export function calculateInvoiceFinancials(
  driver,
  docketTotal,
) {
  /**
   * Current week charges
   */
  const adminFee = Number(
    driver.admin_fee ?? 0,
  );

  const vehicleHire = Number(
    driver.vehicle_hire_charge ?? 0,
  );

  const insurance = Number(
    driver.insurance_charge ?? 0,
  );

  const fuel = Number(
    driver.fuel_charge ?? 0,
  );

  /**
   * Current VAT
   */
  const adminVAT =
    adminFee *
    (
      Number(driver.vat_percent ?? 0) /
      100
    );

  const vehicleVAT =
    vehicleHire *
    (
      Number(
        driver.vehicle_vat_percent ?? 0,
      ) / 100
    );

  const insuranceVAT =
    insurance *
    (
      Number(
        driver.insurance_vat_percent ??
          0,
      ) / 100
    );

  const fuelVAT =
    fuel *
    (
      Number(
        driver.fuel_vat_percent ?? 0,
      ) / 100
    );

  /**
   * Carry-forward charges
   */
  const carryForwardAdmin =
    Number(
      driver.carry_forward_admin_fee ??
        0,
    );

  const carryForwardVehicle =
    Number(
      driver.carry_forward_vehicle_hire_charge ??
        0,
    );

  const carryForwardInsurance =
    Number(
      driver.carry_forward_insurance_charge ??
        0,
    );

  const carryForwardFuel =
    Number(
      driver.carry_forward_fuel_charge ??
        0,
    );

  /**
   * Carry-forward VAT
   */
  const carryForwardAdminVAT =
    carryForwardAdmin *
    (
      Number(
        driver.carry_forward_admin_vat_percent ??
          0,
      ) / 100
    );

  const carryForwardVehicleVAT =
    carryForwardVehicle *
    (
      Number(
        driver.carry_forward_vehicle_vat_percent ??
          0,
      ) / 100
    );

  const carryForwardInsuranceVAT =
    carryForwardInsurance *
    (
      Number(
        driver
          .carry_forward_insurance_vat_percent ??
          0,
      ) / 100
    );

  const carryForwardFuelVAT =
    carryForwardFuel *
    (
      Number(
        driver.carry_forward_fuel_vat_percent ??
          0,
      ) / 100
    );

  /**
   * Totals
   */
  const currentWeekDeductions =
    adminFee +
    vehicleHire +
    insurance +
    fuel +
    adminVAT +
    vehicleVAT +
    insuranceVAT +
    fuelVAT;

  const carriedForwardTotal =
    carryForwardAdmin +
    carryForwardVehicle +
    carryForwardInsurance +
    carryForwardFuel +
    carryForwardAdminVAT +
    carryForwardVehicleVAT +
    carryForwardInsuranceVAT +
    carryForwardFuelVAT;

  const totalVAT =
    adminVAT +
    vehicleVAT +
    insuranceVAT +
    fuelVAT +
    carryForwardAdminVAT +
    carryForwardVehicleVAT +
    carryForwardInsuranceVAT +
    carryForwardFuelVAT;

  const TotalVatPercent =
    totalVAT / docketTotal;  

  const totalDeductions =
    currentWeekDeductions +
    carriedForwardTotal;

  const finalTotal = docketTotal - totalDeductions;

  return {
    admin_fee: adminFee,

    vehicle_hire_charges:
      vehicleHire,

    insurance_charge:
      insurance,

    fuel_charge: fuel,

    vat: Number(
      totalVAT.toFixed(2),
    ),

    current_week_deductions:
      Number(
        currentWeekDeductions.toFixed(
          2,
        ),
      ),

    carried_forward_total:
      Number(
        carriedForwardTotal.toFixed(2),
      ),

    total_deductions:
      Number(
        totalDeductions.toFixed(2),
      ),

    final_total: Number(
      finalTotal.toFixed(2),
    ),

    total_vat_percent: Number(
      TotalVatPercent.toFixed(2),
    ),
  };
}