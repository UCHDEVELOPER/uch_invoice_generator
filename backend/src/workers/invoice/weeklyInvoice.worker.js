// weeklyInvoice.worker.old.js
import { prisma } from "../../config/prismaClient.js";
import { selectJobsWithinTolerance } from "./weeklyInvoice.selector.js";
import { selectJobsForRemainingAmount } from "./remainingJob.selector.js";
import { findPendingWeeks } from "./findPendingWeeks.js";
import dotenv from "dotenv";

dotenv.config();

const HOURS_MS = 1000 * 60 * 60;

function hoursBetween(a, b) {
  return Math.abs(a.getTime() - b.getTime()) / HOURS_MS;
}

async function importsHaveSettled() {
  const waitHours = Number(process.env.INVOICE_WAIT_HOURS_AFTER_IMPORT ?? 12);

  const state = await prisma.systemState.findUnique({
    where: { key: "LAST_JOB_IMPORT_AT" },
  });

  // FIX: If no import record exists yet (fresh system), treat as settled so
  // invoices aren't permanently blocked. Adjust this policy to suit your setup.
  if (!state) {
    console.log("[INVOICE] No LAST_JOB_IMPORT_AT found — treating as settled.");
    return true;
  }

  // FIX: Guard against invalid date values in state.value.
  const importDate = new Date(state.value);
  if (isNaN(importDate.getTime())) {
    console.warn(
      `[INVOICE] LAST_JOB_IMPORT_AT value "${state.value}" is not a valid date. Treating as settled.`
    );
    return true;
  }

  return hoursBetween(new Date(), importDate) >= waitHours;
}

async function fetchActiveDrivers() {
  return prisma.driver.findMany({
    where: {
      status: "active",
      per_hour_rate: { not: null },
      total_hours: { not: null, gt: 0 },
      driver_position_id: { not: null },
    },
    include: {
      driver_position: {
        select: { id: true, label: true, max_weight: true },
      },
    },
  });
}

