import fs from "fs";
import { readCSV, readExcel } from "./selfJobImport.parser.js";
import { processBatch } from "./selfJobImport.processor.js";
import { getFileType } from "../../helpers/validator.js";
import { prisma } from "../../config/prismaClient.js";

async function touchLastImportAt() {
  const now = new Date();
  await prisma.selfSystemState.upsert({
    where: { key: "LAST_SELF_JOB_IMPORT_AT" },
    update: { value: now },
    create: { key: "LAST_SELF_JOB_IMPORT_AT", value: now },
  });
}

export async function handleSelfJobImport({ filePath, originalName }) {
  try {
    console.log("[SelfJob] Worker started for:", originalName);
    if (!fs.existsSync(filePath)) return;

    const fileType = getFileType(filePath, originalName);
    console.log(`[SelfJob] Processing as ${fileType.toUpperCase()} file`);

    const rows =
      fileType === "csv" ? await readCSV(filePath) : readExcel(filePath);

    const CHUNK_SIZE = 100;
    const totalBatches = Math.ceil(rows.length / CHUNK_SIZE);

    console.log(
      `[SelfJob] Total rows: ${rows.length}, Chunk size: ${CHUNK_SIZE}, Batches: ${totalBatches}`
    );

    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const batchNumber = Math.floor(i / CHUNK_SIZE) + 1;
      const chunk = rows.slice(i, i + CHUNK_SIZE);

      console.log(
        `[SelfJob] Processing batch ${batchNumber}/${totalBatches} (${chunk.length} rows)`
      );

      await processBatch(chunk, fileType);
    }

    console.log("[SelfJob] Worker completed for:", originalName);
  } catch (error) {
    console.error("[SelfJob] Error during import:", error);
  } finally {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    await touchLastImportAt();
  }
}