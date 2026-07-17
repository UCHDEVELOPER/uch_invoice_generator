import puppeteer from "puppeteer-core";
import path from "path";
import fs from "fs";
import { formatInTimeZone } from "date-fns-tz";

const TIMEZONE = "Europe/London";

export const generateInvoiceSummaryPdfFile = async (data) => {
  const { rows, summary, start_date, end_date, batch } = data;

  const dirPath = path.join(process.cwd(), "src/public/invoices");
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

const formatDate = (dateString) => {
  if (!dateString) return "N/A";

  return formatInTimeZone(
    new Date(dateString),
    TIMEZONE,
    "dd/MM/yyyy"
  );
};

  const formattedStartDate = formatDate(start_date);
  const formattedEndDate = formatDate(end_date);
  const printDate = formatDate(new Date());

  const totalPages = 1;

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

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice Summary</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body { 
      font-family: Arial, sans-serif; 
      font-size: 11px; 
      padding: 20px;
      color: #333;
    }
    
    .header-table { 
      width: 100%; 
      border-collapse: collapse; 
      margin-bottom: 20px;
      border: 1px solid #000;
    }
    
    .header-table td {
      padding: 10px;
      vertical-align: top;
    }
    
    .header-table .title {
      font-size: 14px;
      font-weight: bold;
      margin-bottom: 5px;
    }
    
    .header-table .company {
      text-align: center;
      font-size: 14px;
      font-weight: bold;
    }
    
    .header-table .page-info {
      text-align: right;
    }
    
    .data-table { 
      width: 100%; 
      border-collapse: collapse; 
      margin-top: 10px;
    }
    
    .data-table th, 
    .data-table td { 
      border-bottom: 1px solid #ccc; 
      padding: 8px 6px; 
      font-size: 10px;
    }
    
    .data-table th {
      border-bottom: 2px solid #000;
    }
    
    .yellow { 
      background: #fff59d; 
      font-weight: bold; 
    }
    
    .grey { 
      background: #e0e0e0; 
      font-weight: bold; 
    }
    
    .right { 
      text-align: right; 
    }
    
    .center { 
      text-align: center; 
    }
    
    .left {
      text-align: left;
    }
    
    .total-row td {
      border-top: 2px solid #000;
      border-bottom: 2px solid #000;
      padding-top: 10px;
      padding-bottom: 10px;
    }
    
    .date-range {
      font-size: 10px;
      color: #666;
      margin-top: 3px;
    }
  </style>
</head>

<body>
  <!-- Header Section -->
  <table class="header-table">
    <tr>
      <td style="width: 33%;">
        <div class="title">Drivers Invoice Summary</div>
        <div class="date-range">Period: ${formattedStartDate} - ${formattedEndDate}</div>
      </td>
      <td style="width: 34%;" class="company">
        <div>UCH Logistics Ltd</div>
        <div style="font-size: 10px; font-weight: normal; margin-top: 3px;">Print Date: ${printDate}</div>
      </td>
      <td style="width: 33%;" class="page-info">
        <div style="font-size: 10px; font-weight: normal; margin-top: 3px;"> Page 1 of ${totalPages}</div>
         <div style="font-size: 10px; font-weight: normal; margin-top: 3px;">Batch: ${batch.batch_code}</div>
      </td>
    </tr>
  </table>

  <!-- Data Table -->
  <table class="data-table">
    <thead>
      <tr class="yellow">
        <th class="left">Callsign</th>
        <th class="left">Driver Name</th>
        <th class="center">Invoice Number</th>
        <th class="center">Jobs</th>
        <th class="right">Docket Amount</th>
        <th class="right">Deduction</th>
        <th class="right">Net Amount</th>
      </tr>
    </thead>
    <tbody>
      ${rows
        .map(
          (r, index) => `
        <tr style="background: {index % 2 === 0 ? '#fff' : '#f9f9f9'};">
          <td class="left">${r.callsign}</td>
          <td class="left">${r.driverName}</td>
          <td class="center">${r.invoiceNumber}</td>
          <td class="center">${r.jobs}</td>
          <td class="right">${(r.debtAmount + r.taxAmount).toFixed(2)}</td>
          <td class="right">${r.taxAmount.toFixed(2)}</td>
          <td class="right">${r.total.toFixed(2)}</td>
        </tr>
      `,
        )
        .join("")}
      
      <!-- Total Row -->
      <tr class="grey total-row">
        <td colspan="3" class="left"><strong>TOTAL</strong></td>
        <td class="center"><strong>${summary.jobs}</strong></td>
        <td class="right"><strong>${(summary.debt + summary.tax ).toFixed(2)}</strong></td>
        <td class="right"><strong>${summary.tax.toFixed(2)}</strong></td>
        <td class="right"><strong>${summary.total.toFixed(2)}</strong></td>
      </tr>
    </tbody>
  </table>
</body>
</html>`;

  await page.setContent(html, { waitUntil: "networkidle0" });

  const fileName = `driver-invoice-summary-${Date.now()}.pdf`;
  const filePath = path.join(dirPath, fileName);

  await page.pdf({
    path: filePath,
    format: "A4",
    printBackground: true,
    margin: {
      top: "20px",
      bottom: "20px",
      left: "20px",
      right: "20px",
    },
  });

  await browser.close();

  return {
    url: `/public/invoices/${fileName}`,
    pdf_url: `/public/invoices/${fileName}`,
    fileName: fileName,
  };
};
