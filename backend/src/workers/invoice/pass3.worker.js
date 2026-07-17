// pass3.worker.js
// Cron Job 3 — Drivers with NO own jobs.
//
// For each active driver NOT handled by Pass 1 or Pass 2 (one by one):
//   1. Confirm they truly have no valid uninvoiced own jobs for the week
//   2. Fetch unassigned pool jobs (driver_id: null, call_sign: null)
//   3. Select the best combination toward weeklyTarget (tolerance ±5)
//   4. Assign pool jobs to the driver and create a DRAFT invoice

import { prisma } from "../../config/prismaClient.js";
import { selectJobsForRemainingAmount } from "./remainingJob.selector.js";
import { calculateWeeklyTarget } from "./invoiceTargetCalculator.js";
import { calculateInvoiceFinancials } from "./invoiceFinancialCalculator.js";
import { getGeneratedId } from "../../utils/getGeneratedId.js";



async function fetchPass3Drivers() {
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

export async function runPass3({ start, end }, handledDriverIds = new Set()) {
  console.log(
    `[PASS3] Starting for week ${start.toISOString()} → ${end.toISOString()}`,
  );

  const drivers = await fetchPass3Drivers();

  for (const driver of drivers) {
    // Skip drivers already handled in Pass 1 or Pass 2
    if (handledDriverIds.has(driver.id)) continue;

    const weeklyTarget = calculateWeeklyTarget(driver);

    if (weeklyTarget <= 0) continue;

    const maxWeight = driver.driver_position?.max_weight;
    if (maxWeight === null || maxWeight === undefined) {
      console.log(
        `[PASS3] Skipping driver ${driver.call_sign} — no max_weight on position`,
      );
      continue;
    }

    // ── Guard: invoice already exists ────────────────────────────────────
    const invoiceExists = await prisma.invoice.findFirst({
      where: { driver_id: driver.id, start_date: start, end_date: end },
    });
    if (invoiceExists) {
      console.log(
        `[PASS3] Driver ${driver.call_sign} — invoice already exists, skipping`,
      );
      continue;
    }

    // ── Confirm truly no valid own jobs ───────────────────────────────────
    const hasOwnJobs = await prisma.job.findFirst({
      where: {
        driver_id: driver.id,
        is_invoiced: false,
        date_time: { gte: start, lte: end },
        weight: { gte: 0, lte: maxWeight },
        driver_total: { gt: 0 },
      },
    });

    if (hasOwnJobs) {
      // Has valid own jobs — should have been caught by Pass 2, skip here
      console.log(
        `[PASS3] Driver ${driver.call_sign} — has own jobs, should be Pass 2, skipping`,
      );
      continue;
    }

    // ── Fetch unassigned pool jobs ────────────────────────────────────────
    const poolJobs = await prisma.job.findMany({
      where: {
        is_invoiced: false,
        date_time: { gte: start, lte: end },
        weight: { gte: 0, lte: maxWeight },
        driver_total: { gt: 0 },
      },
      orderBy: { date_time: "asc" },
    });

    console.log(
      `[PASS3] Driver ${driver.call_sign} — pool jobs available: ${poolJobs.length} | target: £${weeklyTarget}`,
    );

    if (!poolJobs.length) {
      console.log(
        `[PASS3] Driver ${driver.call_sign} — no pool jobs available, skipping`,
      );
      continue;
    }

    // ── Select best combination from pool ─────────────────────────────────
    const { selectedJobs, total } = selectJobsForRemainingAmount(
      poolJobs,
      weeklyTarget,
      5,
    );

    if (!selectedJobs.length) {
      console.log(
        `[PASS3] Driver ${driver.call_sign} — selector returned no jobs, skipping`,
      );
      continue;
    }

    const selectedJobIds = selectedJobs.map((j) => j.id);

    const financials = calculateInvoiceFinancials(driver, total);
    
    const nextId = await getGeneratedId("main");

    await prisma.$transaction(async (tx) => {
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

      // Assign pool jobs to this driver and lock to invoice
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
      `[PASS3] ✓ Invoice created | Driver: ${driver.call_sign} | Jobs: ${selectedJobs.length} | Total: £${total} | Target: £${weeklyTarget}`,
    );
  }

  console.log(`[PASS3] Done — handled ${handledDriverIds.size} driver(s)`);
  return handledDriverIds;
}