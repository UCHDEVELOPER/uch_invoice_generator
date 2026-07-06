import { prisma } from "../../config/prismaClient.js";

/**
 * Fetches uninvoiced jobs for a driver
 * filtered by date range.
 */
export async function getSelfJobsForDriver(driverId, from, to) {
  return prisma.selfJob.findMany({
    where: {
      driver_id: driverId,
      is_invoiced: false,
      date_time: {
        gte: from,
        lte: to,
      },
    },
  });
}

/**
 * Fetches all active SelfDrivers.
 */
export async function getActiveSelfDrivers() {
  return prisma.selfDriver.findMany({
    where: {
      status: "active",
    },
  });
}
