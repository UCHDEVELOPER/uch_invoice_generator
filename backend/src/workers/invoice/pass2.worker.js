// pass2.worker.js
// Cron Job 2 — Drivers with INSUFFICIENT own jobs.
//
// For each active driver NOT already handled by Pass 1 (one by one):
//   1. Start with their own valid uninvoiced jobs for the week
//   2. Calculate how much more is needed to reach weeklyTarget
//   3. Fetch unassigned pool jobs (driver_id: null, call_sign: null) and
//      combine with own jobs to build the best selection
//   4. Create a DRAFT invoice with the combined job set
//
// "Insufficient" means their own jobs total is below (weeklyTarget - tolerance).

import { prisma } from "../../config/prismaClient.js";
import { selectJobsWithinTolerance } from "./weeklyInvoice.selector.js";
import { selectJobsForRemainingAmount } from "./remainingJob.selector.js";
import { calculateWeeklyTarget } from "./invoiceTargetCalculator.js";
import { calculateInvoiceFinancials } from "./invoiceFinancialCalculator.js";

async function fetchPass2Drivers() {
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

export async function runPass2({ start, end }, handledDriverIds = new Set()) {
  console.log(
    `[PASS2] Starting for week ${start.toISOString()} → ${end.toISOString()}`,
  );

  const drivers = await fetchPass2Drivers();
  const handledThisPass = new Set();

  for (const driver of drivers) {
    // Skip drivers already invoiced in Pass 1
    if (handledDriverIds.has(driver.id)) continue;

    const weeklyTarget = calculateWeeklyTarget(driver);

    if (weeklyTarget <= 0) continue;

    const maxWeight = driver.driver_position?.max_weight;
    if (maxWeight === null || maxWeight === undefined) {
      console.log(
        `[PASS2] Skipping driver ${driver.call_sign} — no max_weight on position`,
      );
      continue;
    }

    // ── Guard: invoice already exists ────────────────────────────────────
    const invoiceExists = await prisma.invoice.findFirst({
      where: { driver_id: driver.id, start_date: start, end_date: end },
    });
    if (invoiceExists) {
      console.log(
        `[PASS2] Driver ${driver.call_sign} — invoice already exists, skipping`,
      );
      handledThisPass.add(driver.id);
      continue;
    }

    // ── Fetch own valid jobs (weight-filtered, non-zero) ─────────────────
    const ownJobs = await prisma.job.findMany({
      where: {
        driver_id: driver.id,
        is_invoiced: false,
        date_time: { gte: start, lte: end },
        weight: { gte: 0, lte: maxWeight },
        driver_total: { gt: 0 },
      },
      orderBy: { date_time: "asc" },
    });

    const ownTotal = ownJobs.reduce(
      (sum, j) => sum + Number(j.driver_total ?? 0),
      0,
    );
    const remaining = weeklyTarget - ownTotal;

    console.log(
      `[PASS2] Driver ${driver.call_sign} — own jobs: ${ownJobs.length} total: £${ownTotal} | target: £${weeklyTarget} | remaining: £${remaining}`,
    );

    // ── Fetch pool jobs to cover the remaining amount ─────────────────────
    const poolJobs = await prisma.job.findMany({
      where: {
        is_invoiced: false,
        date_time: { gte: start, lte: end },
        weight: { gte: 0, lte: maxWeight },
        driver_total: { gt: 0 },
      },
      orderBy: { date_time: "asc" },
    });

    if (driver.call_sign === "Scutaru") {
      console.log(
        "[Scutaru debug] maxWeight:",
        maxWeight,
        "start:",
        start,
        "end:",
        end,
      );

      const baseWhere = {
        driver_id: null,
        call_sign: null,
        is_invoiced: false,
        date_time: { gte: start, lte: end },
      };

      const noWeightFilter = await prisma.job.count({ where: baseWhere });
      const withWeightUpper = await prisma.job.count({
        where: { ...baseWhere, weight: { gte: 0, lte: maxWeight } },
      });
      const withDriverTotal = await prisma.job.count({
        where: { ...baseWhere, driver_total: { gt: 0 } },
      });
      const fullFilter = await prisma.job.count({
        where: {
          ...baseWhere,
          weight: { gte: 0, lte: maxWeight },
          driver_total: { gt: 0 },
        },
      });

      console.log("[Scutaru debug] no weight/total filter:", noWeightFilter);
      console.log("[Scutaru debug] + weight<=maxWeight:", withWeightUpper);
      console.log("[Scutaru debug] + driver_total>0 only:", withDriverTotal);
      console.log(
        "[Scutaru debug] full filter (should match poolJobs.length):",
        fullFilter,
      );

      // Peek at jobs that pass the base filter but fail on weight/driver_total,
      // to see what's actually disqualifying them
      const candidates = await prisma.job.findMany({
        where: baseWhere,
        select: {
          id: true,
          weight: true,
          driver_total: true,
          date_time: true,
          call_sign: true,
        },
        take: 20,
      });
      console.log("[Scutaru debug] sample candidates:", candidates);
    }
    console.log(
      `[PASS2] Driver ${driver.call_sign} — pool jobs available: ${poolJobs.length}`,
    );

    // Select the best pool jobs to cover the remaining gap
    const { selectedJobs: selectedPoolJobs, total: poolTotal } =
      selectJobsForRemainingAmount(poolJobs, remaining, 5);

    // Combine: own jobs + selected pool jobs
    const allSelectedJobs = [...ownJobs, ...selectedPoolJobs];
    const combinedTotal = ownTotal + poolTotal;

    if (!allSelectedJobs.length) {
      console.log(
        `[PASS2] Driver ${driver.call_sign} — no jobs available at all, skipping`,
      );
      continue;
    }

    // Final check: re-run selector on combined set to ensure best fit
    const { selectedJobs: finalJobs, total: finalTotal } =
      selectJobsWithinTolerance(allSelectedJobs, weeklyTarget, 2000);

    if (!finalJobs.length) {
      console.log(
        `[PASS2] Driver ${driver.call_sign} — final selector returned no jobs, skipping`,
      );
      continue;
    }

    const finalJobIds = new Set(finalJobs.map((j) => j.id));
    const ownJobIds = new Set(ownJobs.map((j) => j.id));

    // Compute these OUTSIDE the transaction so they're in scope for logging
    const poolJobsInFinal = finalJobs.filter((j) => !ownJobIds.has(j.id));
    const ownJobsInFinal = finalJobs.filter((j) => ownJobIds.has(j.id));

    // Jobs fetched but not selected in final pass → release back to pool
    const unselectedOwnJobs = ownJobs.filter((j) => !finalJobIds.has(j.id));
    const unselectedPoolJobs = selectedPoolJobs.filter(
      (j) => !finalJobIds.has(j.id),
    );
    const toRelease = [...unselectedOwnJobs, ...unselectedPoolJobs];

    await prisma.$transaction(async (tx) => {
      // Release unselected back to pool
      if (toRelease.length) {
        await tx.job.updateMany({
          where: { id: { in: toRelease.map((j) => j.id) } },
          data: { call_sign: null, driver_id: null },
        });
        await tx.jobChangeHistory.createMany({
          data: toRelease.flatMap((job) => [
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

      const financials = calculateInvoiceFinancials(driver, finalTotal);

      // Create DRAFT invoice
      const invoice = await tx.invoice.create({
        data: {
          driver_id: driver.id,
          start_date: start,
          end_date: end,
          docket_total: finalTotal,
          net_amount: finalTotal,
          admin_fee: financials.admin_fee,
          vehicle_hire_charges: financials.vehicle_hire_charges,
          insurance_charge: financials.insurance_charge,
          fuel_charge: financials.fuel_charge,
          vat: financials.vat,
          carried_forward_total: financials.carried_forward_total,
          current_week_deductions: financials.current_week_deductions,
          total_number_of_dockets: finalJobs.length,
          total_deductions: financials.total_deductions,
          final_total: financials.final_total,
          status: "DRAFT",
          old_per_hour_rate: driver.per_hour_rate,
          old_total_hours: driver.total_hours,

          carry_forward_admin_fee: driver.carry_forward_admin_fee || 0,
          carry_forward_admin_vat_percent:
            driver.carry_forward_admin_vat_percent || 0,
          carry_forward_vehicle_hire_charge:
            driver.carry_forward_vehicle_hire_charge || 0,
          carry_forward_vehicle_vat_percent:
            driver.carry_forward_vehicle_vat_percent || 0,
          carry_forward_insurance_charge:
            driver.carry_forward_insurance_charge || 0,
          carry_forward_insurance_vat_percent:
            driver.carry_forward_insurance_vat_percent || 0,
          carry_forward_fuel_charge: driver.carry_forward_fuel_charge || 0,
          carry_forward_fuel_vat_percent:
            driver.carry_forward_fuel_vat_percent || 0,
        },
      });

      // Assign pool jobs to this driver and lock to invoice
      if (poolJobsInFinal.length) {
        await tx.job.updateMany({
          where: { id: { in: poolJobsInFinal.map((j) => j.id) } },
          data: {
            driver_id: driver.id,
            call_sign: driver.call_sign,
            is_invoiced: true,
            invoice_id: invoice.id,
          },
        });
        await tx.jobChangeHistory.createMany({
          data: poolJobsInFinal.flatMap((job) => [
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
      }

      // Lock own jobs already assigned to driver
      if (ownJobsInFinal.length) {
        await tx.job.updateMany({
          where: { id: { in: ownJobsInFinal.map((j) => j.id) } },
          data: { is_invoiced: true, invoice_id: invoice.id },
        });
        await tx.jobChangeHistory.createMany({
          data: ownJobsInFinal.map((job) => ({
            job_id: job.id,
            field: "DRIVER_TOTAL",
            old_value: job.driver_total,
            new_value: job.driver_total,
          })),
        });
      }

      // Reset carry-forward — clears accumulated charges now that an invoice
      // has been created. Inside the transaction so it rolls back on failure.
      await tx.driver.update({
        where: { id: driver.id },
        data: {
          carry_forward_admin_fee: 0,
          carry_forward_admin_vat_percent: 0,
          carry_forward_vehicle_hire_charge: 0,
          carry_forward_vehicle_vat_percent: 0,
          carry_forward_insurance_charge: 0,
          carry_forward_insurance_vat_percent: 0,
          carry_forward_fuel_charge: 0,
          carry_forward_fuel_vat_percent: 0,
        },
      });
    });

    handledThisPass.add(driver.id);
    console.log(
      `[PASS2] ✓ Invoice created | Driver: ${driver.call_sign} | Jobs: ${finalJobs.length} (own: ${ownJobsInFinal.length} pool: ${poolJobsInFinal.length}) | Total: £${finalTotal} | Target: £${weeklyTarget}`,
    );
  }

  console.log(`[PASS2] Done — handled ${handledThisPass.size} driver(s)`);
  return handledThisPass;
}
