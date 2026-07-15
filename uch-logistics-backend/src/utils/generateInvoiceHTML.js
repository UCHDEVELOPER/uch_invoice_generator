const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return "";
  return parseFloat(amount).toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-GB");
};

const formatDateTime = (dateString) => {
  if (!dateString) return "";

  const date = new Date(dateString);

  const dateFormatted = date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    timeZone: "Europe/London",
  });

  const timeFormatted = date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/London",
  });

  return `${dateFormatted} ${timeFormatted}`;
};

// export const transformInvoiceData = (rawData) => {
//   const { jobs = [], driver = {} } = rawData;

//   const calculatedDocketTotal = jobs.reduce(
//     (sum, d) => sum + (parseFloat(d.driver_total) || 0),
//     0,
//   );

//   const transformedDockets = jobs.map((docket) => ({
//     docket_no: docket.docket_no,
//     pickupDateTime: docket.date_time,
//     tariff: docket.tariff,
//     journeyDetails: docket.journey,
//     amount: docket.driver_total,
//   }));

//   const addressParts = (driver.address_details || "")
//     .split(",")
//     .map((s) => s.trim());

//   // Per-row charges & VAT percentages
//   const adminFee = parseFloat(rawData.admin_fee) || 0;
//   const adminVatPct = parseFloat(rawData.driver.vat_percent) || 0;
//   const vehicleHire = parseFloat(rawData.vehicle_hire_charges) || 0;
//   const vehicleVatPct = parseFloat(driver.vehicle_vat_percent) || 0;
//   const insurance = parseFloat(rawData.insurance_charge) || 0;
//   const insuranceVatPct = parseFloat(driver.insurance_vat_percent) || 0;
//   const fuelCharge = parseFloat(rawData.fuel_charge) || 0;
//   const fuelVatPct = parseFloat(driver.fuel_vat_percent) || 0;
//   const additional = parseFloat(rawData.additional_charges) || 0;
//   const additional_charges_1 = parseFloat(driver.additional_charges_1) || 0;
//   const additional_charges_2 = parseFloat(driver.additional_charges_2) || 0;
//   const additional_charges_3 = parseFloat(driver.additional_charges_3) || 0;
//   const carryForwardAdmin = Number(rawData.carry_forward_admin_fee ?? 0);
//   const carryForwardVehicle = Number(
//     rawData.carry_forward_vehicle_hire_charge ?? 0,
//   );
//   const carryForwardInsurance = Number(
//     rawData.carry_forward_insurance_charge ?? 0,
//   );
//   const carryForwardFuel = Number(rawData.carry_forward_fuel_charge ?? 0);
//   const carriedForward =
//     carryForwardAdmin +
//     carryForwardVehicle +
//     carryForwardInsurance +
//     carryForwardFuel;

//   const carryForwardAdminVat =
//     carryForwardAdmin *
//     (Number(rawData.carry_forward_admin_vat_percent ?? 0) / 100);

//   const carryForwardVehicleVat =
//     carryForwardVehicle *
//     (Number(rawData.carry_forward_vehicle_vat_percent ?? 0) / 100);

//   const carryForwardInsuranceVat =
//     carryForwardInsurance *
//     (Number(rawData.carry_forward_insurance_vat_percent ?? 0) / 100);

//   const carryForwardFuelVat =
//     carryForwardFuel *
//     (Number(rawData.carry_forward_fuel_vat_percent ?? 0) / 100);

//   const carryForwardVat =
//     carryForwardAdminVat +
//     carryForwardVehicleVat +
//     carryForwardInsuranceVat +
//     carryForwardFuelVat;

//   // VAT amounts per row
//   const adminVatAmt = adminFee * (adminVatPct / 100);
//   const vehicleVatAmt = vehicleHire * (vehicleVatPct / 100);
//   const insuranceVatAmt = insurance * (insuranceVatPct / 100);
//   const fuelVatAmt = fuelCharge * (fuelVatPct / 100);
//   const additional_charges_vat_1_percent =
//     additional_charges_1 * (driver.additional_charges_vat_1_percent / 100) || 0;
//   const additional_charges_vat_2_percent =
//     additional_charges_2 * (driver.additional_charges_vat_2_percent / 100) || 0;
//   const additional_charges_vat_3_percent =
//     additional_charges_3 * (driver.additional_charges_vat_3_percent / 100) || 0;
//   const docketTotalVat =
//     rawData.docket_total * (driver.docket_total_vat_percent / 100) || 0;

//   // ✅ Calculate manual dockets total for deduction
//   let manualDocketsTotal = 0;
//   if (driver?.manual_dockets) {
//     let manualDockets = [];
//     if (typeof driver.manual_dockets === "string") {
//       try {
//         const parsed = JSON.parse(driver.manual_dockets);
//         manualDockets = Array.isArray(parsed) ? parsed : [];
//       } catch (err) {
//         manualDockets = [];
//       }
//     } else if (Array.isArray(driver.manual_dockets)) {
//       manualDockets = driver.manual_dockets;
//     }
//     manualDocketsTotal = manualDockets.reduce(
//       (sum, md) => sum + Number(md.driver_total || 0),
//       0,
//     );
//   }

