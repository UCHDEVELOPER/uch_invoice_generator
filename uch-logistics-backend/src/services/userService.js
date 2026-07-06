import { prisma } from "../config/prismaClient.js";
import bcrypt from "bcryptjs";

export async function updateUserProfileService(userId, data = {}) {
  try {
    if (!data || typeof data !== "object") {
      return {
        success: false,
        statusCode: 400,
        message: "Invalid update data",
      };
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return {
        success: false,
        statusCode: 404,
        message: "User not found",
      };
    }

    const updateData = {};

    const allowedFields = [
      "username",
      "firstname",
      "lastname",
      "phone_no",
      "email",
      "password",
      "image",
    ];

    allowedFields.forEach((field) => {
      if (field in data && data[field] !== undefined) {
        if (field === "image") {
          if (typeof data[field] === "string" && data[field].trim() !== "") {
            updateData[field] = data[field];
          }
        } else if (field === "password" && data[field]) {
          updateData[field] = data[field];
        } else if (data[field] !== "") {
          updateData[field] = data[field];
        }
      }
    });

    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    if (updateData.email && updateData.email !== existingUser.email) {
      const emailExists = await prisma.user.findFirst({
        where: {
          email: updateData.email,
          id: { not: userId },
        },
      });

      if (emailExists) {
        return {
          success: false,
          statusCode: 400,
          message: "Email already in use",
        };
      }
    }

    console.log("Final update data being sent to Prisma:", updateData);

    if (Object.keys(updateData).length === 0) {
      return {
        success: false,
        statusCode: 400,
        message: "No valid fields to update",
      };
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        firstname: true,
        lastname: true,
        phone_no: true,
        email: true,
        image: true,
        user_type: true,
        updated_at: true,
      },
    });

    if (updatedUser.image !== null) {
      updatedUser.image = process.env.BACKEND_BASE_URL + updatedUser.image;
    }

    return {
      success: true,
      statusCode: 200,
      message: "Profile updated successfully",
      data: updatedUser,
    };
  } catch (err) {
    console.error("Update user profile service error:", err);
    return {
      success: false,
      statusCode: 500,
      message: err.message,
    };
  }
}

export async function getUserProfileService(userId) {
  try {

    if (!userId || typeof userId !== "string") {
      return {
        success: false,
        statusCode: 400,
        message: "Invalid user ID",
      };
    }

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });


    if (!user) {
      return {
        success: false,
        statusCode: 404,
        message: "User not found",
      };
    }

    if (user.image) {
      user.image = `${process.env.BACKEND_BASE_URL}${user.image}`;
    }

    return {
      success: true,
      statusCode: 200,
      message: "User profile fetched successfully",
      data: user,
    };
  } catch (err) {
    return {
      success: false,
      statusCode: 500,
      message: err.message,
    };
  }
}
