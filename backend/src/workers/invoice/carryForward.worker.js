// carryForward.worker.js
// Carry-Forward Pass — runs after Pass 3, only when at least one invoice
// was created this batch.
//
// For every active driver who did NOT receive an invoice this week:
//   • Accumulate their fixed weekly charges into the carry_forward_* fields
//   • Always overwrite VAT percents with the latest rate (never accumulate %)
//
// On the week a driver finally gets invoiced, the transaction in the relevant
// pass worker is responsible for zeroing all carry_forward_* fields.

import { prisma } from "../../config/prismaClient.js";

/**
 * @param {object}  params
 * @param {Set<number>} params.invoicedDriverIds
 *   IDs of every driver that received an invoice this batch run
 *   (union of Pass 1 + Pass 2 + Pass 3 handled sets).
 */
export async function runCarryForwardPass({ invoicedDriverIds }) {
  // Safety: normalise to a plain array for Prisma's notIn filter
  const invoicedIds = invoicedDriverIds instanceof Set
    ? [...invoicedDriverIds]
    : Array.isArray(invoicedDriverIds)
      ? invoicedDriverIds
      : [];

  // Fetch active drivers who were NOT invoiced this week
  const skippedDrivers = await prisma.driver.findMany({
    where: {
      status: "active",
      id: { notIn: invoicedIds },
    },
  });

  console.log(
    `[CARRY_FORWARD] Processing ${skippedDrivers.length} skipped driver(s)`,
  );

  for (const driver of skippedDrivers) {
    try {
      await prisma.driver.update({
        where: { id: driver.id },
        data: {
          /**
           * ADMIN FEE — accumulate amount, store latest VAT %
           */
          carry_forward_admin_fee:
            Number(driver.carry_forward_admin_fee || 0) +
            Number(driver.admin_fee || 0),
          carry_forward_admin_vat_percent:
            Number(driver.vat_percent || 0),

          /**
           * VEHICLE HIRE — accumulate amount, store latest VAT %
           */
          carry_forward_vehicle_hire_charge:
            Number(driver.carry_forward_vehicle_hire_charge || 0) +
            Number(driver.vehicle_hire_charge || 0),
          carry_forward_vehicle_vat_percent:
            Number(driver.vehicle_vat_percent || 0),

          /**
           * INSURANCE — accumulate amount, store latest VAT %
           */
          carry_forward_insurance_charge:
            Number(driver.carry_forward_insurance_charge || 0) +
            Number(driver.insurance_charge || 0),
          carry_forward_insurance_vat_percent:
            Number(driver.insurance_vat_percent || 0),

          /**
           * FUEL — accumulate amount, store latest VAT %
           */
          carry_forward_fuel_charge:
            Number(driver.carry_forward_fuel_charge || 0) +
            Number(driver.fuel_charge || 0),
          carry_forward_fuel_vat_percent:
            Number(driver.fuel_vat_percent || 0),
        },
      });

      console.log(
        `[CARRY_FORWARD] Updated driver ${driver.call_sign} (id: ${driver.id})`,
      );
    } catch (err) {
      console.error(
        `[CARRY_FORWARD] Failed for driver ${driver.call_sign} (id: ${driver.id}):`,
        err.message,
      );
    }
  }

  console.log(`[CARRY_FORWARD] Done`);
}