export type TankType = "草缸" | "海缸" | "三湖缸";

export const TANK_TYPES: TankType[] = ["草缸", "海缸", "三湖缸"];

export interface Tank {
  id: string;
  name: string;
  type: TankType;
  maintainer: string;
  volumeL: number | null;
  createdAt: string;
}

export interface WaterRecord {
  id: string;
  tankId: string;
  /** 测量时间，ISO 字符串 */
  measuredAt: string;
  ph: number;
  /** 氨氮 ppm */
  ammonia: number;
  /** 亚硝酸盐 ppm */
  nitrite: number;
  /** 硝酸盐 ppm */
  nitrate: number;
  /** 硬度 dGH */
  hardness: number;
  /** 温度 ℃ */
  temperature: number;
  /** 换水比例 0-100 */
  waterChangePct: number;
  /** 处理备注（超线时必填） */
  note: string;
  createdAt: string;
}

export type MetricKey =
  | "ph"
  | "ammonia"
  | "nitrite"
  | "nitrate"
  | "hardness"
  | "temperature";

export interface MetricMeta {
  key: MetricKey;
  label: string;
  unit: string;
  decimals: number;
  placeholder: string;
}

export const METRICS: MetricMeta[] = [
  { key: "ph", label: "pH", unit: "", decimals: 2, placeholder: "如 6.8" },
  { key: "ammonia", label: "氨氮", unit: "ppm", decimals: 2, placeholder: "如 0.05" },
  { key: "nitrite", label: "亚硝酸盐", unit: "ppm", decimals: 2, placeholder: "如 0.05" },
  { key: "nitrate", label: "硝酸盐", unit: "ppm", decimals: 1, placeholder: "如 15" },
  { key: "hardness", label: "硬度", unit: "dGH", decimals: 1, placeholder: "如 8" },
  { key: "temperature", label: "温度", unit: "℃", decimals: 1, placeholder: "如 26" },
];

/** 各缸型的氨氮 / 亚硝酸盐安全上限（ppm） */
export const THRESHOLDS: Record<TankType, { ammonia: number; nitrite: number }> = {
  草缸: { ammonia: 0.2, nitrite: 0.2 },
  海缸: { ammonia: 0.1, nitrite: 0.1 },
  三湖缸: { ammonia: 0.25, nitrite: 0.25 },
};

export interface AlertItem {
  metricKey: "ammonia" | "nitrite";
  label: string;
  value: number;
  limit: number;
}

/** 检查氨氮 / 亚硝酸盐是否超线 */
export function getAlerts(
  values: { ammonia: number; nitrite: number },
  tankType: TankType
): AlertItem[] {
  const limits = THRESHOLDS[tankType];
  const alerts: AlertItem[] = [];
  if (values.ammonia > limits.ammonia) {
    alerts.push({ metricKey: "ammonia", label: "氨氮", value: values.ammonia, limit: limits.ammonia });
  }
  if (values.nitrite > limits.nitrite) {
    alerts.push({ metricKey: "nitrite", label: "亚硝酸盐", value: values.nitrite, limit: limits.nitrite });
  }
  return alerts;
}

export function formatMetric(key: MetricKey, value: number): string {
  const meta = METRICS.find((m) => m.key === key)!;
  const text = value.toFixed(meta.decimals);
  return meta.unit ? `${text} ${meta.unit}` : text;
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
