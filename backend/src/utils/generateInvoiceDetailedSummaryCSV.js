import path from "path";
import fs from "fs";

const escapeCsv = (value) => {
  const str = value === null || value === undefined ? "" : String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const formatDate = (date) => {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-GB", {
    timeZone: "Europe/London",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).replace(/\//g, "-"); // gives DD-MM-YYYY
};

export const generateDetailedInvoiceSummaryCSVFile = async (data) => {
  const { invoiceBatch } = data;

  // Validate input
  if (!invoiceBatch) {
    throw new Error("invoiceBatch data is required");
  }

  const { batch_code, from_date, to_date, invoices } = invoiceBatch;

  if (!invoices || invoices.length === 0) {
    throw new Error("No invoices found in the batch");
  }

  // Ensure directory exists
  const dirPath = path.join(process.cwd(), "src/public/invoices");
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  const formattedInvoiceDate = formatDate(from_date) + " - " + formatDate(to_date);
  const printDate = formatDate(new Date());

  // Sort invoices by callsign (mirrors PDF sort)
  const sortedInvoices = [...invoices].sort((a, b) => {
    const callsignA = a.driver?.call_sign || "";
    const callsignB = b.driver?.call_sign || "";
    return callsignA.localeCompare(callsignB);
  });

  // Calculate totals & build rows (mirrors PDF row building)
  let totalJobs = 0;
  let totalDriversPay = 0;

  const rows = sortedInvoices.map((invoice) => {
    const callsign = invoice.driver?.call_sign || "N/A";
    const driverName = invoice.driver?.name || "N/A";
    const selfBillNumber = invoice.generated_id || "";
    const jobs = invoice.total_number_of_dockets || 0;
    const driversPay = parseFloat(invoice.final_total) || 0;

    totalJobs += jobs;
    totalDriversPay += driversPay;

    return { callsign, driverName, selfBillNumber, jobs, driversPay };
  });

  // Metadata rows (mirrors PDF header section)
  const metaRows = [
    [`Pay Batch ${batch_code}`, "UCH Logistics Ltd", `Print Date ${printDate}`],
    [`Invoice Date ${formattedInvoiceDate}`, "", ""],
    [], // blank spacer
  ];

  // Column headers (mirrors PDF table headers)
  const columnHeaders = [
    "Callsign",
    "Driver Name",
    "Self Bill Number",
    "Jobs",
    "Drivers Pay",
  ];

  // Data rows
  const dataRows = rows.map((row) => [
    row.callsign,
    row.driverName,
    row.selfBillNumber,
    row.jobs,
    row.driversPay.toFixed(2),
  ]);

  // Total row (mirrors PDF total row on last page)
  const totalRow = ["", "", "", totalJobs, totalDriversPay.toFixed(2)];

  const allRows = [
    ...metaRows,
    columnHeaders,
    ...dataRows,
    totalRow,
  ];

  const csvContent = allRows
    .map((row) => row.map(escapeCsv).join(","))
    .join("\n");

  const fileName = `detailed-invoice-summary-batch-${batch_code}-${Date.now()}.csv`;
  const filePath = path.join(dirPath, fileName);

  fs.writeFileSync(filePath, csvContent, "utf8");

  return {
    success: true,
    url: process.env.BACKEND_BASE_URL + `/public/invoices/${fileName}`,
    csv_url: process.env.BACKEND_BASE_URL + `/public/invoices/${fileName}`,
    fileName,
  };
};

export default generateDetailedInvoiceSummaryCSVFile;