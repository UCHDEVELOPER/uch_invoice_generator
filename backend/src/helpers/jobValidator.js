import { validateObjectId } from "./validator.js";

export function validateJobPayload(body) {
  if (!body || Object.keys(body).length === 0) {
    return {
      valid: false,
      message: "Request body cannot be empty. Please provide job details.",
    };
  }

  // ==================================================
  // FIELD LIMITS
  // ==================================================
  const MAX_LENGTHS = {
    docket_no: 20,
    tariff: 50,
    journey: 100, // length only, no regex
    call_sign: 50,
  };

  // ==================================================
  // ALLOWED CHARACTERS (FOR ALL EXCEPT JOURNEY)
  // ==================================================
  const safeTextRegex = /^[A-Za-z0-9\s-]+$/;

  // ==================================================
  // TEXT FIELD VALIDATION
  // ==================================================
  for (const field in MAX_LENGTHS) {
    if (body[field] != null) {
      const value = String(body[field]).trim();

      // Length check (applies to ALL fields)
      if (value.length > MAX_LENGTHS[field]) {
        return {
          valid: false,
          message: `${field.replace(/_/g, " ").toUpperCase()} must not exceed ${
            MAX_LENGTHS[field]
          } characters.`,
        };
      }

      // Regex check (SKIP journey )
      if (field !== "journey" && field !== "tariff" && !safeTextRegex.test(value)) {
        return {
          valid: false,
          message: `${field
            .replace(/_/g, " ")
            .toUpperCase()} can contain only letters, numbers, spaces, and hyphens.`,
        };
      }
    }
  }

  // ==================================================
  // DRIVER ID VALIDATION
  // ==================================================
  if (body.driver_id != null) {
    if (!validateObjectId(body.driver_id)) {
      return {
        valid: false,
        message: "Invalid driver ID format.",
      };
    }
  }

  // ==================================================
  // CALL SIGN OR DRIVER ID REQUIRED
  // ==================================================
  const hasCallSign = body.call_sign && body.call_sign.toString().trim() !== "";
  const hasDriverId = body.driver_id && body.driver_id.toString().trim() !== "";

  if (!hasCallSign && !hasDriverId) {
    return {
      valid: false,
      message: "Either call sign or driver ID must be provided.",
    };
  }

  // ==================================================
  // DRIVER TOTAL VALIDATION (NO NEGATIVE / NO EXPONENTIAL)
  // ==================================================
  if (body.driver_total !== undefined && body.driver_total !== null) {
    const rawValue = String(body.driver_total).trim();

    if (/e/i.test(rawValue)) {
      return {
        valid: false,
        message: "Driver total must not be in exponential notation.",
      };
    }

    const amount = Number(rawValue);

    if (!Number.isFinite(amount)) {
      return {
        valid: false,
        message: "Driver total must be a valid finite number.",
      };
    }

    if (amount < 0) {
      return {
        valid: false,
        message: "Driver total cannot be a negative value.",
      };
    }

    const MAX_DRIVER_TOTAL = 1_000_000_000;

    if (amount > MAX_DRIVER_TOTAL) {
      return {
        valid: false,
        message: `Driver total must not exceed ${MAX_DRIVER_TOTAL}.`,
      };
    }

    if (!/^\d+(\.\d{1,2})?$/.test(rawValue)) {
      return {
        valid: false,
        message: "Driver total can have a maximum of 2 decimal places.",
      };
    }
  }

  // ==================================================
  // DOCKET NO VALIDATION (NO NEGATIVE VALUES)
  // ==================================================
  if (body.docket_no !== undefined && body.docket_no !== null) {
    const amount = Number(body.docket_no);

    if (isNaN(amount)) {
      return {
        valid: false,
        message: "Docket no must be a valid number.",
      };
    }

    if (amount < 0) {
      return {
        valid: false,
        message: "Docket no cannot be a negative value.",
      };
    }
  }

  // ==================================================
  // DATE TIME VALIDATION (STRICT ISO FORMAT)
  // ==================================================
  if (body.date_time != null) {
    const isoStrictRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

    if (!isoStrictRegex.test(body.date_time)) {
      return {
        valid: false,
        message:
          "Invalid date & time format. Use ISO format (YYYY-MM-DDTHH:mm:ss.sssZ).",
      };
    }

    const parsedDate = new Date(body.date_time);
    if (isNaN(parsedDate.getTime())) {
      return {
        valid: false,
        message: "Invalid date & time value.",
      };
    }
  }

  // ==================================================
  // PASSED ALL VALIDATIONS
  // ==================================================
  return { valid: true };
}
