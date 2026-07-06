import { validatePassword, validateRequired } from "../helpers/validator.js";
import {
  loginService,
  addAccountantService,
  changePasswordService,
  forgotPasswordService,
  resetPasswordService,
} from "../services/authService.js";

export async function login(req, res) {
  try {
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Request body is empty",
      });
    }

    const validation = validateRequired(req.body, ["email", "password"]);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: validation.message,
      });
    }

    const { email, password } = req.body;
    const result = await loginService(email, password);

    if (!result.success) {
      return res.status(result.statusCode).json(result);
    }

    // res.cookie("auth_token", result.data.token, {
    //   httpOnly: true,
    //   secure: true,
    //   sameSite: "lax",
    //   path: "/",
    //   maxAge: 24 * 60 * 60 * 1000, // 1 day
    // });

    // delete result.data.token;

    return res.status(result.statusCode).json(result);
  } catch (err) {
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: err.message,
    });
  }
}

export async function addAccountant(req, res) {
  try {
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Request body is empty",
      });
    }
    const requiredCheck = validateRequired(req.body, [
      "name",
      "email",
      "password",
    ]);
    if (!requiredCheck.valid) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: requiredCheck.message,
      });
    }

    const result = await addAccountantService(req.body);

    return res.status(result.statusCode).json(result);
  } catch (err) {
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: err.message,
    });
  }
}

export async function changePassword(req, res) {
  try {
    const userId = req.user.id;

    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Request body is empty",
      });
    }

    const requiredCheck = validateRequired(req.body, [
      "old_password",
      "new_password",
    ]);
    if (!requiredCheck.valid) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: requiredCheck.message,
      });
    }

    const { old_password, new_password } = req.body;

    const passwordStrengthRegex = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/;

    if (!passwordStrengthRegex.test(new_password)) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message:
          "New password must be at least 6 characters, include letters and numbers",
      });
    }

    if (old_password === new_password) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "New password cannot be the same as old password",
      });
    }

    const result = await changePasswordService(
      userId,
      old_password,
      new_password
    );
    return res.status(result.statusCode).json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: error.message,
    });
  }
}

export async function forgotPassword(req, res) {
  try {
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Request body is empty",
      });
    }

    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Email is required",
      });
    }

    const result = await forgotPasswordService(email);
    return res.status(result.statusCode).json(result);
  } catch (err) {
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: err.message,
    });
  }
}

export async function resetPassword(req, res) {
  try {
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Request body is empty",
      });
    }

    if (!req.params || Object.keys(req.params).length === 0) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Request params is empty",
      });
    }

    const { token } = req.params;
    console.log(token, "token");

    const { password, confirm_password } = req.body;

    if (!password || !confirm_password) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Password and confirm password are required",
      });
    }

    const validPassword = validatePassword(password);

    if (!validPassword.valid) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: validPassword.message,
      });
    }

    if (password !== confirm_password) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Password and confirm password do not match",
      });
    }

    const result = await resetPasswordService(token, password);
    return res.status(result.statusCode).json(result);
  } catch (err) {
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: err.message,
    });
  }
}

export async function logout(req, res) {
  res.clearCookie("auth_token", {
    path: "/",
  });

  return res.status(200).json({
    success: true,
    message: "Logout successful",
  });
}
