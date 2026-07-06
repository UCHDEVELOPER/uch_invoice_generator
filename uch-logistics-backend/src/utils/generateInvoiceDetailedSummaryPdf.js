import puppeteer from "puppeteer";
import path from "path";
import fs from "fs";

export const generateDetailedInvoiceSummaryPdfFile = async (data) => {
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

  // Format date helper
const formatDate = (date) => {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-GB", {
    timeZone: "Europe/London",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).replace(/\//g, "-"); // gives DD-MM-YYYY
};
  const formattedInvoiceDate =
    formatDate(from_date) + " - " + formatDate(to_date);
  const printDate = formatDate(new Date());

  // Sort invoices by callsign
  const sortedInvoices = [...invoices].sort((a, b) => {
    const callsignA = a.driver?.call_sign || "";
    const callsignB = b.driver?.call_sign || "";
    return callsignA.localeCompare(callsignB);
  });

  // Calculate totals
  let totalJobs = 0;
  let totalDriversPay = 0;

  const rows = sortedInvoices.map((invoice) => {
    const callsign = invoice.driver?.call_sign || "N/A";
    const driverName = invoice.driver?.name || "N/A";
    const selfBillNumber = invoice.id.slice(-6).toUpperCase();
    const jobs = invoice.total_number_of_dockets || 0;
    const driversPay = parseFloat(invoice.final_total) || 0;

    totalJobs += jobs;
    totalDriversPay += driversPay;

    return {
      callsign,
      driverName,
      selfBillNumber,
      jobs,
      driversPay,
    };
  });

  // Pagination: 50 records per page
  const RECORDS_PER_PAGE = 35;
  const totalPages = Math.ceil(rows.length / RECORDS_PER_PAGE);
  const pages = [];

  for (let i = 0; i < totalPages; i++) {
    const start = i * RECORDS_PER_PAGE;
    const end = start + RECORDS_PER_PAGE;
    pages.push(rows.slice(start, end));
  }

  // Build pages HTML
  const pagesHtml = pages
    .map((pageRows, pageIndex) => {
      const currentPage = pageIndex + 1;
      const isLastPage = currentPage === totalPages;

      return `
      <div class="page ${!isLastPage ? "page-break" : ""}">
        <!-- Header Section -->
        <div class="header-section">
          <div class="header-grid">
            <!-- Left Column -->
            <div class="header-left">
              <div class="batch-title">Pay Batch ${batch_code}</div>
              <div class="batch-title">Invoice Date</div>
              <div class="batch-title">${formattedInvoiceDate}</div>
            </div>
            
            <!-- Center Column -->
            <div class="header-center">
              <div class="company-name">UCH Logistics Ltd</div>
              <div class="print-date">Print Date ${printDate}</div>
            </div>
            
            <!-- Right Column -->
            <div class="header-right">
              <div class="page-info">Page ${currentPage} of ${totalPages}</div>
            </div>
          </div>
        </div>

        <!-- Data Table -->
        <table class="data-table">
          <thead>
            <!-- Header Row 1 -->
            <tr class="header-row-1">
              <th class="col-callsign left">Callsign</th>
              <th class="col-driver-name left">Driver Name</th>
              <th class="col-self-bill center">Self Bill</th>
              <th class="col-jobs center">Jobs</th>
              <th class="col-drivers-pay center">Drivers Pay</th>
            </tr>
            <!-- Header Row 2 -->
            <tr class="header-row-2">
              <th class="col-callsign"></th>
              <th class="col-driver-name"></th>
              <th class="col-self-bill center">Number</th>
              <th class="col-jobs"></th>
            </tr>
          </thead>
          <tbody>
            ${pageRows
              .map(
                (row) => `
              <tr class="data-row">
                <td class="col-callsign left">${row.callsign}</td>
                <td class="col-driver-name left">${row.driverName}</td>
                <td class="col-self-bill center">${row.selfBillNumber}</td>
                <td class="col-jobs center">${row.jobs}</td>
                <td class="col-drivers-pay center">${row.driversPay.toFixed(2)}</td>
              </tr>
            `,
              )
              .join("")}
            
            ${
              isLastPage
                ? `
              <!-- Total Row - only on last page -->
              <tr class="total-row">
                <td class="col-callsign" colspan="3"></td>
                <td class="col-jobs center">${totalJobs}</td>
                <td class="col-drivers-pay center">${totalDriversPay.toFixed(2)}</td>
              </tr>
            `
                : ""
            }
          </tbody>
        </table>
      </div>
    `;
    })
    .join("");

  // Full HTML
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Detailed Invoice Summary - Batch ${batch_code}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body { 
      font-family: Arial, sans-serif; 
      font-size: 10px; 
      padding: 20px;
      color: #000;
    }
    
    .page-break {
      page-break-after: always;
    }
    
    .page {
      margin-bottom: 0;
    }
    
    .header-section { 
      width: 100%; 
      border: 1px solid #000;
      border-bottom: none;
      padding: 12px 15px;
      position: relative;
      margin-bottom: 0;
    }
    
    .header-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      align-items: start;
    }
    
    .header-left {
      text-align: left;
    }
    
    .header-center {
      text-align: center;
    }
    
    .header-right {
      text-align: right;
    }
    
    .batch-title {
      font-size: 10px;
      font-weight: normal;
      margin-bottom: 2px;
    }
    
    .company-name {
      font-size: 14px;
      font-weight: bold;
      margin-bottom: 3px;
    }
    
    .print-date {
      font-size: 10px;
      font-weight: normal;
    }
    
    .page-info {
      font-size: 10px;
      font-weight: normal;
    }
    
    .data-table { 
      width: 100%; 
      border-collapse: collapse;
      border: 1px solid #000;
    }
    
    .data-table th, 
    .data-table td { 
      border: 1px solid #000;
      padding: 6px 8px;
      font-size: 9px;
      line-height: 1.3;
    }
    
    .data-table thead {
      background-color: #f5f5f5;
    }
    
    .data-table th {
      font-weight: bold;
      padding: 8px;
    }
    
    .header-row-1 th {
      border-bottom: none;
      padding-bottom: 2px;
    }
    
    .header-row-2 th {
      border-top: none;
      padding-top: 2px;
    }
    
    .left { 
      text-align: left; 
    }
    
    .center { 
      text-align: center; 
    }
    
    .right { 
      text-align: right; 
    }
    
    .data-row:nth-child(even) {
      background-color: #fafafa;
    }
    
    .total-row {
      background-color: #f0f0f0;
      font-weight: bold;
      border-top: 2px solid #000;
    }
    
    .total-row td {
      padding: 10px 8px;
      font-size: 10px;
    }
    
    /* Column widths adjusted after removing Docket Cost */
    .col-callsign { width: 14%; }
    .col-driver-name { width: 36%; }
    .col-self-bill { width: 16%; }
    .col-jobs { width: 12%; }
    .col-drivers-pay { width: 22%; }
  </style>
</head>

<body>
  ${pagesHtml}
</body>
</html>`;

  // Launch Puppeteer
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

  // Generate PDF
  const fileName = `detailed-invoice-summary-batch-${batch_code}-${Date.now()}.pdf`;
  const filePath = path.join(dirPath, fileName);

  await page.pdf({
    path: filePath,
    format: "A4",
    printBackground: true,
    margin: {
      top: "15px",
      bottom: "15px",
      left: "15px",
      right: "15px",
    },
  });

  await browser.close();

  return {
    success: true,
    url: process.env.BACKEND_BASE_URL + `/public/invoices/${fileName}`,
    pdf_url: process.env.BACKEND_BASE_URL + `/public/invoices/${fileName}`,
    fileName: fileName,
  };
};

export default generateDetailedInvoiceSummaryPdfFile;
