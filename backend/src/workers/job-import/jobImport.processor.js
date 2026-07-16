import { prisma } from "../../config/prismaClient.js";
import {
  buildLocalDateFromComponents,
  excelSerialToYMDHMS,
  parseDateTimeStringToComponents,
} from "../../utils/parseUserDate.js";

/**
 * Process a batch of rows safely and efficiently
 */
export async function processBatch(rows, fileType) {
  const jobsToCreate = [];
  const logsToCreate = [];

  const driverCache = new Map();

  const docketNumbers = rows
    .map((r) => String(r["Docket"] || "").trim())
    .filter(Boolean);

  const existingJobs = await prisma.job.findMany({
    where: { docket_no: { in: docketNumbers } },
    select: { docket_no: true },
  });

  const existingDocketSet = new Set(existingJobs.map((j) => j.docket_no));

  for (const row of rows) {
    const docket_no = String(row["Docket"] || "").trim();
    if (!docket_no) continue;

    if (existingDocketSet.has(docket_no)) {
      logsToCreate.push({
        docket_no,
        reason: "DUPLICATE_DOCKET",
        row_data: row,
      });
      continue;
    }

    /* ---------------- DATE PARSING ---------------- */
    const date_time_raw = row["Date/Time"];
    let parsedDate;

    try {
      if (fileType === "excel") {
        const isExcelSerial =
          typeof date_time_raw === "number" &&
          date_time_raw > 20000 &&
          date_time_raw < 60000;
        if (isExcelSerial) {
          const comps = excelSerialToYMDHMS(date_time_raw);
          parsedDate = buildLocalDateFromComponents(comps);
        } else {
          const comps = parseDateTimeStringToComponents(date_time_raw);
          parsedDate = buildLocalDateFromComponents(comps);
        }
      } else {
        const comps = parseDateTimeStringToComponents(date_time_raw);
        parsedDate = buildLocalDateFromComponents(comps);
      }
    } catch {
      parsedDate = null;
    }

    if (!parsedDate || isNaN(parsedDate.getTime())) {
      logsToCreate.push({
        docket_no,
        reason: "INVALID_DATE",
        row_data: row,
      });
      continue;
    }

    /* ---------------- CALL SIGN ---------------- */
    const rawCallSign = String(row["Callsign"] || "").trim();

    if (!rawCallSign) {
      logsToCreate.push({
        docket_no,
        reason: "CALL_SIGN_MISSING",
        row_data: row,
      });
      continue;
    }

    const callSign = rawCallSign.toUpperCase();

    /* ---------------- DRIVER RESOLUTION ---------------- */
    let driver = driverCache.get(callSign);

    if (!driver) {
      driver = await prisma.driver.findFirst({
        where: {
          call_sign: {
            equals: callSign,
            mode: "insensitive",
          },
        },
      });

      if (!driver) {
        driver = await prisma.driver.create({
          data: {
            call_sign: callSign,
            status: "active",
          },
        });
      }

      driverCache.set(callSign, driver);
    }

    /* ---------------- JOB PREPARATION ---------------- */
    jobsToCreate.push({
      docket_no,
      call_sign: callSign,
      date_time: parsedDate.toISOString(),
      journey: row["Journey"],
      tariff: row["Tariff"],
      weight: parseFloat(row["Weight"] || 0),
      driver_total: parseFloat(row["Driver Total"] || 0),
      driver_id: driver.id,
      is_invoiced: false,
      invoice_id: null,
    });
  }

  /* ---------------- BULK INSERT JOBS ---------------- */
  if (jobsToCreate.length) {
    await prisma.job.createMany({
      data: jobsToCreate,
    });
  }

  /* ---------------- BULK INSERT LOGS ---------------- */
  if (logsToCreate.length) {
    await prisma.jobImportLog.createMany({
      data: logsToCreate,
    });
  }
}
