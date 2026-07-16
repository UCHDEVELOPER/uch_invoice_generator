import {prisma} from "../../config/prismaClient.js";

const SELF_BATCH_NUMBER_START = 1001; // Self invoice batches always start from 1001

/**
 * Checks if a SelfInvoiceBatch already exists for the given batch_code.
 * Used as a guard to prevent duplicate batch creation on re-runs.
 */
export async function findExistingSelfBatch(batchCode) {
  return prisma.selfInvoiceBatch.findUnique({
    where: { batch_code: batchCode },
  });
}

/**
 * Creates a new SelfInvoiceBatch for the given week.
 *
 * batch_number rules:
 *   - Always starts at 1001 minimum (never below)
 *   - If batches already exist, increments from the highest existing number
 */
export async function createSelfInvoiceBatch({
  batchCode,
  from,
  to,
  week,
  year,
  siteType,
}) {
  const lastBatch =
    await prisma.selfInvoiceBatch.findFirst({
      orderBy: {
        batch_number: "desc",
      },
    });

  const nextBatchNumber = lastBatch
    ? Math.max(
        lastBatch.batch_number + 1,
        SELF_BATCH_NUMBER_START,
      )
    : SELF_BATCH_NUMBER_START;

  return prisma.selfInvoiceBatch.create({
    data: {
      batch_number: nextBatchNumber,
      batch_code: batchCode,
      from_date: from,
      to_date: to,
      year,
      week,
      site_type: siteType,
    },
  });
}