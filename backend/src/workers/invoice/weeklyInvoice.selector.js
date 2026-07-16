// weeklyInvoice.selector.js (SIMPLIFIED - Tolerance = 500)
/**
 * Select jobs where:
 * - total >= weeklyTarget (always meet or exceed minimum)
 * - total <= weeklyTarget + 500 (high tolerance, but with a cap)
 * - Among valid combinations, pick the one closest to weeklyTarget
 *
 * This creates a buffer for finalization: invoices can be reduced
 * to exact amounts without needing to increase the last job.
 */
export function selectJobsWithinTolerance(jobs, weeklyTarget, tolerance = 1000) {
  const min = weeklyTarget;
  const max = weeklyTarget + tolerance;

  if (!Array.isArray(jobs) || jobs.length === 0) {
    return { selectedJobs: [], total: 0 };
  }

  // Sort by date ascending, then by driver_total ascending
  // This helps us find optimal combinations efficiently
  const sortedJobs = [...jobs].sort((a, b) => {
    const dateA = a.date_time ? new Date(a.date_time).getTime() : 0;
    const dateB = b.date_time ? new Date(b.date_time).getTime() : 0;
    if (dateA !== dateB) return dateA - dateB;
    return Number(a.driver_total ?? 0) - Number(b.driver_total ?? 0);
  });

  let selected = [];
  let total = 0;
  let best = { selectedJobs: [], total: 0 };

  for (const job of sortedJobs) {
    const amount = Number(job.driver_total ?? 0);
    if (amount <= 0) continue;

    // Only add if it stays within [min, max] band
    if (total + amount <= max) {
      selected.push(job);
      total += amount;

      // Only consider this a valid candidate if total >= min (weeklyTarget)
      if (total >= min) {
        // Keep the candidate that is closest to weeklyTarget
        const currentGap = Math.abs(weeklyTarget - total);
        const bestGap = Math.abs(weeklyTarget - best.total);

        if (
          best.selectedJobs.length === 0 ||
          currentGap < bestGap ||
          (currentGap === bestGap && selected.length < best.selectedJobs.length)
        ) {
          best = { selectedJobs: [...selected], total };
        }

        // Found a valid match, can break early
        if (total >= weeklyTarget) break;
      }
    }
    // If adding this job would exceed max, skip it and try next
  }

  // Return the best valid combination found (guaranteed total >= min)
  if (best.selectedJobs.length > 0 && best.total >= min) {
    return best;
  }

  // Fallback: if we couldn't reach minimum, return all accumulated jobs
  // (partial invoice, may need manual intervention)
  if (selected.length > 0) {
    console.log(
      `[selectJobsWithinTolerance] Warning: Could not reach minimum £${min}, returning partial total £${total}`,
    );
    return { selectedJobs: selected, total };
  }

  return { selectedJobs: [], total: 0 };
}