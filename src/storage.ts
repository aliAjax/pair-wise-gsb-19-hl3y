import { Tank, WaterRecord, uid } from "./types";

const STORAGE_KEY = "hxwl05-aquarium-v1";

export interface AppState {
  tanks: Tank[];
  records: WaterRecord[];
}

/** 首次打开时写入一批近两周的历史记录，让趋势图立即可用 */
function buildSeedState(): AppState {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  const tanks: Tank[] = [
    { id: uid(), name: "翠谷草缸", type: "草缸", maintainer: "小林", volumeL: 90, createdAt: new Date(now - 40 * day).toISOString() },
    { id: uid(), name: "蓝礁海缸", type: "海缸", maintainer: "阿哲", volumeL: 250, createdAt: new Date(now - 35 * day).toISOString() },
    { id: uid(), name: "岩栖三湖缸", type: "三湖缸", maintainer: "小林", volumeL: 180, createdAt: new Date(now - 30 * day).toISOString() },
  ];

  const records: WaterRecord[] = [];
  const push = (
    tank: Tank,
    daysAgo: number,
    hour: number,
    values: Pick<WaterRecord, "ph" | "ammonia" | "nitrite" | "nitrate" | "hardness" | "temperature" | "waterChangePct" | "note">
  ) => {
    const measured = new Date(now - daysAgo * day);
    measured.setHours(hour, 15, 0, 0);
    records.push({
      id: uid(),
      tankId: tank.id,
      measuredAt: measured.toISOString(),
      ...values,
      createdAt: measured.toISOString(),
    });
  };

  const [planted, marine, cichlid] = tanks;

  // 草缸：水质平稳，周末换水
  const plantedBase = [
    { ph: 6.9, ammonia: 0.02, nitrite: 0.02, nitrate: 22, hardness: 6.5, temperature: 25.4 },
    { ph: 6.8, ammonia: 0.02, nitrite: 0.03, nitrate: 20, hardness: 6.4, temperature: 25.6 },
    { ph: 6.8, ammonia: 0.01, nitrite: 0.02, nitrate: 18, hardness: 6.6, temperature: 25.2 },
    { ph: 6.9, ammonia: 0.02, nitrite: 0.02, nitrate: 19, hardness: 6.5, temperature: 25.8 },
    { ph: 6.8, ammonia: 0.03, nitrite: 0.03, nitrate: 17, hardness: 6.3, temperature: 25.5 },
    { ph: 6.8, ammonia: 0.02, nitrite: 0.02, nitrate: 15, hardness: 6.5, temperature: 25.3 },
    { ph: 6.9, ammonia: 0.02, nitrite: 0.02, nitrate: 14, hardness: 6.6, temperature: 25.6 },
  ];
  plantedBase.forEach((v, i) => {
    const daysAgo = 13 - i * 2;
    const isWaterChange = i === 2 || i === 5;
    push(planted, daysAgo, 10, {
      ...v,
      waterChangePct: isWaterChange ? 30 : 0,
      note: isWaterChange ? "例行换水 30%，修剪莫斯" : "",
    });
  });

  // 海缸：一次氨氮轻微超线，已处理
  const marineBase = [
    { ph: 8.1, ammonia: 0.02, nitrite: 0.01, nitrate: 5, hardness: 8.2, temperature: 26.1 },
    { ph: 8.2, ammonia: 0.03, nitrite: 0.02, nitrate: 5.5, hardness: 8.3, temperature: 26.0 },
    { ph: 8.1, ammonia: 0.14, nitrite: 0.04, nitrate: 6, hardness: 8.1, temperature: 26.3 },
    { ph: 8.2, ammonia: 0.06, nitrite: 0.02, nitrate: 5, hardness: 8.4, temperature: 26.0 },
    { ph: 8.2, ammonia: 0.03, nitrite: 0.01, nitrate: 4.5, hardness: 8.3, temperature: 26.2 },
    { ph: 8.1, ammonia: 0.02, nitrite: 0.01, nitrate: 4, hardness: 8.2, temperature: 26.1 },
    { ph: 8.2, ammonia: 0.02, nitrite: 0.01, nitrate: 4, hardness: 8.3, temperature: 26.0 },
  ];
  marineBase.forEach((v, i) => {
    const daysAgo = 13 - i * 2;
    const spike = i === 2;
    push(marine, daysAgo, 11, {
      ...v,
      waterChangePct: spike ? 20 : i === 5 ? 15 : 0,
      note: spike
        ? "氨氮超线：停喂一天，换水 20%，检查活石与蛋分，次日复测回落"
        : i === 3
        ? "复测氨氮已回落，继续观察"
        : "",
    });
  });

  // 三湖缸：亚硝酸盐一度超线
  const cichlidBase = [
    { ph: 8.0, ammonia: 0.05, nitrite: 0.05, nitrate: 25, hardness: 12.5, temperature: 26.8 },
    { ph: 8.1, ammonia: 0.06, nitrite: 0.08, nitrate: 27, hardness: 12.8, temperature: 26.6 },
    { ph: 8.0, ammonia: 0.08, nitrite: 0.32, nitrate: 30, hardness: 12.6, temperature: 27.0 },
    { ph: 8.1, ammonia: 0.05, nitrite: 0.18, nitrate: 26, hardness: 12.9, temperature: 26.7 },
    { ph: 8.1, ammonia: 0.04, nitrite: 0.06, nitrate: 24, hardness: 12.7, temperature: 26.8 },
    { ph: 8.2, ammonia: 0.04, nitrite: 0.04, nitrate: 22, hardness: 13.0, temperature: 26.9 },
    { ph: 8.1, ammonia: 0.03, nitrite: 0.03, nitrate: 21, hardness: 12.8, temperature: 26.8 },
  ];
  cichlidBase.forEach((v, i) => {
    const daysAgo = 13 - i * 2;
    const spike = i === 2;
    push(cichlid, daysAgo, 9, {
      ...v,
      waterChangePct: spike ? 40 : i === 3 ? 25 : 0,
      note: spike
        ? "亚硝酸盐超线：立即换水 40%，停喂，添加硝化菌，加强打氧"
        : i === 3
        ? "继续换水 25%，亚硝酸盐下降中"
        : "",
    });
  });

  return { tanks, records };
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (Array.isArray(parsed.tanks) && Array.isArray(parsed.records)) {
        return parsed;
      }
    }
  } catch {
    // 数据损坏时回退到种子数据
  }
  const seed = buildSeedState();
  saveState(seed);
  return seed;
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 存储满或被禁用时静默失败，页面内数据仍可用
  }
}
