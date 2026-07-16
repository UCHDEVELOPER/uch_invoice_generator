import { prisma } from "../../config/prismaClient.js";
import { getISOWeek, getISOWeekYear } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

const TIMEZONE = "Europe/London";

/**
 * Finds the oldest uninvoiced SelfJob across ALL drivers,
 * then derives the full ISO week (Mon 00:00:00 → Sun 23:59:59) in Europe/London time.
 *
 * @returns {{ from: Date, to: Date, week: number, year: number } | null}
 */
export async function findOldestPendingSelfWeek() {
  const oldestJob = await prisma.selfJob.findFirst({
    where: {
      is_invoiced: false,
      date_time: { not: null },
    },
    orderBy: { date_time: "asc" },
    select: { date_time: true },
  });

  if (!oldestJob?.date_time) return null;

  // Convert UTC timestamp → Europe/London wall-clock date
  const ukDate = toZonedTime(oldestJob.date_time, TIMEZONE);

  const week = getISOWeek(ukDate);
  const year = getISOWeekYear(ukDate);

  // Find the Monday of this ISO week in London time.
  // getDay() returns 0=Sun,1=Mon,...,6=Sat; ISO week starts Monday.
  const dayOfWeek = ukDate.getDay(); // 0 (Sun) – 6 (Sat)
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sun→6, Mon→0, …

  // Build Monday 00:00:00 and Sunday 23:59:59.999 as London wall-clock dates
  const monday = new Date(ukDate);
  monday.setDate(ukDate.getDate() - daysFromMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  // Convert those London wall-clock boundaries back to UTC for Prisma queries
  const from = fromZonedTime(monday, TIMEZONE);
  const to = fromZonedTime(sunday, TIMEZONE);

  return { from, to, week, year };
}

/**
 * Generates a human-readable batch code e.g. "SELF-2025-W22-SITE"
 */
export function buildSelfBatchCode(year, week, siteType) {
  const paddedWeek = String(week).padStart(2, "0");
  return `SELF-${year}-W${paddedWeek}-${siteType}`;
}