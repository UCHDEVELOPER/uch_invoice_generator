/**
 * Rounds value to 2 decimals
 */
function round2(val) {
  return Math.round((Number(val || 0) + Number.EPSILON) * 100) / 100;
}

/**
 * Calculate VAT amount
 */
function calculateVat(amount, percent) {
  return Number(amount || 0) * (Number(percent || 0) / 100);
}

/**
 * Sum manual docket totals
 */
function normalizeManualDockets(manualDockets) {
  /**
   * NULL / UNDEFINED
   */
  if (!manualDockets) {
    return [];
  }

  /**
   * STRINGIFIED JSON
   */
  if (typeof manualDockets === "string") {
    try {
      const parsed = JSON.parse(manualDockets);

      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      return [];
    }
  }

  /**
   * ALREADY ARRAY
   */
  if (Array.isArray(manualDockets)) {
    return manualDockets;
  }

  /**
   * INVALID OBJECT
   */
  return [];
}

function sumManualDocketTotals(manualDockets = []) {
  const normalized = normalizeManualDockets(manualDockets);

  return normalized.reduce(
    (sum, item) => sum + Number(item?.driver_total || 0),
    0,
  );
}

/**
 * Main financial calculator
 */
export function calculateSelfInvoiceFinancials({
  driver,
  docketTotal,
  manualDockets = [],
}) {
  /**
   * STANDARD CHARGES0
   */
  const adminFee = Number(driver.admin_fee || 0);

  const vehicleHire = Number(driver.vehicle_hire_charge || 0);

  const insurance = Number(driver.insurance_charge || 0);

  const fuel = Number(driver.fuel_charge || 0);

  const additional1 = Number(driver.additional_charges_1 || 0);

  const additional2 = Number(driver.additional_charges_2 || 0);

  const additional3 = Number(driver.additional_charges_3 || 0);

  /**
   * STANDARD VAT
   */
  const adminVat = calculateVat(adminFee, driver.vat_percent);

  const vehicleVat = calculateVat(vehicleHire, driver.vehicle_vat_percent);

  const insuranceVat = calculateVat(insurance, driver.insurance_vat_percent);

  const fuelVat = calculateVat(fuel, driver.fuel_vat_percent);

  const additional1Vat = calculateVat(
    additional1,
    driver.additional_charges_vat_1_percent,
  );

  const additional2Vat = calculateVat(
    additional2,
    driver.additional_charges_vat_2_percent,
  );

  const additional3Vat = calculateVat(
    additional3,
    driver.additional_charges_vat_3_percent,
  );

  /**
   * CARRY FORWARD CHARGES
   */
  const carryForwardAdminFee = Number(driver.carry_forward_admin_fee || 0);

  const carryForwardVehicleHire = Number(
    driver.carry_forward_vehicle_hire_charge || 0,
  );

  const carryForwardInsurance = Number(
    driver.carry_forward_insurance_charge || 0,
  );

  const carryForwardFuel = Number(driver.carry_forward_fuel_charge || 0);

  const carryForwardAdditional1 = Number(
    driver.carry_forward_additional_charge_1 || 0,
  );

  const carryForwardAdditional2 = Number(
    driver.carry_forward_additional_charge_2 || 0,
  );

  const carryForwardAdditional3 = Number(
    driver.carry_forward_additional_charge_3 || 0,
  );

  /**
   * CARRY FORWARD VAT
   */
  const carryForwardAdminVat = calculateVat(
    carryForwardAdminFee,
    driver.carry_forward_admin_vat_percent,
  );

  const carryForwardVehicleVat = calculateVat(
    carryForwardVehicleHire,
    driver.carry_forward_vehicle_vat_percent,
  );

  const carryForwardInsuranceVat = calculateVat(
    carryForwardInsurance,
    driver.carry_forward_insurance_vat_percent,
  );

  const carryForwardFuelVat = calculateVat(
    carryForwardFuel,
    driver.carry_forward_fuel_vat_percent,
  );

  const carryForwardAdditional1Vat = calculateVat(
    carryForwardAdditional1,
    driver.carry_forward_additional_charge_1_vat_percent,
  );

  const carryForwardAdditional2Vat = calculateVat(
    carryForwardAdditional2,
    driver.carry_forward_additional_charge_2_vat_percent,
  );

  const carryForwardAdditional3Vat = calculateVat(
    carryForwardAdditional3,
    driver.carry_forward_additional_charge_3_vat_percent,
  );

  /**
   * CARRY FORWARD VAT TOTAL
   */
  const carryForwardVatTotal =
    carryForwardAdminVat +
    carryForwardVehicleVat +
    carryForwardInsuranceVat +
    carryForwardFuelVat +
    carryForwardAdditional1Vat +
    carryForwardAdditional2Vat +
    carryForwardAdditional3Vat;

  /**
   * CARRY FORWARD TOTAL
   */
  const carryForwardTotal =
    carryForwardAdminFee +
    carryForwardVehicleHire +
    carryForwardInsurance +
    carryForwardFuel +
    carryForwardAdditional1 +
    carryForwardAdditional2 +
    carryForwardAdditional3;

  /**
   * DOCKET VAT
   */
  const docketTotalVat = calculateVat(
    docketTotal,
    driver.docket_total_vat_percent,
  );

  /**
   * STANDARD VAT TOTAL
   */
  const standardVatTotal =
    adminVat +
    vehicleVat +
    insuranceVat +
    fuelVat +
    additional1Vat +
    additional2Vat +
    additional3Vat +
    carryForwardVatTotal;

  /**
   * STANDARD DEDUCTIONS
   */
  const standardChargeTotal =
    adminFee +
    vehicleHire +
    insurance +
    fuel + 
    additional1 +
    additional2 +
    additional3 + 
    carryForwardTotal;

  /**
   * MANUAL DOCKET TOTALS
   */
  const normalizedManualDockets = normalizeManualDockets(manualDockets);

  const manualDriverTotal = sumManualDocketTotals(normalizedManualDockets);

  /**
   * FINAL TAX DEDUCTION
   */
  const finalTaxDeduction =
    standardVatTotal +
    standardChargeTotal -
    manualDriverTotal - 
    docketTotalVat;

  /**
   * FINAL TOTAL
   */
  const finalTotal = docketTotal - finalTaxDeduction;

  return {
    net_amount: round2(docketTotal),
    admin_fee: round2(adminFee),
    vehicle_hire_charges: round2(vehicleHire),
    insurance_charge: round2(insurance),
    fuel_charge: round2(fuel),
    additional_charges_1: round2(additional1),
    additional_charges_2: round2(additional2),
    additional_charges_3: round2(additional3),
    standard_charge_total: round2(standardChargeTotal),
    standard_vat_total: round2(standardVatTotal),
    carry_forward_total: round2(carryForwardTotal),
    carry_forward_vat_total: round2(carryForwardVatTotal),
    docket_total_vat: round2(docketTotalVat),
    manual_driver_total: round2(manualDriverTotal),
    final_tax_deduction: round2(finalTaxDeduction),
    total_deductions: round2(finalTaxDeduction),
    final_total: round2(finalTotal),
  };
}

/**
 * Sum docket totals
 */
export function sumDocketTotal(jobs) {
  const total = jobs.reduce(
    (sum, job) => sum + Number(job.driver_total || 0),
    0,
  );

  return round2(total);
}
