import { prisma } from "../../config/prismaClient.js";
import {
  buildLocalDateFromComponents,
  excelSerialToYMDHMS,
  parseDateTimeStringToComponents,
} from "../../utils/parseUserDate.js";

export async function processBatch(rows, fileType) {
  const jobsToCreate = [];
  const logsToCreate = [];
  const driverCache = new Map();

  const docketNumbers = rows
    .map((r) => String(r["Docket"] || "").trim())
    .filter(Boolean);

  const existingJobs = await prisma.selfJob.findMany({
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

        const comps = isExcelSerial
          ? excelSerialToYMDHMS(date_time_raw)
          : parseDateTimeStringToComponents(date_time_raw);

        parsedDate = buildLocalDateFromComponents(comps);
      } else {
        const comps = parseDateTimeStringToComponents(date_time_raw);
        parsedDate = buildLocalDateFromComponents(comps);
      }
    } catch {
      parsedDate = null;
    }

    if (!parsedDate || isNaN(parsedDate.getTime())) {
      logsToCreate.push({ docket_no, reason: "INVALID_DATE", row_data: row });
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

    const callSign = rawCallSign.toUpperCase().trim();

    /* ---------------- DRIVER RESOLUTION ---------------- */
    let driver = driverCache.get(callSign);

    if (!driver) {
      driver = await prisma.selfDriver.findFirst({
        where: {
          call_sign: {
            equals: callSign,
            mode: "insensitive",
          },
        },
      });

      if (!driver) {
        driver = await prisma.selfDriver.create({
          data: {
            call_sign: callSign.toUpperCase(),
            status: "active",
          },
        });
      } else {
        /**
         * NORMALIZE EXISTING DRIVER CALL SIGN
         */
        if (driver.call_sign !== callSign.toUpperCase()) {
          driver = await prisma.selfDriver.update({
            where: {
              id: driver.id,
            },

            data: {
              call_sign: callSign.toUpperCase(),
            },
          });
        }
      }

      driverCache.set(callSign, driver);
    }

    /* ---------------- JOB PREPARATION ---------------- */
    jobsToCreate.push({
      docket_no,
      call_sign: callSign,
      date_time: parsedDate.toISOString(),
      journey: row["Journey"] || null,
      tariff: row["Tariff"] || null,
      weight: parseFloat(row["Weight"] || 0) || null,
      driver_total: parseFloat(row["Driver Total"] || 0) || null,
      driver_id: driver.id,
      is_invoiced: false,
      invoice_id: null,
    });
  }

  /* ---------------- BULK INSERT ---------------- */
  if (jobsToCreate.length) {
    await prisma.selfJob.createMany({ data: jobsToCreate });
  }

  if (logsToCreate.length) {
    await prisma.selfJobImportLog.createMany({ data: logsToCreate });
  }
}
