import { prisma } from "../config/prismaClient.js";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

export async function seedAdminUser() {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;

    const existing = await prisma.user.findFirst({
      where: { email: adminEmail }
    });

    if (existing) {
      console.log("Admin already exists");
      return;
    }

    const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
    
    await prisma.user.create({
      data: {
        username: process.env.ADMIN_USERNAME,
        email: adminEmail,
        password: hash,
        user_type: "admin",
      }
    });
    console.log('Admin user seeded successfully');
  } catch (err) {
    console.error("Error seeding admin:", err.message);
  }
}
