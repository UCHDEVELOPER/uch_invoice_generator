import { fromZonedTime } from "date-fns-tz";
import { prisma } from "../../config/prismaClient.js";
import { createBankRemittanceCsv } from "../../utils/generatebankRemittanceCsv.js";
import { generateBankRemittancePdf } from "../../utils/generateBankRemittancePdf.js";
import generateDetailedInvoiceSummaryCSVFile from "../../utils/generateInvoiceDetailedSummaryCSV.js";
import generateDetailedInvoiceSummaryPdfFile from "../../utils/generateInvoiceDetailedSummaryPdf.js";
import { generateInvoiceSummaryCSVFile } from "../../utils/generateInvoiceSummaryCsv.js";
import { generateInvoiceSummaryPdfFile } from "../../utils/generateInvoiceSummaryPdf.js";
import {
  buildUkRange,
  formatDateForUser,
  getISOWeekNumber,
  normalizeDateRange,
  parseDDMMYYYY,
} from "../../utils/parseUserDate.js";
import { getGeneratedId } from "../../utils/getGeneratedId.js";

const TIMEZONE = "Europe/London";

function daysBetweenInclusive(start, end) {
  const msPerDay = 24 * 60 * 60 * 1000;
  const s = new Date(
    Date.UTC(start.getFullYear(), start.getMonth(), start.getDate()),
  );
  const e = new Date(
    Date.UTC(end.getFullYear(), end.getMonth(), end.getDate()),
  );
  return Math.round((e - s) / msPerDay) + 1;
}

