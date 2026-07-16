import { prisma } from "../../config/prismaClient.js";

import { findOldestPendingSelfWeek } from "./findPendingSelfWeek.js";

import {
  getActiveSelfDrivers,
  getSelfJobsForDriver,
} from "./selfJob.selector.js";

import {
  calculateSelfInvoiceFinancials,
  sumDocketTotal,
} from "./selfInvoice.calculator.js";

import {
  findExistingSelfBatch,
  createSelfInvoiceBatch,
} from "./selfInvoiceBatch.selector.js";

import { processCarryForwardForSkippedDrivers } from "./selfCarryForward.service.js";

import { getGeneratedId } from "../../utils/getGeneratedId.js";



/**
 * GENERATE SIMPLE SEQUENTIAL BATCH CODE
 *
 * Looks at the highest existing batch_number in the table
 * and pads it to 3 digits: 001, 002, 003 …
 *
 * NOTE: batch_number is a reliable integer counter maintained
 * by createSelfInvoiceBatch — we never parse batch_code strings.
 */
async function generateWeeklyBatchCode() {
  const lastBatch = await prisma.selfInvoiceBatch.findFirst({
    orderBy: { batch_number: "desc" },
    select: { batch_number: true },
  });

  const totalExisting = await prisma.selfInvoiceBatch.count();
  const nextDisplayNumber = totalExisting + 1; // 1 → "001", 2 → "002" …

  return String(nextDisplayNumber).padStart(3, "0");
}

/**
 * MAIN WEEKLY SELF INVOICE PROCESSOR
 */
