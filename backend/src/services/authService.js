import bcrypt from "bcryptjs";
import { prisma } from "../config/prismaClient.js";
import { generateToken } from "../utils/jwt.js";
import crypto from "crypto";
import { generateResetToken } from "../utils/tokenGenerator.js";
import { sendEmail } from "../utils/email.js";
import dotenv from "dotenv";

dotenv.config();

export async function loginService(email, password) {
  const user = await prisma.user.findFirst({ where: { email } });

  if (!user) {
    return {
      success: false,
      statusCode: 400,
      message: "Invalid email or password",
    };
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return {
      success: false,
      statusCode: 400,
      message: "Invalid email or password",
    };
  }

  const token = generateToken(user);

  return {
    success: true,
    statusCode: 200,
    message: "Login successful",
    data: {
      id: user.id,
      username: user.username,
      email: user.email,
      user_type: user.user_type,
      image: user.image ? process.env.BACKEND_BASE_URL + user.image : null,
      token,
    },
  };
}

export async function addAccountantService(data) {
  const alreadyRegistered = await prisma.user.findFirst({
    where: { email: data.email },
  });

  if (alreadyRegistered) {
    return {
      success: false,
      statusCode: 400,
      message: "Accountant already registered",
    };
  }

  const hashedPassword = data.password
    ? await bcrypt.hash(data.password, 10)
    : null;

  const user = await prisma.user.create({
    data: {
      username: data.username,
      email: data.email,
      password: hashedPassword,
      user_type: "accountant",
    },
  });

  return {
    success: true,
    statusCode: 200,
    message: "Accountant added successfully",
    data: user,
  };
}

export async function changePasswordService(userId, oldPassword, newPassword) {
  try {
    console.log(userId, oldPassword, newPassword);
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return {
        success: false,
        statusCode: 404,
        message: "User not found",
      };
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);

    if (!isMatch) {
      return {
        success: false,
        statusCode: 401,
        message: "Old password is incorrect",
      };
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return {
      success: true,
      statusCode: 200,
      message: "Password changed successfully",
    };
  } catch (error) {
    return {
      success: false,
      statusCode: 500,
      message: error.message,
    };
  }
}

export async function forgotPasswordService(email) {
  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return {
        success: false,
        statusCode: 404,
        message: "Email not found",
      };
    }

    const { token, hashedToken } = generateResetToken();

    await prisma.user.update({
      where: { id: user.id },
      data: {
        reset_password_token: hashedToken,
        reset_password_expires: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    const resetLink = `${process.env.FRONTEND_URL}/reset-password/${token}`;


    await sendEmail({
      to: user.email,
      subject: "Reset Your Password",
      html: `
    <div style="
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      font-family: Arial, Helvetica, sans-serif;
      background-color: #f4f6f8;
    ">
      <div style="
        background-color: #ffffff;
        padding: 30px;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      ">
        <h2 style="color: #333; margin-bottom: 10px;">
          Reset Your Password
        </h2>

        <p style="color: #555; font-size: 14px; line-height: 1.6;">
          Hi ${user.username || "there"},
        </p>

        <p style="color: #555; font-size: 14px; line-height: 1.6;">
          We received a request to reset your password. Click the button below
          to set a new password.
        </p>

        <div style="text-align: center; margin: 30px 0;">
          <a
            href="${resetLink}"
            style="
              background-color: #4f46e5;
              color: #ffffff;
              padding: 12px 24px;
              text-decoration: none;
              border-radius: 6px;
              font-size: 14px;
              font-weight: bold;
              display: inline-block;
            "
          >
            Reset Password
          </a>
        </div>

        <p style="color: #777; font-size: 13px; line-height: 1.6;">
          This link will expire in <strong>15 minutes</strong>.
          If you didn’t request a password reset, you can safely ignore this email.
        </p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />

        <p style="color: #999; font-size: 12px;">
          If the button above doesn’t work, copy and paste the link below into your browser:
        </p>

        <p style="
          font-size: 12px;
          color: #2563eb;
          word-break: break-all;
        ">
          ${resetLink}
        </p>

        <p style="color: #999; font-size: 12px; margin-top: 30px;">
          © ${new Date().getFullYear()} Your Company Name. All rights reserved.
        </p>
      </div>
    </div>
  `,
    });


    return {
      success: true,
      statusCode: 200,
      message: "Password reset link has been sent to your email",
    };
  } catch (err) {
    return {
      success: false,
      statusCode: 500,
      message: err.message,
    };
  }
}

export async function resetPasswordService(token, password) {
  try {
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await prisma.user.findFirst({
      where: {
        reset_password_token: hashedToken,
        reset_password_expires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      return {
        success: false,
        statusCode: 400,
        message: "Invalid or expired reset token",
      };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        reset_password_token: null,
        reset_password_expires: null,
      },
    });

    return {
      success: true,
      statusCode: 200,
      message: "Password reset successfully",
    };
  } catch (err) {
    return {
      success: false,
      statusCode: 500,
      message: err.message,
    };
  }
}

