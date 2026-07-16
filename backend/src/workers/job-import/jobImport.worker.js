import { Worker } from "bullmq";
import {
  buildLocalDateFromComponents,
  excelSerialToYMDHMS,
  parseDateTimeStringToComponents,
} from "../../utils/parseUserDate.js";
import { handleJobImport } from "./jobImport.handler.js";
import { handleSelfJobImport } from "./selfJobImport.worker.js";

console.log("Redis Config:", {
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD ? "SET" : "NOT_SET",
});

new Worker(
  "job-import-queue",
  async (job) => {
    await handleJobImport(job.data);
  },
  {
    connection: {
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
      password: process.env.REDIS_PASSWORD,
    },
    autorun: true,
  },
);

export const selfJobImportWorker = new Worker(
  "self-job-import-queue",
  async (job) => {
    await handleSelfJobImport(job.data);
  },
  {
    connection: {
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
      password: process.env.REDIS_PASSWORD,
    },
  },
);