function countUniqueJobDays(jobs = []) {
  const set = new Set();
  for (const j of jobs) {
    if (!j?.date_time) continue;
    const d = new Date(j.date_time);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(
      2,
      "0",
    )}-${String(d.getUTCDate()).padStart(2, "0")}`;
    set.add(key);
  }
  return set.size;
}

function selectJobsWithTolerance(
  leftoverJobs,
  currentWeekJobs,
  weeklyTarget,
  tolerance = 5,
  leftoverTolerance = 10,
) {
  const hasLeftovers = leftoverJobs.length > 0;
  const effectiveTolerance = hasLeftovers ? leftoverTolerance : tolerance;

  const minAcceptable = weeklyTarget - effectiveTolerance;
  const maxAcceptable = weeklyTarget + effectiveTolerance;

  let jobsToProcess;

  if (hasLeftovers) {
    jobsToProcess = [...leftoverJobs, ...currentWeekJobs].sort((a, b) => {
      const dateA = new Date(a.date_time);
      const dateB = new Date(b.date_time);
      return dateA - dateB;
    });
  } else {
    jobsToProcess = [...currentWeekJobs].sort((a, b) => {
      const amountA = Number(a.driver_total ?? 0);
      const amountB = Number(b.driver_total ?? 0);
      return amountA - amountB; // Smallest first
    });
  }

  if (jobsToProcess.length === 0) {
    return {
      selectedJobs: [],
      total: 0,
      reason: "No jobs available",
      effectiveTolerance,
    };
  }

  const selected = [];
  let total = 0;

  for (const job of jobsToProcess) {
    const jobAmount = Number(job.driver_total ?? 0);
    const newTotal = total + jobAmount;

    if (newTotal <= maxAcceptable) {
      selected.push(job);
      total = newTotal;
    } else if (total < minAcceptable) {
      selected.push(job);
      total = newTotal;
      break;
    }
  }

  if (total < minAcceptable && selected.length < jobsToProcess.length) {
    const remaining = jobsToProcess.filter((j) => !selected.includes(j));

    let bestJob = null;
    let smallestOvershoot = Infinity;

    for (const job of remaining) {
      const jobAmount = Number(job.driver_total ?? 0);
      const newTotal = total + jobAmount;

      if (newTotal >= minAcceptable) {
        const overshoot = newTotal - minAcceptable;
        if (overshoot < smallestOvershoot) {
          smallestOvershoot = overshoot;
          bestJob = job;
        }
      }
    }

    if (bestJob) {
      selected.push(bestJob);
      total += Number(bestJob.driver_total ?? 0);
    } else if (remaining.length > 0) {
      const largest = remaining.reduce((max, j) =>
        Number(j.driver_total ?? 0) > Number(max.driver_total ?? 0) ? j : max,
      );
      selected.push(largest);
      total += Number(largest.driver_total ?? 0);
    }
  }

  let reason;
  if (total < minAcceptable) {
    reason = `Total ${total.toFixed(2)} below minimum ${minAcceptable.toFixed(
      2,
    )} - included all possible jobs`;
  } else if (total > maxAcceptable) {
    reason = `Total ${total.toFixed(2)} exceeds maximum ${maxAcceptable.toFixed(
      2,
    )} - minimum set to reach target`;
  } else {
    reason = hasLeftovers
      ? `Selected ${selected.length} jobs chronologically (leftover jobs present, extended tolerance: ±${effectiveTolerance})`
      : `Selected ${selected.length} smallest jobs first to maximize count (standard tolerance: ±${effectiveTolerance})`;
  }

  if (total > maxAcceptable) {
    selected.sort(
      (a, b) => Number(a.driver_total ?? 0) - Number(b.driver_total ?? 0),
    );

    for (const job of selected) {
      if (total <= maxAcceptable) break;
      const amount = Number(job.driver_total ?? 0);
      total -= amount;
      const index = selected.indexOf(job);
      if (index !== -1) selected.splice(index, 1);
    }
    reason += ` | Trimmed lowest-value jobs to stay within max limit ${maxAcceptable}`;
  }

  return {
    selectedJobs: selected,
    total,
    reason,
    effectiveTolerance,
  };
}

export async function generateWeeklyInvoice(payload) {
  const { driverId, startDate, endDate, payload: rawPayload = {} } = payload;

  // ------------------ Driver ------------------
  const driver = await prisma.driver.findUnique({ where: { id: driverId } });
  if (!driver) throw { statusCode: 400, message: "Driver not found" };

  if (!driver.per_hour_rate && !driver.weekly_fixed_rate) {
    throw {
      statusCode: 400,
      message: "Driver has not set Per Hour Rate",
    };
  }

  // ------------------ Normalize date range ------------------
  const { startDate: start, endDate: end } = normalizeDateRange(
    startDate,
    endDate,
  );
  const startDt = new Date(start);
  const endDt = new Date(end);

  if (daysBetweenInclusive(startDt, endDt) < 7) {
    throw {
      statusCode: 400,
      message: "Date range must be at least 7 days for a weekly invoice",
    };
  }

  // ------------------ Existing invoice check ------------------
  console.log(startDt, "startDt");
  console.log(endDt, "endDt");

  const existingInvoice = await prisma.selfInvoice.findFirst({
    where: {
      driver_id: driverId,
      start_date: startDt,
      end_date: endDt,
    },
    include: { jobs: true, driver: true },
  });

  if (existingInvoice) {
    const driverRateChanged =
      (driver.weekly_fixed_rate ?? null) !==
        (existingInvoice.old_weekly_fixed_rate ?? null) ||
      (driver.per_hour_rate ?? null) !==
        (existingInvoice.old_per_hour_rate ?? null) ||
      (driver.total_hours ?? null) !==
        (existingInvoice.old_total_hours ?? null) ||
      (driver.total_days ?? null) !== (existingInvoice.old_total_days ?? null);

    const chargesChanged =
      (rawPayload.admin_fee ?? driver.admin_fee ?? 0) !==
        (existingInvoice.admin_fee ?? 0) ||
      (rawPayload.vehicle_hire_charges ?? driver.vehicle_hire_charges ?? 0) !==
        (existingInvoice.vehicle_hire_charges ?? 0) ||
      (rawPayload.insurance_charge ?? driver.insurance_charge ?? 0) !==
        (existingInvoice.insurance_charge ?? 0) ||
      (rawPayload.fuel_charge ?? driver.fuel_charge ?? 0) !==
        (existingInvoice.fuel_charge ?? 0) ||
      (rawPayload.additional_charges ?? driver.additional_charges ?? 0) !==
        (existingInvoice.additional_charges ?? 0);

    const formattedExistingInvoice = {
      ...existingInvoice,
      start_date: formatDateForUser(existingInvoice.start_date),
      end_date: formatDateForUser(existingInvoice.end_date),
      created_at: formatDateForUser(existingInvoice.created_at),
      jobs: existingInvoice.jobs.map((job) => ({
        ...job,
        date_time: formatDateForUser(job.date_time),
        created_at: formatDateForUser(job.created_at),
        updated_at: formatDateForUser(job.updated_at),
      })),
      driver: {
        ...existingInvoice.driver,
        created_at: formatDateForUser(existingInvoice.driver.created_at),
        updated_at: formatDateForUser(existingInvoice.driver.updated_at),
      },
    };

    if (!driverRateChanged && !chargesChanged) {
      return {
        invoice: formattedExistingInvoice,
        meta: {
          message: "Invoice already exists for this week.",
          selectedJobIds: existingInvoice.jobs.map((j) => j.id),
          total_no_of_jobs: existingInvoice.jobs.length,
          total_number_of_dockets:
            existingInvoice.total_number_of_dockets ??
            existingInvoice.jobs.length,
          docketTotal: existingInvoice.docket_total,
          net_amount:
            existingInvoice.net_amount ?? existingInvoice.docket_total,
          total_deductions: existingInvoice.total_deductions ?? 0,
          final_total: existingInvoice.final_total,
          total_days: existingInvoice.total_days ?? 0,
        },
      };
    }

    await prisma.job.updateMany({
      where: { invoice_id: existingInvoice.id },
      data: { is_invoiced: false, invoice_id: null },
    });

    await prisma.selfInvoice.delete({ where: { id: existingInvoice.id } });
  }

  // ------------------ Fetch jobs ------------------
  const jobsRaw = await prisma.job.findMany({
    where: {
      driver_id: driverId,
      OR: [
        { is_invoiced: false },
        existingInvoice ? { invoice_id: existingInvoice.id } : undefined,
      ].filter(Boolean),
    },
    orderBy: { date_time: "asc" },
  });

  if (!jobsRaw || jobsRaw.length === 0) {
    throw { statusCode: 400, message: "No jobs available for invoice" };
  }

  // ------------------ Split jobs by date range ------------------
  const leftoverJobs = jobsRaw.filter((j) => new Date(j.date_time) < startDt);
  const currentWeekJobs = jobsRaw.filter(
    (j) => new Date(j.date_time) >= startDt && new Date(j.date_time) <= endDt,
  );

  // Sort appropriately
  leftoverJobs.sort((a, b) => new Date(a.date_time) - new Date(b.date_time));
  currentWeekJobs.sort((a, b) => new Date(a.date_time) - new Date(b.date_time));

  // ------------------ Determine weekly target ------------------
  const weeklyFixed = driver.weekly_fixed_rate ?? 0;
  const perHour = driver.per_hour_rate ?? 0;
  const totalHours = driver.total_hours ?? 40;
  let weeklyTarget = weeklyFixed > 0 ? weeklyFixed : perHour * totalHours;

  if (!weeklyTarget || weeklyTarget === 0) {
    // No target configured - include all available jobs
    const allJobs = [...leftoverJobs, ...currentWeekJobs];
    const docketTotal = allJobs.reduce(
      (s, j) => s + Number(j.driver_total ?? 0),
      0,
    );

    const admin_fee = rawPayload.admin_fee ?? driver.admin_fee ?? 0;
    const vehicle_hire_charges =
      rawPayload.vehicle_hire_charges ?? driver.vehicle_hire_charges ?? 0;
    const insurance_charge =
      rawPayload.insurance_charge ?? driver.insurance_charge ?? 0;
    const fuel_charge = rawPayload.fuel_charge ?? driver.fuel_charge ?? 0;
    const additional_charges =
      rawPayload.additional_charges ?? driver.additional_charges ?? 0;

    const total_deductions =
      admin_fee +
      vehicle_hire_charges +
      insurance_charge +
      fuel_charge +
      additional_charges;
    const net_amount = docketTotal;
    const final_total = net_amount - total_deductions;
    const total_days_in_invoice = countUniqueJobDays(allJobs);

    const nextId = await getGeneratedId("self");

    const invoice = await prisma.selfInvoice.create({
      data: {
        generated_id: nextId,
        driver: { connect: { id: driverId } },
        start_date: startDt,
        end_date: endDt,
        total_number_of_dockets: allJobs.length,
        docket_total: docketTotal,
        net_amount,
        admin_fee,
        vehicle_hire_charges,
        insurance_charge,
        fuel_charge,
        additional_charges,
        total_deductions,
        final_total,
        old_weekly_fixed_rate: driver.weekly_fixed_rate ?? null,
        old_per_hour_rate: driver.per_hour_rate ?? null,
        old_total_hours: driver.total_hours ?? null,
        old_total_days: driver.total_days ?? null,
        jobs: { connect: allJobs.map((j) => ({ id: j.id })) },
      },
      include: { jobs: true, driver: true },
    });

    await prisma.job.updateMany({
      where: { id: { in: allJobs.map((j) => j.id) } },
      data: { is_invoiced: true, invoice_id: invoice.id },
    });

    return {
      invoice,
      meta: {
        selectedJobIds: allJobs.map((j) => j.id),
        total_no_of_jobs: allJobs.length,
        total_number_of_dockets: allJobs.length,
        weeklyTarget: null,
        docketTotal,
        net_amount,
        total_deductions,
        final_total,
        total_days: total_days_in_invoice,
        note: "No weekly target configured - all jobs included",
      },
    };
  }

  // ------------------ Smart job selection with tolerance ------------------
  const tolerance = rawPayload.tolerance ?? 5;
  const selection = selectJobsWithTolerance(
    leftoverJobs,
    currentWeekJobs,
    weeklyTarget,
    tolerance,
  );
  const selectedJobs = selection.selectedJobs;
  const docketTotal = selection.total;

  if (selectedJobs.length === 0) {
    throw { statusCode: 400, message: "No jobs could be selected for invoice" };
  }

  // ------------------ Calculate deductions and finals ------------------
  const admin_fee = rawPayload.admin_fee ?? driver.admin_fee ?? 0;
  const vehicle_hire_charges =
    rawPayload.vehicle_hire_charges ?? driver.vehicle_hire_charges ?? 0;
  const insurance_charge =
    rawPayload.insurance_charge ?? driver.insurance_charge ?? 0;
  const fuel_charge = rawPayload.fuel_charge ?? driver.fuel_charge ?? 0;
  const additional_charges =
    rawPayload.additional_charges ?? driver.additional_charges ?? 0;

  const total_deductions =
    admin_fee +
    vehicle_hire_charges +
    insurance_charge +
    fuel_charge +
    additional_charges;
  const net_amount = docketTotal;
  const final_total = net_amount - total_deductions;
  const total_days_in_invoice = countUniqueJobDays(selectedJobs);

  // ------------------ Create invoice ------------------
  const invoice = await prisma.selfInvoice.create({
    data: {
      generated_id: nextId,
      driver: { connect: { id: driverId } },
      start_date: startDt,
      end_date: endDt,
      total_number_of_dockets: selectedJobs.length,
      docket_total: docketTotal,
      net_amount,
      admin_fee,
      vehicle_hire_charges,
      insurance_charge,
      fuel_charge,
      additional_charges,
      total_deductions,
      final_total,
      old_weekly_fixed_rate: driver.weekly_fixed_rate ?? null,
      old_per_hour_rate: driver.per_hour_rate ?? null,
      old_total_hours: driver.total_hours ?? null,
      old_total_days: driver.total_days ?? null,
      jobs: { connect: selectedJobs.map((j) => ({ id: j.id })) },
    },
    include: { jobs: true, driver: true },
  });

  // ------------------ Mark selected jobs as invoiced ------------------
  await prisma.job.updateMany({
    where: { id: { in: selectedJobs.map((j) => j.id) } },
    data: { is_invoiced: true, invoice_id: invoice.id },
  });

  // ------------------ Return invoice with metadata ------------------
  const variance = docketTotal - weeklyTarget;
  const variancePercent = ((variance / weeklyTarget) * 100).toFixed(2);
  const leftoverCount = selectedJobs.filter(
    (j) => new Date(j.date_time) < startDt,
  ).length;
  const currentWeekCount = selectedJobs.filter(
    (j) => new Date(j.date_time) >= startDt && new Date(j.date_time) <= endDt,
  ).length;

  const formattedInvoice = {
    ...invoice,
    start_date: formatDateForUser(invoice.start_date),
    end_date: formatDateForUser(invoice.end_date),
    created_at: formatDateForUser(invoice.created_at),
    jobs: invoice.jobs.map((job) => ({
      ...job,
      date_time: formatDateForUser(job.date_time),
      created_at: formatDateForUser(job.created_at),
      updated_at: formatDateForUser(job.updated_at),
    })),
    driver: {
      ...invoice.driver,
      created_at: formatDateForUser(invoice.driver.created_at),
      updated_at: formatDateForUser(invoice.driver.updated_at),
    },
  };

  return {
    invoice: formattedInvoice,
    meta: {
      selectedJobIds: selectedJobs.map((j) => j.id),
      total_no_of_jobs: selectedJobs.length,
      total_number_of_dockets: selectedJobs.length,
      weeklyTarget,
      tolerance,
      acceptableRange: {
        min: weeklyTarget - tolerance,
        max: weeklyTarget + tolerance,
      },
      docketTotal,
      variance,
      variancePercent: `${variancePercent}%`,
      net_amount,
      total_deductions,
      final_total,
      total_days: total_days_in_invoice,
      leftoverJobsIncluded: leftoverCount,
      currentWeekJobsIncluded: currentWeekCount,
      totalLeftoverJobsAvailable: leftoverJobs.length,
      totalCurrentWeekJobsAvailable: currentWeekJobs.length,
      selectionReason: selection.reason,
      note:
        leftoverJobs.length > 0
          ? "Leftover jobs present: Selected chronologically to handle high-paid remaining jobs"
          : "No leftover jobs: Selected smallest amounts first to maximize job count",
    },
  };
}

export async function getAllInvoiceService(page, limit, filters = {}) {
  try {
    const hasSearch = filters.search && String(filters.search).trim() !== "";

    const effectivePage = hasSearch ? 1 : Math.max(Number(page) || 1, 1);
    const safeLimit = Math.max(Number(limit) || 10, 1);
    const skip = (effectivePage - 1) * safeLimit;

    const where = {};

    /* ===================== SEARCH ===================== */
    if (filters.search && String(filters.search).trim() !== "") {
      const search = String(filters.search).trim();
      const isNumeric = !isNaN(search);

      where.OR = [
        {
          driver: {
            name: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
        {
          driver: {
            call_sign: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
      ];

      if (isNumeric) {
        where.OR.push({
          net_amount: Number(search),
        });
      }
    }

    /* ===================== DATE RANGE ===================== */
    if (filters.from_date || filters.to_date) {
      if (filters.from_date) {
        const from = parseDDMMYYYY(filters.from_date);

        if (from) {
          where.start_date = {
            gte: fromZonedTime(
              new Date(
                from.getFullYear(),
                from.getMonth(),
                from.getDate(),
                0,
                0,
                0,
                0,
              ),
              TIMEZONE,
            ),
          };
        }
      }

      if (filters.to_date) {
        const to = parseDDMMYYYY(filters.to_date);

        if (to) {
          where.end_date = {
            lte: fromZonedTime(
              new Date(
                to.getFullYear(),
                to.getMonth(),
                to.getDate(),
                23,
                59,
                59,
                999,
              ),
              TIMEZONE,
            ),
          };
        }
      }
    }

    /* ===================== QUERY ===================== */
    const [invoices, totalCount] = await Promise.all([
      prisma.selfInvoice.findMany({
        where,
        skip,
        take: safeLimit,
        include: {
          driver: true,
          batch: true,
        },
        orderBy: {
          generated_id: "asc",
        },
      }),
      prisma.selfInvoice.count({ where }),
    ]);

    return {
      success: true,
      statusCode: 200,
      message: "Invoices fetched successfully",
      data: invoices,
      pagination: {
        page: effectivePage,
        limit: safeLimit,
        totalCount,
        totalPages: Math.ceil(totalCount / safeLimit),
        hasNextPage: effectivePage * safeLimit < totalCount,
        hasPrevPage: effectivePage > 1,
      },
    };
  } catch (error) {
    return {
      success: false,
      statusCode: 500,
      message: error.message,
    };
  }
}

export async function getInvoiceByIdService(invoiceId) {
  try {
    const invoice = await prisma.selfInvoice.findUnique({
      where: { id: invoiceId },
      include: {
        jobs: true,
        driver: true,
      },
    });

    if (!invoice) {
      return {
        success: false,
        statusCode: 404,
        message: "Invoice not found",
      };
    }

    return {
      success: true,
      statusCode: 200,
      message: "Invoice fetched successfully",
      data: invoice,
    };
  } catch (err) {
    return {
      success: false,
      statusCode: 500,
      message: err.message,
    };
  }
}

export async function deleteInvoiceService(invoiceId) {
  try {
    const invoice = await prisma.selfInvoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      return {
        success: false,
        statusCode: 404,
        message: "Invoice not found",
      };
    }

    await prisma.job.updateMany({
      where: { invoice_id: invoiceId },
      data: { invoice_id: null, is_invoiced: false },
    });

    await prisma.selfInvoice.delete({
      where: { id: invoiceId },
    });

    return {
      success: true,
      statusCode: 200,
      message: "Invoice deleted successfully",
    };
  } catch (error) {
    return {
      success: false,
      statusCode: 500,
      message: error.message,
    };
  }
}

export async function generateFinalInvoiceService(payload) {
  const { invoice_id } = payload;

  // ── 1. Fetch invoice ─────────────────────────────────────────────────────
  const invoice = await prisma.selfInvoice.findUnique({
    where: { id: invoice_id },
    include: {
      jobs: true,
      driver: true,
    },
  });

  if (!invoice) {
    return { success: false, statusCode: 404, message: "Invoice not found" };
  }

  if (invoice.status === "FINAL") {
    return {
      success: false,
      statusCode: 400,
      message: "Invoice is already finalized",
    };
  }

  if (!invoice.jobs.length) {
    return { success: false, statusCode: 400, message: "Invoice has no jobs" };
  }

  // ── 2. Recalculate docket VAT if missing ─────────────────────────────────
  let docketTotalVat = Number(invoice.docket_total_vat ?? 0);
  let finalTotal = Number(invoice.final_total ?? 0);

  if (docketTotalVat === 0) {
    const vatPercent = Number(invoice.driver?.docket_total_vat_percent ?? 0);

    if (vatPercent > 0) {
      const docketTotal = Number(invoice.docket_total ?? 0);
      docketTotalVat = parseFloat(
        ((docketTotal * vatPercent) / 100).toFixed(2),
      );
      finalTotal = parseFloat((finalTotal + docketTotalVat).toFixed(2));
    }
  }

  // ── 3. Finalize ───────────────────────────────────────────────────────────
  const updatedInvoice = await prisma.selfInvoice.update({
    where: { id: invoice_id },
    data: {
      status: "FINAL",
      docket_total_vat: docketTotalVat,
      final_total: finalTotal,
    },
    include: {
      jobs: true,
      driver: true,
    },
  });

  return {
    success: true,
    statusCode: 200,
    message: "Invoice finalized successfully",
    data: updatedInvoice,
  };
}

export async function updateInvoiceService(invoiceId, payload) {
  try {
    const invoice = await prisma.selfInvoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      return {
        success: false,
        statusCode: 404,
        message: "Invoice not found",
      };
    }

    const updatedInvoice = await prisma.selfInvoice.update({
      where: { id: invoiceId },
      data: payload,
    });

    return {
      success: true,
      statusCode: 200,
      message: "Invoice updated successfully",
      data: updatedInvoice,
    };
  } catch (error) {
    return {
      success: false,
      statusCode: 500,
      message: error.message,
    };
  }
}

export const generateInvoiceSummaryService = async ({
  start_date,
  end_date,
  format,
}) => {
  if (!start_date || !end_date) {
    throw { statusCode: 400, message: "Start date and end date are required" };
  }

  const start = start_date;

  const end = end_date;

  if (start > end) {
    throw { statusCode: 400, message: "Start date cannot be after end date" };
  }

  const batch = await getOrCreateInvoiceBatch(prisma, start, end);

  const invoices = await prisma.selfInvoice.findMany({
    where: {
      AND: [
        {
          start_date: {
            lte: end,
          },
        },
        {
          end_date: {
            gte: start,
          },
        },
      ],
      status: "FINAL",
    },
    include: {
      driver: true,
      jobs: true,
    },
    orderBy: [
      {
        start_date: "asc",
      },
      {
        driver: {
          name: "asc",
        },
      },
    ],
  });

  if (invoices.length === 0) {
    throw { statusCode: 400, message: "No Invoices found for the date range" };
  }

  await prisma.selfInvoice.updateMany({
    where: {
      id: { in: invoices.map((i) => i.id) },
    },
    data: {
      batch_id: batch.id,
    },
  });

  const rows = invoices.map((invoice) => {
    const otherCharges =
      (parseFloat(invoice.admin_fee) || 0) +
      (parseFloat(invoice.vehicle_hire_charges) || 0) +
      (parseFloat(invoice.insurance_charge) || 0) +
      (parseFloat(invoice.fuel_charge) || 0) +
      (parseFloat(invoice.additional_charges) || 0);

    let vatAmount = 0;
    const vatValue = invoice.vat;

    if (vatValue && invoice.admin_fee) {
      vatAmount = (invoice.admin_fee * vatValue) / 100;
    } else if (vatValue) {
      vatAmount = parseFloat(vatValue) || 0;
    }

    const taxAmount = invoice.total_deductions || 0;

    return {
      callsign: invoice.driver?.call_sign || "",
      driverName: invoice.driver?.name || "",
      invoiceNumber: invoice.generated_id || "" ,
      jobs: invoice.total_number_of_dockets || 0,
      debtAmount: invoice.final_total || 0,
      taxAmount,
      total: invoice.final_total || 0,
    };
  });

  const summary = rows.reduce(
    (acc, row) => {
      acc.jobs += row.jobs;
      acc.debt += row.debtAmount;
      acc.tax += row.taxAmount;
      acc.total += row.total;
      return acc;
    },
    { jobs: 0, debt: 0, tax: 0, total: 0 },
  );

  if (format === "csv") {
    return generateInvoiceSummaryCSVFile({
      rows,
      summary,
      start_date,
      end_date,
      batch,
    });
  } else {
    return generateInvoiceSummaryPdfFile({
      rows,
      summary,
      start_date,
      end_date,
      batch,
    });
  }
};

const getOrCreateInvoiceBatch = async (prisma, fromDate, toDate) => {
  const year = fromDate.getFullYear();
  const week = getISOWeekNumber(fromDate);

  const existing = await prisma.selfInvoiceBatch.findFirst({
    where: { year, week },
  });

  if (existing) {
    return existing;
  }

  const lastBatch = await prisma.selfInvoiceBatch.findFirst({
    where: { year },
    orderBy: { batch_number: "desc" },
  });

const nextBatchNumber = lastBatch ? lastBatch.batch_number + 1 : 1001;
const batchCode = String(nextBatchNumber).padStart(4, "0");

  return prisma.selfInvoiceBatch.create({
    data: {
      batch_number: nextBatchNumber,
      batch_code: batchCode,
      from_date: fromDate,
      to_date: toDate,
      year,
      week,
    },
  });
};

export async function generateBankRemittanceService({
  start_date,
  end_date,
  format = "csv",
}) {
  if (!start_date || !end_date) {
    throw { statusCode: 400, message: "Start date and end date are required" };
  }

  const { start, end } = buildUkRange(start_date, end_date);

  if (start > end) {
    throw { statusCode: 400, message: "Start date cannot be after end date" };
  }
  console.log(start, "=> start", end, "=> end");

  const invoices = await prisma.selfInvoice.findMany({
    where: {
      status: "FINAL",
      AND: [
        {
          start_date: {
            lte: end,
          },
        },
        {
          end_date: {
            gte: start,
          },
        },
      ],
    },
    include: {
      driver: true,
    },
    orderBy: [
      {
        start_date: "asc",
      },
      {
        driver: {
          name: "asc",
        },
      },
    ],
  });

  if (invoices.length === 0) {
    throw {
      statusCode: 404,
      message: "No Final invoices found for the given date range",
    };
  }

  if (format === "pdf") {
    const result = await generateBankRemittancePdf({
      invoices,
      start_date: start,
      end_date: end,
    });
    console.log(result, "-------------");

    return { pdf_url: result.pdf_url };
  }

  return createBankRemittanceCsv({
    invoices,
    start_date: start,
    end_date: end,
  });
}

export async function generateDetailedInvoiceSummaryService(
  start_date,
  end_date,
  format = "pdf",
) {
  try {
    if (!start_date || !end_date) {
      throw {
        statusCode: 400,
        message: "Start date and end date are required",
      };
    }

    const { start, end } = buildUkRange(start_date, end_date);
    if (start > end) {
      throw { statusCode: 400, message: "Start date cannot be after end date" };
    }

    const invoiceBatch = await getOrCreateInvoiceBatch(prisma, start, end);

    const invoices = await prisma.selfInvoice.findMany({
      where: {
        AND: [
          {
            start_date: {
              lte: end,
            },
          },
          {
            end_date: {
              gte: start,
            },
          },
        ],
        status: "FINAL",
      },
      include: {
        driver: true,
        jobs: true,
      },
    orderBy: [
      {
        start_date: "asc",
      },
      {
        driver: {
          name: "asc",
        },
      },
    ],
    });

    console.log(invoices.length, "invoices for detailed summary");

    if (invoices.length === 0) {
      throw {
        statusCode: 400,
        message: "No Invoices found for the date range",
      };
    }

    await prisma.selfInvoice.updateMany({
      where: {
        id: { in: invoices.map((i) => i.id) },
      },
      data: {
        batch_id: invoiceBatch.id,
      },
    });

    const batch = await prisma.selfInvoiceBatch.findUnique({
      where: {
        id: invoiceBatch.id,
      },
      include: {
        invoices: {
          where: {
            AND: [
              {
                start_date: {
                  lte: end,
                },
              },
              {
                end_date: {
                  gte: start,
                },
              },
            ],
            status: "FINAL",
          },
          include: {
            driver: true,
          },
        },
      },
    });

    const payload = { invoiceBatch: batch };

    if (format === "csv") {
      const result = await generateDetailedInvoiceSummaryCSVFile(payload);

      return {
        success: true,
        statusCode: 200,
        data: result,
      };
    }

    const result = await generateDetailedInvoiceSummaryPdfFile(payload);

    return {
      success: true,
      statusCode: 200,
      data: result,
    };
  } catch (err) {
    return {
      success: false,
      statusCode: err.statusCode || 500,
      message:
        err.message ||
        "An error occurred while generating the detailed invoice summary",
    };
  }
}

function normalizeManualDockets(md) {
  if (!md) return [];
  if (typeof md === "string") {
    try {
      const p = JSON.parse(md);
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  }
  return Array.isArray(md) ? md : [];
}

export async function redraftInvoiceService(invoiceId) {
  console.log(`[REDRAFT] Starting redraft for invoice ${invoiceId}`);

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        // ── 1. Fetch invoice with driver ───────────────────────────────────
        const invoice = await tx.selfInvoice.findUnique({
          where: { id: invoiceId },
          include: { driver: true },
        });

        if (!invoice) {
          return {
            success: false,
            statusCode: 404,
            message: `Invoice with ID ${invoiceId} not found`,
            data: null,
          };
        }

        const driver = invoice.driver;
        if (!driver) {
          return {
            success: false,
            statusCode: 400,
            message: `Driver not found for invoice ${invoiceId}`,
            data: null,
          };
        }

        // ── 2. Count jobs currently attached to this invoice ───────────────
        const detachedJobCount = await tx.selfJob.count({
          where: {
            invoice_id: invoiceId,
            is_invoiced: true,
          },
        });

        // ── 3. Detach all jobs from this invoice ───────────────────────────
        if (detachedJobCount > 0) {
          await tx.selfJob.updateMany({
            where: {
              invoice_id: invoiceId,
              is_invoiced: true,
            },
            data: {
              invoice_id: null,
              is_invoiced: false,
            },
          });
        }

        // ── 4. Fetch all uninvoiced jobs for this driver in the invoice period
        const availableJobs = await tx.selfJob.findMany({
          where: {
            driver_id: driver.id,
            is_invoiced: false,
            date_time: {
              gte: invoice.start_date,
              lte: invoice.end_date,
            },
          },
          orderBy: { date_time: "asc" },
        });


        // ── 5. Handle no jobs case ─────────────────────────────────────────
        if (!availableJobs.length) {
          const resetInvoice = await tx.selfInvoice.update({
            where: { id: invoiceId },
            data: {
              docket_total: 0,
              net_amount: 0,
              total_deductions: 0,
              vat: 0,
              final_total: 0,
              total_number_of_dockets: 0,
              admin_fee: 0,
              vehicle_hire_charges: 0,
              insurance_charge: 0,
              fuel_charge: 0,
              additional_charges: 0,
              status: "DRAFT",
            },
          });

          return {
            success: true,
            statusCode: 200,
            message: `Invoice ${invoiceId} has been reset. No uninvoiced jobs found.`,
            data: {
              invoice: resetInvoice,
              jobsDetached: detachedJobCount,
              jobsAttached: 0,
              period: {
                start: invoice.start_date,
                end: invoice.end_date,
              },
            },
          };
        }

        // ── 6. Calculate financials from jobs + driver charge config ────────
        const docketTotal = availableJobs.reduce(
          (sum, job) => sum + Number(job.driver_total ?? 0),
          0,
        );

        const adminFee = Number(driver.admin_fee ?? 0);
        const vehicleHire = Number(driver.vehicle_hire_charge ?? 0);
        const insurance = Number(driver.insurance_charge ?? 0);
        const fuel = Number(driver.fuel_charge ?? 0);
        const additionalCharges1 = driver.additional_charges_1 ?? 0;
        const additionalCharges2 = driver.additional_charges_2 ?? 0;
        const additionalCharges3 = driver.additional_charges_3 ?? 0;

        const adminVat = adminFee * (Number(driver.vat_percent ?? 0) / 100);
        const vehicleVat =
          vehicleHire * (Number(driver.vehicle_vat_percent ?? 0) / 100);
        const insuranceVat =
          insurance * (Number(driver.insurance_vat_percent ?? 0) / 100);
        const fuelVat = fuel * (Number(driver.fuel_vat_percent ?? 0) / 100);
        const additionalCharges1Vat =
          additionalCharges1 *
          ((driver.additional_charges_vat_1_percent ?? 0) / 100);
        const additionalCharges2Vat =
          additionalCharges2 *
          ((driver.additional_charges_vat_2_percent ?? 0) / 100);
        const additionalCharges3Vat =
          additionalCharges3 *
          ((driver.additional_charges_vat_3_percent ?? 0) / 100);

        const manualDockets = driver
          ? normalizeManualDockets(driver.manual_dockets)
          : [];

        const manualDocketTotal = manualDockets.reduce(
          (sum, docket) => sum + Number(docket.driver_total || 0),
          0,
        );

        const docketTotalVatPercentValue =
          docketTotal * (Number(driver.docket_total_vat_percent ?? 0) / 100);

        const carryForwardAdmin = Number(driver.carry_forward_admin_fee ?? 0);
        const carryForwardVehicle = Number(
          driver.carry_forward_vehicle_hire_charge ?? 0,
        );
        const carryForwardInsurance = Number(
          driver.carry_forward_insurance_charge ?? 0,
        );
        const carryForwardFuel = Number(driver.carry_forward_fuel_charge ?? 0);
        const carriedForward =
          carryForwardAdmin +
          carryForwardVehicle +
          carryForwardInsurance +
          carryForwardFuel;

        const carryForwardAdminVat =
          carryForwardAdmin *
          (Number(driver.carry_forward_admin_vat_percent ?? 0) / 100);

        const carryForwardVehicleVat =
          carryForwardVehicle *
          (Number(driver.carry_forward_vehicle_vat_percent ?? 0) / 100);

        const carryForwardInsuranceVat =
          carryForwardInsurance *
          (Number(driver.carry_forward_insurance_vat_percent ?? 0) / 100);

        const carryForwardFuelVat =
          carryForwardFuel *
          (Number(driver.carry_forward_fuel_vat_percent ?? 0) / 100);

        const carryForwardVat =
          carryForwardAdminVat +
          carryForwardVehicleVat +
          carryForwardInsuranceVat +
          carryForwardFuelVat;

        const totalVat =
          adminVat +
          vehicleVat +
          insuranceVat +
          fuelVat +
          additionalCharges1Vat +
          additionalCharges2Vat +
          additionalCharges3Vat +
          carryForwardVat;

        console.log("========== Invoice Deduction Breakdown ==========");

        console.log({
          adminFee,
          vehicleHire,
          insurance,
          fuel,
          additionalCharges1,
          additionalCharges2,
          additionalCharges3,
          carriedForward,
          totalVat,
          docketTotalVatPercentValue,
          manualDocketTotal,
          docketTotal,
        });

        const deductionAdditionTotal =
          adminFee +
          vehicleHire +
          insurance +
          fuel +
          additionalCharges1 +
          additionalCharges2 +
          additionalCharges3 +
          carriedForward +
          totalVat;

        const deductionSubtractionTotal =
          docketTotalVatPercentValue + manualDocketTotal;

        const rawTotalDeductions =
          deductionAdditionTotal - deductionSubtractionTotal;

        const totalDeductions = Math.abs(rawTotalDeductions);

        const netAmount = docketTotal;

        console.log("---------- Calculation Totals ----------");

        console.log({
          deductionAdditionTotal,
          deductionSubtractionTotal,
          rawTotalDeductions,
          totalDeductions,
          netAmount,
        });

        console.log("===============================================");
        const finalTotal = Math.abs(netAmount - totalDeductions);

        // ── 7. Attach all available jobs to this invoice ───────────────────
        const jobIds = availableJobs.map((job) => job.id);

        await tx.selfJob.updateMany({
          where: { id: { in: jobIds } },
          data: {
            is_invoiced: true,
            invoice_id: invoiceId,
          },
        });

        // ── 8. Update invoice back to DRAFT with recalculated values ────────
        const updatedInvoice = await tx.selfInvoice.update({
          where: { id: invoiceId },
          data: {
            docket_total: docketTotal,
            net_amount: netAmount,
            total_deductions: totalDeductions,
            vat: totalVat,
            final_total: finalTotal,
            total_number_of_dockets: availableJobs.length,
            admin_fee: adminFee,
            vehicle_hire_charges: vehicleHire,
            insurance_charge: insurance,
            fuel_charge: fuel,
            additional_charges: 0,
            status: "DRAFT",
          },
        });

        return {
          success: true,
          statusCode: 200,
          message: `Invoice ${invoiceId} has been successfully redrafted`,
          data: {
            invoice: updatedInvoice,
            jobsDetached: detachedJobCount,
            jobsAttached: availableJobs.length,
            calculation: {
              docketTotal,
              deductions: {
                adminFee,
                vehicleHire,
                insurance,
                fuel,
                total: totalDeductions,
              },
              vat: totalVat,
              netAmount,
              finalTotal,
            },
            period: {
              start: invoice.start_date,
              end: invoice.end_date,
            },
          },
        };
      },
      {
        maxWait: 10000,
        timeout: 30000,
      },
    );

    console.log(`[REDRAFT] Completed for invoice ${invoiceId}:`, {
      jobsDetached: result.data?.jobsDetached,
      jobsAttached: result.data?.jobsAttached,
      finalTotal: result.data?.calculation?.finalTotal,
    });

    return result;
  } catch (error) {
    console.error(`[REDRAFT] Error redrafting invoice ${invoiceId}:`, error);
    return {
      success: false,
      statusCode: 500,
      message: `Failed to redraft invoice: ${error.message}`,
      data: {
        error: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
    };
  }
}

export async function bulkUpdateInvoicesToPaidService(invoiceIds) {
  try {
    const updatedInvoices = await prisma.selfInvoice.updateMany({
      where: {
        id: {
          in: invoiceIds,
        },
      },
      data: {
        is_paid: true,
      },
    });

    return {
      success: true,
      statusCode: 200,
      message: "Invoices updated to paid successfully",
      data: {
        updatedInvoices,
      },
    };
  } catch (error) {
    return {
      success: false,
      statusCode: 500,
      message: "Failed to update invoices to paid",
      data: {
        error: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
    };
  }
}
