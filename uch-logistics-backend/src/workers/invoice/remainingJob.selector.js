// remainingJob.selector.js
export function selectJobsForRemainingAmount(jobs, remaining, tolerance = 5) {
  const max = remaining + tolerance;

  if (!jobs.length || remaining <= 0) {
    return { selectedJobs: [], total: 0 };
  }

  const sortedJobs = [...jobs].sort((a, b) => {
    const dA = a.date_time ? new Date(a.date_time).getTime() : 0;
    const dB = b.date_time ? new Date(b.date_time).getTime() : 0;
    if (dA !== dB) return dA - dB;
    return Number(a.driver_total ?? 0) - Number(b.driver_total ?? 0);
  });

  let selected = [];
  let total = 0;
  // Same "closest to target" logic as weeklyInvoice.selector for consistency.
  let best = { selectedJobs: [], total: 0 };

  for (const job of sortedJobs) {
    const amount = Number(job.driver_total ?? 0);
    if (amount <= 0) continue;

    if (total + amount <= max) {
      selected.push(job);
      total += amount;

      const currentGap = Math.abs(remaining - total);
      const bestGap = Math.abs(remaining - best.total);

      if (
        best.selectedJobs.length === 0 ||
        currentGap < bestGap ||
        (currentGap === bestGap && selected.length < best.selectedJobs.length)
      ) {
        best = { selectedJobs: [...selected], total };
      }

      if (total >= remaining && total <= max) break;
    }
  }

  // Symmetrical fallback: return partial accumulation if best is still empty.
  if (best.selectedJobs.length === 0 && selected.length > 0) {
    return { selectedJobs: selected, total };
  }

  return best;
}