//   // ✅ Include manual dockets in totalCharges
//   const totalCharges = Math.abs(
//     adminFee +
//     vehicleHire +
//     insurance +
//     fuelCharge +
//     additional +
//     additional_charges_1 +
//     additional_charges_2 +
//     additional_charges_3 +
//     carriedForward
//   );

//   const totalVatAmount =
//     adminVatAmt +
//     vehicleVatAmt +
//     insuranceVatAmt +
//     fuelVatAmt +
//     additional_charges_vat_1_percent +
//     additional_charges_vat_2_percent +
//     additional_charges_vat_3_percent +
//     carryForwardVat;
//   const adjustmentTotal = Math.abs(totalCharges + totalVatAmount - (manualDocketsTotal +
//     docketTotalVat));

//   const docketTotal = rawData.docket_total || calculatedDocketTotal;
//   const finalTotal =  rawData.final_total || docketTotal - adjustmentTotal;

//   return {
//     invoiceNumber: rawData.id || "",
//     selfBillDate: rawData.created_at || rawData.start_date || new Date(),
//     selfBillNumber: rawData.id?.slice(-6).toUpperCase() || "",
//     startDate: rawData.start_date,
//     endDate: rawData.end_date,
//     status: rawData.status || "",
//     driver: {
//       name: driver.name || "",
//       callsign: driver.call_sign || "",
//       addressLine1: addressParts[0] || driver.address_details || "",
//       city: addressParts[1] || "",
//       postcode: driver.zip_code || "",
//       phone: driver.phone_number || "",
//       email: driver.email || "",
//       bankAccountNo: driver.bank_account_no || "",
//       ibanNo: driver.iban_no || "",
//       paymentReference: driver.payment_reference || "",
//       payrollId: driver.payroll_id || "",
//       vat_number: driver.vat_number || ""
//     },
//     company: {
//       address: "Colnbrook Cargo Centre, Old Bath Road, Colnbrook, SL3 0NW.",
//       telephone: "+44 (0) 1784 242 824",
//       fax: "+44 (0) 1784 245 222",
//       email: "info@uchlogistics.co.uk",
//     },
//     billTo: {
//       companyName: "UCH Logistics Ltd",
//       addressLine1: "Colnbrook Cargo Centre",
//       addressLine2: "Old Bath Road",
//       city: "Colnbrook",
//       region: "Slough",
//       postcode: "SL3 0NW",
//       phone: "+44 (0)1784 242824",
//     },
//     dockets: transformedDockets,
//     adjustments: {
//       adminFee: {
//         value: adminFee,
//         vatPct: adminVatPct,
//         vatAmt: adminVatAmt,
//         rowTotal: adminFee + adminVatAmt,
//       },
//       vehicleHire: {
//         value: vehicleHire,
//         vatPct: vehicleVatPct,
//         vatAmt: vehicleVatAmt,
//         rowTotal: vehicleHire + vehicleVatAmt,
//       },
//       insurance: {
//         value: insurance,
//         vatPct: insuranceVatPct,
//         vatAmt: insuranceVatAmt,
//         rowTotal: insurance + insuranceVatAmt,
//       },
//       fuelCharge: {
//         value: fuelCharge,
//         vatPct: fuelVatPct,
//         vatAmt: fuelVatAmt,
//         rowTotal: fuelCharge + fuelVatAmt,
//       },
//       additional: {
//         value: additional,
//         vatPct: 0,
//         vatAmt: 0,
//         rowTotal: additional,
//       },
//       additional_charges_1: {
//         value: additional_charges_1,
//         vatPct: driver.additional_charges_vat_1_percent,
//         vatAmt: additional_charges_vat_1_percent,
//         rowTotal: additional_charges_1 + additional_charges_vat_1_percent,
//       },
//       additional_charges_2: {
//         value: additional_charges_2,
//         vatPct: driver.additional_charges_vat_2_percent,
//         vatAmt: additional_charges_vat_2_percent,
//         rowTotal: additional_charges_2 + additional_charges_vat_2_percent,
//       },
//       additional_charges_3: {
//         value: additional_charges_3,
//         vatPct: driver.additional_charges_vat_3_percent,
//         vatAmt: additional_charges_vat_3_percent,
//         rowTotal: additional_charges_3 + additional_charges_vat_3_percent,
//       },
//       carriedForward: {
//         value: carriedForward,
//         vatPct: 0,
//         vatAmt: carryForwardVat,
//         rowTotal: carriedForward,
//       },
//       // ✅ Added manual dockets to adjustments
//       manualDockets: {
//         value: manualDocketsTotal,
//         vatPct: 0,
//         vatAmt: 0,
//         rowTotal: manualDocketsTotal,
//       },
//       docketTotal: {
//         value: docketTotal,
//         vatPct: driver.docket_total_vat_percent,
//         vatAmt: docketTotalVat,
//         rowTotal: docketTotal,
//       },
//       totalCharges,
//       totalVatAmount,
//       adjustmentTotal,
//     },
//     totals: {
//       carriedForward: carriedForward + carryForwardVat,
//       docketTotal: docketTotal,
//       numberOfDockets: rawData.total_number_of_dockets || jobs.length,
//       totalDeductions: rawData.total_deductions || adjustmentTotal,
//       netAmount: rawData.net_amount || docketTotal,
//       grandTotal: finalTotal,
//     },
//     paymentDetails: {
//       bacs: finalTotal,
//       isPaid: rawData.is_paid || false,
//     },
//   };
// };


