export const DAILY_REPORT_TZ = "Asia/Kathmandu";

export function ymdInTz(date: Date, timeZone = DAILY_REPORT_TZ) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const y = parts.find((p) => p.type === "year")?.value ?? "0000";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const d = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${y}-${m}-${d}`;
}

export function todayNepalYmd() {
  return ymdInTz(new Date(), DAILY_REPORT_TZ);
}