import dayjs from "dayjs";

export function formatDateTime(value: string | Date) {
  return dayjs(value).format("MMM D, YYYY h:mm A");
}

export function formatDate(value: string | Date) {
  return dayjs(value).format("MMM D, YYYY");
}

export function formatIsoDate(value: string | Date, timezone?: string) {
  if (timezone) {
    // Format in the specified timezone using Intl
    const d = typeof value === "string" ? new Date(value) : value;
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(d);
    const year = parts.find((p) => p.type === "year")?.value;
    const month = parts.find((p) => p.type === "month")?.value;
    const day = parts.find((p) => p.type === "day")?.value;
    return `${year}-${month}-${day}`;
  }
  return dayjs(value).format("YYYY-MM-DD");
}

export function getCurrentHour() {
  return dayjs().hour();
}
