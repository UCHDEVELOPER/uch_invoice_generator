import path from "path";
import fs from "fs";
import puppeteer from "puppeteer-core";
import { prisma } from "../config/prismaClient.js";
import dotenv from "dotenv";

dotenv.config();

const COLUMN_CONFIG = {
  name: { label: "Name" },
  sage_name: { label: "SageName" },
  call_sign: { label: "CallSign" },
  position: { label: "Position" },
  shift_type: { label: "ShiftType" },
  per_hour_rate: { label: "HourlyRate" },
  weekly_fixed_rate: { label: "WeeklyRate" },
  total_hours: { label: "TotalHours" },
  total_days: { label: "TotalDays" },
  vat_percent: { label: "AdminVATPercentage" },
  admin_fee: { label: "AdminFee" },
  vehicle_hire_charge: { label: "VehicleHireCharge" },
  vehicle_vat_percent: { label: "VehicleVATPercentage" },
  insurance_charge: { label: "InsuranceCharge" },
  insurance_vat_percent: { label: "InsuranceVATPercentage" },
  fuel_charge: { label: "FuelCharge" },
  fuel_vat_percent: { label: "FuelVATPercentage" },
  bank_user_name: { label: "BankUserName" },
  bank_account_no: { label: "BankAccountNo" },
  iban_no: { label: "SortCode" },
  payment_reference: { label: "PaymentReference" },
  email: { label: "Email" },
  phone_number: { label: "PhoneNumber" },
  address_details: { label: "Address" },
  zip_code: { label: "PostCode" },
  payroll_id: { label: "PayrollID" },
  status: { label: "Status" },
  carry_forward_admin_fee: { label: "CarryForwardAdminFee" },
  carry_forward_admin_vat_percent: { label: "CarryForwardAdminVATPercentage" },
  carry_forward_vehicle_hire_charge: { label: "CarryForwardVehicleHireCharge" },
  carry_forward_vehicle_vat_percent: {
    label: "CarryForwardVehicleVATPercentage",
  },
  carry_forward_insurance_charge: { label: "CarryForwardInsuranceCharge" },
  carry_forward_insurance_vat_percent: {
    label: "CarryForwardInsuranceVATPercentage",
  },
  carry_forward_fuel_charge: { label: "CarryForwardFuelCharge" },
  carry_forward_fuel_vat_percent: { label: "CarryForwardFuelVATPercentage" },
};

