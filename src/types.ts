export type TankType = "草缸" | "海缸" | "三湖缸";

export const TANK_TYPES: TankType[] = ["草缸", "海缸", "三湖缸"];

export interface Tank {
  id: string;
  name: string;
  type: TankType;
  maintainer: string;
  volumeL: number | null;
  createdAt: string; // ISO
}

export interface WaterRecord {
  id: string;
  tankId: string;
  measuredAt: string; // ISO，测量/换水时间
  ph: number;
  ammonia: number; // 氨氮 ppm
  nitrite: number; // 亚硝酸盐 ppm
  nitrate: number; // 硝酸盐 ppm
  hardness: number; // 硬度 °dH
  temperature: number; // 温度 °C
  waterChangePct: number; // 换水比例 %
  note: string; // 处理备注（超标时必填）
  createdAt: string; // ISO
}

/** 各缸型的氨氮 / 亚硝酸盐上限（ppm），超过即视为异常 */
export const THRESHOLDS: Record<TankType, { ammonia: number; nitrite: number }> = {
  草缸: { ammonia: 0.2, nitrite: 0.2 },
  海缸: { ammonia: 0.1, nitrite: 0.1 },
  三湖缸: { ammonia: 0.25, nitrite: 0.3 },
};

export type MetricKey = "ph" | "ammonia" | "nitrite" | "nitrate" | "hardness" | "temperature";

export interface MetricDef {
  key: MetricKey;
  label: string;
  unit: string;
  precision: number;
  color: string;
}

export const METRICS: MetricDef[] = [
  { key: "ammonia", label: "氨氮", unit: "ppm", precision: 2, color: "#e11d48" },
  { key: "nitrite", label: "亚硝酸盐", unit: "ppm", precision: 2, color: "#f59e0b" },
  { key: "nitrate", label: "硝酸盐", unit: "ppm", precision: 1, color: "#0891b2" },
  { key: "ph", label: "pH", unit: "", precision: 2, color: "#7c3aed" },
  { key: "hardness", label: "硬度", unit: "°dH", precision: 1, color: "#16a34a" },
  { key: "temperature", label: "温度", unit: "°C", precision: 1, color: "#ea580c" },
];

export const TANK_TYPE_TAG_CLASS: Record<TankType, string> = {
  草缸: "tag-green",
  海缸: "tag-blue",
  三湖缸: "tag-amber",
};
