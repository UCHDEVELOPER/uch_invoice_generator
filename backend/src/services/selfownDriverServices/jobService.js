import { prisma } from "../../config/prismaClient.js";
import { parseDDMMYYYY, formatDateForUser, getAllowedDateRange } from "../../utils/parseUserDate.js";

export async function addJobService(payload) {
  try {
    let driverId = null;
    let finalCallSign = null;
    let fetchedDriver = null;

    const existingJob = await prisma.selfJob.findFirst({
      where: { docket_no: payload.docket_no },
    });

    if (existingJob) {
      return {
        success: false,
        statusCode: 400,
        message: "Job with this docket number already exists",
      };
    }

    if (payload.driver_id && payload.call_sign) {
      let driver = await prisma.selfDriver.findFirst({
        where: {
          id: payload.driver_id,
          call_sign: payload.call_sign,
        },
      });

      if (driver) {
        fetchedDriver = driver;
        driverId = driver.id;
      } else {
        const byId = await prisma.selfDriver.findFirst({
          where: { id: payload.driver_id },
        });

        const byCallSign = await prisma.selfDriver.findFirst({
          where: { call_sign: payload.call_sign },
        });

        if (byId) {
          fetchedDriver = byId;
          driverId = byId.id;
        } else if (byCallSign) {
          fetchedDriver = byCallSign;
          driverId = byCallSign.id;
        } else {
          return {
            success: false,
            statusCode: 400,
            message:
              "Invalid driver_id and call_sign. No matching driver found using either value.",
          };
        }
      }
    } else if (payload.driver_id && !payload.call_sign) {
      const driver = await prisma.selfDriver.findFirst({
        where: { id: payload.driver_id },
      });

      if (!driver) {
        return {
          success: false,
          statusCode: 400,
          message: "Invalid driver_id. Driver not found.",
        };
      }

      fetchedDriver = driver;
      driverId = driver.id;
    } else if (!payload.driver_id && payload.call_sign) {
      const driver = await prisma.selfDriver.findFirst({
        where: { call_sign: payload.call_sign },
      });

      if (!driver) {
        return {
          success: false,
          statusCode: 400,
          message: `Driver with call_sign '${payload.call_sign}' does not exist. Please add the driver first.`,
        };
      }

      fetchedDriver = driver;
      driverId = driver.id;
    }

    finalCallSign =
      payload.call_sign || (fetchedDriver ? fetchedDriver.call_sign : null);

    const job = await prisma.selfJob.create({
      data: {
        docket_no: payload.docket_no,
        date_time: payload.date_time,
        journey: payload.journey,
        tariff: payload.tariff,
        driver_total: payload.driver_total ? Number(payload.driver_total) : 0,
        call_sign: finalCallSign,
        driver_id: driverId,
      },
    });

    const formattedJob = {
      ...job,
      date_time: job.date_time ? formatDateForUser(job.date_time) : null,
    };

    return {
      success: true,
      statusCode: 201,
      message: "Job added successfully",
      data: formattedJob,
    };
  } catch (err) {
    return {
      success: false,
      statusCode: 500,
      message: err.message,
    };
  }
}

export async function getAllJobsService(page, limit, filters = {}) {
  try {
    const hasSearch =
      filters.search && String(filters.search).trim() !== "";

    const safeLimit = Math.max(Number(limit) || 10, 1);
    const effectivePage = hasSearch
      ? 1
      : Math.max(Number(page) || 1, 1);

    const skip = (effectivePage - 1) * safeLimit;

    const where = {};

    /* ===================== SEARCH ===================== */
    if (hasSearch) {
      const search = String(filters.search).trim();
      const isNumeric = !isNaN(search);

      where.OR = [
        { docket_no: { contains: search, mode: "insensitive" } },
        { call_sign: { contains: search, mode: "insensitive" } },
        { tariff: { contains: search, mode: "insensitive" } },
        { journey: { contains: search, mode: "insensitive" } },
      ];

      if (isNumeric) {
        where.OR.push({ driver_total: Number(search) });
      }
    }

    /* ===================== DATE RANGE ===================== */
    if (filters.from_date || filters.to_date) {
      where.date_time = {};

      if (filters.from_date) {
        const from = parseDDMMYYYY(filters.from_date);
        if (from) {
          from.setHours(0, 0, 0, 0);
          where.date_time.gte = from;
        }
      }

      if (filters.to_date) {
        const to = parseDDMMYYYY(filters.to_date);
        if (to) {
          to.setHours(23, 59, 59, 999);
          where.date_time.lte = to;
        }
      }
    }

    /* ===================== QUERY ===================== */
    const [jobs, totalCount] = await Promise.all([
      prisma.selfJob.findMany({
        where,
        skip,
        take: safeLimit,
        orderBy: { date_time: "desc" },
      }),
      prisma.selfJob.count({ where }),
    ]);

    const formattedJobs = jobs.map((job) => ({
      ...job,
      date_time: job.date_time ? formatDateForUser(job.date_time) : null,
    }));

    return {
      success: true,
      statusCode: 200,
      message: "Jobs fetched successfully",
      data: formattedJobs,
      pagination: {
        page: effectivePage,
        limit: safeLimit,
        totalCount,
        totalPages: Math.ceil(totalCount / safeLimit),
        hasNextPage: effectivePage * safeLimit < totalCount,
        hasPrevPage: effectivePage > 1,
      },
    };
  } catch (err) {
    return {
      success: false,
      statusCode: 500,
      message: err.message,
    };
  }
}

