// weeklyInvoice.cron.js
// Three sequential cron passes — each runs only after the previous completes.
//
// Pass 1 → drivers with SUFFICIENT own jobs
// Pass 2 → drivers with INSUFFICIENT own jobs (topped up from pool)
// Pass 3 → drivers with NO own jobs (fully from pool)
//
// All three passes share a single isRunning lock so they never overlap.
// handledDriverIds flows from Pass 1 → Pass 2 → Pass 3 so no driver is
// processed twice.

import cron from "node-cron";
import { findPendingWeeks } from "./findPendingWeeks.js";
import { runPass1 } from "./pass1.worker.js";
import { runPass2 } from "./pass2.worker.js";
import { runPass3 } from "./pass3.worker.js";
import { runCarryForwardPass } from "./carryForward.worker.js";

let isRunning = false;

async function runAllPasses() {
  if (isRunning) {
    console.log("[CRON] Previous invoice run still in progress — skipping.");
    return;
  }

  isRunning = true;
  console.log(`[CRON] Invoice batch started at ${new Date().toISOString()}`);

  try {
    const pendingWeeks = await findPendingWeeks();

    if (!pendingWeeks.length) {
      console.log("[CRON] No pending weeks found — nothing to process.");
      return;
    }

    console.log(`[CRON] ${pendingWeeks.length} pending week(s) found.`);

    // Process each pending week sequentially
    for (const { start, end } of pendingWeeks) {
      console.log(`\n[CRON] ── Week: ${start.toISOString()} → ${end.toISOString()} ──`);

      // Pass 1: drivers with sufficient own jobs
      const pass1Handled = await runPass1({ start, end });

      // Pass 2: drivers with insufficient own jobs — skip those Pass 1 handled
      const pass2Handled = await runPass2({ start, end }, pass1Handled);

      // Pass 3: drivers with no jobs — skip those handled by Pass 1 or Pass 2
      const allHandled = new Set([...pass1Handled, ...pass2Handled]);
      const pass3Handled = await runPass3({ start, end }, allHandled);

      // Carry-forward pass: accumulate fixed weekly charges for every active
      // driver who received no invoice at all this week.
      // Only runs if at least one invoice was created — if nothing was invoiced
      // there is no meaningful batch to carry forward from.
      const allInvoicedIds = new Set([...allHandled, ...pass3Handled]);

      if (allInvoicedIds.size > 0) {
        await runCarryForwardPass({ invoicedDriverIds: allInvoicedIds });
      } else {
        console.log(
          `[CRON] No invoices created this week — carry-forward skipped`,
        );
      }

      console.log(`[CRON] ── Week complete ──\n`);
    }
  } catch (error) {
    console.error("[CRON] Invoice batch failed:", error);
  } finally {
    isRunning = false;
    console.log(`[CRON] Invoice batch finished at ${new Date().toISOString()}`);
  }
}

cron.schedule("*/15 * * * *", runAllPasses);