import fs from "fs";
import path from "path";

function escapeCsv(value) {
  if (value === null || value === undefined) return '""';
  const str = String(value);
  return `"${str.replace(/"/g, '""')}"`;
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

/**
 * Creates Drivers Export CSV
 */
export function createDriversCsv({ drivers }) {
  const headers = [
    "Name",
    "CallSign",
    "Position",
    "ShiftType",
    "HourlyRate",
    "TotalHours",
    "VAT",
    "AdminFee",
    "VehicleHireCharge",
    "InsuranceCharge",
    "FuelCharge",
    "BankUserName",
    "BankAccountNo",
    "SortCode",
    "PaymentReference",
    "Email",
    "PhoneNumber",
    "Address",
    "ZIPCode",
    "PayrollID",
  ];

  const rows = drivers.map((driver) => [
    driver.name || "",
    driver.call_sign || "",
    driver.position || "",
    String(driver.shift_type || ""),
    driver.per_hour_rate ?? "",
    driver.total_hours ?? "",
    driver.vat_percent ?? "",
    driver.admin_fee ?? "",
    driver.vehicle_hire_charge ?? "",
    driver.insurance_charge ?? "",
    driver.fuel_charge ?? "",
    driver.bank_user_name || "",
    driver.bank_account_no || "",
    driver.iban_no || "",
    driver.payment_reference || "",
    driver.email || "",
    driver.phone_number || "",
    driver.address_details || "",
    driver.zip_code || "",
    driver.payroll_id || "",
  ]);

  console.log(rows);

  const csvContent = [
    headers.map(escapeCsv).join(","),
    ...rows.map((row) => row.map(escapeCsv).join(",")),
  ].join("\n");

  const dirPath = path.join(process.cwd(), "src/public/drivers");
  fs.mkdirSync(dirPath, { recursive: true });

  const fileName = `drivers-${Date.now()}-${Math.random()}.csv`;
  const filePath = path.join(dirPath, fileName);

  fs.writeFileSync(filePath, csvContent, "utf8");

  return {
    fileName,
    csv_url: process.env.BACKEND_BASE_URL + `/public/drivers/${fileName}`,
    totalDrivers: drivers.length,
  };
}
