import path from "path";
import fs from "fs";
import { formatInTimeZone } from "date-fns-tz";

const TIMEZONE = "Europe/London";
const escapeCsv = (value) => {
  const str = value === null || value === undefined ? "" : String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const formatDate = (dateString) => {
  if (!dateString) return "N/A";

  return formatInTimeZone(
    new Date(dateString),
    TIMEZONE,
    "dd/MM/yyyy"
  );
};
export const generateInvoiceSummaryCSVFile = async (data) => {
  const { rows, summary, start_date, end_date, batch } = data;

  const dirPath = path.join(process.cwd(), "src/public/invoices");
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  const formattedStartDate = formatDate(start_date);
  const formattedEndDate = formatDate(end_date);
  const printDate = formatDate(new Date());

  // Metadata header rows (mirrors the header table in the PDF)
  const metaRows = [
    ["Drivers Invoice Summary", "UCH Logistics Ltd", ""],
    [`Period: ${formattedStartDate} - ${formattedEndDate}`, `Print Date: ${printDate}`, `Batch: ${batch.batch_code}`],
    [], // blank spacer
  ];

  // Column headers (mirrors the PDF table headers)
  const columnHeaders = [
    "Callsign",
    "Driver Name",
    "Invoice Number",
    "Jobs",
    "Docket Amount",
    "Deduction",
    "Net Amount",
  ];

  // Data rows
  const dataRows = rows.map((r) => [
    r.callsign,
    r.driverName,
    r.invoiceNumber,
    r.jobs,
    (r.debtAmount + r.taxAmount).toFixed(2),
    r.taxAmount.toFixed(2),
    r.total.toFixed(2),
  ]);

  // Summary/total row (mirrors the grey total row in the PDF)
  const totalRow = [
    "TOTAL",
    "",
    "",
    summary.jobs,
    (summary.debt + summary.tax).toFixed(2),
    summary.tax.toFixed(2),
    summary.total.toFixed(2),
  ];

  const allRows = [
    ...metaRows,
    columnHeaders,
    ...dataRows,
    totalRow,
  ];

  const csvContent = allRows
    .map((row) => row.map(escapeCsv).join(","))
    .join("\n");

  const fileName = `driver-invoice-summary-${Date.now()}.csv`;
  const filePath = path.join(dirPath, fileName);

  fs.writeFileSync(filePath, csvContent, "utf8");

  return {
    url: `/public/invoices/${fileName}`,
    csv_url: `/public/invoices/${fileName}`,
    fileName,
  };
};