// pass1.worker.js
// Cron Job 1 — Drivers with SUFFICIENT own jobs.
//
// For each active driver (one by one):
//   1. Fetch their own uninvoiced jobs for the pending week
//   2. Use selectJobsWithinTolerance to pick the best subset toward weeklyTarget
//   3. Create a DRAFT invoice with the selected jobs
//   4. Release unused jobs (unselected + zero-value + over-weight) back to pool
//      so Pass 2 / Pass 3 can pick them up
//
// A driver is considered "handled" here only if a valid subset of their own
// jobs was found that reaches the target within tolerance. Drivers who cannot
// meet the target from their own jobs are left for Pass 2.

import { prisma } from "../../config/prismaClient.js";
import { selectJobsWithinTolerance } from "./weeklyInvoice.selector.js";
import { calculateWeeklyTarget } from "./invoiceTargetCalculator.js";
import { calculateInvoiceFinancials } from "./invoiceFinancialCalculator.js";
import { getGeneratedId } from "../../utils/getGeneratedId.js";


async function fetchPass1Drivers() {
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

export async function runPass1({ start, end }) {
  console.log(
    `[PASS1] Starting for week ${start.toISOString()} → ${end.toISOString()}`,
  );

  const drivers = await fetchPass1Drivers();
  const handledDriverIds = new Set(); // returned to caller so Pass 2 can skip these

  for (const driver of drivers) {
    const weeklyTarget = calculateWeeklyTarget(driver);

    if (weeklyTarget <= 0) {
      console.log(
        `[PASS1] Skipping driver ${driver.call_sign} — invalid weeklyTarget`,
      );
      continue;
    }

    const maxWeight = driver.driver_position?.max_weight;
    if (maxWeight === null || maxWeight === undefined) {
      console.log(
        `[PASS1] Skipping driver ${driver.call_sign} — no max_weight on position`,
      );
      continue;
    }

    // ── Guard: invoice already exists for this week ──────────────────────
    const invoiceExists = await prisma.invoice.findFirst({
      where: { driver_id: driver.id, start_date: start, end_date: end },
    });
    if (invoiceExists) {
      console.log(
        `[PASS1] Driver ${driver.call_sign} — invoice already exists, skipping`,
      );
      handledDriverIds.add(driver.id);
      continue;
    }

    // ── Fetch driver's own jobs for the week ─────────────────────────────
    const overWeightJobs = await prisma.job.findMany({
      where: {
        driver_id: driver.id,
        is_invoiced: false,
        date_time: { gte: start, lte: end },
        weight: { gt: maxWeight },
      },
      select: { id: true, call_sign: true, driver_id: true },
    });

    const ownJobs = await prisma.job.findMany({
      where: {
        driver_id: driver.id,
        is_invoiced: false,
        date_time: { gte: start, lte: end },
        weight: { gte: 0, lte: maxWeight },
      },
      orderBy: { date_time: "asc" },
    });

    const validJobs = ownJobs.filter((j) => Number(j.driver_total ?? 0) > 0);
    const zeroValueJobs = ownJobs.filter(
      (j) => Number(j.driver_total ?? 0) <= 0,
    );

    console.log(
      `[PASS1] Driver ${driver.call_sign} — own jobs: ${ownJobs.length} valid: ${validJobs.length} zero: ${zeroValueJobs.length} overweight: ${overWeightJobs.length}`,
    );

    // Always release over-weight and zero-value jobs to pool first
    const alwaysRelease = [...zeroValueJobs, ...overWeightJobs];
    if (alwaysRelease.length) {
      await prisma.$transaction(async (tx) => {
        await tx.job.updateMany({
          where: { id: { in: alwaysRelease.map((j) => j.id) } },
          data: { call_sign: null, driver_id: null },
        });
        await tx.jobChangeHistory.createMany({
          data: alwaysRelease.flatMap((job) => [
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
        `[PASS1] Driver ${driver.call_sign} — released ${alwaysRelease.length} zero/over-weight jobs to pool`,
      );
    }

    // No valid own jobs → leave for Pass 2
    if (!validJobs.length) {
      console.log(
        `[PASS1] Driver ${driver.call_sign} — no valid own jobs, deferring to Pass 2`,
      );
      continue;
    }

    // ── Select best subset of own jobs toward weeklyTarget ────────────────
    const { selectedJobs, total } = selectJobsWithinTolerance(
      validJobs,
      weeklyTarget,
      2000,
    );

    if (!selectedJobs.length) {
      console.log(
        `[PASS1] Driver ${driver.call_sign} — selector returned no jobs, deferring to Pass 2`,
      );
      continue;
    }

    // If selected total is still well below target (more than tolerance away),
    // this driver needs pool top-up — defer to Pass 2 instead.
    if (total < weeklyTarget - 5) {
      console.log(
        `[PASS1] Driver ${driver.call_sign} — own jobs total £${total} is below target £${weeklyTarget} (gap > £5), deferring to Pass 2`,
      );
      continue;
    }

    const selectedJobIds = new Set(selectedJobs.map((j) => j.id));

    // Release unselected valid jobs to pool
    const unselectedJobs = validJobs.filter((j) => !selectedJobIds.has(j.id));

    const nextId = await getGeneratedId("main");

    await prisma.$transaction(async (tx) => {
      // Release unselected jobs to pool
      if (unselectedJobs.length) {
        await tx.job.updateMany({
          where: { id: { in: unselectedJobs.map((j) => j.id) } },
          data: { call_sign: null, driver_id: null },
        });
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

      const financials = calculateInvoiceFinancials(driver, total);

      // Create DRAFT invoice
      const invoice = await tx.invoice.create({
        data: {
          generated_id: nextId,
          driver_id: driver.id,
          start_date: start,
          end_date: end,
          docket_total: total,
          net_amount: total,
          admin_fee: financials.admin_fee,
          vehicle_hire_charges: financials.vehicle_hire_charges,
          insurance_charge: financials.insurance_charge,
          fuel_charge: financials.fuel_charge,
          vat: financials.vat,
          carried_forward_total: financials.carried_forward_total,
          current_week_deductions: financials.current_week_deductions,
          total_number_of_dockets: selectedJobs.length,
          total_deductions: financials.total_deductions,
          final_total: financials.final_total,
          status: "DRAFT",
          old_per_hour_rate: driver.per_hour_rate,
          old_total_hours: driver.total_hours,
          
          carry_forward_admin_fee: driver.carry_forward_admin_fee || 0 ,
          carry_forward_admin_vat_percent: driver.carry_forward_admin_vat_percent || 0 ,
          carry_forward_vehicle_hire_charge: driver.carry_forward_vehicle_hire_charge || 0 ,
          carry_forward_vehicle_vat_percent: driver.carry_forward_vehicle_vat_percent || 0 ,
          carry_forward_insurance_charge: driver.carry_forward_insurance_charge || 0 ,
          carry_forward_insurance_vat_percent: driver.carry_forward_insurance_vat_percent || 0 ,
          carry_forward_fuel_charge: driver.carry_forward_fuel_charge || 0,
          carry_forward_fuel_vat_percent: driver.carry_forward_fuel_vat_percent || 0,
        },
      });

      // Lock selected jobs to invoice
      await tx.job.updateMany({
        where: { id: { in: [...selectedJobIds] } },
        data: { is_invoiced: true, invoice_id: invoice.id },
      });

      await tx.jobChangeHistory.createMany({
        data: selectedJobs.map((job) => ({
          job_id: job.id,
          field: "DRIVER_TOTAL",
          old_value: job.driver_total,
          new_value: job.driver_total,
        })),
      });

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

    handledDriverIds.add(driver.id);
    console.log(
      `[PASS1] ✓ Invoice created | Driver: ${driver.call_sign} | Jobs: ${selectedJobs.length} | Total: £${total} | Target: £${weeklyTarget}`,
    );
  }

  console.log(`[PASS1] Done — handled ${handledDriverIds.size} driver(s)`);
  return handledDriverIds;
}