export async function getJobService(id) {
  try {
    const job = await prisma.selfJob.findUnique({
      where: { id },
      include: { driver: true },
    });

    if (!job) {
      return {
        success: false,
        statusCode: 404,
        message: "Job not found",
      };
    }

    const formattedJob = {
      ...job,
      // date_time: job.date_time ? formatDateForUser(job.date_time) : null,
    };

    return {
      success: true,
      statusCode: 200,
      message: "Job fetched successfully",
      data: formattedJob,
    };
  } catch (err) {
    return {
      success: false,
      statusCode: 500,
      message: err.message,
    };
  }
}

export async function updateJobService(id, data) {
  try {
    const existingJob = await prisma.selfJob.findUnique({ where: { id } });

    if (!existingJob) {
      return {
        success: false,
        statusCode: 404,
        message: "Job not found",
      };
    }

    if (data.docket_no) {
      const duplicate = await prisma.selfJob.findFirst({
        where: {
          docket_no: data.docket_no,
          NOT: { id: id },
        },
      });

      if (duplicate) {
        return {
          success: false,
          statusCode: 400,
          message: `Docket number "${data.docket_no}" already exists.`,
        };
      }
    }

    const updated = await prisma.selfJob.update({
      where: { id },
      data: {
        ...data,
        updated_at: new Date(),
      },
    });

    const formattedJob = {
      ...updated,
      date_time: updated.date_time
        ? formatDateForUser(updated.date_time)
        : null,
    };

    return {
      success: true,
      statusCode: 200,
      message: "Job updated successfully",
      data: formattedJob,
    };
  } catch (err) {
    return {
      success: false,
      statusCode: 500,
      message: err.message,
    };
  }
}

export async function deleteJobService(id) {
  try {
    const job = await prisma.selfJob.findUnique({ where: { id } });

    if (!job) {
      return {
        success: false,
        statusCode: 404,
        message: "Job not found",
      };
    }

    await prisma.selfJob.delete({ where: { id } });

    return {
      success: true,
      statusCode: 200,
      message: "Job deleted successfully",
    };
  } catch (err) {
    return {
      success: false,
      statusCode: 500,
      message: err.message,
    };
  }
}

export async function deleteBulkJobsService(jobIds) {
  try {
    await prisma.$transaction([
      prisma.jobChangeHistory.deleteMany({
        where: { job_id: { in: jobIds } },
      }),
      prisma.selfInvoiceJob.deleteMany({
        where: { job_id: { in: jobIds } },
      }),
      prisma.selfJob.deleteMany({
        where: { id: { in: jobIds } },
      }),
    ]);

    return {
      success: true,
      statusCode: 200,
      message: "Jobs deleted successfully",
    };
  } catch (err) {
    return {
      success: false,
      statusCode: 500,
      message: err.message,
    };
  }
}
export async function getDriverJobsService(
  id,
  page = 1,
  limit = 10,
  filters = {}
) {
  try {
    const safePage = Math.max(Number(page) || 1, 1);
    const safeLimit = Math.max(Number(limit) || 10, 1);
    const skip = (safePage - 1) * safeLimit;

    const driver = await prisma.selfDriver.findUnique({
      where: { id: id },
      select:{ call_sign: true }
    });

    const where = {
      call_sign: driver.call_sign, 
    };

    /* ===================== SEARCH ===================== */
    if (filters.search && String(filters.search).trim() !== "") {
      const search = String(filters.search).trim();
      const isNumeric = !isNaN(search);

      where.AND = [
        {
          OR: [
            { docket_no: { contains: search, mode: "insensitive" } },
            { call_sign: { contains: search, mode: "insensitive" } },
            { tariff: { contains: search, mode: "insensitive" } },
            { journey: { contains: search, mode: "insensitive" } },
            ...(isNumeric ? [{ driver_total: Number(search) }] : []),
          ],
        },
      ];
    }

    /* ===================== DATE RANGE ===================== */
    if (filters.from_date || filters.to_date) {
      const dateFilter = {};

      if (filters.from_date) {
        const from = parseDDMMYYYY(filters.from_date);
        if (from) {
          from.setHours(0, 0, 0, 0);
          dateFilter.gte = from;
        }
      }

      if (filters.to_date) {
        const to = parseDDMMYYYY(filters.to_date);
        if (to) {
          to.setHours(23, 59, 59, 999);
          dateFilter.lte = to;
        }
      }

      if (Object.keys(dateFilter).length) {
        where.date_time = dateFilter;
      }
    }

    /* ===================== QUERY ===================== */
    const [jobs, totalCount] = await Promise.all([
      prisma.selfJob.findMany({
        where,
        skip,
        take: safeLimit,
        orderBy: { date_time: "desc" },
      }),
      prisma.selfJob.count({ where }),
    ]);

    const formattedJobs = jobs.map((job) => ({
      ...job,
      date_time: job.date_time ? formatDateForUser(job.date_time) : null,
    }));

    return {
      success: true,
      statusCode: 200,
      message: "Driver jobs fetched successfully",
      data: formattedJobs,
      pagination: {
        page: safePage,
        limit: safeLimit,
        totalCount,
        totalPages: Math.ceil(totalCount / safeLimit),
        hasNextPage: safePage * safeLimit < totalCount,
        hasPrevPage: safePage > 1,
      },
    };
  } catch (err) {
    return {
      success: false,
      statusCode: 500,
      message: err.message,
    };
  }
}