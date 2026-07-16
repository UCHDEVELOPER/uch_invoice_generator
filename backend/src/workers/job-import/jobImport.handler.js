import fs from "fs";
import { readCSV, readExcel } from "./jobImport.parser.js";
import { processBatch } from "./jobImport.processor.js";
import { getFileType } from "../../helpers/validator.js";
import { prisma } from "../../config/prismaClient.js";

async function touchLastImportAt() {
  const now = new Date();
  await prisma.systemState.upsert({
    where: { key: "LAST_JOB_IMPORT_AT" },
    update: { value: now },
    create: { key: "LAST_JOB_IMPORT_AT", value: now },
  });
}

export async function handleJobImport({ filePath, originalName }) {
  try {
    console.log("Worker started for:", originalName);
    if (!fs.existsSync(filePath)) return;

    const fileType = getFileType(filePath, originalName);

    console.log(`Processing as ${fileType.toUpperCase()} file`);

    const rows =
      fileType === "csv" ? await readCSV(filePath) : readExcel(filePath);

    const CHUNK_SIZE = 100;
    const totalBatches = Math.ceil(rows.length / CHUNK_SIZE);

    console.log(
      `[IMPORT] Total rows: ${rows.length}, Chunk size: ${CHUNK_SIZE}, Batches: ${totalBatches}`,
    );

    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const batchNumber = Math.floor(i / CHUNK_SIZE) + 1;
      const chunk = rows.slice(i, i + CHUNK_SIZE);

      console.log(
        `[IMPORT] Processing batch ${batchNumber}/${totalBatches} (${chunk.length} rows)`,
      );

      await processBatch(chunk, fileType);
    }
    console.log("Worker completed for:", originalName);
  } catch (error) {
    console.error("Error during import:", error);
  } finally {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    await touchLastImportAt();
  }
}
