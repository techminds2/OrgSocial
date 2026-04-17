export function monthFromYmd(ymd: string) {
  return String(ymd || "").slice(0, 7);
}

export function safePercent(done: number, target: number) {
  if (!Number.isFinite(target) || target <= 0) return 0;
  if (!Number.isFinite(done) || done <= 0) return 0;
  return Number(((done / target) * 100).toFixed(2));
}

export function clampRemaining(target: number, achieved: number) {
  return Math.max(0, Math.trunc(target) - Math.trunc(achieved));
}

export function currentNepalMonth() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kathmandu",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((p) => p.type === "year")?.value ?? "0000";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  return `${year}-${month}`;
}

/**
 * Only current Nepal month can be edited.
 * Past months are locked.
 * Future months are locked until that month begins.
 */
export function canEditMonthlyTarget(month?: string | null) {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) return false;
  return month === currentNepalMonth();
}