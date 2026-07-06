export function calculateWeeklyTarget(driver) {
  const hourlyRate = Number(driver.per_hour_rate ?? 0);
  const totalHours = Number(driver.total_hours ?? 0);
  const baseWeeklyTarget = hourlyRate * totalHours;
  const adminFee = Number(driver.admin_fee ?? 0);
  const vehicleHire = Number(driver.vehicle_hire_charge ?? 0);
  const insurance = Number(driver.insurance_charge ?? 0);
  const fuel = Number(driver.fuel_charge ?? 0);
  const adminVAT = adminFee * (Number(driver.vat_percent ?? 0) / 100);
  const vehicleVAT =
    vehicleHire * (Number(driver.vehicle_vat_percent ?? 0) / 100);

  const insuranceVAT =
    insurance * (Number(driver.insurance_vat_percent ?? 0) / 100);

  const fuelVAT = fuel * (Number(driver.fuel_vat_percent ?? 0) / 100);

  /**
   * Carry-forward charges
   */
  const carryForwardAdmin = Number(driver.carry_forward_admin_fee ?? 0);

  const carryForwardVehicle = Number(
    driver.carry_forward_vehicle_hire_charge ?? 0,
  );

  const carryForwardInsurance = Number(
    driver.carry_forward_insurance_charge ?? 0,
  );

  const carryForwardFuel = Number(driver.carry_forward_fuel_charge ?? 0);

  /**
   * Carry-forward VAT
   */
  const carryForwardAdminVAT =
    carryForwardAdmin *
    (Number(driver.carry_forward_admin_vat_percent ?? 0) / 100);

  const carryForwardVehicleVAT =
    carryForwardVehicle *
    (Number(driver.carry_forward_vehicle_vat_percent ?? 0) / 100);

  const carryForwardInsuranceVAT =
    carryForwardInsurance *
    (Number(driver.carry_forward_insurance_vat_percent ?? 0) / 100);

  const carryForwardFuelVAT =
    carryForwardFuel *
    (Number(driver.carry_forward_fuel_vat_percent ?? 0) / 100);

  /**
   * Final target
   */
  const weeklyTarget =
    baseWeeklyTarget +
    adminFee +
    adminVAT +
    vehicleHire +
    vehicleVAT +
    insurance +
    insuranceVAT +
    fuel +
    fuelVAT +
    carryForwardAdmin +
    carryForwardAdminVAT +
    carryForwardVehicle +
    carryForwardVehicleVAT +
    carryForwardInsurance +
    carryForwardInsuranceVAT +
    carryForwardFuel +
    carryForwardFuelVAT;

  return Number(weeklyTarget.toFixed(2));
}
