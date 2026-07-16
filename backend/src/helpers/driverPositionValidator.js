export default function validateDriverPositionPayload(payload, isUpdate = false) {
  const validation = {
    valid: true,
    message: "",
  };

  if (!payload || Object.keys(payload).length === 0) {
    validation.valid = false;
    validation.message = "Request body is empty";
    return validation;
  }

  // For creation, label is required
  if (!isUpdate) {
    if (!payload.label || typeof payload.label !== "string" || payload.label.trim().length === 0) {
      validation.valid = false;
      validation.message = "Label is required and must be a non-empty string";
      return validation;
    }
  }

  // For update, if label is provided it must be valid
  if (isUpdate && payload.label !== undefined) {
    if (typeof payload.label !== "string" || payload.label.trim().length === 0) {
      validation.valid = false;
      validation.message = "Label must be a non-empty string";
      return validation;
    }
  }

  // If slug is provided, validate it
  if (payload.slug !== undefined) {
    if (typeof payload.slug !== "string" || payload.slug.trim().length === 0) {
      validation.valid = false;
      validation.message = "Slug must be a non-empty string";
      return validation;
    }

    // Slug format validation: lowercase, alphanumeric, hyphens only
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!slugRegex.test(payload.slug.trim())) {
      validation.valid = false;
      validation.message =
        "Slug must contain only lowercase letters, numbers, and hyphens (e.g., 'driver-left')";
      return validation;
    }
  }

  // If max_weight is provided, validate it
  if (payload.max_weight !== undefined && payload.max_weight !== null) {
    if (typeof payload.max_weight !== "number" || isNaN(payload.max_weight)) {
      validation.valid = false;
      validation.message = "Max weight must be a valid number";
      return validation;
    }

    if (payload.max_weight < 0) {
      validation.valid = false;
      validation.message = "Max weight must be a non-negative number";
      return validation;
    }
  }

  // Check for unexpected fields
  const allowedFields = ["label", "slug", "max_weight"];
  const unexpectedFields = Object.keys(payload).filter(
    (key) => !allowedFields.includes(key)
  );

  if (unexpectedFields.length > 0) {
    validation.valid = false;
    validation.message = `Unexpected fields: ${unexpectedFields.join(", ")}`;
    return validation;
  }

  return validation;
}