export const transformInvoiceData = (rawData) => {
  const { jobs = [], driver = {} } = rawData;

  console.group(`🔍 transformInvoiceData — invoice ${rawData.id || "(no id)"}`);
  console.log("RAW rawData:", rawData);
  console.log("RAW driver:", driver);
  console.log("RAW jobs count:", jobs.length);

  const calculatedDocketTotal = jobs.reduce(
    (sum, d) => sum + (parseFloat(d.driver_total) || 0),
    0,
  );
  console.log("calculatedDocketTotal (sum of job.driver_total):", calculatedDocketTotal);

  const transformedDockets = jobs.map((docket) => ({
    docket_no: docket.docket_no,
    pickupDateTime: docket.date_time,
    tariff: docket.tariff,
    journeyDetails: docket.journey,
    amount: docket.driver_total,
  }));

  const addressParts = (driver.address_details || "")
    .split(",")
    .map((s) => s.trim());

  // ---- Per-row charges & VAT percentages ----
  console.group("📥 Raw charge inputs");
  const adminFee = parseFloat(rawData.admin_fee) || 0;
  const adminVatPct = parseFloat(rawData.driver.vat_percent) || 0;
  const vehicleHire = parseFloat(rawData.vehicle_hire_charges) || 0;
  const vehicleVatPct = parseFloat(driver.vehicle_vat_percent) || 0;
  const insurance = parseFloat(rawData.insurance_charge) || 0;
  const insuranceVatPct = parseFloat(driver.insurance_vat_percent) || 0;
  const fuelCharge = parseFloat(rawData.fuel_charge) || 0;
  const fuelVatPct = parseFloat(driver.fuel_vat_percent) || 0;
  const additional = parseFloat(rawData.additional_charges) || 0;
  const additional_charges_1 = parseFloat(driver.additional_charges_1) || 0;
  const additional_charges_2 = parseFloat(driver.additional_charges_2) || 0;
  const additional_charges_3 = parseFloat(driver.additional_charges_3) || 0;

  console.table({
    adminFee, adminVatPct,
    vehicleHire, vehicleVatPct,
    insurance, insuranceVatPct,
    fuelCharge, fuelVatPct,
    additional,
    additional_charges_1, additional_charges_2, additional_charges_3,
  });
  // NOTE: rawData.driver.vat_percent is used for adminVatPct instead of driver.vat_percent.
  // These should be the same object (driver = rawData.driver), but log both raw sources to be sure.
  console.log("Sanity check — rawData.driver === driver?", rawData.driver === driver);
  console.log("rawData.driver.vat_percent:", rawData.driver?.vat_percent, "| driver.vat_percent:", driver.vat_percent);
  console.groupEnd();

  // ---- Carry forward charges ----
  console.group("📥 Carry-forward inputs");
  const carryForwardAdmin = Number(rawData.carry_forward_admin_fee ?? 0);
  const carryForwardVehicle = Number(
    rawData.carry_forward_vehicle_hire_charge ?? 0,
  );
  const carryForwardInsurance = Number(
    rawData.carry_forward_insurance_charge ?? 0,
  );
  const carryForwardFuel = Number(rawData.carry_forward_fuel_charge ?? 0);
  const carriedForward =
    carryForwardAdmin +
    carryForwardVehicle +
    carryForwardInsurance +
    carryForwardFuel;

  console.table({
    carryForwardAdmin, carryForwardVehicle, carryForwardInsurance, carryForwardFuel,
  });
  console.log("carriedForward (sum of the 4 above):", carriedForward);

  const carryForwardAdminVat =
    carryForwardAdmin *
    (Number(rawData.carry_forward_admin_vat_percent ?? 0) / 100);

  const carryForwardVehicleVat =
    carryForwardVehicle *
    (Number(rawData.carry_forward_vehicle_vat_percent ?? 0) / 100);

  const carryForwardInsuranceVat =
    carryForwardInsurance *
    (Number(rawData.carry_forward_insurance_vat_percent ?? 0) / 100);

  const carryForwardFuelVat =
    carryForwardFuel *
    (Number(rawData.carry_forward_fuel_vat_percent ?? 0) / 100);

  const carryForwardVat =
    carryForwardAdminVat +
    carryForwardVehicleVat +
    carryForwardInsuranceVat +
    carryForwardFuelVat;

  console.table({
    carryForwardAdminVat, carryForwardVehicleVat, carryForwardInsuranceVat, carryForwardFuelVat,
  });
  console.log("carryForwardVat (sum of the 4 above):", carryForwardVat);
  console.groupEnd();

  // ---- VAT amounts per row ----
  console.group("💷 VAT amount calculations");
  const adminVatAmt = adminFee * (adminVatPct / 100);
  const vehicleVatAmt = vehicleHire * (vehicleVatPct / 100);
  const insuranceVatAmt = insurance * (insuranceVatPct / 100);
  const fuelVatAmt = fuelCharge * (fuelVatPct / 100);
  const additional_charges_vat_1_percent =
    additional_charges_1 * (driver.additional_charges_vat_1_percent / 100) || 0;
  const additional_charges_vat_2_percent =
    additional_charges_2 * (driver.additional_charges_vat_2_percent / 100) || 0;
  const additional_charges_vat_3_percent =
    additional_charges_3 * (driver.additional_charges_vat_3_percent / 100) || 0;
  const docketTotalVat =
    rawData.docket_total * (driver.docket_total_vat_percent / 100) || 0;

  console.table({
    adminVatAmt,
    vehicleVatAmt,
    insuranceVatAmt,
    fuelVatAmt,
    additional_charges_vat_1_percent,
    additional_charges_vat_2_percent,
    additional_charges_vat_3_percent,
    docketTotalVat,
  });
  console.log("rawData.docket_total (used for docketTotalVat):", rawData.docket_total,
    "| driver.docket_total_vat_percent:", driver.docket_total_vat_percent);
  console.groupEnd();

  // ---- Manual dockets ----
  console.group("📄 Manual dockets");
  let manualDocketsTotal = 0;
  if (driver?.manual_dockets) {
    let manualDockets = [];
    if (typeof driver.manual_dockets === "string") {
      try {
        const parsed = JSON.parse(driver.manual_dockets);
        manualDockets = Array.isArray(parsed) ? parsed : [];
      } catch (err) {
        console.warn("⚠️ Failed to parse driver.manual_dockets JSON:", err, driver.manual_dockets);
        manualDockets = [];
      }
    } else if (Array.isArray(driver.manual_dockets)) {
      manualDockets = driver.manual_dockets;
    }
    manualDocketsTotal = manualDockets.reduce(
      (sum, md) => sum + Number(md.driver_total || 0),
      0,
    );
    console.log("Parsed manualDockets array:", manualDockets);
  } else {
    console.log("No manual_dockets on driver.");
  }
  console.log("manualDocketsTotal:", manualDocketsTotal);
  console.groupEnd();

  // ---- Totals ----
  console.group("🧮 Totals build-up");

  const totalCharges = Math.abs(
    adminFee +
    vehicleHire +
    insurance +
    fuelCharge +
    additional +
    additional_charges_1 +
    additional_charges_2 +
    additional_charges_3 +
    carriedForward
  );
  console.log("totalCharges (abs of all base charges + carriedForward, NO vat, NO manual dockets):", totalCharges);

  const totalVatAmount =
    adminVatAmt +
    vehicleVatAmt +
    insuranceVatAmt +
    fuelVatAmt +
    additional_charges_vat_1_percent +
    additional_charges_vat_2_percent +
    additional_charges_vat_3_percent +
    carryForwardVat;
  console.log("totalVatAmount (sum of all VAT amts incl carryForwardVat):", totalVatAmount);

  const preAbsAdjustment = totalCharges + totalVatAmount - (manualDocketsTotal + docketTotalVat);
  console.log("pre-abs adjustmentTotal = totalCharges + totalVatAmount - (manualDocketsTotal + docketTotalVat):", preAbsAdjustment,
    preAbsAdjustment < 0 ? "⚠️ NEGATIVE before Math.abs() — sign will flip!" : "");
  const adjustmentTotal = Math.abs(preAbsAdjustment);
  console.log("adjustmentTotal (post abs):", adjustmentTotal);

  const docketTotal = rawData.docket_total || calculatedDocketTotal;
  console.log("docketTotal (rawData.docket_total || calculatedDocketTotal):", docketTotal,
    "| source used:", rawData.docket_total ? "rawData.docket_total" : "calculatedDocketTotal");

  const finalTotal = rawData.final_total || docketTotal - adjustmentTotal;
  console.log("finalTotal (rawData.final_total || docketTotal - adjustmentTotal):", finalTotal,
    "| source used:", rawData.final_total ? "rawData.final_total" : "docketTotal - adjustmentTotal");
  console.log("  docketTotal - adjustmentTotal =", docketTotal, "-", adjustmentTotal, "=", docketTotal - adjustmentTotal);

  console.groupEnd();

  const result = {
    invoiceNumber: rawData.id || "",
    selfBillDate: rawData.created_at || rawData.start_date || new Date(),
    selfBillNumber: rawData.id?.slice(-6).toUpperCase() || "",
    startDate: rawData.start_date,
    endDate: rawData.end_date,
    status: rawData.status || "",
    driver: {
      name: driver.name || "",
      callsign: driver.call_sign || "",
      addressLine1: addressParts[0] || driver.address_details || "",
      city: addressParts[1] || "",
      postcode: driver.zip_code || "",
      phone: driver.phone_number || "",
      email: driver.email || "",
      bankAccountNo: driver.bank_account_no || "",
      ibanNo: driver.iban_no || "",
      paymentReference: driver.payment_reference || "",
      payrollId: driver.payroll_id || "",
      vat_number: driver.vat_number || ""
    },
    company: {
      address: "Colnbrook Cargo Centre, Old Bath Road, Colnbrook, SL3 0NW.",
      telephone: "+44 (0) 1784 242 824",
      fax: "+44 (0) 1784 245 222",
      email: "info@uchlogistics.co.uk",
    },
    billTo: {
      companyName: "UCH Logistics Ltd",
      addressLine1: "Colnbrook Cargo Centre",
      addressLine2: "Old Bath Road",
      city: "Colnbrook",
      region: "Slough",
      postcode: "SL3 0NW",
      phone: "+44 (0)1784 242824",
    },
    dockets: transformedDockets,
    adjustments: {
      adminFee: {
        value: adminFee,
        vatPct: adminVatPct,
        vatAmt: adminVatAmt,
        rowTotal: adminFee + adminVatAmt,
      },
      vehicleHire: {
        value: vehicleHire,
        vatPct: vehicleVatPct,
        vatAmt: vehicleVatAmt,
        rowTotal: vehicleHire + vehicleVatAmt,
      },
      insurance: {
        value: insurance,
        vatPct: insuranceVatPct,
        vatAmt: insuranceVatAmt,
        rowTotal: insurance + insuranceVatAmt,
      },
      fuelCharge: {
        value: fuelCharge,
        vatPct: fuelVatPct,
        vatAmt: fuelVatAmt,
        rowTotal: fuelCharge + fuelVatAmt,
      },
      additional: {
        value: additional,
        vatPct: 0,
        vatAmt: 0,
        rowTotal: additional,
      },
      additional_charges_1: {
        value: additional_charges_1,
        vatPct: driver.additional_charges_vat_1_percent,
        vatAmt: additional_charges_vat_1_percent,
        rowTotal: additional_charges_1 + additional_charges_vat_1_percent,
      },
      additional_charges_2: {
        value: additional_charges_2,
        vatPct: driver.additional_charges_vat_2_percent,
        vatAmt: additional_charges_vat_2_percent,
        rowTotal: additional_charges_2 + additional_charges_vat_2_percent,
      },
      additional_charges_3: {
        value: additional_charges_3,
        vatPct: driver.additional_charges_vat_3_percent,
        vatAmt: additional_charges_vat_3_percent,
        rowTotal: additional_charges_3 + additional_charges_vat_3_percent,
      },
      carriedForward: {
        value: carriedForward,
        vatPct: 0,
        vatAmt: carryForwardVat,
        rowTotal: carriedForward,
      },
      // ✅ Added manual dockets to adjustments
      manualDockets: {
        value: manualDocketsTotal,
        vatPct: 0,
        vatAmt: 0,
        rowTotal: manualDocketsTotal,
      },
      docketTotal: {
        value: docketTotal,
        vatPct: driver.docket_total_vat_percent,
        vatAmt: docketTotalVat,
        rowTotal: docketTotal,
      },
      totalCharges,
      totalVatAmount,
      adjustmentTotal,
    },
    totals: {
      carriedForward: carriedForward + carryForwardVat,
      docketTotal: docketTotal,
      numberOfDockets: rawData.total_number_of_dockets || jobs.length,
      totalDeductions: rawData.total_deductions || adjustmentTotal,
      netAmount: rawData.net_amount || docketTotal,
      grandTotal: finalTotal,
    },
    paymentDetails: {
      bacs: finalTotal,
      isPaid: rawData.is_paid || false,
    },
  };

  console.log("✅ FINAL RESULT:", result);
  console.groupEnd();

  return result;
};

