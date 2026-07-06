import fs from "fs";
import path from "path";
import { transformInvoiceData } from "./generateInvoiceHTML.js";

function escapeCsv(value) {
  if (value === null || value === undefined) return '""';

  const str = String(value);

  return `"${str.replace(/"/g, '""')}"`;
}

const formatDate = (date) => {
  if (!date) return "";

  return new Date(date).toLocaleDateString("en-GB");
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

const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return "";
  return parseFloat(amount).toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export function generateInvoiceCsv(rawInvoiceData) {
  /**
   * USE SAME DATA AS PDF
   */
  const invoice = transformInvoiceData(rawInvoiceData);

  const rows = [];

  /**
   * Header
   */
  rows.push(["Invoice Summary"]);

  rows.push([
    "Invoice Number",
    invoice.selfBillNumber,
  ]);

  rows.push([
    "Self Bill Date",
    formatDate(invoice.selfBillDate),
  ]);

  rows.push([
    "VAT No",
    invoice.driver.vat_number
  ]);

  rows.push([
    "Period",
    `${formatDate(invoice.startDate)} - ${formatDate(invoice.endDate)}`,
  ]);

  rows.push([
    "Status",
    invoice.status,
  ]);

  rows.push([]);

  /**
   * Driver
   */
  rows.push(["Driver Information"]);

  rows.push([
    "Driver Name",
    invoice.driver.name,
  ]);

  rows.push([
    "Callsign",
    invoice.driver.callsign,
  ]);

  rows.push([
    "Phone",
    invoice.driver.phone,
  ]);

  rows.push([
    "Email",
    invoice.driver.email,
  ]);

  rows.push([
    "Address",
    invoice.driver.addressLine1,
  ]);

  rows.push([
    "Postcode",
    invoice.driver.postcode,
  ]);

  rows.push([]);

  /**
   * Dockets
   */
  rows.push(["Docket Details"]);

  rows.push([
    "Docket No",
    "Pickup Date/Time",
    "Tariff",
    "Journey Details",
    "Amount (£)",
  ]);

  invoice.dockets.forEach((docket) => {
    rows.push([
      docket.docket_no || "",
      formatDateTime(docket.pickupDateTime),
      docket.tariff || "",
      docket.journeyDetails || "",
      formatCurrency(docket.amount),
    ]);
  });

  rows.push([]);

  rows.push([
    "Number of Dockets",
    invoice.totals.numberOfDockets,
  ]);

  rows.push([
    "Docket Total (£)",
    formatCurrency(invoice.totals.docketTotal),
  ]);

  rows.push([]);

  /**
   * PAY ADJUSTMENTS
   */
  rows.push(["Pay Adjustment Detail"]);

  rows.push([
    "Description",
    "Value (£)",
    "VAT %",
    "VAT (£)",
  ]);

  const adjustments = invoice.adjustments;

  if (adjustments.adminFee?.value) {
    rows.push([
      "Admin Fee",
      formatCurrency(adjustments.adminFee.value),
      `${adjustments.adminFee.vatPct}%`,
      formatCurrency(adjustments.adminFee.vatAmt),
    ]);
  }

  if (adjustments.vehicleHire?.value) {
    rows.push([
      "Vehicle Hire charges",
      formatCurrency(adjustments.vehicleHire.value),
      `${adjustments.vehicleHire.vatPct}%`,
      formatCurrency(adjustments.vehicleHire.vatAmt),
    ]);
  }

  if (adjustments.insurance?.value) {
    rows.push([
      "Insurance charge",
      formatCurrency(adjustments.insurance.value),
      `${adjustments.insurance.vatPct}%`,
      formatCurrency(adjustments.insurance.vatAmt),
    ]);
  }

  if (adjustments.fuelCharge?.value) {
    rows.push([
      "Fuel charge",
      formatCurrency(adjustments.fuelCharge.value),
      `${adjustments.fuelCharge.vatPct}%`,
      formatCurrency(adjustments.fuelCharge.vatAmt),
    ]);
  }

  if (adjustments.additional?.value) {
    rows.push([
      "Any additional charges",
      formatCurrency(adjustments.additional.value),
      "-",
      "-",
    ]);
  }

  if (adjustments.additional_charges_1?.value) {
    rows.push([
      "Additional charges 1",
      formatCurrency(
        adjustments.additional_charges_1.value,
      ),
      `${adjustments.additional_charges_1.vatPct}%`,
      formatCurrency(
        adjustments.additional_charges_1.vatAmt,
      ),
    ]);
  }

  if (adjustments.additional_charges_2?.value) {
    rows.push([
      "Additional charges 2",
      formatCurrency(
        adjustments.additional_charges_2.value,
      ),
      `${adjustments.additional_charges_2.vatPct}%`,
      formatCurrency(
        adjustments.additional_charges_2.vatAmt,
      ),
    ]);
  }

  if (adjustments.additional_charges_3?.value) {
    rows.push([
      "Additional charges 3",
      formatCurrency(
        adjustments.additional_charges_3.value,
      ),
      `${adjustments.additional_charges_3.vatPct}%`,
      formatCurrency(
        adjustments.additional_charges_3.vatAmt,
      ),
    ]);
  }

  if (adjustments.carriedForward?.value) {
    rows.push([
      "Carried Forward",
      formatCurrency(
        adjustments.carriedForward.value,
      ),
      "-",
      formatCurrency(
        adjustments.carriedForward.vatAmt,
      ),
    ]);
  }

  rows.push([]);

  rows.push([
    "Total Charges (£)",
    formatCurrency(adjustments.totalCharges),
  ]);

  rows.push([
    "Total VAT (£)",
    formatCurrency(adjustments.totalVatAmount),
  ]);

  rows.push([
    "Adjustment Total (£)",
    formatCurrency(adjustments.adjustmentTotal),
  ]);

  rows.push([]);

  rows.push([
    "Final Total (£)",
    formatCurrency(invoice.totals.grandTotal),
  ]);

  rows.push([
    "BACS Payment (£)",
    formatCurrency(invoice.paymentDetails.bacs),
  ]);

  /**
   * Generate CSV
   */
  const csvContent = rows
    .map((row) =>
      row.map(escapeCsv).join(","),
    )
    .join("\n");

  const dirPath = path.join(
    process.cwd(),
    "src/public/invoices",
  );

  fs.mkdirSync(dirPath, {
    recursive: true,
  });

  const fileName = `invoice-${invoice.selfBillNumber}-${Date.now()}.csv`;

  const filePath = path.join(
    dirPath,
    fileName,
  );

  fs.writeFileSync(
    filePath,
    csvContent,
    "utf8",
  );

  return {
    fileName,
    filePath,
  };
}