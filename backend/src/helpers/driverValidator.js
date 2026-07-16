export function validateDriverPayload(body, isUpdate = false , isSelfOwn = false) {
  if (!body || Object.keys(body).length === 0) {
    return {
      valid: false,
      message: "Request body cannot be empty. Please provide driver details.",
    };
  }

  // ==================================================
  // CONSTANTS
  // ==================================================
  const MAX_LENGTHS = {
    name: 30,
    call_sign: 15,
    position: 50,
    bank_account_no: 34,
    payment_reference: 30,
    iban_no: 34,
    address_details: 100,
    zip_code: 20,
    payroll_id: 50,
    phone_number: 20,
    email: 50,
  };

  const textFields = Object.keys(MAX_LENGTHS);
  const numericFields = [
    "per_hour_rate",
    "total_hours",
    "weekly_fixed_rate",
    "total_days",
  ];

  // ==================================================
  // TEXT LENGTH VALIDATION
  // ==================================================
  for (const field of textFields) {
    if (body[field] !== undefined && body[field] !== null) {
      const value = String(body[field]).trim();
      if (value.length > MAX_LENGTHS[field]) {
        return {
          valid: false,
          message: `${field.replace(/_/g, " ").toUpperCase()} must not exceed ${
            MAX_LENGTHS[field]
          } characters.`,
        };
      }
    }
  }

  // ==================================================
  // BANK ACCOUNT NUMBER VALIDATION (NO SPECIAL CHARS)
  // ==================================================
  if (body.bank_account_no != null) {
    const bankAcc = String(body.bank_account_no).trim();
    const bankAccRegex = /^[A-Za-z0-9\s]+$/;

    if (!bankAccRegex.test(bankAcc)) {
      return {
        valid: false,
        message:
          "Bank account number can contain only letters, numbers, and spaces.",
      };
    }
  }

  // ==================================================
  // ADDRESS VALIDATION (NO SPECIAL CHARS)
  // ==================================================
  if (body.address_details != null) {
    const address = String(body.address_details).trim();
    const addressRegex = /^[A-Za-z0-9\s.,]+$/;

    // if (!addressRegex.test(address)) {
    //   return {
    //     valid: false,
    //     message:
    //       "Address can contain only letters, numbers, spaces, commas",
    //   };
    // }
  }

  // ==================================================
  // RATE MODEL VALIDATION (HOURLY vs WEEKLY)
  // ==================================================
  const hasHourly = body.per_hour_rate != null && body.total_hours != null;

  const hasWeekly = body.weekly_fixed_rate != null && body.total_days != null;

  const partialHourly =
    (body.per_hour_rate != null && body.total_hours == null) ||
    (body.per_hour_rate == null && body.total_hours != null);

  if (partialHourly) {
    return {
      valid: false,
      message:
        'To use the hourly payment model, please provide both "Per Hour Rate" and "Total Hours".',
    };
  }

  const partialWeekly =
    (body.weekly_fixed_rate != null && body.total_days == null) ||
    (body.weekly_fixed_rate == null && body.total_days != null);

  if (partialWeekly) {
    return {
      valid: false,
      message:
        'To use the weekly payment model, please provide both "Weekly Fixed Rate" and "Total Days".',
    };
  }

  if (hasHourly && hasWeekly) {
    return {
      valid: false,
      message:
        "Please choose only one payment model: either Hourly or Weekly, not both.",
    };
  }

  if (!isUpdate && !isSelfOwn && !hasHourly && !hasWeekly) {
    return {
      valid: false,
      message:
        "Please select a payment model by providing either hourly or weekly details.",
    };
  }

  // ==================================================
  // NUMERIC VALIDATION (NO NEGATIVES + LIMITS)
  // ==================================================
  for (const field of numericFields) {
    if (body[field] !== undefined && body[field] !== null) {
      const num = Number(body[field]);

      if (isNaN(num)) {
        return {
          valid: false,
          message: `${field
            .replace(/_/g, " ")
            .toUpperCase()} must be a valid number.`,
        };
      }

      if (num < 0) {
        return {
          valid: false,
          message: `${field
            .replace(/_/g, " ")
            .toUpperCase()} cannot be a negative value.`,
        };
      }

      if (field === "total_days" && num > 7) {
        return {
          valid: false,
          message: "Total days cannot exceed 7 in a week.",
        };
      }

      if (field === "total_hours" && num > 168) {
        return {
          valid: false,
          message: "Total hours cannot exceed 168 in a week.",
        };
      }
    }
  }

  // ==================================================
  // PHONE NUMBER VALIDATION
  // ==================================================
  if (body.phone_number != null) {
    const phone = String(body.phone_number).trim();
    const phoneRegex = /^[+]?[\d\s-]+$/;

    if (!phoneRegex.test(phone)) {
      return {
        valid: false,
        message:
          "Invalid phone number format. Please enter a valid phone number.",
      };
    }

    const digitCount = phone.replace(/\D/g, "").length;
    if (digitCount < 7 || digitCount > 15) {
      return {
        valid: false,
        message: "Phone number must contain between 7 and 15 digits.",
      };
    }
  }

  // ==================================================
  // EMAIL VALIDATION
  // ==================================================
  if (body.email != null) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return {
        valid: false,
        message: "Please enter a valid email address (e.g., name@example.com).",
      };
    }
  }

  // ==================================================
  // STATUS VALIDATION
  // ==================================================
  if (body.status != null) {
    const allowedStatus = ["active", "inactive"];
    if (!allowedStatus.includes(body.status.toLowerCase())) {
      return {
        valid: false,
        message: 'Status must be either "active" or "inactive".',
      };
    }
  }

  // ==================================================
  // IBAN VALIDATION
  // ==================================================
  // if (body.iban_no != null) {
  //   const iban = body.iban_no.replace(/\s+/g, "").toUpperCase();
  //   const ibanRegex = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/;

  //   if (!ibanRegex.test(iban)) {
  //     return {
  //       valid: false,
  //       message: "Please enter a valid IBAN number.",
  //     };
  //   }
  // }

  // ==================================================
  // PASSED ALL VALIDATIONS
  // ==================================================
  return { valid: true };
}