export async function runWeeklySelfInvoiceBatch() {
  console.log(`[WeeklySelfInvoice] Started at ${new Date().toISOString()}`);

  /**
   * FIND PENDING WEEK
   */
  const pendingWeek = await findOldestPendingSelfWeek();

  console.log(pendingWeek , "====================>>>> pending week <<<=====================");

  if (!pendingWeek) {
    console.log(`[WeeklySelfInvoice] No uninvoiced jobs found`);
    return;
  }

  const { from, to, week, year } = pendingWeek;

  try {
    /**
     * GENERATE BATCH CODE
     */
    const batchCode = await generateWeeklyBatchCode();

    console.log(`[WeeklySelfInvoice] Processing batch ${batchCode}`);

    /**
     * PREVENT DUPLICATE WEEKLY BATCH
     * Pass batchCode (string) — that is what findExistingSelfBatch expects.
     */
    const existingBatch = await findExistingSelfBatch(batchCode);

    if (existingBatch) {
      console.log(`[WeeklySelfInvoice] Batch ${batchCode} already exists`);
      return;
    }

    /**
     * FETCH ACTIVE DRIVERS
     */
    const drivers = await getActiveSelfDrivers();

    if (!drivers.length) {
      console.log(`[WeeklySelfInvoice] No active drivers found`);
      return;
    }

    /**
     * CREATE BATCH
     * siteType is not week-level in this context; pass a default.
     * If your system has a global siteType config, substitute it here.
     */
    const batch = await createSelfInvoiceBatch({
      batchCode,
      from,
      to,
      week,
      year,
    });

    console.log(`[WeeklySelfInvoice] Batch created ${batchCode}`);

    /**
     * TRACKERS
     */
    let invoicesCreated = 0;
    let invoicesSkipped = 0;
    const driversInvoicedIds = [];

    /**
     * PROCESS DRIVERS
     */
    for (const driver of drivers) {
      try {
        console.log(`[WeeklySelfInvoice] Processing driver ${driver.name}`);

        /**
         * FETCH DRIVER JOBS FOR THIS WEEK
         */
        const jobs = await getSelfJobsForDriver(driver.id, from, to);

        /**
         * SKIP IF NO JOBS — carry-forward handled after the loop
         */
        if (!jobs || !jobs.length) {
          invoicesSkipped++;
          console.log(`[WeeklySelfInvoice] No jobs for ${driver.name}`);
          continue;
        }

        /**
         * MANUAL DOCKETS
         */
        const manualDockets = driver.manual_dockets || [];

        /**
         * DOCKET TOTAL
         */
        const docketTotal = sumDocketTotal(jobs);

        /**
         * CALCULATE FINANCIALS
         */
        const financials = calculateSelfInvoiceFinancials({
          driver,
          docketTotal,
          manualDockets,
        });

        const nextId = await getGeneratedId();


        /**
         * TRANSACTION — create invoice + links + reset carry-forward
         */
        const invoice = await prisma.$transaction(async (tx) => {
          /**
           * CREATE INVOICE
           */
          const createdInvoice = await tx.selfInvoice.create({
            data: {
              generated_id: nextId,
              driver_id: driver.id,
              site_type: driver.shift_type || "",
              start_date: from,
              end_date: to,
              docket_total: docketTotal,
              total_number_of_dockets: jobs.length,

              // Standard charges
              admin_fee: financials.admin_fee,
              vehicle_hire_charges: financials.vehicle_hire_charges,
              insurance_charge: financials.insurance_charge,
              fuel_charge: financials.fuel_charge,

              // VAT
              vat: financials.standard_vat_total,

              // Totals
              net_amount: financials.net_amount,
              total_deductions: financials.total_deductions,
              carry_forward_vat_total: financials.carry_forward_vat_total,
              docket_total_vat: financials.docket_total_vat,
              manual_driver_total: financials.manual_driver_total,
              final_tax_deduction: financials.final_tax_deduction,
              final_total: financials.final_total,

              // Carry Forward Charges
              carry_forward_admin_fee: driver.carry_forward_admin_fee ?? 0,
              carry_forward_admin_vat_percent:
                driver.carry_forward_admin_vat_percent ?? 0,
              carry_forward_vehicle_hire_charge:
                driver.carry_forward_vehicle_hire_charge ?? 0,
              carry_forward_vehicle_vat_percent:
                driver.carry_forward_vehicle_vat_percent ?? 0,
              carry_forward_insurance_charge:
                driver.carry_forward_insurance_charge ?? 0,
              carry_forward_insurance_vat_percent:
                driver.carry_forward_insurance_vat_percent,
              carry_forward_fuel_charge: driver.carry_forward_fuel_charge ?? 0,
              carry_forward_fuel_vat_percent:
                driver.carry_forward_fuel_vat_percent ?? 0,

              // Batch
              batch_id: batch.id,

              // Status
              status: "DRAFT",
              is_paid: false,
            },
          });

          /**
           * CREATE JOB LINKS
           */
          await tx.selfInvoiceJob.createMany({
            data: jobs.map((job) => ({
              invoice_id: createdInvoice.id,
              job_id: job.id,
            })),
          });

          /**
           * MARK JOBS INVOICED
           */
          await tx.selfJob.updateMany({
            where: { id: { in: jobs.map((j) => j.id) } },
            data: {
              is_invoiced: true,
              invoice_id: createdInvoice.id,
            },
          });

          /**
           * RESET CARRY FORWARD — amounts AND VAT percents
           * Must happen inside the transaction so it rolls back
           * if invoice creation fails.
           */
          await tx.selfDriver.update({
            where: { id: driver.id },
            data: {
              // Amounts
              carry_forward_admin_fee: 0,
              carry_forward_vehicle_hire_charge: 0,
              carry_forward_insurance_charge: 0,
              carry_forward_fuel_charge: 0,
              carry_forward_additional_charge_1: 0,
              carry_forward_additional_charge_2: 0,
              carry_forward_additional_charge_3: 0,

              // VAT percents — also zeroed so stale rates don't leak
              carry_forward_admin_vat_percent: 0,
              carry_forward_vehicle_vat_percent: 0,
              carry_forward_insurance_vat_percent: 0,
              carry_forward_fuel_vat_percent: 0,
              carry_forward_additional_charge_1_vat_percent: 0,
              carry_forward_additional_charge_2_vat_percent: 0,
              carry_forward_additional_charge_3_vat_percent: 0,
            },
          });

          return createdInvoice;
        });

        /**
         * SUCCESS TRACKING
         */
        if (invoice?.id) {
          driversInvoicedIds.push(driver.id);
          invoicesCreated++;
          console.log(
            `[WeeklySelfInvoice] ✓ Invoice created for ${driver.name}`,
          );
        }
      } catch (err) {
        console.error(
          `[WeeklySelfInvoice] Driver failed ${driver.name}`,
          err.message,
        );
      }
    }

    console.log(`[WeeklySelfInvoice] Drivers invoiced:`, driversInvoicedIds);
    console.log(
      `[WeeklySelfInvoice] Total invoiced drivers:`,
      driversInvoicedIds.length,
    );

    /**
     * PROCESS CARRY FORWARD
     * Run only AFTER all invoices complete so the exclusion list is final.
     * Prisma instance is passed in so the service never needs its own import.
     */
    if (invoicesCreated > 0) {
      await processCarryForwardForSkippedDrivers({
        prisma,
        driversWhoReceivedInvoices: driversInvoicedIds,
      });
    } else {
      console.log(
        `[WeeklySelfInvoice] No invoices created — carry-forward skipped`,
      );
    }

    console.log(`[WeeklySelfInvoice] Batch completed`);
    console.log(`[WeeklySelfInvoice] Created=${invoicesCreated}`);
    console.log(`[WeeklySelfInvoice] Skipped=${invoicesSkipped}`);
  } catch (err) {
    console.error(`[WeeklySelfInvoice] Batch failed`, err);
  }

  console.log(`[WeeklySelfInvoice] Completed successfully`);
}
