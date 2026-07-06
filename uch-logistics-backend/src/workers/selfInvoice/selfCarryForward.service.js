/**
 * Process carry-forward charges ONLY for drivers
 * who did NOT receive an invoice in this batch.
 *
 * @param {object} params
 * @param {import('@prisma/client').PrismaClient} params.prisma
 *   Injected from the worker — avoids a top-level import that can
 *   cause resolution issues when the service is loaded early.
 * @param {number[]} params.driversWhoReceivedInvoices
 *   Array of driver IDs that were successfully invoiced this run.
 */
export async function processCarryForwardForSkippedDrivers({
  prisma,
  driversWhoReceivedInvoices = [],
}) {
  /**
   * SAFETY: ensure array format
   */
  const invoicedDriverIds = Array.isArray(driversWhoReceivedInvoices)
    ? driversWhoReceivedInvoices
    : [];

  /**
   * Fetch active drivers who were NOT invoiced this week
   */
  const activeDrivers = await prisma.selfDriver.findMany({
    where: {
      status: "active",
      id: { notIn: invoicedDriverIds },
    },
  });

  console.log(
    `[CarryForward] Processing ${activeDrivers.length} skipped drivers`,
  );

  for (const driver of activeDrivers) {
    try {
      await prisma.selfDriver.update({
        where: { id: driver.id },
        data: {
          /**
           * ADMIN FEE — accumulate amount, store latest VAT %
           */
          carry_forward_admin_fee:
            Number(driver.carry_forward_admin_fee || 0) +
            Number(driver.admin_fee || 0),
          carry_forward_admin_vat_percent: Number(driver.vat_percent || 0),

          /**
           * VEHICLE HIRE — accumulate amount, store latest VAT %
           */
          carry_forward_vehicle_hire_charge:
            Number(driver.carry_forward_vehicle_hire_charge || 0) +
            Number(driver.vehicle_hire_charge || 0),
          carry_forward_vehicle_vat_percent: Number(
            driver.vehicle_vat_percent || 0,
          ),

          /**
           * INSURANCE — accumulate amount, store latest VAT %
           */
          carry_forward_insurance_charge:
            Number(driver.carry_forward_insurance_charge || 0) +
            Number(driver.insurance_charge || 0),
          carry_forward_insurance_vat_percent: Number(
            driver.insurance_vat_percent || 0,
          ),

          /**
           * FUEL — accumulate amount, store latest VAT %
           */
          carry_forward_fuel_charge:
            Number(driver.carry_forward_fuel_charge || 0) +
            Number(driver.fuel_charge || 0),
          carry_forward_fuel_vat_percent: Number(driver.fuel_vat_percent || 0),

          /**
           * ADDITIONAL CHARGE 1 — accumulate amount, store latest VAT %
           */
          carry_forward_additional_charge_1:
            Number(driver.carry_forward_additional_charge_1 || 0) +
            Number(driver.additional_charges_1 || 0),
          carry_forward_additional_charge_1_vat_percent: Number(
            driver.additional_charges_vat_1_percent || 0,
          ),

          /**
           * ADDITIONAL CHARGE 2 — accumulate amount, store latest VAT %
           */
          carry_forward_additional_charge_2:
            Number(driver.carry_forward_additional_charge_2 || 0) +
            Number(driver.additional_charges_2 || 0),
          carry_forward_additional_charge_2_vat_percent: Number(
            driver.additional_charges_vat_2_percent || 0,
          ),

          /**
           * ADDITIONAL CHARGE 3 — accumulate amount, store latest VAT %
           */
          carry_forward_additional_charge_3:
            Number(driver.carry_forward_additional_charge_3 || 0) +
            Number(driver.additional_charges_3 || 0),
          carry_forward_additional_charge_3_vat_percent: Number(
            driver.additional_charges_vat_3_percent || 0,
          ),
        },
      });

      console.log(
        `[CarryForward] Updated carry-forward for driver ${driver.id}`,
      );
    } catch (err) {
      console.error(
        `[CarryForward] Failed for driver ${driver.id}:`,
        err.message,
      );
    }
  }
}