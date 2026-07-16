import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { startOfISOWeek, endOfISOWeek } from "date-fns";

const UK_TIMEZONE = "Europe/London";

export const startOfUkDay = (date) => {
  const ukDate = toZonedTime(date, UK_TIMEZONE);
  ukDate.setHours(0, 0, 0, 0);
  return fromZonedTime(ukDate, UK_TIMEZONE);
};

export const endOfUkDay = (date) => {
  const ukDate = toZonedTime(date, UK_TIMEZONE);
  ukDate.setHours(23, 59, 59, 999);
  return fromZonedTime(ukDate, UK_TIMEZONE);
};

export function parseUserDate(dateStr) {
  if (!dateStr) return null;

  // const [month, day, year] = dateStr.split("/").map(Number);
  const [day, month, year] = dateStr.split("/").map(Number);
  if (!month || !day || !year) return null;

  const start = new Date(year, month - 1, day, 0, 0, 0);
  const end = new Date(year, month - 1, day + 1, 0, 0, 0);

  return { start, end };
}

export function parseDDMMYYYY(dateStr) {
  if (!dateStr) return null;

  if (dateStr.includes("-")) {
    const [year, month, day] = dateStr.split("-").map(Number);
    if (!day || !month || !year) return null;
    return new Date(year, month - 1, day);
  }

  if (dateStr.includes("/")) {
    const [day, month, year] = dateStr.split("/").map(Number);
    if (!day || !month || !year) return null;
    return new Date(year, month - 1, day);
  }

  return null;
}

export function formatDateForUser(isoDate) {
  const date = new Date(isoDate);

  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();

  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");

  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

export function parseDateTimeStringToComponents(input) {
  const cleaned = String(input).trim();

  if (/^\d{4}-\d{2}-\d{2}T/.test(cleaned)) {
    const d = new Date(cleaned);
    return {
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      day: d.getDate(),
      hour: d.getHours(),
      minute: d.getMinutes(),
      second: d.getSeconds(),
      ms: d.getMilliseconds(),
    };
  }

  const sep = cleaned.includes("/") ? "/" : cleaned.includes("-") ? "-" : null;
  if (!sep) return null;

  const parts = cleaned.split(/\s+/);
  const datePart = parts[0];
  const timePart = parts[1] || "00:00:00";

  const dp = datePart.split(sep);
  if (dp.length !== 3) return null;

  const day = Number(dp[0]);
  const month = Number(dp[1]);
  const year = Number(dp[2]);

  const timeParts = timePart.trim().split(":");
  const hour = Number(timeParts[0] || 0);
  const minute = Number(timeParts[1] || 0);
  const second = Number(timeParts[2] || 0);

  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
    ms: 0,
  };
}

export function excelSerialToJSDate(serial) {
  const leapBugCorrection = serial > 59 ? -1 : 0;

  const utcDays = serial + leapBugCorrection;
  const epoch = Date.UTC(1899, 11, 31);

  const ms = utcDays * 24 * 60 * 60 * 1000;
  return new Date(epoch + ms);
}

export function excelSerialToYMDHMS(serial) {
  const d = excelSerialToJSDate(serial);

  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
    second: d.getUTCSeconds(),
    ms: d.getUTCMilliseconds(),
  };
}

export function buildLocalDateFromComponents({
  year,
  month,
  day,
  hour = 0,
  minute = 0,
  second = 0,
  ms = 0,
}) {
  return fromZonedTime(
    new Date(year, month - 1, day, hour, minute, second, ms),
    UK_TIMEZONE,
  );
}

// export function normalizeDateRange(start, end) {
//   if (!start || !end) return null;
//   const [sy, sm, sd] = start.split("-").map(Number);
//   const [ey, em, ed] = end.split("-").map(Number);
//   const startDate = new Date(Date.UTC(sy, sm - 1, sd, 0, 0, 0, 0));
//   const endDate = new Date(Date.UTC(ey, em - 1, ed, 23, 59, 59, 999));
//   return { startDate, endDate };
// }

export function normalizeDateRange(start, end) {
  if (!start || !end) return null;

  return {
    startDate: startOfUkDay(new Date(start)),
    endDate: endOfUkDay(new Date(end)),
  };
}

export function getPreviousWeekRange() {
  const now = new Date();

  // Previous Monday
  const start = new Date(now);
  start.setUTCDate(now.getUTCDate() - now.getUTCDay() - 6);
  start.setUTCHours(0, 0, 0, 0);

  // Previous Sunday
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  end.setUTCHours(23, 59, 59, 999);

  return { start, end };
}

export function getWeekRangeFromDate(date) {
  const ukDate = toZonedTime(date, UK_TIMEZONE);

  const weekStartLondon = startOfISOWeek(ukDate);
  const weekEndLondon = endOfISOWeek(ukDate);

  return {
    start: fromZonedTime(weekStartLondon, UK_TIMEZONE),
    end: fromZonedTime(weekEndLondon, UK_TIMEZONE),
  };
}

export const buildUtcRange = (start_date, end_date) => {
  const [sy, sm, sd] = start_date.split("-").map(Number);
  const [ey, em, ed] = end_date.split("-").map(Number);

  const start = new Date(Date.UTC(sy, sm - 1, sd, 0, 0, 0, 0));
  const end = new Date(Date.UTC(ey, em - 1, ed, 23, 59, 59, 999));

  return { start, end };
};

export const buildUkRange = (start_date, end_date) => {
  const start = fromZonedTime(`${start_date} 00:00:00.000`, UK_TIMEZONE);

  const end = fromZonedTime(`${end_date} 23:59:59.999`, UK_TIMEZONE);

  return { start, end };
};

export function getAllowedDateRange() {
  const now = new Date();

  const utcToday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );

  const day = utcToday.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;

  const currentWeekStart = new Date(utcToday);
  currentWeekStart.setUTCDate(utcToday.getUTCDate() + mondayOffset);
  currentWeekStart.setUTCHours(0, 0, 0, 0);

  const currentWeekEnd = new Date(currentWeekStart);
  currentWeekEnd.setUTCDate(currentWeekStart.getUTCDate() + 6);
  currentWeekEnd.setUTCHours(23, 59, 59, 999);

  const previousWeekStart = new Date(currentWeekStart);
  previousWeekStart.setUTCDate(currentWeekStart.getUTCDate() - 7);
  previousWeekStart.setUTCHours(0, 0, 0, 0);

  return {
    minDate: previousWeekStart,
    maxDate: currentWeekEnd,
  };
}

export function getISOWeekNumber(date) {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

// export function parseLocalDate(dateStr) {
//   const [year, month, day] = dateStr.split("-").map(Number);
//   return new Date(Date.UTC(year, month - 1, day));
// }

export function parseLocalDate(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return fromZonedTime(
    `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")} 00:00:00`,
    UK_TIMEZONE,
  );
}