const DOCKETS_PER_PAGE = 45;

const paginateDockets = (dockets) => {
  if (dockets.length === 0) return [[]];

  const pages = [];
  let remaining = [...dockets];

  while (remaining.length > 0) {
    pages.push(remaining.splice(0, DOCKETS_PER_PAGE));
  }

  return pages;
};

export const generateInvoiceHTML = (rawInvoiceData) => {
  const invoice = transformInvoiceData(rawInvoiceData);

  const {
    invoiceNumber = "",
    selfBillDate = new Date(),
    selfBillNumber = "",
    driver = {},
    billTo = {},
    dockets = [],
    adjustments = {},
    totals = {},
    paymentDetails = {},
  } = invoice;

  const docketPages = paginateDockets(dockets);
  const totalPages = docketPages.length;

  const generateDocketRows = (pageDockets) => {
    return pageDockets
      .map(
        (docket) => `
        <ul style="list-style: none; display: flex; padding: 0; margin: 0; font-size:10px ; white-space: nowrap">
          <li style="text-align: left; font-weight: 500; flex-basis: 10%">
            ${docket.docket_no || ""}
          </li>
          <li style="text-align: left; font-weight: 500; flex-basis: 15%">
            ${formatDateTime(docket.pickupDateTime)}
          </li>
          <li style="text-align: left; font-weight: 500; flex-basis: 18%">
            ${docket.tariff || ""}
          </li>
          <li style="text-align: left; font-weight: 400; flex-basis: 40%">
            ${docket.journeyDetails || ""}
          </li>
          <li style="text-align: right; font-weight: 500; flex-grow: 1; padding: 0 20px">
            ${formatCurrency(docket.amount)}
          </li>
        </ul>`,
      )
      .join("");
  };

  const tableHeader = `
        <ul
          style="
            border: 2px solid #000;
            border-right: 0;
            border-left: 0;
            list-style: none;
            display: flex;
            padding: 4px 0;
            margin: 0;
            margin-bottom: 5px;
          "
        >
          <li style="text-align: left; font-weight: 400; flex-basis: 10%">
            Docket No.
          </li>
          <li style="text-align: left; font-weight: 400; flex-basis: 15%">
            Pickup Date/Time
          </li>
          <li style="text-align: left; font-weight: 400; flex-basis: 18%">
            Tariff
          </li>
          <li style="text-align: left; font-weight: 400; flex-basis: 40%">
            Journey Details
          </li>
          <li
            style="
              text-align: right;
              font-weight: 400;
              flex-grow: 1;
              padding: 0 20px;
            "
          >
            Amount
          </li>
        </ul>`;

  const generatePage = (pageDockets, pageNumber, isLastPage) => {
    const showFooter = isLastPage;

    return `
    <!-- Page ${pageNumber} -->
    <div
      style="
        width: 100%;
        max-width: 794px;
        min-height: 1123px;
        background: #ffffff;
        margin: 20px auto;
        padding: clamp(16px, 4vw, 40px);
        box-sizing: border-box;
        color: #000;
        font-size: 12px;
        position: relative;
      "
    >
      <!-- HEADER -->
      ${
        pageNumber === 1
          ? `
      <div
        style="display: flex; justify-content: space-between; padding: 0 40px"
      >
        <div>
          <strong>TO:</strong><br />
          <strong>${billTo.companyName}</strong><br />
          ${billTo.addressLine1}<br />
          ${billTo.addressLine2}<br />
          ${billTo.city}<br />
          ${billTo.region}<br />
          ${billTo.postcode}<br />
          ${billTo.phone}
        </div>
      </div>

      <hr style="margin: 25px 0; border: 0; border-top: 2px solid #000" />

      <!-- FROM + INFO -->
      <div
        style="display: flex; justify-content: space-between; padding: 0 80px"
      >
        <div>
          <strong>FROM:</strong><br />
          ${driver.name}<br />
          ${driver.addressLine1}<br />
          ${driver.city}<br />
          ${driver.postcode}
        </div>

        <div>
          <table style="border-collapse: collapse">
            <tr>
              <td style="padding: 2px 8px">Driver Callsign:</td>
              <td style="padding: 2px 8px">${driver.callsign}</td>
            </tr>
            <tr>
              <td style="padding: 2px 8px">Self Bill Date:</td>
              <td style="padding: 2px 8px">${formatDate(selfBillDate)}</td>
            </tr>
            <tr>
              <td style="padding: 2px 8px">Self Bill Number:</td>
              <td style="padding: 2px 8px">${selfBillNumber}</td>
            </tr>
            <tr>
              <td style="padding: 2px 8px"></td>
              <td style="padding: 2px 8px">Page: ${pageNumber} of ${totalPages}</td>
            </tr>
            <tr>
              <td style="padding: 2px 8px">VAT No:</td>
              <td style="padding: 2px 8px">${driver.vat_number ?? N/A}</td>
            </tr>
          </table>
        </div>
      </div>
      `
          : `
      <div style="text-align: right; padding: 0 40px; margin-bottom: 10px;">
        <strong>Page: ${pageNumber} of ${totalPages}</strong>
      </div>
      `
      }

      <!-- Dockets List -->
      <div style="width: 100%; margin-top: 25px; font-size: 11px">
        ${tableHeader}
        ${generateDocketRows(pageDockets)}
      </div>

      ${
        showFooter
          ? `
      <!-- Footer Section -->
      <footer style="position: absolute; bottom: 40px; width: 90%;">
        <!-- TOTAL -->
        <div
          style="
            display: flex;
            justify-content: space-between;
            border: 2px solid #000;
            border-left: 0;
            border-right: 0;
            padding: 8px 0;
          "
        >
          <div >Number of Dockets: ${totals.numberOfDockets}</div>
          <div
            style="display: flex; align-items: center; gap: 40px; padding: 0 20px"
          >
            Docket Total: <span>${formatCurrency(totals.docketTotal)}</span>
          </div>
        </div>

        <!-- ADJUSTMENTS -->
<div style="margin-top: 10px">
  <strong style="font-size:11px">Pay Adjustment Detail</strong>

  <div style="width: 70%; margin-top: 4px; border-bottom: 1px solid #000">
    <!-- Header -->
    <ul style="list-style:none; display:flex; align-items:center; padding:0; margin:0; border-bottom:1px solid #ccc; padding-bottom:3px;">
      <li style="flex-basis:38%">Description</li>
      <li style="flex-basis:14%; text-align:center">Value</li>
      <li style="flex-basis:10%; text-align:center">VAT %</li>
      <li style="flex-basis:14%; text-align:center">VAT £</li>
    </ul>

    ${
      adjustments.adminFee?.value
        ? `
    <ul style="list-style:none; display:flex; align-items:center; padding:2px 0; margin:0;">
      <li style="flex-basis:38%">Admin Fee</li>
      <li style="flex-basis:14%; text-align:center">-${formatCurrency(adjustments.adminFee.value)}</li>
      <li style="flex-basis:10%; text-align:center">${adjustments.adminFee.vatPct}%</li>
      <li style="flex-basis:14%; text-align:center">-${formatCurrency(adjustments.adminFee.vatAmt)}</li>
    </ul>`
        : ""
    }

    ${
      adjustments.vehicleHire?.value
        ? `
    <ul style="list-style:none; display:flex; align-items:center; padding:2px 0; margin:0;">
      <li style="flex-basis:38%">Vehicle Hire charges</li>
      <li style="flex-basis:14%; text-align:center">-${formatCurrency(adjustments.vehicleHire.value)}</li>
      <li style="flex-basis:10%; text-align:center">${adjustments.vehicleHire.vatPct}%</li>
      <li style="flex-basis:14%; text-align:center">-${formatCurrency(adjustments.vehicleHire.vatAmt)}</li>
    </ul>`
        : ""
    }

    ${
      adjustments.insurance?.value
        ? `
    <ul style="list-style:none; display:flex; align-items:center; padding:2px 0; margin:0;">
      <li style="flex-basis:38%">Insurance charge</li>
      <li style="flex-basis:14%; text-align:center">-${formatCurrency(adjustments.insurance.value)}</li>
      <li style="flex-basis:10%; text-align:center">${adjustments.insurance.vatPct}%</li>
      <li style="flex-basis:14%; text-align:center">-${formatCurrency(adjustments.insurance.vatAmt)}</li>
    </ul>`
        : ""
    }

    ${
      adjustments.fuelCharge?.value
        ? `
    <ul style="list-style:none; display:flex; align-items:center; padding:2px 0; margin:0;">
      <li style="flex-basis:38%">Fuel charge</li>
      <li style="flex-basis:14%; text-align:center">-${formatCurrency(adjustments.fuelCharge.value)}</li>
      <li style="flex-basis:10%; text-align:center">${adjustments.fuelCharge.vatPct}%</li>
      <li style="flex-basis:14%; text-align:center">-${formatCurrency(adjustments.fuelCharge.vatAmt)}</li>
    </ul>`
        : ""
    }

    ${
      adjustments.additional?.value
        ? `
    <ul style="list-style:none; display:flex; align-items:center; padding:2px 0; margin:0;">
      <li style="flex-basis:38%">Any additional charges</li>
      <li style="flex-basis:14%; text-align:center">-${formatCurrency(adjustments.additional.value)}</li>
      <li style="flex-basis:10%; text-align:center">-</li>
      <li style="flex-basis:14%; text-align:center">-</li>
    </ul>`
        : ""
    }

    ${
      adjustments.additional_charges_1?.value
        ? `
    <ul style="list-style:none; display:flex; align-items:center; padding:2px 0; margin:0;">
      <li style="flex-basis:38%">Additional charges 1</li>
      <li style="flex-basis:14%; text-align:center">-${formatCurrency(adjustments.additional_charges_1.value)}</li>
      <li style="flex-basis:10%; text-align:center">${adjustments.additional_charges_1.vatPct}%</li>
      <li style="flex-basis:14%; text-align:center">-${formatCurrency(adjustments.additional_charges_1.vatAmt)}</li>
    </ul>`
        : ""
    }

    ${
      adjustments.additional_charges_2?.value
        ? `
    <ul style="list-style:none; display:flex; align-items:center; padding:2px 0; margin:0;">
      <li style="flex-basis:38%">Additional charges 2</li>
      <li style="flex-basis:14%; text-align:center">-${formatCurrency(adjustments.additional_charges_2.value)}</li>
      <li style="flex-basis:10%; text-align:center">${adjustments.additional_charges_2.vatPct}%</li>
      <li style="flex-basis:14%; text-align:center">-${formatCurrency(adjustments.additional_charges_2.vatAmt)}</li>
    </ul>`
        : ""
    }

    ${
      adjustments.additional_charges_3?.value
        ? `
    <ul style="list-style:none; display:flex; align-items:center; padding:2px 0; margin:0;">
      <li style="flex-basis:38%">Additional charges 3</li>
      <li style="flex-basis:14%; text-align:center">-${formatCurrency(adjustments.additional_charges_3.value)}</li>
      <li style="flex-basis:10%; text-align:center">${adjustments.additional_charges_3.vatPct}%</li>
      <li style="flex-basis:14%; text-align:center">-${formatCurrency(adjustments.additional_charges_3.vatAmt)}</li>
    </ul>`
        : ""
    }

      ${
        adjustments.docketTotal?.vatPct
          ? `
    <ul style="list-style:none; display:flex; align-items:center; padding:2px 0; margin:0;">
      <li style="flex-basis:38%">Docket Vat</li>
      <li style="flex-basis:14%; text-align:center">+${formatCurrency(adjustments.docketTotal.value)}</li>
      <li style="flex-basis:10%; text-align:center">+${formatCurrency(adjustments.docketTotal.vatPct)}%</li>
      <li style="flex-basis:14%; text-align:center">+${formatCurrency(adjustments.docketTotal.vatAmt)}</li>
    </ul>`
          : ""
      }

    ${
      adjustments.carriedForward?.value
        ? `
    <ul style="list-style:none; display:flex; align-items:center; padding:2px 0; margin:0;">
      <li style="flex-basis:38%">Carried Forward</li>
      <li style="flex-basis:14%; text-align:center">-${formatCurrency(adjustments.carriedForward.value)}</li>
      <li style="flex-basis:10%; text-align:center">-</li>
      <li style="flex-basis:14%; text-align:center">-${formatCurrency(adjustments.carriedForward.vatAmt)}</li>
    </ul>`
        : ""
    }

    ${(() => {
      // Normalize manual dockets from string or array
      let manualDockets = [];
      if (rawInvoiceData.driver?.manual_dockets) {
        if (typeof rawInvoiceData.driver.manual_dockets === "string") {
          try {
            const parsed = JSON.parse(rawInvoiceData.driver.manual_dockets);
            manualDockets = Array.isArray(parsed) ? parsed : [];
          } catch (err) {
            manualDockets = [];
          }
        } else if (Array.isArray(rawInvoiceData.driver.manual_dockets)) {
          manualDockets = rawInvoiceData.driver.manual_dockets;
        }
      }

      if (manualDockets.length === 0) {
        return "";
      }

      // Calculate total of manual dockets
      const manualDocketTotal = manualDockets.reduce(
        (sum, md) => sum + Number(md.driver_total || 0),
        0,
      );

      const docketRows = manualDockets
        .map(
          (md) => `
    <ul style="list-style:none; display:flex; align-items:center; padding:2px 0; margin:0;">
      <li style="flex-basis:38%">${md.docket_no}</li>
      <li style="flex-basis:14%; text-align:center">${formatCurrency(Number(md.driver_total || 0))}</li>
      <li style="flex-basis:10%; text-align:center">-</li>
      <li style="flex-basis:14%; text-align:center">-</li>
    </ul>`,
        )
        .join("");

      return `
    ${docketRows}
    <ul style="list-style:none; display:flex; align-items:center; padding:2px 0; margin:0; margin-top:4px; padding-top:6px; border-top:1px solid #000; font-weight:bold;">
      <li style="flex-basis:38%">Manual Dockets Total</li>
      <li style="flex-basis:14%; text-align:center">+${formatCurrency(manualDocketTotal)}</li>
      <li style="flex-basis:10%; text-align:center">-</li>
      <li style="flex-basis:14%; text-align:center">-</li>
    </ul>`;
    })()}
  </div>
</div>

<!-- FINAL TOTAL -->
<div style="border-bottom: 2px solid black; padding: 4px 0">
  <ul style="list-style:none; display:flex; align-items:center; padding:0; margin:0;">
    <ul style="list-style:none; display:flex; align-items:center; padding:0; margin:0; width:100%; max-width:70%;">
      <li style="flex-basis:38%">Total</li>
      <li style="flex-basis:14%; text-align:center">-${formatCurrency(adjustments.totalCharges)}</li>
      <li style="flex-basis:10%; text-align:center"></li>
      <li style="flex-basis:14%; text-align:center">-${formatCurrency(adjustments.totalVatAmount)}</li>
    </ul>
    <li style="flex-grow:1; text-align:right">Adjustment Total:</li>
    <li style="flex-basis:12%; text-align:center">-${formatCurrency(adjustments.adjustmentTotal)}</li>
  </ul>
</div>

        <!-- Query -->
        <div
          style="
            padding: 0 0 25px 0;
            font-size: 11px;
            display: flex;
            align-items: center;
            border-bottom: 1px solid black;
          "
        >
          <strong style="flex-basis: 95%; text-align: right; padding-top: 10px;">Total:</strong>
          <strong style="flex-basis: 10%; text-align: center; padding-top: 10px;">${formatCurrency(
            totals.grandTotal,
          )}</strong>
        </div>

        <!-- Payment Detail -->
        <div
          style="
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            padding-top: 2px;
          "
        >
          <strong>Payment Details</strong>
          <div style="display: flex; align-items: center; width: 50%; gap: 10px">
            <span>Signed:</span>
            <div style="border: 2px solid gray; padding: 5px; width: 100%">
              
            </div>
          </div>
        </div>
        <p style="margin: 0;">BACS: ${formatCurrency(paymentDetails.bacs)}</p>
      </footer>
      `
          : ""
      }
    </div>`;
  };

  let allPages = "";

  docketPages.forEach((pageDockets, index) => {
    const isLastPage = index === totalPages - 1;
    const pageNumber = index + 1;
    allPages += generatePage(pageDockets, pageNumber, isLastPage);
  });

  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Invoice ${invoiceNumber}</title>
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      body {
        margin: 0;
        padding: 0;
        background: #282828;
        font-family: Arial, Helvetica, sans-serif;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      @page {
        size: A4;
        margin: 0;
      }
      @media print {
        body {
          background: #fff;
        }
        div[style*="margin: 20px auto"] {
          margin: 0 !important;
          page-break-after: always;
        }
        div[style*="margin: 20px auto"]:last-child {
          page-break-after: auto;
        }
      }
    </style>
  </head>
  <body>
    ${allPages}
  </body>
</html>`;
};
