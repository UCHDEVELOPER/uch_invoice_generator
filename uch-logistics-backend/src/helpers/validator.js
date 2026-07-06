import { ObjectId } from "mongodb";
import path from "path";
export function validateRequired(body, requiredFields) {
  const missing = [];
  const invalid = [];

  requiredFields.forEach((field) => {
    const value = body[field];

    if (
      value === undefined ||
      value === null ||
      (typeof value === "string" && value.trim() === "")
    ) {
      missing.push(field);
      return;
    }

    if (field === "email") {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

      if (!emailRegex.test(value)) {
        invalid.push("Invalid email format");
      }
    }
  });

  if (missing.length > 0) {
    return {
      valid: false,
      message: `Missing required fields: ${missing.join(", ")}`,
    };
  }

  if (invalid.length > 0) {
    return {
      valid: false,
      message: invalid.join(", "),
    };
  }

  return { valid: true };
}

export function validateObjectId(id) {
  return ObjectId.isValid(id);
}

export function getFileType(filePath, originalName) {
  const ext = path.extname(originalName || filePath).toLowerCase();
  if (ext === ".csv") return "csv";
  if (ext === ".xlsx" || ext === ".xls") return "excel";
  return null;
}

export function validatePassword(password) {
  const passwordRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;

  if (!passwordRegex.test(password)) {
    return {
      valid: false,
      message:
        "Password must be at least 8 characters long and include uppercase, lowercase, number and special character",
    };
  }

  return { valid: true };
}
