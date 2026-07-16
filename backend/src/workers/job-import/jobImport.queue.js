import { Queue } from "bullmq";

export const jobImportQueue = new Queue("job-import-queue", {
  connection: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_PASSWORD,
  }
});
