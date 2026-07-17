import { prisma } from "../config/prismaClient.js";
import { createBankRemittanceCsv } from "../utils/generatebankRemittanceCsv.js";
import { generateBankRemittancePdf } from "../utils/generateBankRemittancePdf.js";
import generateDetailedInvoiceSummaryCSVFile from "../utils/generateInvoiceDetailedSummaryCSV.js";
import generateDetailedInvoiceSummaryPdfFile from "../utils/generateInvoiceDetailedSummaryPdf.js";
import { generateInvoiceSummaryCSVFile } from "../utils/generateInvoiceSummaryCsv.js";
import { generateInvoiceSummaryPdfFile } from "../utils/generateInvoiceSummaryPdf.js";
import {
  buildUkRange,
  formatDateForUser,
  getISOWeekNumber,
  normalizeDateRange,
  parseDDMMYYYY,
} from "../utils/parseUserDate.js";
import { getGeneratedId } from "../utils/getGeneratedId.js";
import { calculateInvoiceFinancials } from "../workers/invoice/invoiceFinancialCalculator.js";
import { calculateWeeklyTarget } from "../workers/invoice/invoiceTargetCalculator.js";
import { selectJobsWithinTolerance } from "../workers/invoice/weeklyInvoice.selector.js";
import { startOfDay, endOfDay } from "date-fns";
import { fromZonedTime } from "date-fns-tz";

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

  const existingInvoice = await invoice.findFirst({
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

    await prisma.invoice.delete({ where: { id: existingInvoice.id } });
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

  const nextId = await getGeneratedId("main");

  console.log('===================================');
  console.log(nextId);
  console.log('===================================');


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

    const invoice = await prisma.invoice.create({
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
  const invoice = await prisma.invoice.create({
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
      prisma.invoice.findMany({
        where,
        skip,
        take: safeLimit,
        include: {
          driver: true,
        },
        orderBy: {
          generated_id: "asc",
        },
      }),
      prisma.invoice.count({ where }),
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
    console.log(error.message);

    return {
      success: false,
      statusCode: 500,
      message: error.message,
    };
  }
}

export async function getInvoiceByIdService(invoiceId) {
  try {
    const invoice = await prisma.invoice.findUnique({
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
    const invoice = await prisma.invoice.findUnique({
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

    await prisma.invoice.delete({
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

/**
 * generateFinalInvoiceService (CORRECT VERSION)
 *
 * RULE: Only adjust the LAST job's docket_total
 * - Calculate required vs current
 * - If adjustment needed: SUBTRACT from last job only
 * - Never add to last job
 * - Never touch any other job
 *
 * This works because:
 * - Selection phase uses high tolerance (500): jobs total between target and target+500
 * - Finalization reduces last job by the overage amount
 * - Result: final invoice matches required docket total
 */

// export async function generateFinalInvoiceService(payload) {
//   const {
//     invoice_id,
//     admin_fee = 0,
//     vehicle_hire_charges = 0,
//     insurance_charge = 0,
//     fuel_charge = 0,
//     additional_charges = 0,
//     vat = null,
//     total_deduction = 0,
//   } = payload;

//   // ──────────────────────────────────────────────────────────────────────
//   // Fetch invoice and validate
//   // ──────────────────────────────────────────────────────────────────────

//   const invoice = await prisma.invoice.findUnique({
//     where: { id: invoice_id },
//     include: {
//       jobs: {
//         orderBy: { date_time: "asc" },
//       },
//       driver: true,
//     },
//   });

//   if (!invoice) {
//     return {
//       success: false,
//       statusCode: 404,
//       message: "Invoice not found",
//     };
//   }

//   if (invoice.status === "FINAL") {
//     return {
//       success: false,
//       statusCode: 400,
//       message: "Invoice is already finalized",
//     };
//   }

//   if (!invoice.jobs.length) {
//     return {
//       success: false,
//       statusCode: 400,
//       message: "Invoice has no jobs",
//     };
//   }

//   // ──────────────────────────────────────────────────────────────────────
//   // Calculate required amounts
//   // ──────────────────────────────────────────────────────────────────────

//   const hourlyRate = Number(invoice.driver.per_hour_rate ?? 0);
//   const totalHours = Number(invoice.driver.total_hours ?? 0);

//   if (!hourlyRate || !totalHours) {
//     return {
//       success: false,
//       statusCode: 400,
//       message: "Invalid driver rate or hours",
//     };
//   }

//   /**
//    * Weekly target = hourlyRate * totalHours
//    * Example: £25/hr * 7 hours = £175/week
//    */
//   const exactWeeklyRate = hourlyRate * totalHours;

//   /**
//    * Current jobs total = sum of all job.driver_total
//    */
//   const currentJobsTotal = invoice.jobs.reduce((sum, job) => {
//     return sum + Number(job.driver_total ?? 0);
//   }, 0);

//   /**
//    * Deductions = what gets subtracted to get net amount
//    */
//   const finalDeductionAmount = Number(total_deduction ?? 0);

//   /**
//    * Required docket total = exactWeeklyRate + deductions
//    * This is what the invoice SHOULD be worth (gross)
//    * Example: £175 + £25 = £200
//    */
//   const requiredDocketTotal = exactWeeklyRate + finalDeductionAmount;

//   /**
//    * Adjustment needed = how much to subtract from last job
//    * adjustment = currentJobsTotal - requiredDocketTotal
//    *
//    * Example:
//    *   - currentJobsTotal = £250 (from selection with buffer)
//    *   - requiredDocketTotal = £200 (target + deductions)
//    *   - adjustment = £50 (need to subtract £50 from last job)
//    */
//   const adjustmentNeeded = currentJobsTotal - requiredDocketTotal;

//   console.log(`[generateFinalInvoiceService] Invoice #${invoice_id}:`, {
//     exactWeeklyRate,
//     currentJobsTotal,
//     requiredDocketTotal,
//     finalDeductionAmount,
//     adjustmentNeeded,
//   });

//   // ──────────────────────────────────────────────────────────────────────
//   // Get the LAST job and calculate its new value
//   // ──────────────────────────────────────────────────────────────────────

//   const lastJob = invoice.jobs[invoice.jobs.length - 1];
//   const lastJobOldValue = Number(lastJob.driver_total ?? 0);

//   /**
//    * Calculate new value for last job
//    * newValue = oldValue - adjustmentNeeded
//    *
//    * Key: We SUBTRACT the adjustment (never add)
//    * This requires the last job to have enough buffer (from tolerance)
//    */
//   let lastJobNewValue = lastJobOldValue - adjustmentNeeded;

//   /**
//    * Safety: Don't let last job go below 0
//    */
//   if (lastJobNewValue < 0) {
//     console.warn(
//       `[generateFinalInvoiceService] WARNING: Last job would be negative (£${lastJobNewValue}). Setting to 0.`,
//     );
//     lastJobNewValue = 0;
//   }

//   /**
//    * Calculate final docket total
//    * Replace old last job value with new value
//    */
//   const finalDocketTotal = currentJobsTotal - lastJobOldValue + lastJobNewValue;

//   /**
//    * Net amount = what driver receives after deductions
//    */
//   const netAmount = finalDocketTotal - finalDeductionAmount;

//   console.log(`[generateFinalInvoiceService] Last job adjustment:`, {
//     lastJobId: lastJob.id,
//     oldValue: lastJobOldValue,
//     newValue: lastJobNewValue,
//     subtracted: lastJobOldValue - lastJobNewValue,
//     finalDocketTotal,
//     netAmount,
//   });

//   // ──────────────────────────────────────────────────────────────────────
//   // Update database: only touch the last job, finalize invoice
//   // ──────────────────────────────────────────────────────────────────────

//   const updatedInvoice = await prisma.$transaction(async (tx) => {
//     // ✓ ONLY update the last job
//     await tx.job.update({
//       where: { id: lastJob.id },
//       data: {
//         driver_total: lastJobNewValue,
//       },
//     });

//     // Record the change
//     await tx.jobChangeHistory.create({
//       data: {
//         job_id: lastJob.id,
//         field: "DRIVER_TOTAL",
//         old_value: lastJobOldValue,
//         new_value: lastJobNewValue,
//       },
//     });

//     console.log(
//       `[DB] Updated last job #${lastJob.id}: £${lastJobOldValue} → £${lastJobNewValue}`,
//     );

//     // ✓ Finalize invoice with correct totals
//     return tx.invoice.update({
//       where: { id: invoice_id },
//       data: {
//         admin_fee: Number(admin_fee),
//         vehicle_hire_charges: Number(vehicle_hire_charges),
//         insurance_charge: Number(insurance_charge),
//         fuel_charge: Number(fuel_charge),
//         additional_charges: Number(additional_charges),

//         // ✓ docket_total = sum of all jobs (last job now reduced)
//         docket_total: finalDocketTotal,

//         // ✓ net_amount = docket_total - deductions
//         net_amount: netAmount,

//         // total_deductions stays the same
//         total_deductions: finalDeductionAmount,

//         // final_total = the weekly rate target
//         final_total: exactWeeklyRate,

//         status: "FINAL",
//       },
//       include: {
//         jobs: true,
//         driver: true,
//       },
//     });
//   });

//   return {
//     success: true,
//     statusCode: 200,
//     message: "Invoice finalized successfully",
//     data: updatedInvoice,
//   };
// }

export async function generateFinalInvoiceService(payload) {
  const {
    invoice_id,
    admin_fee = 0,
    vehicle_hire_charges = 0,
    insurance_charge = 0,
    fuel_charge = 0,
    additional_charges = 0,
    vat = null,
    total_deduction = 0,
  } = payload;

  // ──────────────────────────────────────────────────────────────────────
  // Fetch invoice and validate
  // ──────────────────────────────────────────────────────────────────────

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoice_id },
    include: {
      jobs: {
        orderBy: { date_time: "asc" },
      },
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

  if (invoice.status === "FINAL") {
    return {
      success: false,
      statusCode: 400,
      message: "Invoice is already finalized",
    };
  }

  if (!invoice.jobs.length) {
    return {
      success: false,
      statusCode: 400,
      message: "Invoice has no jobs",
    };
  }

  // ──────────────────────────────────────────────────────────────────────
  // Calculate required amounts
  // ──────────────────────────────────────────────────────────────────────

  const hourlyRate = Number(invoice.driver.per_hour_rate ?? 0);
  const totalHours = Number(invoice.driver.total_hours ?? 0);

  if (!hourlyRate || !totalHours) {
    return {
      success: false,
      statusCode: 400,
      message: "Invalid driver rate or hours",
    };
  }

  /**
   * Weekly target = hourlyRate * totalHours
   * Example: £25/hr * 7 hours = £175/week
   */
  const exactWeeklyRate = hourlyRate * totalHours;

  /**
   * Current jobs total = sum of all job.driver_total
   */
  const currentJobsTotal = invoice.jobs.reduce((sum, job) => {
    return sum + Number(job.driver_total ?? 0);
  }, 0);

  /**
   * Deductions = what gets subtracted to get net amount
   */
  const finalDeductionAmount = Number(total_deduction ?? 0);

  /**
   * Required docket total = exactWeeklyRate + deductions
   * This is what the invoice SHOULD be worth (gross)
   * Example: £175 + £25 = £200
   */
  const requiredDocketTotal = exactWeeklyRate + finalDeductionAmount;

  /**
   * Adjustment needed = how much to subtract from jobs
   * adjustment = currentJobsTotal - requiredDocketTotal
   */
  let adjustmentNeeded = currentJobsTotal - requiredDocketTotal;

  // ──────────────────────────────────────────────────────────────────────
  // Cascade adjustment: Start from last job, skip jobs that would go to 0
  // ──────────────────────────────────────────────────────────────────────

  const MIN_JOB_VALUE = 0.01; // Minimum value to keep a job
  const jobUpdates = []; // Track job value updates
  const jobsToExclude = []; // Track jobs to remove from invoice

  // Start from the last job and work backwards
  for (let i = invoice.jobs.length - 1; i >= 0 && adjustmentNeeded > 0; i--) {
    const currentJob = invoice.jobs[i];
    const currentJobOldValue = Number(currentJob.driver_total ?? 0);

    /**
     * Calculate what the job value would be after reduction
     */
    const potentialNewValue = currentJobOldValue - adjustmentNeeded;

    /**
     * Decision logic:
     * IF potentialNewValue < MIN_JOB_VALUE:
     *   → This job would go to 0 or negative
     *   → EXCLUDE this job from invoice (remove it)
     *   → Reduce adjustment by this job's full amount
     * ELSE:
     *   → Reduce this job by the adjustment amount
     *   → Set adjustment to 0 (we're done)
     */

    if (potentialNewValue < MIN_JOB_VALUE) {
      // Job would go to 0 - EXCLUDE it completely

      jobsToExclude.push({
        jobId: currentJob.id,
        oldValue: currentJobOldValue,
        reason: "Excluded from finalization",
      });

      // Reduce the adjustment by this job's full value
      adjustmentNeeded -= currentJobOldValue;

      if (adjustmentNeeded < 0) {
        adjustmentNeeded = 0; // Don't over-subtract
      }
    } else {
      // Job has enough buffer - reduce it
      const amountToReduce = adjustmentNeeded;
      const currentJobNewValue = currentJobOldValue - amountToReduce;

      jobUpdates.push({
        jobId: currentJob.id,
        oldValue: currentJobOldValue,
        newValue: currentJobNewValue,
        amountReduced: amountToReduce,
        index: i,
      });

      console.log(
        `[generateFinalInvoiceService] Job #${i} (#${currentJob.id}): £${currentJobOldValue} → £${currentJobNewValue} (reduced by £${amountToReduce})`,
      );

      adjustmentNeeded = 0; // Adjustment complete
    }
  }

  // Check if we successfully applied the full adjustment
  if (adjustmentNeeded > 0.01) {
    console.error(
      `[generateFinalInvoiceService] ERROR: Could not apply full adjustment. Remaining: £${adjustmentNeeded.toFixed(2)}`,
    );
    return {
      success: false,
      statusCode: 400,
      message: `Insufficient buffer in jobs to apply adjustment. Remaining unapplied: £${adjustmentNeeded.toFixed(2)}`,
    };
  }

  /**
   * Calculate final docket total from UPDATED jobs ONLY
   * (excluded jobs are not counted)
   */
  let finalDocketTotal = 0;
  const jobValuesMap = new Map(); // Track final values
  const excludedJobIds = new Set(jobsToExclude.map((j) => j.jobId));

  // Populate map with original values (excluding excluded jobs)
  invoice.jobs.forEach((job) => {
    if (!excludedJobIds.has(job.id)) {
      jobValuesMap.set(job.id, Number(job.driver_total ?? 0));
    }
  });

  // Apply updates
  jobUpdates.forEach((update) => {
    jobValuesMap.set(update.jobId, update.newValue);
  });

  // Calculate final docket total
  finalDocketTotal = Array.from(jobValuesMap.values()).reduce(
    (sum, val) => sum + val,
    0,
  );

  /**
   * Net amount = what driver receives after deductions
   */
  const netAmount = finalDocketTotal - finalDeductionAmount;

  // ──────────────────────────────────────────────────────────────────────
  // Update database: apply updates, exclude jobs, and finalize invoice
  // ──────────────────────────────────────────────────────────────────────

  const updatedInvoice = await prisma.$transaction(async (tx) => {
    // ✓ Update job values (only for jobs that keep their value above minimum)
    for (const update of jobUpdates) {
      await tx.job.update({
        where: { id: update.jobId },
        data: {
          driver_total: update.newValue,
        },
      });

      // Record the change in history
      await tx.jobChangeHistory.create({
        data: {
          job_id: update.jobId,
          field: "DRIVER_TOTAL",
          old_value: update.oldValue,
          new_value: update.newValue,
        },
      });

      console.log(
        `[DB] Updated job #${update.jobId}: £${update.oldValue} → £${update.newValue}`,
      );
    }

    // ✓ EXCLUDE jobs from invoice (disconnect them)
    for (const excluded of jobsToExclude) {
      await tx.job.update({
        where: { id: excluded.jobId },
        data: {
          invoice_id: null, // Disconnect from invoice
        },
      });

      console.log(
        `[DB] Excluded job #${excluded.jobId} from invoice (value was £${excluded.oldValue})`,
      );
    }

    // ✓ Finalize invoice with correct totals
    return tx.invoice.update({
      where: { id: invoice_id },
      data: {
        admin_fee: Number(admin_fee),
        vehicle_hire_charges: Number(vehicle_hire_charges),
        insurance_charge: Number(insurance_charge),
        fuel_charge: Number(fuel_charge),
        additional_charges: Number(additional_charges),

        // ✓ docket_total = sum of remaining jobs only (excluded jobs not counted)
        docket_total: finalDocketTotal,

        // ✓ net_amount = docket_total - deductions
        net_amount: netAmount,

        // total_deductions stays the same
        total_deductions: finalDeductionAmount,

        // final_total = the weekly rate target
        final_total: exactWeeklyRate,

        status: "FINAL",
      },
      include: {
        jobs: true,
        driver: true,
      },
    });
  });

  return {
    success: true,
    statusCode: 200,
    message: "Invoice finalized successfully",
    data: updatedInvoice,
    appliedAdjustments: {
      updatedJobs: jobUpdates,
      excludedJobs: jobsToExclude,
      totalExcluded: jobsToExclude.length,
    },
  };
}

export async function updateInvoiceService(invoiceId, payload) {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      return {
        success: false,
        statusCode: 404,
        message: "Invoice not found",
      };
    }

    const updatedInvoice = await prisma.invoice.update({
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

  const invoices = await prisma.invoice.findMany({
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

  await prisma.invoice.updateMany({
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
      invoiceNumber: invoice.generated_id || "",
      jobs: invoice.total_number_of_dockets || 0,
      debtAmount: invoice.net_amount || 0,
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
  console.log("year", year, "******************************");
  const week = getISOWeekNumber(fromDate);

  const existing = await prisma.invoiceBatch.findFirst({
    where: { year, week },
  });

  if (existing) {
    return existing;
  }

  const lastBatch = await prisma.invoiceBatch.findFirst({
    where: { year },
    orderBy: { batch_number: "desc" },
  });

  const nextBatchNumber = lastBatch ? lastBatch.batch_number + 1 : 1001;
  const batchCode = String(nextBatchNumber).padStart(4, "0");

  console.log(
    fromDate,
    "fromDate",
    toDate,
    "toDate",
    year,
    "year",
    week,
    "week",
  );
  return prisma.invoiceBatch.create({
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

  const invoices = await prisma.invoice.findMany({
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
    console.log(start_date, "start date", end_date, "endate");

    const { start, end } = buildUkRange(start_date, end_date);

    console.log(start, "start", end, "end");

    if (start > end) {
      throw { statusCode: 400, message: "Start date cannot be after end date" };
    }

    const invoiceBatch = await getOrCreateInvoiceBatch(prisma, start, end);

    const invoices = await prisma.invoice.findMany({
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
      throw {
        statusCode: 400,
        message: "No Invoices found for the date range",
      };
    }

    await prisma.invoice.updateMany({
      where: {
        id: { in: invoices.map((i) => i.id) },
      },
      data: {
        batch_id: invoiceBatch.id,
      },
    });

    const batch = await prisma.InvoiceBatch.findUnique({
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

export async function redraftInvoiceService(invoiceId) {
  console.log(`[REDRAFT] Starting redraft for invoice ${invoiceId}`);

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        // 1. Fetch invoice with driver
        const invoice = await tx.invoice.findUnique({
          where: { id: invoiceId },
          include: {
            driver: {
              include: {
                driver_position: {
                  select: {
                    id: true,
                    label: true,
                    max_weight: true,
                  },
                },
              },
            },
          },
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

        const maxWeight = driver.driver_position?.max_weight;

        const hasHourlyConfig = driver.per_hour_rate && driver.total_hours;
        const hasFixedConfig = driver.weekly_fixed_rate && driver.total_days;

        if (!hasHourlyConfig && !hasFixedConfig) {
          return {
            success: false,
            statusCode: 400,
            message: `Driver ${driver.name} is missing required rate configuration`,
            data: {
              driverId: driver.id,
              driverName: driver.name,
              hasHourlyRate: !!driver.per_hour_rate,
              hasTotalHours: !!driver.total_hours,
              hasWeeklyFixedRate: !!driver.weekly_fixed_rate,
              hasTotalDays: !!driver.total_days,
            },
          };
        }

        // 2. Count jobs to detach (for return data)
        const detachedJobCount = await tx.job.count({
          where: {
            invoice_id: invoiceId,
            is_invoiced: true,
          },
        });

        // 3. BATCH UPDATE - Detach all jobs at once (instead of loop)
        if (detachedJobCount > 0) {
          await tx.job.updateMany({
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

        // 4. Calculate weekly target
        const weeklyTarget = calculateWeeklyTarget(driver);

        if (weeklyTarget <= 0) {
          return {
            success: false,
            statusCode: 400,
            message: `Invalid weekly target calculated: ${weeklyTarget}`,
            data: {
              weeklyTarget,
              driverConfig: {
                per_hour_rate: driver.per_hour_rate,
                total_hours: driver.total_hours,
                weekly_fixed_rate: driver.weekly_fixed_rate,
                total_days: driver.total_days,
              },
            },
          };
        }

        // 5. Find available jobs
        const availableJobs = await tx.job.findMany({
          where: {
            driver_id: driver.id,
            is_invoiced: false,
            date_time: {
              gte: invoice.start_date,
              lte: invoice.end_date,
            },
            weight: { gte: 0, lte: maxWeight },
          },
          orderBy: {
            date_time: "asc",
          },
        });

        // 6. Select jobs (this is synchronous, no DB call)
        const { selectedJobs, total } = selectJobsWithinTolerance(
          availableJobs,
          weeklyTarget,
          1000,
        );

        // Availbale and selected jobs weights
        availableJobs.forEach((job) => {
          console.log(
            `Available job: ${job.id} - ${job.weight} - ${job.date_time}`,
          );
        });

        selectedJobs.forEach((job) => {
          console.log(
            `Selected job: ${job.id} - ${job.weight} - ${job.date_time}`,
          );
        });

        // 7. Calculate amounts
        const financials = calculateInvoiceFinancials(driver, total);

        // 8. Handle no jobs case
        if (!selectedJobs.length) {
          const resetInvoice = await tx.invoice.update({
            where: { id: invoiceId },
            data: {
              docket_total: 0,
              net_amount: 0,
              final_total: 0,
              total_number_of_dockets: 0,
              admin_fee: 0,
              vehicle_hire_charges: 0,
              insurance_charge: 0,
              fuel_charge: 0,
              additional_charges: 0,
              vat: 0,
              carried_forward_total: 0,
              current_week_deductions: 0,
              total_deductions: 0,
              old_per_hour_rate: driver.per_hour_rate,
              old_total_hours: driver.total_hours,
              old_weekly_fixed_rate: driver.weekly_fixed_rate,
              old_total_days: driver.total_days,
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
              total: 0,
              weeklyTarget,
              remaining: weeklyTarget,
              period: {
                start: invoice.start_date,
                end: invoice.end_date,
              },
            },
          };
        }

        // 9. BATCH UPDATE - Attach jobs using updateMany with IDs
        const selectedJobIds = selectedJobs.map((job) => job.id);

        await tx.job.updateMany({
          where: {
            id: { in: selectedJobIds },
          },
          data: {
            is_invoiced: true,
            invoice_id: invoiceId,
            call_sign: driver.call_sign,
          },
        });

        // 10. Prepare history records (filter jobs that actually changed)
        const attachmentHistory = selectedJobs.flatMap((job) => {
          const changes = [];
          if (job.driver_id !== driver.id) {
            changes.push({
              job_id: job.id,
              field: "DRIVER_ID",
              old_value: job.driver_id,
              new_value: driver.id,
            });
          }
          if (job.call_sign !== driver.call_sign) {
            changes.push({
              job_id: job.id,
              field: "CALL_SIGN",
              old_value: job.call_sign,
              new_value: driver.call_sign,
            });
          }
          return changes;
        });

        // 11. Batch create history if needed
        if (attachmentHistory.length > 0) {
          await tx.jobChangeHistory.createMany({
            data: attachmentHistory,
          });
        }

        // 12. Update invoice
        const updatedInvoice = await tx.invoice.update({
          where: { id: invoiceId },
          data: {
            docket_total: total,
            net_amount: total,
            final_total: financials.final_total,
            total_number_of_dockets: selectedJobs.length,
            admin_fee: financials.admin_fee,
            vehicle_hire_charges: financials.vehicle_hire_charges,
            insurance_charge: financials.insurance_charge,
            fuel_charge: financials.fuel_charge,
            additional_charges: 0,
            vat: financials.vat,
            carried_forward_total: financials.carried_forward_total,
            current_week_deductions: financials.current_week_deductions,
            status: "DRAFT",
            total_deductions: financials.total_deductions,
            old_per_hour_rate: driver.per_hour_rate,
            old_total_hours: driver.total_hours,
            old_weekly_fixed_rate: driver.weekly_fixed_rate,
            old_total_days: driver.total_days,
          },
        });

        return {
          success: true,
          statusCode: 200,
          message: `Invoice ${invoiceId} has been successfully redrafted`,
          data: {
            invoice: updatedInvoice,
            jobsDetached: detachedJobCount,
            jobsAttached: selectedJobs.length,
            calculation: {
              docketTotal: total,
              deductions: {
                adminFee: financials.admin_fee,
                vehicleHireCharge: financials.vehicle_hire_charges,
                insuranceCharge: financials.insurance_charge,
                fuelCharge: financials.fuel_charge,
                total: financials.total_deductions,
              },
              // netAmount : financials.net_amount,
              vat: financials.total_vat_percent,
              // finalTotal,
            },
            target: {
              weeklyTarget,
              achieved: total,
              remaining: weeklyTarget - total,
              percentageAchieved:
                weeklyTarget > 0
                  ? ((total / weeklyTarget) * 100).toFixed(2)
                  : "0.00",
            },
            period: {
              start: invoice.start_date,
              end: invoice.end_date,
            },
          },
        };
      },
      {
        maxWait: 10000, // Max time to wait for transaction to start
        timeout: 30000, // Max time for transaction to complete
      },
    );

    // Move logging OUTSIDE the transaction
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
    const updatedInvoices = await prisma.invoice.updateMany({
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

async function fetchRegularInvoices(start, end) {
  return prisma.invoice.findMany({
    where: {
      status: "FINAL",
      AND: [{ start_date: { lte: end } }, { end_date: { gte: start } }],
    },
    include: { driver: true },
    orderBy: { start_date: "asc" },
  });
}

/**
 * Fetches FINAL self-invoices in the given date range.
 * Includes selfDriver so the PDF/CSV generators receive the same
 * { ...invoice, driver: selfDriver } shape they already expect.
 */
async function fetchSelfInvoices(start, end) {
  return prisma.selfInvoice.findMany({
    where: {
      status: "FINAL",
      AND: [
        { start_date: { lte: end } },
        { end_date: { gte: start } },
        { final_total: { gt: 0 } },
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
}
export async function generateCollectiveBankRemittanceService({
  start_date,
  end_date,
  format = "csv",
}) {
  if (!start_date || !end_date) {
    throw { statusCode: 400, message: "start_date and end_date are required" };
  }

  const { start, end } = buildUkRange(start_date, end_date);

  if (start > end) {
    throw { statusCode: 400, message: "Start date cannot be after end date" };
  }

  // ── Fetch both sets in parallel ───────────────────────────────────────
  const [regularInvoices, selfInvoices] = await Promise.all([
    fetchRegularInvoices(start, end),
    fetchSelfInvoices(start, end),
  ]);

  if (regularInvoices.length === 0 && selfInvoices.length === 0) {
    throw {
      statusCode: 404,
      message: "No FINAL invoices found for the given date range",
    };
  }

  // ── Merge and sort chronologically ───────────────────────────────────
  const mergedInvoices = [...regularInvoices, ...selfInvoices].sort(
    (a, b) => new Date(a.start_date) - new Date(b.start_date),
  );

  // ── Call the generator once with the merged set ───────────────────────
  if (format === "pdf") {
    const result = await generateBankRemittancePdf({
      invoices: mergedInvoices,
      start_date: start,
      end_date: end,
      filePrefix: "bank-remittance-collective",
    });
    return { pdf_url: result.pdf_url };
  }

  // CSV (default)
  const result = await createBankRemittanceCsv({
    invoices: mergedInvoices,
    start_date: start,
    end_date: end,
    filePrefix: "bank-remittance-collective",
  });
  return { csv_url: result.csv_url };
}

export const getOrCreateCombinedInvoiceBatch = async (
  prisma,
  fromDate,
  toDate,
) => {
  console.log(fromDate, "fromDate", toDate, "toDate");

  const existingBatch = await prisma.combinedInvoiceBatch.findFirst({
    where: {
      from_date: {
        gte: new Date(new Date(fromDate).setHours(0, 0, 0, 0)),
        lte: new Date(new Date(fromDate).setHours(23, 59, 59, 999)),
      },
      to_date: {
        gte: new Date(new Date(toDate).setHours(0, 0, 0, 0)),
        lte: new Date(new Date(toDate).setHours(23, 59, 59, 999)),
      },
    },
  });

  if (existingBatch) {
    return existingBatch;
  }

  const lastBatch = await prisma.combinedInvoiceBatch.findFirst({
    orderBy: {
      batch_number: "desc",
    },
  });

  const nextNumber = lastBatch ? lastBatch.batch_number + 1 : 1001;

  const batchCode = String(nextNumber).padStart(4, "0");

  return prisma.combinedInvoiceBatch.create({
    data: {
      batch_number: nextNumber,
      batch_code: batchCode,
      from_date: fromDate,
      to_date: toDate,
    },
  });
};

export const generateCollectiveInvoiceSummaryService = async ({
  start_date,
  end_date,
  format,
}) => {
  if (!start_date || !end_date) {
    throw {
      statusCode: 400,
      message: "Start date and end date are required",
    };
  }

  const { start, end } = buildUkRange(start_date, end_date);

  if (start > end) {
    throw {
      statusCode: 400,
      message: "Start date cannot be after end date",
    };
  }

  // Create/Get Collective Batch
  const batch = await getOrCreateCombinedInvoiceBatch(prisma, start, end);

  // ==========================
  // Driver Invoices
  // ==========================
  const invoices = await prisma.invoice.findMany({
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
      jobs: true,
    },
  });

  // ==========================
  // Self Driver Invoices
  // ==========================
  const selfInvoices = await prisma.selfInvoice.findMany({
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
        {
          final_total: {
            gte: 0,
          },
        },
      ],
    },
    include: {
      driver: true,
      jobs: true,
    },
  });

  if (!invoices.length && !selfInvoices.length) {
    throw {
      statusCode: 400,
      message: "No invoices found for the selected date range",
    };
  }

  // ==========================
  // Normalize Driver Invoices
  // ==========================
  const invoiceRows = invoices.map((invoice) => ({
    invoiceType: "Driver",

    callsign: invoice.driver?.call_sign || "",

    driverName: invoice.driver?.name || "",

    invoiceNumber: invoice.generated_id || "",

    jobs: invoice.total_number_of_dockets || 0,

    debtAmount: Number(invoice.net_amount || 0),

    taxAmount: Number(invoice.total_deductions || 0),

    total: Number(invoice.final_total || 0),
  }));

  // ==========================
  // Normalize Self Driver Invoices
  // ==========================
  const selfInvoiceRows = selfInvoices.map((invoice) => ({
    invoiceType: "Self Driver",

    callsign: invoice.driver?.call_sign || "",

    driverName: invoice.driver?.name || "",

    invoiceNumber: invoice.generated_id || "",

    jobs: invoice.total_number_of_dockets || 0,

    debtAmount: Number(invoice.net_amount || 0),

    taxAmount: Number(
      invoice.final_tax_deduction ?? invoice.total_deductions ?? 0,
    ),

    total: Number(invoice.final_total || 0),
  }));

  // ==========================
  // Merge Both
  // ==========================
  const rows = [...invoiceRows, ...selfInvoiceRows];

  // ==========================
  // Grand Totals
  // ==========================
  const summary = rows.reduce(
    (acc, row) => {
      acc.jobs += Number(row.jobs || 0);
      acc.debt += Number(row.debtAmount || 0);
      acc.tax += Number(row.taxAmount || 0);
      acc.total += Number(row.total || 0);

      return acc;
    },
    {
      jobs: 0,
      debt: 0,
      tax: 0,
      total: 0,
    },
  );

  // ==========================
  // Generate Output
  // ==========================
  if (format === "csv") {
    return generateInvoiceSummaryCSVFile({
      rows,
      summary,
      start_date,
      end_date,
      batch,
    });
  }

  return generateInvoiceSummaryPdfFile({
    rows,
    summary,
    start_date,
    end_date,
    batch,
  });
};

export const generateCollectiveDetailedInvoiceSummaryService = async (
  start_date,
  end_date,
  format = "pdf",
) => {
  console.log(start_date, end_date, format, "djasdhkashdkhasd");

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

  // ── Use combinedInvoiceBatch (same as collective invoice summary) ──────
  const batch = await getOrCreateCombinedInvoiceBatch(prisma, start, end);

  // ── Driver invoices ───────────────────────────────────────────────────
  const invoices = await prisma.invoice.findMany({
    where: {
      status: "FINAL",
      AND: [{ start_date: { lte: end } }, { end_date: { gte: start } }],
    },
    include: { driver: true, jobs: true },
    orderBy: { start_date: "asc" },
  });

  // ── Self-driver invoices ──────────────────────────────────────────────
  const selfInvoices = await prisma.selfInvoice.findMany({
    where: {
      status: "FINAL",
      AND: [
        { start_date: { lte: end } },
        { end_date: { gte: start } },
        { final_total: { gte: 0 } },
      ],
    },
    include: { driver: true, jobs: true },
    orderBy: { start_date: "asc" },
  });

  if (!invoices.length && !selfInvoices.length) {
    throw {
      statusCode: 400,
      message: "No invoices found for the selected date range",
    };
  }

  // ── Attach batch_id to driver invoices ────────────────────────────────
  if (invoices.length) {
    await prisma.invoice.updateMany({
      where: { id: { in: invoices.map((i) => i.id) } },
      data: { batch_id: batch.id },
    });
  }

  const combinedBatch = {
    ...batch,
    invoices: [
      ...invoices.map((inv) => ({ ...inv, invoiceType: "Driver" })),
      ...selfInvoices.map((inv) => ({ ...inv, invoiceType: "Self Driver" })),
    ],
  };

  const payload = { invoiceBatch: combinedBatch };

  if (format === "csv") {
    const result = await generateDetailedInvoiceSummaryCSVFile(payload);
    return { success: true, statusCode: 200, data: result };
  }

  const result = await generateDetailedInvoiceSummaryPdfFile(payload);
  return { success: true, statusCode: 200, data: result };
};
