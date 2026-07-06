import { prisma } from "./prismaClient.js";

export async function connectDB() {
  try {
    await prisma.$connect();
    console.log("MongoDB connected successfully via Prisma");
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  }
}

export async function disconnectDB() {
  try {
    await prisma.$disconnect();
    console.log("MongoDB disconnected");
  } catch (err) {
    console.error("Error disconnecting MongoDB:", err.message);
  }
}
