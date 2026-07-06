import { prisma } from "../../config/prismaClient.js";
import { getISOWeek, getISOWeekYear } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

const TIMEZONE = "Europe/London";

function getWeekRangeFromDate(utcDate) {
  const ukDate = toZonedTime(utcDate, TIMEZONE);

  const dayOfWeek = ukDate.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const monday = new Date(ukDate);
  monday.setDate(ukDate.getDate() - daysFromMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return {
    start: fromZonedTime(monday, TIMEZONE),
    end: fromZonedTime(sunday, TIMEZONE),
    week: getISOWeek(ukDate),
    year: getISOWeekYear(ukDate),
  };
}

export async function findPendingWeeks() {
  const jobs = await prisma.job.findMany({
    where: {
      is_invoiced: false,
      date_time: { not: null },
      driver: {
        status: "active",
        per_hour_rate: { gt: 0 },
        total_hours: { gt: 0 },
      },
    },
    select: { date_time: true },
  });

  const weekMap = new Map();

  for (const job of jobs) {
    const { start, end, week, year } = getWeekRangeFromDate(job.date_time);
    const key = start.toISOString();

    if (!weekMap.has(key)) {
      weekMap.set(key, { start, end, week, year });
    }
  }

  return Array.from(weekMap.values()).sort((a, b) => a.start - b.start);
}