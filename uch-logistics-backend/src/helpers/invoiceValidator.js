import { prisma } from "../config/prismaClient.js";
import { validateObjectId, validateRequired } from "./validator.js";

export async function validateInvoicePayload(body) {
  if (!body || Object.keys(body).length === 0) {
    return {
      valid: false,
      message: "Request body is empty",
    };
  }

  const { driver_id, start_date, end_date } = body;

  const validateDriverId = validateObjectId(driver_id);
  if (!validateDriverId) {
    return { valid: false, message: "Invalid driver_id format" };
  }

  const deductionFields = [
    "admin_fee",
    "vehicle_hire_charges",
    "insurance_charge",
    "fuel_charge",
    "additional_charges",
  ];

  for (const field of deductionFields) {
    if (body[field] !== undefined) {
      const value = Number(body[field]);
      if (isNaN(value)) {
        return {
          valid: false,
          message: `${field} must be a number`,
        };
      }
    }
  }

  // --------------------------
  // DATE VALIDATION
  // ---------------------------
  const start = new Date(start_date);
  const end = new Date(end_date);

  if (isNaN(start.getTime())) {
    return { valid: false, message: "Invalid start_date format" };
  }

  if (isNaN(end.getTime())) {
    return { valid: false, message: "Invalid end_date format" };
  }

  if (end < start) {
    return {
      valid: false,
      message: "end_date must be greater than start_date",
    };
  }

  // ---------------------------
  // WEEK VALIDATION (MUST BE EXACT 7 DAYS)
  // ---------------------------
  const msInDay = 24 * 60 * 60 * 1000;
  const totalDays = Math.floor((end - start) / msInDay) + 1;

  if (totalDays !== 7) {
    return {
      valid: false,
      message: "Date range must be exactly 7 days to generate a weekly invoice",
    };
  }

  // ---------------------------
  // DRIVER EXISTS?
  // ---------------------------
  const driver = await prisma.driver.findUnique({
    where: { id: driver_id },
  });

  if (!driver) {
    return { valid: false, message: "Driver not found" };
  }

  // ---------------------------
  // DRIVER IS ACTIVE
  // ---------------------------
  if (driver.status !== "active") {
    return {
      valid: false,
      message: "Driver is not active",
    };
  }

  // ---------------------------
  // START DATE MUST HAVE AT LEAST 1 JOB FOR DRIVER
  // ---------------------------
  const startOfDay = new Date(start);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(startOfDay);
  endOfDay.setHours(23, 59, 59, 999);

  return { valid: true };
}
