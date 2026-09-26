import { TankType, THRESHOLDS, WaterRecord } from "./types";

export function uid(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function fmt(n: number, precision = 2): string {
  return Number.isFinite(n) ? n.toFixed(precision) : "-";
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** 2026-09-26 14:30 */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** 09-26 14:30 */
export function formatShort(iso: string): string {
  const d = new Date(iso);
  return `${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** 09-26 */
export function formatDay(iso: string): string {
  const d = new Date(iso);
  return `${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** datetime-local 输入框需要的本地时间字符串 */
export function toLocalInputValue(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function isAnomaly(rec: Pick<WaterRecord, "ammonia" | "nitrite">, type: TankType): boolean {
  const th = THRESHOLDS[type];
  return rec.ammonia > th.ammonia || rec.nitrite > th.nitrite;
}

export function daysAgoIso(days: number, hour = 10, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}
