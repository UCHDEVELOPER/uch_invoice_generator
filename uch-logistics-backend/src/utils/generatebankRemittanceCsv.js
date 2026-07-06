import fs from "fs";
import path from "path";

function escapeCsv(value) {
  if (value === null || value === undefined) return '""';
  const str = String(value);
  return `"${str.replace(/"/g, '""')}"`;
}
/**
 * Creates Bank Remittance CSV file
 */
export function createBankRemittanceCsv({ invoices, start_date, end_date }) {
  const headers = [
    "Type",
    "Driver",
    "Account",
    "Extra Reference",
    "Date",
    "Invoice Number",
    "Details",
    "Net Amount",
    "Tax Code",
    "VAT",
    "Sort Code",
  ];

  const formatDate = (date) => {
    if (!date) return "";
    return new Date(date)
      .toLocaleDateString("en-GB", {
        timeZone: "Europe/London",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
      .replace(/\//g, "-"); // gives DD-MM-YYYY
  };

  const rows = invoices.map((invoice) => {
    const vatRate = invoice.vat ? parseFloat(invoice.vat) : 0;
    const netAmount = Number(invoice.final_total) || 0;
    const vatAmount = (netAmount * vatRate) / 100;

    return [
      "PI",
      invoice.driver?.bank_user_name || invoice.driver?.name || "",
      `\t${invoice.driver?.bank_account_no || ""}`,
      "",
      formatDate(invoice.created_at),
      invoice.id.slice(-6).toUpperCase(),
      `Job on ${formatDate(invoice.start_date)} - ${formatDate(invoice.end_date)}`,
      netAmount.toFixed(2),
      "T9",
      invoice.total_deductions.toFixed(2),
      `\t${invoice.driver?.iban_no || ""}`,
    ];
  });

  const csvContent = [
    headers.map(escapeCsv).join(","),
    ...rows.map((row) => row.map(escapeCsv).join(",")),
  ].join("\n");

  const dirPath = path.join(process.cwd(), "src/public/remittance");
  fs.mkdirSync(dirPath, { recursive: true });

  const fileName = `bank-remittance-${Date.now()}.csv`;
  const filePath = path.join(dirPath, fileName);

  fs.writeFileSync(filePath, csvContent, "utf8");

  return {
    fileName,
    csv_url: `/public/remittance/${fileName}`,
    totalInvoices: invoices.length,
  };
}
