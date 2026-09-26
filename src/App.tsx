import { useEffect, useMemo, useState } from "react";
import RecordForm from "./components/RecordForm";
import RecordList from "./components/RecordList";
import TankSidebar, { TankSummary } from "./components/TankSidebar";
import TrendChart, { ChartPoint } from "./components/TrendChart";
import { loadRecords, loadTanks, saveRecords, saveTanks } from "./storage";
import { METRICS, MetricKey, TANK_TYPES, Tank, TankType, THRESHOLDS, WaterRecord } from "./types";
import { fmt, formatDay, formatShort, isAnomaly } from "./utils";
import "./styles.css";

const ALL = "全部";
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function App() {
  const [tanks, setTanks] = useState<Tank[]>(loadTanks);
  const [records, setRecords] = useState<WaterRecord[]>(loadRecords);
  const [typeFilter, setTypeFilter] = useState<typeof ALL | TankType>(ALL);
  const [maintainerFilter, setMaintainerFilter] = useState<string>(ALL);
  const [selectedTankId, setSelectedTankId] = useState<string | null>(null);
  const [metricKey, setMetricKey] = useState<MetricKey>("ammonia");

  // 任何变化都写回 localStorage，重开页面可接着记录
  useEffect(() => saveTanks(tanks), [tanks]);
  useEffect(() => saveRecords(records), [records]);

  const tanksById = useMemo(() => new Map(tanks.map((t) => [t.id, t])), [tanks]);
  const maintainers = useMemo(
    () => Array.from(new Set(tanks.map((t) => t.maintainer))).sort((a, b) => a.localeCompare(b, "zh")),
    [tanks]
  );
  // 维护人被删光时回退到“全部”
  const effectiveMaintainer = maintainerFilter !== ALL && !maintainers.includes(maintainerFilter) ? ALL : maintainerFilter;

  const filteredTanks = useMemo(
    () =>
      tanks.filter(
        (t) =>
          (typeFilter === ALL || t.type === typeFilter) &&
          (effectiveMaintainer === ALL || t.maintainer === effectiveMaintainer)
      ),
    [tanks, typeFilter, effectiveMaintainer]
  );

  const filteredRecords = useMemo(() => {
    const ids = new Set(filteredTanks.map((t) => t.id));
    return records.filter((r) => ids.has(r.tankId));
  }, [records, filteredTanks]);

  // 筛选变化后，保证当前选中的缸仍在可见列表里
  useEffect(() => {
    if (!filteredTanks.some((t) => t.id === selectedTankId)) {
      setSelectedTankId(filteredTanks[0]?.id ?? null);
    }
  }, [filteredTanks, selectedTankId]);

  const selectedTank = selectedTankId ? tanksById.get(selectedTankId) ?? null : null;

  const summaries = useMemo(() => {
    const map = new Map<string, TankSummary>();
    const sorted = [...records].sort((a, b) => b.measuredAt.localeCompare(a.measuredAt));
    for (const tank of tanks) {
      const list = sorted.filter((r) => r.tankId === tank.id);
      const latest = list[0];
      map.set(tank.id, {
        recordCount: list.length,
        latestStatus: latest ? (isAnomaly(latest, tank.type) ? "danger" : "ok") : "none",
      });
    }
    return map;
  }, [tanks, records]);

  // 统计卡：全部跟随筛选联动
  const stats = useMemo(() => {
    const anomalyCount = filteredRecords.filter((r) => {
      const tank = tanksById.get(r.tankId);
      return tank ? isAnomaly(r, tank.type) : false;
    }).length;
    const weekChanges = filteredRecords.filter(
      (r) => r.waterChangePct > 0 && Date.now() - new Date(r.measuredAt).getTime() < WEEK_MS
    ).length;
    return { tankCount: filteredTanks.length, recordCount: filteredRecords.length, anomalyCount, weekChanges };
  }, [filteredTanks, filteredRecords, tanksById]);

  const metric = METRICS.find((m) => m.key === metricKey)!;

  const chartPoints: ChartPoint[] = useMemo(() => {
    if (!selectedTank) return [];
    return records
      .filter((r) => r.tankId === selectedTank.id)
      .sort((a, b) => a.measuredAt.localeCompare(b.measuredAt))
      .map((r) => ({
        time: new Date(r.measuredAt).getTime(),
        value: r[metric.key],
        axisLabel: formatDay(r.measuredAt),
        tipLabel: formatShort(r.measuredAt),
      }));
  }, [records, selectedTank, metric.key]);

  const threshold =
    selectedTank && (metric.key === "ammonia" || metric.key === "nitrite")
      ? THRESHOLDS[selectedTank.type][metric.key]
      : undefined;

  const recentRecords = useMemo(
    () => [...filteredRecords].sort((a, b) => b.measuredAt.localeCompare(a.measuredAt)).slice(0, 50),
    [filteredRecords]
  );

  const addTank = (tank: Tank) => {
    setTanks((list) => [...list, tank]);
    setSelectedTankId(tank.id);
  };

  const deleteTank = (tank: Tank) => {
    if (!window.confirm(`确定删除「${tank.name}」及其全部水质记录吗？此操作不可恢复。`)) return;
    setTanks((list) => list.filter((t) => t.id !== tank.id));
    setRecords((list) => list.filter((r) => r.tankId !== tank.id));
  };

  const addRecord = (record: WaterRecord) => setRecords((list) => [...list, record]);

  const deleteRecord = (record: WaterRecord) => {
    if (!window.confirm("确定删除这条水质记录吗？")) return;
    setRecords((list) => list.filter((r) => r.id !== record.id));
  };

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">hxwl-05 · 水族养护</p>
          <h1>水族箱水质监测</h1>
          <p className="subtitle">
            为草缸、海缸、三湖缸建档，跟踪 pH、氨氮、亚硝酸盐、硝酸盐、硬度和温度；氨氮或亚硝酸盐超线自动提醒，
            填写处理备注后才能保存。数据保存在本机浏览器，重开页面可接着记录。
          </p>
        </div>
        <div className="stack-card">
          <span>超标上限（ppm）</span>
          {TANK_TYPES.map((t) => (
            <div key={t} className="threshold-row">
              <span className={`tag ${t === "草缸" ? "tag-green" : t === "海缸" ? "tag-blue" : "tag-amber"}`}>{t}</span>
              <strong>
                氨氮 ≤ {fmt(THRESHOLDS[t].ammonia, 2)} · 亚硝酸盐 ≤ {fmt(THRESHOLDS[t].nitrite, 2)}
              </strong>
            </div>
          ))}
        </div>
      </section>

      <section className="metrics-grid">
        <article className="metric-card">
          <span>在档鱼缸</span>
          <strong>{stats.tankCount}</strong>
          <p className="stat-sub">当前筛选范围内</p>
          <i className="status-ok" />
        </article>
        <article className="metric-card">
          <span>水质记录</span>
          <strong>{stats.recordCount}</strong>
          <p className="stat-sub">含换水比例与时间</p>
          <i className="status-ok" />
        </article>
        <article className={`metric-card${stats.anomalyCount > 0 ? " alert" : ""}`}>
          <span>异常记录</span>
          <strong>{stats.anomalyCount}</strong>
          <p className="stat-sub">氨氮 / 亚硝酸盐超线</p>
          <i className={stats.anomalyCount > 0 ? "status-danger" : "status-ok"} />
        </article>
        <article className="metric-card">
          <span>近 7 天换水</span>
          <strong>{stats.weekChanges}</strong>
          <p className="stat-sub">换水比例 &gt; 0 的记录</p>
          <i className="status-watch" />
        </article>
      </section>

      <section className="panel filter-bar">
        <div className="filter-row">
          <span className="filter-label">鱼缸类型</span>
          <div className="chips">
            {[ALL, ...TANK_TYPES].map((t) => (
              <button
                key={t}
                type="button"
                className={typeFilter === t ? "chip active" : "chip"}
                onClick={() => setTypeFilter(t as typeof ALL | TankType)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="filter-row">
          <span className="filter-label">维护人</span>
          <div className="chips">
            {[ALL, ...maintainers].map((m) => (
              <button
                key={m}
                type="button"
                className={effectiveMaintainer === m ? "chip active" : "chip"}
                onClick={() => setMaintainerFilter(m)}
              >
                {m}
              </button>
            ))}
          </div>
          <span className="filter-result">
            当前 {stats.tankCount} 口缸 · {stats.recordCount} 条记录 · {stats.anomalyCount} 条异常
          </span>
        </div>
      </section>

      <section className="workspace">
        <TankSidebar
          tanks={filteredTanks}
          summaries={summaries}
          selectedId={selectedTankId}
          maintainers={maintainers}
          onSelect={setSelectedTankId}
          onAdd={addTank}
          onDelete={deleteTank}
        />

        <div className="main-col">
          <section className="panel">
            <div className="section-heading">
              <div>
                <p>趋势</p>
                <h2>{selectedTank ? `「${selectedTank.name}」水质趋势` : "水质趋势"}</h2>
              </div>
              <div className="chips">
                {METRICS.map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    className={metric.key === m.key ? "chip active" : "chip"}
                    onClick={() => setMetricKey(m.key)}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
            {selectedTank ? (
              chartPoints.length > 0 ? (
                <>
                  <TrendChart
                    points={chartPoints}
                    unit={metric.unit}
                    precision={metric.precision}
                    color={metric.color}
                    threshold={threshold}
                    thresholdLabel={
                      threshold !== undefined ? `${metric.label}上限 ${fmt(threshold, 2)} ppm` : undefined
                    }
                  />
                  <p className="chart-caption">
                    {metric.label}
                    {metric.unit ? `（${metric.unit}）` : ""} · 共 {chartPoints.length} 条记录
                    {threshold !== undefined && " · 红色虚线为超标线，红点为超标记录"}
                  </p>
                </>
              ) : (
                <p className="empty-state">这口缸还没有记录，先在下方录入第一条水质数据。</p>
              )
            ) : (
              <p className="empty-state">当前筛选下没有鱼缸，请先新建鱼缸档案。</p>
            )}
          </section>

          {selectedTank && <RecordForm tank={selectedTank} onSave={addRecord} />}
        </div>
      </section>

      <section className="records panel">
        <div className="section-heading">
          <div>
            <p>台账</p>
            <h2>最近记录（{recentRecords.length}）</h2>
          </div>
        </div>
        <RecordList records={recentRecords} tanksById={tanksById} onDelete={deleteRecord} />
      </section>
    </main>
  );
}

export default App;
