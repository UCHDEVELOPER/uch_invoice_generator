import { deleteDriver } from "@/lib/api/driver.api";
import { deleteSelfOwnDriver } from "@/lib/api/self-own/driver.api";
import {
  setISOWeekYear,
  setISOWeek,
  startOfISOWeek,
  endOfISOWeek,
  format
} from "date-fns";
import { toast } from "react-hot-toast";
import { fromZonedTime , toZonedTime } from "date-fns-tz";

const TIMEZONE = "Europe/London";

export const formatDriverRate = (driver) => {
  if (driver?.per_hour_rate) {
    return `£${driver.per_hour_rate} for ${
      driver.total_hours ?? 0
    } hours / week`;
  }

  if (driver?.weekly_fixed_rate) {
    return `£${driver.weekly_fixed_rate} for ${
      driver.total_days ?? 0
    } days / week`;
  }

  return "-";
};

export async function handleDeleteDriver({
  driverId,
  driverName,
  onError,
  onSuccess,
  setLoading,
  closeModal,
}) {
  try {
    setLoading(true);

    const response = await deleteDriver(driverId);

    if (response?.data?.success) {
      toast.success(`Driver ${driverName} deleted successfully`);
      closeModal?.();
      onSuccess?.(`Driver ${driverName} deleted successfully`);
    } else {
      const errorMsg = response?.data?.message || "Failed to delete driver";
      toast.error(errorMsg);
      onError?.(errorMsg);
    }
  } catch (error) {
    const errorMsg =
      error?.response?.data?.message ||
      error?.message ||
      "Failed to delete driver";
    toast.error(errorMsg);
    onError?.(errorMsg);
  } finally {
    setLoading(false);
  }
}

export async function handleDeleteSelfOwnDriver({
  driverId,
  driverName,
  onError,
  onSuccess,
  setLoading,
  closeModal,
}) {
  try {
    setLoading(true);

    const response = await deleteSelfOwnDriver(driverId);

    if (response?.data?.success) {
      toast.success(`Driver ${driverName} deleted successfully`);
      closeModal?.();
      onSuccess?.(`Driver ${driverName} deleted successfully`);
    } else {
      const errorMsg = response?.data?.message || "Failed to delete driver";
      toast.error(errorMsg);
      onError?.(errorMsg);
    }
  } catch (error) {
    const errorMsg =
      error?.response?.data?.message ||
      error?.message ||
      "Failed to delete driver";
    toast.error(errorMsg);
    onError?.(errorMsg);
  } finally {
    setLoading(false);
  }
}

export const formatDateForAPI = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

export const calculatePageNumbers = (totalPages, currentPage) => {
  const pages = [];
  const maxVisiblePages = 5;

  if (totalPages <= maxVisiblePages) {
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
  } else {
    if (currentPage <= 3) {
      for (let i = 1; i <= 4; i++) pages.push(i);
      pages.push("...");
      pages.push(totalPages);
    } else if (currentPage >= totalPages - 2) {
      pages.push(1);
      pages.push("...");
      for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      pages.push("...");
      for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
      pages.push("...");
      pages.push(totalPages);
    }
  }

  return pages;
};

export function parseDDMMYYYYHHmm(dateTimeStr) {
  if (!dateTimeStr || typeof dateTimeStr !== "string") return null;

  const [datePart, timePart] = dateTimeStr.trim().split(" ");
  if (!datePart || !timePart) return null;

  const [day, month, year] = datePart.split("/").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);

  if (
    Number.isNaN(day) ||
    Number.isNaN(month) ||
    Number.isNaN(year) ||
    Number.isNaN(hour) ||
    Number.isNaN(minute)
  ) {
    return null;
  }

  return fromZonedTime(
    new Date(year, month - 1, day, hour, minute, 0, 0),
    TIMEZONE,
  );
}

export function getAllowedDateRange() {
  const now = new Date();
  const ukNow = toZonedTime(now, TIMEZONE);

  // Get Monday of current week in London time
  const day = ukNow.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const daysFromMonday = day === 0 ? 6 : day - 1;

  const monday = new Date(ukNow);
  monday.setDate(ukNow.getDate() - daysFromMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const previousMonday = new Date(monday);
  previousMonday.setDate(monday.getDate() - 7);
  previousMonday.setHours(0, 0, 0, 0);

  return {
    minDate: fromZonedTime(previousMonday, TIMEZONE),
    maxDate: fromZonedTime(sunday, TIMEZONE),
  };
}

export function toDateInputValue(date) {
  if (!date) return "";
  return date.toISOString().split("T")[0];
}

export function formatWeekRange(week, year) {
  let date = new Date();

  date = setISOWeekYear(date, year);
  date = setISOWeek(date, week);

  const startDate = startOfISOWeek(date);
  const endDate = endOfISOWeek(date);

  return `${format(startDate, "dd/MM/yyyy")} to ${format(
    endDate,
    "dd/MM/yyyy",
  )}`;
}
