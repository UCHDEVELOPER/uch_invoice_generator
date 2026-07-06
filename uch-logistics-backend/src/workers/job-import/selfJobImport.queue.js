import { Queue } from "bullmq";

export const selfJobImportQueue = new Queue("self-job-import-queue", {
  connection: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_PASSWORD,
  },
});
