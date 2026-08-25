import { prisma } from "../../config/prismaClient.js";
import { selectJobsWithinTolerance } from "./weeklyInvoice.selector.js";
import { selectJobsForRemainingAmount } from "./remainingJob.selector.js";
import { calculateWeeklyTarget } from "./invoiceTargetCalculator.js";
import { calculateInvoiceFinancials } from "./invoiceFinancialCalculator.js";
import { getGeneratedId } from "../../utils/getGeneratedId.js";

export async function runPass2({ start, end }, handledDriverIds = new Set()) {
  console.log(`[PASS2] Starting week ${start.toISOString()}`);

  const drivers = await prisma.driver.findMany({
    where: {
      status: "active",
      per_hour_rate: { not: null },
      total_hours: { not: null, gt: 0 },
      driver_position_id: { not: null },
    },
    include: {
      driver_position: { select: { id: true, max_weight: true } },
    },
  });

  const handledThisPass = new Set();

  for (const driver of drivers) {
    if (handledDriverIds.has(driver.id)) continue;

    const weeklyTarget = calculateWeeklyTarget(driver);
    const maxWeight = driver.driver_position?.max_weight ?? 0;

    // 1. Fetch THIS driver's valid jobs (Own Jobs)
    const ownJobs = await prisma.job.findMany({
      where: {
        driver_id: driver.id,
        is_invoiced: false,
        date_time: { gte: start, lte: end },
        weight: { gte: 0, lte: maxWeight },
        driver_total: { gt: 0 },
      },
    });

    const ownTotal = ownJobs.reduce((sum, j) => sum + Number(j.driver_total || 0), 0);
    const remainingNeeded = weeklyTarget - ownTotal;

    // 2. Fetch ONLY unassigned jobs (Pool Jobs)
    // CRITICAL FIX: Added driver_id: null and call_sign: null
    const poolJobs = await prisma.job.findMany({
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

    if (ownJobs.length === 0 && poolJobs.length === 0) {
      console.log(`[PASS2] Driver ${driver.call_sign} has no own jobs and pool is empty. Skipping.`);
      continue;
    }

    // 3. Select supplemental jobs from the pool
    const { selectedJobs: selectedPoolJobs } = selectJobsForRemainingAmount(
      poolJobs,
      remainingNeeded,
      5 // tolerance
    );

    // 4. Combine Own + Selected Pool Jobs
    const combinedCandidateJobs = [...ownJobs, ...selectedPoolJobs];

    // 5. Final pass through the selector to get as close to target as possible
    const { selectedJobs: finalJobs, total: finalTotal } = selectJobsWithinTolerance(
      combinedCandidateJobs,
      weeklyTarget,
      2000 // broad search
    );

    if (finalJobs.length === 0) continue;

    // 6. Identify which jobs are being taken from the pool to update their ownership
    const ownJobIds = new Set(ownJobs.map(j => j.id));
    const poolJobsToAssign = finalJobs.filter(j => !ownJobIds.has(j.id));
    const ownJobsToLock = finalJobs.filter(j => ownJobIds.has(j.id));

    // 7. Database Transaction
    await prisma.$transaction(async (tx) => {
      const nextId = await getGeneratedId("main");
      const financials = calculateInvoiceFinancials(driver, finalTotal);

const invoice = await tx.invoice.create({
    data: {
      generated_id: nextId,
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

      // Update Pool Jobs: Assign to this driver and mark invoiced
      if (poolJobsToAssign.length > 0) {
        await tx.job.updateMany({
          where: { id: { in: poolJobsToAssign.map(j => j.id) } },
          data: {
            driver_id: driver.id,
            call_sign: driver.call_sign,
            is_invoiced: true,
            invoice_id: invoice.id,
          },
        });
      }

      // Update Own Jobs: Mark invoiced
      if (ownJobsToLock.length > 0) {
        await tx.job.updateMany({
          where: { id: { in: ownJobsToLock.map(j => j.id) } },
          data: { is_invoiced: true, invoice_id: invoice.id },
        });
      }

      // Reset carry forward
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
    console.log(`[PASS2] ✓ Invoice for ${driver.call_sign}: £${finalTotal} (Own: ${ownJobsToLock.length}, Pool: ${poolJobsToAssign.length})`);
  }

  return handledThisPass;
}