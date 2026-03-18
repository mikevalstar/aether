import dayjs from "dayjs";

export function formatDateTime(value: string | Date) {
  return dayjs(value).format("MMM D, YYYY h:mm A");
}

export function formatDate(value: string | Date) {
  return dayjs(value).format("MMM D, YYYY");
}

export function formatIsoDate(value: string | Date) {
  return dayjs(value).format("YYYY-MM-DD");
}

export function getCurrentHour() {
  return dayjs().hour();
}
