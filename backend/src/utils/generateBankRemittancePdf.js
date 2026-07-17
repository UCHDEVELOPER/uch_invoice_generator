import puppeteer from "puppeteer-core";
import path from "path";
import fs from "fs";

export async function generateBankRemittancePdf({
  invoices,
  start_date,
  end_date,
}) {
  const dirPath = path.join(process.cwd(), "src/public/remittance");
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

const formatDate = (date) => {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-GB", {
    timeZone: "Europe/London",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).replace(/\//g, "-"); // gives DD-MM-YYYY
};

  const printDate = formatDate(new Date());
  const formattedStart = formatDate(start_date);
  const formattedEnd = formatDate(end_date);

  const rows = invoices.map((invoice) => {
    const netAmount = Number(invoice.final_total) || 0;
    const vatAmount = invoice.total_deductions || 0;

    return {
      type: "PI",
      driver: invoice.driver?.bank_user_name || invoice.driver?.name || "N/A",
      account: invoice.driver?.bank_account_no || "N/A",
      extraReference: "",
      date: formatDate(invoice.created_at),
      invoiceNumber: invoice.generated_id,
      details: `Job on ${formatDate(invoice.start_date)} - ${formatDate(invoice.end_date)}`,
      netAmount: netAmount.toFixed(2),
      taxCode: "T9",
      vat: vatAmount.toFixed(2),
      sortCode: invoice.driver?.iban_no || "N/A",
    };
  });

  // Summary totals
  const totalNet = rows.reduce((sum, r) => sum + parseFloat(r.netAmount), 0);
  const totalVat = rows.reduce((sum, r) => sum + parseFloat(r.vat), 0);

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Bank Remittance</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: Arial, sans-serif;
      font-size: 10px;
      padding: 20px;
      color: #000;
    }

    /* ── Header ── */
    .header-section {
      width: 100%;
      border: 1px solid #000;
      border-bottom: none;
      padding: 12px 15px;
    }

    .header-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      align-items: start;
    }

    .header-left  { text-align: left; }
    .header-center { text-align: center; }
    .header-right { text-align: right; }

    .company-name {
      font-size: 14px;
      font-weight: bold;
      margin-bottom: 3px;
    }

    .sub-text { font-size: 10px; margin-bottom: 2px; }

    /* ── Table ── */
    .data-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #000;
    }

    .data-table th,
    .data-table td {
      border: 1px solid #000;
      padding: 5px 6px;
      font-size: 9px;
      line-height: 1.3;
    }

    .data-table thead {
      background-color: #f5f5f5;
    }

    .data-table th {
      font-weight: bold;
      padding: 7px 6px;
      text-align: center;
    }

    .left   { text-align: left; }
    .center { text-align: center; }
    .right  { text-align: right; }

    .data-row:nth-child(even) { background-color: #fafafa; }

    .total-row {
      background-color: #f0f0f0;
      font-weight: bold;
      border-top: 2px solid #000;
    }

    .total-row td {
      padding: 8px 6px;
      font-size: 10px;
    }

    /* Column widths */
    .col-type         { width: 4%; }
    .col-driver       { width: 14%; }
    .col-account      { width: 10%; }
    .col-extra-ref    { width: 8%; }
    .col-date         { width: 9%; }
    .col-invoice      { width: 8%; }
    .col-details      { width: 18%; }
    .col-net          { width: 9%; }
    .col-tax-code     { width: 6%; }
    .col-vat          { width: 7%; }
    .col-sort         { width: 7%; }
  </style>
</head>
<body>

  <!-- Header -->
  <div class="header-section">
    <div class="header-grid">
      <div class="header-left">
        <div class="sub-text">Bank Remittance</div>
        <div class="sub-text">Period: ${formattedStart} - ${formattedEnd}</div>
      </div>
      <div class="header-center">
        <div class="company-name">UCH Logistics Ltd</div>
        <div class="sub-text">Print Date: ${printDate}</div>
      </div>
      <div class="header-right">
        <div class="sub-text">Total Invoices: ${invoices.length}</div>
      </div>
    </div>
  </div>

  <!-- Table -->
  <table class="data-table">
    <thead>
      <tr>
        <th class="col-type   center">Type</th>
        <th class="col-driver  left">Driver</th>
        <th class="col-account center">Account</th>
        <th class="col-sort   center">Sort Code</th>
        <th class="col-extra-ref center">Extra Ref</th>
        <th class="col-date   center">Date</th>
        <th class="col-invoice center">Invoice No.</th>
        <th class="col-details left">Details</th>
        <th class="col-net    right">Net Amount</th>
        <th class="col-tax-code center">Tax Code</th>
        <th class="col-vat    right">VAT</th>
      </tr>
    </thead>
    <tbody>
      ${rows
        .map(
          (row) => `
        <tr class="data-row">
          <td class="col-type    center">${row.type}</td>
          <td class="col-driver  left">${row.driver}</td>
          <td class="col-account center">${row.account}</td>
          <td class="col-sort    center">${row.sortCode}</td>
          <td class="col-extra-ref center">${row.extraReference}</td>
          <td class="col-date    center">${row.date}</td>
          <td class="col-invoice center">${row.invoiceNumber}</td>
          <td class="col-details left">${row.details}</td>
          <td class="col-net     right">${row.netAmount}</td>
          <td class="col-tax-code center">${row.taxCode}</td>
          <td class="col-vat     right">${row.vat}</td>
        </tr>
      `,
        )
        .join("")}

      <!-- Totals row -->
      <tr class="total-row">
        <td colspan="7" class="left">TOTAL</td>
        <td class="right">${totalNet.toFixed(2)}</td>
        <td class="center">—</td>
        <td class="right">${totalVat.toFixed(2)}</td>
        <td class="center">—</td>
      </tr>
    </tbody>
  </table>

</body>
</html>`;

  // const browser = await puppeteer.launch({
  //   headless: "new",
  //   args: ["--no-sandbox", "--disable-setuid-sandbox"],
  // });

  const browser = await puppeteer.launch({
    executablePath: "/snap/bin/chromium",
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--font-render-hinting=none",
      "--disable-web-security",
      "--disable-features=VizDisplayCompositor",
    ],
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });

  const fileName = `bank-remittance-${Date.now()}.pdf`;
  const filePath = path.join(dirPath, fileName);

  await page.pdf({
    path: filePath,
    format: "A4",
    landscape: true, // wider layout fits all 11 columns comfortably
    printBackground: true,
    margin: { top: "15px", bottom: "15px", left: "15px", right: "15px" },
  });

  await browser.close();

  return {
    fileName,
    pdf_url: `/public/remittance/${fileName}`,
    totalInvoices: invoices.length,
  };
}
