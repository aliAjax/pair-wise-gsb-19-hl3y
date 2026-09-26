import { Tank, WaterRecord } from "./types";
import { daysAgoIso, uid } from "./utils";

const TANKS_KEY = "hxwl05.tanks.v1";
const RECORDS_KEY = "hxwl05.records.v1";

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function loadTanks(): Tank[] {
  const stored = readJson<Tank[]>(TANKS_KEY);
  if (stored && Array.isArray(stored)) return stored;
  const seed = seedData();
  saveTanks(seed.tanks);
  saveRecords(seed.records);
  return seed.tanks;
}

export function loadRecords(): WaterRecord[] {
  const stored = readJson<WaterRecord[]>(RECORDS_KEY);
  if (stored && Array.isArray(stored)) return stored;
  // loadTanks 已经写入种子数据时这里能直接读到
  return readJson<WaterRecord[]>(RECORDS_KEY) ?? [];
}

export function saveTanks(tanks: Tank[]): void {
  try {
    localStorage.setItem(TANKS_KEY, JSON.stringify(tanks));
  } catch {
    // 存储满或被禁用时静默失败，页面内数据仍可用
  }
}

export function saveRecords(records: WaterRecord[]): void {
  try {
    localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
  } catch {
    // 同上
  }
}

/** 首次打开时写入三口缸 + 近三周的示例记录，让趋势图立即可看 */
function seedData(): { tanks: Tank[]; records: WaterRecord[] } {
  const planted: Tank = {
    id: uid(),
    name: "草缸·前景石景",
    type: "草缸",
    maintainer: "林岚",
    volumeL: 120,
    createdAt: daysAgoIso(30),
  };
  const marine: Tank = {
    id: uid(),
    name: "海缸·珊瑚礁岩",
    type: "海缸",
    maintainer: "周航",
    volumeL: 300,
    createdAt: daysAgoIso(30),
  };
  const cichlid: Tank = {
    id: uid(),
    name: "三湖缸·马拉维岩栖",
    type: "三湖缸",
    maintainer: "林岚",
    volumeL: 200,
    createdAt: daysAgoIso(30),
  };

  type Row = [number, number, number, number, number, number, number, number, string?];
  // [天数前, pH, 氨氮, 亚硝酸盐, 硝酸盐, 硬度, 温度, 换水%, 备注]
  const plantedRows: Row[] = [
    [21, 6.8, 0.05, 0.05, 15, 6, 24.5, 30],
    [17, 6.7, 0.08, 0.08, 18, 6, 24.8, 0],
    [14, 6.9, 0.04, 0.04, 12, 6.5, 25.0, 30],
    [10, 6.8, 0.06, 0.05, 14, 6, 24.6, 0],
    [7, 6.8, 0.05, 0.06, 16, 6, 24.9, 25],
    [3, 6.9, 0.03, 0.04, 11, 6.5, 24.7, 0],
    [1, 6.8, 0.04, 0.05, 13, 6, 24.8, 30],
  ];
  const marineRows: Row[] = [
    [20, 8.1, 0.02, 0.02, 5, 8, 25.8, 10],
    [16, 8.2, 0.03, 0.03, 6, 8, 26.0, 0],
    [13, 8.1, 0.14, 0.05, 8, 7.5, 26.1, 20, "捞出死鱼一条，换水20%，加强蛋分，停喂一天"],
    [9, 8.2, 0.06, 0.03, 6, 8, 25.9, 0],
    [6, 8.2, 0.04, 0.02, 5, 8, 26.0, 15],
    [2, 8.3, 0.02, 0.02, 4, 8.5, 25.7, 0],
  ];
  const cichlidRows: Row[] = [
    [19, 7.9, 0.08, 0.1, 25, 13, 25.5, 30],
    [15, 8.0, 0.1, 0.15, 30, 13, 25.8, 0],
    [12, 7.8, 0.12, 0.6, 35, 12, 26.0, 40, "亚硝酸盐超线：停食两天，换水40%，添加硝化细菌"],
    [8, 8.0, 0.08, 0.2, 28, 13, 25.6, 30],
    [5, 8.1, 0.06, 0.1, 24, 14, 25.9, 0],
    [2, 8.0, 0.05, 0.08, 22, 14, 25.7, 30],
    [0, 8.1, 0.04, 0.06, 20, 14, 25.8, 0],
  ];

  const toRecords = (tank: Tank, rows: Row[]): WaterRecord[] =>
    rows.map(([d, ph, ammonia, nitrite, nitrate, hardness, temperature, wc, note]) => ({
      id: uid(),
      tankId: tank.id,
      measuredAt: daysAgoIso(d, 9 + (d % 5), 15),
      ph,
      ammonia,
      nitrite,
      nitrate,
      hardness,
      temperature,
      waterChangePct: wc,
      note: note ?? "",
      createdAt: daysAgoIso(d, 9 + (d % 5), 20),
    }));

  return {
    tanks: [planted, marine, cichlid],
    records: [...toRecords(planted, plantedRows), ...toRecords(marine, marineRows), ...toRecords(cichlid, cichlidRows)],
  };
}
