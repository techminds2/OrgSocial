export function monthFromYmd(ymd: string) {
  return String(ymd || "").slice(0, 7);
}

export function safePercent(achieved: number, target: number) {
  if (!Number.isFinite(target) || target <= 0) return 0;
  if (!Number.isFinite(achieved) || achieved <= 0) return 0;
  return Number(((achieved / target) * 100).toFixed(2));
}