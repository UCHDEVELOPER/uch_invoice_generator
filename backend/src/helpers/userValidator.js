export function validateUserPayload(body, isUpdate = true) {
  if (!body || typeof body !== "object") {
    return { valid: false, message: "Invalid request payload" };
  }

  if (isUpdate && Object.keys(body).length === 0) {
    return {
      valid: false,
      message: "At least one field must be provided for update",
    };
  }

  const LIMITS = {
    username: 30,
    firstname: 50,
    lastname: 50,
    email: 254,
    password: 128,
    image: 255,
  };

  // ---------------------------
  // USERNAME
  // ---------------------------
  if (body.username !== undefined && body.username !== null && body.username !== "") {
    if (typeof body.username !== "string") {
      return { valid: false, message: "Username must be a string" };
    }

    const username = body.username.trim();

    if (username.length < 3 || username.length > LIMITS.username) {
      return {
        valid: false,
        message: `Username must be between 3 and ${LIMITS.username} characters`,
      };
    }

    if (!/^[a-zA-Z0-9._]+$/.test(username)) {
      return {
        valid: false,
        message: "Username can contain only letters, numbers, dots and underscores",
      };
    }
  }

  // ---------------------------
  // FIRST NAME
  // ---------------------------
  if (body.firstname !== undefined && body.firstname !== null && body.firstname !== "") {
    if (typeof body.firstname !== "string") {
      return { valid: false, message: "First name must be a string" };
    }

    const firstname = body.firstname.trim();

    if (firstname.length < 2 || firstname.length > LIMITS.firstname) {
      return {
        valid: false,
        message: `First name must be between 2 and ${LIMITS.firstname} characters`,
      };
    }
  }

  // ---------------------------
  // LAST NAME
  // ---------------------------
  if (body.lastname !== undefined && body.lastname !== null && body.lastname !== "") {
    if (typeof body.lastname !== "string") {
      return { valid: false, message: "Last name must be a string" };
    }

    const lastname = body.lastname.trim();

    if (lastname.length < 2 || lastname.length > LIMITS.lastname) {
      return {
        valid: false,
        message: `Last name must be between 2 and ${LIMITS.lastname} characters`,
      };
    }
  }

  // ---------------------------
  // PHONE NUMBER
  // ---------------------------
  if (body.phone_no !== undefined && body.phone_no !== null && body.phone_no !== "") {
    const phone = String(body.phone_no).trim();
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, "");

    if (!/^\+?[0-9]{7,15}$/.test(cleanPhone)) {
      return {
        valid: false,
        message: "Phone number must contain 7 to 15 digits",
      };
    }
  }

  // ---------------------------
  // EMAIL
  // ---------------------------
  if (body.email !== undefined && body.email !== null && body.email !== "") {
    const email = String(body.email).trim().toLowerCase();

    if (email.length > LIMITS.email) {
      return {
        valid: false,
        message: `Email must not exceed ${LIMITS.email} characters`,
      };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return { valid: false, message: "Invalid email format" };
    }
  }

  // ---------------------------
  // PASSWORD
  // ---------------------------
  if (body.password !== undefined && body.password !== null && body.password !== "") {
    if (typeof body.password !== "string") {
      return { valid: false, message: "Password must be a string" };
    }

    if (body.password.length < 8 || body.password.length > LIMITS.password) {
      return {
        valid: false,
        message: `Password must be between 8 and ${LIMITS.password} characters`,
      };
    }
  }

  // ---------------------------
  // IMAGE
  // ---------------------------
  if (body.image !== undefined && body.image !== null && body.image !== "") {
    if (typeof body.image !== "string") {
      return { valid: false, message: "Image must be a valid string path" };
    }

    if (body.image.length > LIMITS.image) {
      return {
        valid: false,
        message: `Image path must not exceed ${LIMITS.image} characters`,
      };
    }
  }

  return { valid: true };
}
