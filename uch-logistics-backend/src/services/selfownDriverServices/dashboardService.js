import { prisma } from "../../config/prismaClient.js";

export async function dashboardDataService() {
  try {
    const totalJobs = await prisma.selfJob.count();

    const activeDrivers = await prisma.selfDriver.count({
      where: { status: "active" },   
    });

    const jobRevenue = await prisma.selfJob.aggregate({
      _sum: { driver_total: true },
    });

    const totalRevenue = jobRevenue._sum.driver_total || 0;

    const recentActiveDrivers = await prisma.selfDriver.findMany({
      where: { status: "active" },
      orderBy: { created_at: "desc" },
      take: 5,
      include: {
        driver_position: {
          select: {
            id: true,
            label: true,
          },
        },
      },
    });

    return {
      success: true,
      statusCode: 200,
      message: "Dashboard data fetched successfully",
      data: {
        total_jobs: totalJobs,
        active_drivers: activeDrivers,
        total_revenue: totalRevenue,
        recent_active_drivers: recentActiveDrivers,
      },
    };

  } catch (error) {
    return {
      success: false,
      statusCode: 500,
      message: error.message,
    };
  }
}