export async function runWeeklyInvoiceBatch() {
  if (!(await importsHaveSettled())) {
    console.log("[INVOICE] Imports not settled. Skipping.");
    return;
  }

  const pendingWeeks = await findPendingWeeks();
  if (!pendingWeeks.length) {
    console.log("[INVOICE] No pending weeks found.");
    return;
  }

  for (const { start, end } of pendingWeeks) {
    console.log(
      `[INVOICE] Processing week ${start.toISOString()} → ${end.toISOString()}`
    );

    const drivers = await fetchActiveDrivers();
    const invoicedDriverIds = new Set();

    // ── PASS 1: Drivers who have their own valid jobs this week ───────────
    for (const driver of drivers) {
      const hourlyRate = Number(driver.per_hour_rate);
      const totalHours = Number(driver.total_hours);

      if (!hourlyRate || !totalHours || hourlyRate <= 0 || totalHours <= 0)
        continue;

      const weeklyTarget = hourlyRate * totalHours;
      if (weeklyTarget <= 0) continue;

      const maxWeight = driver.driver_position?.max_weight;
      if (maxWeight === null || maxWeight === undefined) {
        console.log(
          `[INVOICE] Skipping driver ${driver.call_sign} — position "${driver.driver_position?.label}" has no max_weight set`
        );
        continue;
      }

      // Check for existing invoice BEFORE touching any jobs.
      const invoiceExists = await prisma.invoice.findFirst({
        where: { driver_id: driver.id, start_date: start, end_date: end },
      });
      if (invoiceExists) {
        invoicedDriverIds.add(driver.id);
        continue;
      }

      // FIX: Move over-weight job release INSIDE the transaction so it is
      // atomic with invoice creation. Previously this ran outside, meaning a
      // transaction failure left jobs unassigned with no invoice created.
      // We collect the over-weight job ids first (read-only, safe outside tx).
      const overWeightJobs = await prisma.job.findMany({
        where: {
          driver_id: driver.id,
          is_invoiced: false,
          date_time: { gte: start, lte: end },
          weight: { gt: maxWeight },
        },
        select: { id: true, call_sign: true, driver_id: true },
      });

      const jobs = await prisma.job.findMany({
        where: {
          driver_id: driver.id,
          is_invoiced: false,
          date_time: { gte: start, lte: end },
          weight: { gte: 0, lte: maxWeight },
        },
        orderBy: { date_time: "asc" },
      });

      const validJobs = jobs.filter((j) => Number(j.driver_total ?? 0) > 0);
      const zeroValueJobs = jobs.filter((j) => Number(j.driver_total ?? 0) <= 0);

      console.log(
        `[INVOICE] Driver ${driver.call_sign} has ${jobs.length} jobs this week (${validJobs.length} with valid driver_total)`
      );

      // FIX: Zero-value and over-weight job releases are now INSIDE the
      // transaction so they are atomic. Change history is recorded for both.
      // No valid own jobs → defer entirely to Pass 2.
      if (!validJobs.length) {
        // Still release zero-value and over-weight jobs to pool atomically.
        if (zeroValueJobs.length || overWeightJobs.length) {
          const releaseIds = [
            ...zeroValueJobs.map((j) => j.id),
            ...overWeightJobs.map((j) => j.id),
          ];
          const allReleased = [...zeroValueJobs, ...overWeightJobs];
          await prisma.$transaction(async (tx) => {
            await tx.job.updateMany({
              where: { id: { in: releaseIds } },
              data: { call_sign: null, driver_id: null },
            });
            // FIX: Record change history for zero-value/over-weight releases.
            await tx.jobChangeHistory.createMany({
              data: allReleased.flatMap((job) => [
                {
                  job_id: job.id,
                  field: "CALL_SIGN",
                  old_value: job.call_sign,
                  new_value: null,
                },
                {
                  job_id: job.id,
                  field: "DRIVER_ID",
                  old_value: job.driver_id,
                  new_value: null,
                },
              ]),
            });
          });
          console.log(
            `[INVOICE] Released ${releaseIds.length} zero/over-weight jobs to pool for driver ${driver.call_sign}`
          );
        }
        continue;
      }

      const { selectedJobs, total } = selectJobsWithinTolerance(
        validJobs,
        weeklyTarget,
        1000
      );

      if (!selectedJobs.length) continue;

      const selectedJobIds = new Set(selectedJobs.map((j) => j.id));

      // FIX: Unselected jobs = only the valid jobs NOT chosen by the selector,
      // plus zero-value jobs, plus over-weight jobs.
      // Previously used driver_id filter which would wipe jobs for OTHER weeks
      // or jobs that were already handled. Now we unassign only the exact set
      // we fetched and didn't select.
      const unselectedJobs = [
        ...validJobs.filter((j) => !selectedJobIds.has(j.id)),
        ...zeroValueJobs,
        ...overWeightJobs,
      ];
      const unselectedJobIds = unselectedJobs.map((j) => j.id);

      await prisma.$transaction(async (tx) => {
        // Release over-weight and unselected jobs to pool atomically.
        if (unselectedJobIds.length) {
          await tx.job.updateMany({
            where: { id: { in: unselectedJobIds } },
            data: { call_sign: null, driver_id: null },
          });
          // FIX: Record history for ALL released jobs, not just selected ones.
          await tx.jobChangeHistory.createMany({
            data: unselectedJobs.flatMap((job) => [
              {
                job_id: job.id,
                field: "CALL_SIGN",
                old_value: job.call_sign,
                new_value: null,
              },
              {
                job_id: job.id,
                field: "DRIVER_ID",
                old_value: job.driver_id,
                new_value: null,
              },
            ]),
          });
        }

        const invoice = await tx.invoice.create({
          data: {
            driver_id: driver.id,
            start_date: start,
            end_date: end,
            docket_total: total,
            net_amount: total,
            total_number_of_dockets: selectedJobs.length,
            total_deductions: 0,
            final_total: total,
            status: "DRAFT",
            old_per_hour_rate: driver.per_hour_rate,
            old_total_hours: driver.total_hours,
          },
        });

        await tx.job.updateMany({
          where: { id: { in: [...selectedJobIds] } },
          data: { is_invoiced: true, invoice_id: invoice.id },
        });

        // Only CALL_SIGN, DRIVER_ID, DRIVER_TOTAL are valid JobChangeField
        // enum values. Selected jobs keep their driver assignment, so we
        // record DRIVER_TOTAL change (null → actual value) as the meaningful
        // audit entry for these jobs being locked into an invoice.
        await tx.jobChangeHistory.createMany({
          data: selectedJobs.flatMap((job) => [
            {
              job_id: job.id,
              field: "DRIVER_TOTAL",
              old_value: job.driver_total,
              new_value: job.driver_total,
            },
          ]),
        });
      });

      invoicedDriverIds.add(driver.id);

      console.log(
        `[INVOICE] Draft invoice created | Driver: ${driver.call_sign} | Jobs: ${selectedJobs.length} | Total: ${total} | Max Weight: ${maxWeight}kg | Week: ${start.toISOString()}`
      );
    }

    // ── PASS 2: Drivers who had no valid own jobs this week ───────────────
    console.log("[INVOICE] Checking for drivers with no jobs this week...");

    for (const driver of drivers) {
      const hourlyRate = Number(driver.per_hour_rate);
      const totalHours = Number(driver.total_hours);

      if (!hourlyRate || !totalHours || hourlyRate <= 0 || totalHours <= 0)
        continue;

      const weeklyTarget = hourlyRate * totalHours;
      if (weeklyTarget <= 0) continue;

      const maxWeight = driver.driver_position?.max_weight;
      if (maxWeight === null || maxWeight === undefined) continue;

      if (invoicedDriverIds.has(driver.id)) continue;

      const invoiceExists = await prisma.invoice.findFirst({
        where: { driver_id: driver.id, start_date: start, end_date: end },
      });
      if (invoiceExists) continue;

      // Zero-value jobs were already released to pool in Pass 1 so this
      // correctly returns null for drivers who only had zero-value jobs.
      const hasInvoiceableJobs = await prisma.job.findFirst({
        where: {
          driver_id: driver.id,
          is_invoiced: false,
          date_time: { gte: start, lte: end },
          weight: { gte: 0, lte: maxWeight },
          driver_total: { gt: 0 },
        },
      });
      if (hasInvoiceableJobs) continue;

      const availableJobs = await prisma.job.findMany({
        where: {
          driver_id: null,
          call_sign: null,
          is_invoiced: false,
          date_time: { gte: start, lte: end },
          weight: { gte: 0, lte: maxWeight },
          driver_total: { gt: 0 },
        },
        orderBy: { date_time: "asc" },
      });

      if (!availableJobs.length) {
        console.log(
          `[INVOICE] No unassigned jobs available for driver ${driver.call_sign} | Week: ${start.toISOString()}`
        );
        continue;
      }

      const { selectedJobs, total } = selectJobsForRemainingAmount(
        availableJobs,
        weeklyTarget,
        5
      );

      if (!selectedJobs.length) continue;

      const selectedJobIds = selectedJobs.map((j) => j.id);

      await prisma.$transaction(async (tx) => {
        const invoice = await tx.invoice.create({
          data: {
            driver_id: driver.id,
            start_date: start,
            end_date: end,
            docket_total: total,
            net_amount: total,
            total_number_of_dockets: selectedJobs.length,
            total_deductions: 0,
            final_total: total,
            status: "DRAFT",
            old_per_hour_rate: driver.per_hour_rate,
            old_total_hours: driver.total_hours,
          },
        });

        await tx.job.updateMany({
          where: { id: { in: selectedJobIds } },
          data: {
            driver_id: driver.id,
            call_sign: driver.call_sign,
            is_invoiced: true,
            invoice_id: invoice.id,
          },
        });

        await tx.jobChangeHistory.createMany({
          data: selectedJobs.flatMap((job) => [
            {
              job_id: job.id,
              field: "CALL_SIGN",
              old_value: null,
              new_value: driver.call_sign,
            },
            {
              job_id: job.id,
              field: "DRIVER_ID",
              old_value: null,
              new_value: driver.id,
            },
          ]),
        });
      });

      console.log(
        `[INVOICE] Draft invoice created (no-job driver) | Driver: ${driver.call_sign} | Jobs: ${selectedJobs.length} | Total: ${total} | Max Weight: ${maxWeight}kg | Week: ${start.toISOString()}`
      );
    }
  }

  console.log("[INVOICE] Weekly invoice batch completed");
}