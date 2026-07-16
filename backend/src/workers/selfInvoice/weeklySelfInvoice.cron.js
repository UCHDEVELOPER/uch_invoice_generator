import cron from "node-cron";
import { runWeeklySelfInvoiceBatch } from "./Weeklyselfinvoice.worker.js";


cron.schedule("*/15 * * * *", () => {
  runWeeklySelfInvoiceBatch()
});