function escapeCsv(value) {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getDriverValue(driver, key) {
  switch (key) {
    case "position":
      return driver.driver_position?.label || "";
    case "shift_type":
      return String(driver.shift_type || "");
    case "per_hour_rate":
    case "weekly_fixed_rate":
    case "total_hours":
    case "vat_percent":
    case "admin_fee":
    case "vehicle_hire_charge":
    case "insurance_charge":
    case "fuel_charge":
      return driver[key] != null ? driver[key] : "";
    case "total_days":
      return driver[key] != null ? driver[key] : "";
    default:
      return driver[key] || "";
  }
}

async function fetchDriversFromDB() {
  return prisma.driver.findMany({
    select: {
      id: true,
      name: true,
      sage_name: true,
      call_sign: true,
      driver_position: {
        select: { id: true, label: true },
      },
      shift_type: true,
      per_hour_rate: true,
      weekly_fixed_rate: true,
      total_hours: true,
      total_days: true,
      vat_percent: true,
      admin_fee: true,
      vehicle_hire_charge: true,
      vehicle_vat_percent: true,
      insurance_charge: true,
      insurance_vat_percent: true,
      fuel_charge: true,
      fuel_vat_percent: true,
      bank_user_name: true,
      bank_account_no: true,
      iban_no: true,
      payment_reference: true,
      email: true,
      phone_number: true,
      address_details: true,
      zip_code: true,
      payroll_id: true,
      status: true,
      created_at: true,
      carry_forward_admin_fee: true,
      carry_forward_admin_vat_percent: true,
      carry_forward_vehicle_hire_charge: true,
      carry_forward_vehicle_vat_percent: true,
      carry_forward_insurance_charge: true,
      carry_forward_insurance_vat_percent: true,
      carry_forward_fuel_charge: true,
      carry_forward_fuel_vat_percent: true,
    },
    orderBy: { created_at: "desc" },
  });
}

// ─── MAIN EXPORT SERVICE ────────────────────────────────────────────

export async function exportDriversService(format = "csv", columns = []) {
  try {
    if (!columns || columns.length === 0) {
      return {
        success: false,
        statusCode: 400,
        message: "Please select at least one column to export.",
      };
    }

    const validColumns = columns.filter((col) => COLUMN_CONFIG[col]);
    if (validColumns.length === 0) {
      return {
        success: false,
        statusCode: 400,
        message: "No valid columns selected.",
      };
    }

    const drivers = await fetchDriversFromDB();

    if (format === "pdf") {
      return await createDriversPdf({ drivers, columns: validColumns });
    } else {
      return createDriversCsv({ drivers, columns: validColumns });
    }
  } catch (err) {
    console.error("Export error:", err);
    return {
      success: false,
      statusCode: 500,
      message: err.message,
    };
  }
}

// ─── CSV EXPORT ─────────────────────────────────────────────────────

export function createDriversCsv({ drivers, columns }) {
  const headers = columns.map((col) => COLUMN_CONFIG[col].label);

  const rows = drivers.map((driver) =>
    columns.map((col) => getDriverValue(driver, col)),
  );

  const csvContent = [
    headers.map(escapeCsv).join(","),
    ...rows.map((row) => row.map(escapeCsv).join(",")),
  ].join("\n");

  const dirPath = path.join(process.cwd(), "src/public/drivers");
  fs.mkdirSync(dirPath, { recursive: true });

  const fileName = `drivers-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}.csv`;
  const filePath = path.join(dirPath, fileName);

  fs.writeFileSync(filePath, csvContent, "utf8");

  return {
    success: true,
    statusCode: 200,
    message: "Drivers exported successfully",
    fileName,
    file_url: `${process.env.BACKEND_BASE_URL}/public/drivers/${fileName}`,
    totalDrivers: drivers.length,
    format: "csv",
  };
}

// ─── PDF EXPORT (PUPPETEER) ─────────────────────────────────────────

function buildPdfHtml({ drivers, columns }) {
  const isLandscape = columns.length > 6;
  const fontSize =
    columns.length > 12 ? "9px" : columns.length > 8 ? "10px" : "11px";
  const headerFontSize =
    columns.length > 12 ? "9px" : columns.length > 8 ? "10.5px" : "11.5px";

  const now = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const headerCells = columns
    .map(
      (col) =>
        `<th style="
          padding: 8px 6px;
          text-align: left;
          font-size: ${headerFontSize};
          font-weight: 700;
          color: #ffffff;
          white-space: nowrap;
          border-right: 1px solid rgba(255,255,255,0.15);
        ">${escapeHtml(COLUMN_CONFIG[col].label)}</th>`,
    )
    .join("");

  const bodyRows = drivers
    .map((driver, i) => {
      const bgColor = i % 2 === 0 ? "#f9fafb" : "#ffffff";

      const cells = columns
        .map((col) => {
          let value = String(getDriverValue(driver, col));
          let cellStyle = `
            padding: 7px 6px;
            font-size: ${fontSize};
            color: #374151;
            border-bottom: 1px solid #e5e7eb;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 200px;
          `;

          if (col === "status") {
            const isActive = value.toLowerCase() === "active";
            value = isActive ? "Active" : "Inactive";
            cellStyle += `
              color: ${isActive ? "#009249" : "#C00000"};
              font-weight: 600;
            `;
          }

          return `<td style="${cellStyle}">${escapeHtml(value)}</td>`;
        })
        .join("");

      return `<tr style="background-color: ${bgColor};">${cells}</tr>`;
    })
    .join("");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI',
            Roboto, 'Helvetica Neue', Arial, sans-serif;
          background: #ffffff;
          padding: 30px;
        }
        .report-header {
          text-align: center;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 2px solid #223581;
        }
        .report-title {
          font-size: 22px;
          font-weight: 800;
          color: #223581;
          margin-bottom: 6px;
          letter-spacing: 0.5px;
        }
        .report-meta {
          font-size: 11px;
          color: #6b7280;
        }
        .report-meta span {
          margin: 0 8px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        }
        thead tr {
          background: linear-gradient(135deg, #223581, #1a2a6c);
        }
        thead th:last-child {
          border-right: none;
        }
        .report-footer {
          text-align: center;
          margin-top: 24px;
          padding-top: 12px;
          border-top: 1px solid #e5e7eb;
          font-size: 10px;
          color: #9ca3af;
        }
      </style>
    </head>
    <body>
      <div class="report-header">
        <div class="report-title">Driver Profiles Report</div>
        <div class="report-meta">
          Generated: ${now}
          <span>|</span>
          Total Drivers: ${drivers.length}
          <span>|</span>
          Columns: ${columns.length}
        </div>
      </div>

      <table>
        <thead>
          <tr>${headerCells}</tr>
        </thead>
        <tbody>
          ${bodyRows}
        </tbody>
      </table>

      <div class="report-footer">
        — End of Report —
      </div>
    </body>
    </html>
  `;
}

export async function createDriversPdf({ drivers, columns }) {
  const dirPath = path.join(process.cwd(), "src/public/drivers");
  fs.mkdirSync(dirPath, { recursive: true });

  const fileName = `drivers-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}.pdf`;
  const filePath = path.join(dirPath, fileName);

  const isLandscape = columns.length > 6;
  const htmlContent = buildPdfHtml({ drivers, columns });

  let browser;

  try {
    // browser = await puppeteer.launch({
    //   headless: "new",
    //   args: [
    //     "--no-sandbox",
    //     "--disable-setuid-sandbox",
    //     "--disable-dev-shm-usage",
    //     "--disable-gpu",
    //     "--font-render-hinting=none",
    //   ],
    // });

    browser = await puppeteer.launch({
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

    await page.setContent(htmlContent, {
      waitUntil: "networkidle0",
    });

    await page.pdf({
      path: filePath,
      format: "A4",
      landscape: isLandscape,
      printBackground: true,
      margin: {
        top: "20px",
        right: "20px",
        bottom: "40px",
        left: "20px",
      },
      displayHeaderFooter: true,
      headerTemplate: "<span></span>",
      footerTemplate: `
        <div style="
          width: 100%;
          text-align: center;
          font-size: 9px;
          color: #9ca3af;
          font-family: Arial, sans-serif;
          padding: 0 20px;
        ">
          Page <span class="pageNumber"></span> of
          <span class="totalPages"></span>
        </div>
      `,
    });

    return {
      success: true,
      statusCode: 200,
      message: "Drivers exported as PDF successfully",
      fileName,
      file_url: `${process.env.BACKEND_BASE_URL}/public/drivers/${fileName}`,
      totalDrivers: drivers.length,
      format: "pdf",
    };
  } catch (err) {
    console.error("Puppeteer PDF error:", err);
    return {
      success: false,
      statusCode: 500,
      message: "Failed to generate PDF: " + err.message,
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
