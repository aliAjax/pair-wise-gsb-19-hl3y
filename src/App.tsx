import { FormEvent, useEffect, useMemo, useState } from "react";
import "./styles.css";
import {
  AlertItem,
  METRICS,
  MetricKey,
  TANK_TYPES,
  THRESHOLDS,
  Tank,
  TankType,
  WaterRecord,
  formatDateTime,
  formatMetric,
  getAlerts,
  uid,
} from "./types";
import { loadState, saveState } from "./storage";
import TrendChart from "./TrendChart";

type TypeFilter = "全部" | TankType;

function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface RecordFormState {
  tankId: string;
  measuredAt: string;
  ph: string;
  ammonia: string;
  nitrite: string;
  nitrate: string;
  hardness: string;
  temperature: string;
  waterChangePct: string;
  note: string;
}

function emptyRecordForm(tankId: string): RecordFormState {
  return {
    tankId,
    measuredAt: toLocalInputValue(new Date()),
    ph: "",
    ammonia: "",
    nitrite: "",
    nitrate: "",
    hardness: "",
    temperature: "",
    waterChangePct: "0",
    note: "",
  };
}

function App() {
  const [{ tanks, records }, setState] = useState(loadState);

  const [typeFilter, setTypeFilter] = useState<TypeFilter>("全部");
  const [maintainerFilter, setMaintainerFilter] = useState<string>("全部");

  const [trendTankId, setTrendTankId] = useState<string>("");
  const [trendMetric, setTrendMetric] = useState<MetricKey>("ammonia");

  const [recordForm, setRecordForm] = useState<RecordFormState>(() => emptyRecordForm(""));
  const [formError, setFormError] = useState("");
  const [formOk, setFormOk] = useState("");

  const [tankName, setTankName] = useState("");
  const [tankType, setTankType] = useState<TankType>("草缸");
  const [tankMaintainer, setTankMaintainer] = useState("");
  const [tankVolume, setTankVolume] = useState("");
  const [tankError, setTankError] = useState("");

  // 持久化：任何变更都写回 localStorage，重开页面可继续记录
  useEffect(() => {
    saveState({ tanks, records });
  }, [tanks, records]);

  const maintainers = useMemo(
    () => Array.from(new Set(tanks.map((t) => t.maintainer))).sort(),
    [tanks]
  );

  const filteredTanks = useMemo(
    () =>
      tanks.filter(
        (t) =>
          (typeFilter === "全部" || t.type === typeFilter) &&
          (maintainerFilter === "全部" || t.maintainer === maintainerFilter)
      ),
    [tanks, typeFilter, maintainerFilter]
  );

  const filteredTankIds = useMemo(() => new Set(filteredTanks.map((t) => t.id)), [filteredTanks]);

  const filteredRecords = useMemo(
    () => records.filter((r) => filteredTankIds.has(r.tankId)),
    [records, filteredTankIds]
  );

  const tankById = useMemo(() => new Map(tanks.map((t) => [t.id, t])), [tanks]);

  const anomalyCount = useMemo(
    () =>
      filteredRecords.filter((r) => {
        const tank = tankById.get(r.tankId);
        return tank ? getAlerts(r, tank.type).length > 0 : false;
      }).length,
    [filteredRecords, tankById]
  );

  const recentRecords = useMemo(
    () =>
      [...filteredRecords]
        .sort((a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime())
        .slice(0, 12),
    [filteredRecords]
  );

  const lastWaterChange = useMemo(() => {
    const withChange = filteredRecords
      .filter((r) => r.waterChangePct > 0)
      .sort((a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime());
    return withChange[0] ?? null;
  }, [filteredRecords]);

  // 趋势图只展示筛选结果内的缸；筛选变化时自动校正选中的缸
  useEffect(() => {
    if (filteredTanks.length === 0) {
      setTrendTankId("");
    } else if (!filteredTanks.some((t) => t.id === trendTankId)) {
      setTrendTankId(filteredTanks[0].id);
    }
  }, [filteredTanks, trendTankId]);

  // 录入表单默认选中第一口缸
  useEffect(() => {
    setRecordForm((f) => (f.tankId || tanks.length === 0 ? f : { ...f, tankId: tanks[0].id }));
  }, [tanks]);

  const trendTank = filteredTanks.find((t) => t.id === trendTankId) ?? null;
  const trendRecords = useMemo(
    () => filteredRecords.filter((r) => r.tankId === trendTankId),
    [filteredRecords, trendTankId]
  );

  // 录入表单实时超线检测（用于即时高亮和强制备注）
  const formTank = tankById.get(recordForm.tankId) ?? null;
  const formAlerts: AlertItem[] = useMemo(() => {
    if (!formTank) return [];
    const ammonia = parseFloat(recordForm.ammonia);
    const nitrite = parseFloat(recordForm.nitrite);
    if (Number.isNaN(ammonia) || Number.isNaN(nitrite)) return [];
    return getAlerts({ ammonia, nitrite }, formTank.type);
  }, [formTank, recordForm.ammonia, recordForm.nitrite]);

  function submitRecord(e: FormEvent) {
    e.preventDefault();
    setFormError("");
    setFormOk("");

    const tank = tankById.get(recordForm.tankId);
    if (!tank) {
      setFormError("请先选择要记录的鱼缸");
      return;
    }

    const parsed: Partial<Record<MetricKey, number>> = {};
    for (const meta of METRICS) {
      const v = parseFloat(recordForm[meta.key]);
      if (Number.isNaN(v)) {
        setFormError(`请填写有效的${meta.label}数值`);
        return;
      }
      parsed[meta.key] = v;
    }

    const waterChangePct = parseFloat(recordForm.waterChangePct || "0");
    if (Number.isNaN(waterChangePct) || waterChangePct < 0 || waterChangePct > 100) {
      setFormError("换水比例需在 0–100% 之间");
      return;
    }

    if (!recordForm.measuredAt) {
      setFormError("请选择记录时间");
      return;
    }

    const alerts = getAlerts(
      { ammonia: parsed.ammonia!, nitrite: parsed.nitrite! },
      tank.type
    );
    if (alerts.length > 0 && recordForm.note.trim() === "") {
      setFormError(
        `${alerts.map((a) => a.label).join("、")}已超线，请先填写处理备注再保存`
      );
      return;
    }

    const record: WaterRecord = {
      id: uid(),
      tankId: tank.id,
      measuredAt: new Date(recordForm.measuredAt).toISOString(),
      ph: parsed.ph!,
      ammonia: parsed.ammonia!,
      nitrite: parsed.nitrite!,
      nitrate: parsed.nitrate!,
      hardness: parsed.hardness!,
      temperature: parsed.temperature!,
      waterChangePct,
      note: recordForm.note.trim(),
      createdAt: new Date().toISOString(),
    };

    setState((s) => ({ ...s, records: [...s.records, record] }));
    setRecordForm({ ...emptyRecordForm(tank.id) });
    setFormOk(
      alerts.length > 0
        ? `已保存（含超线处理备注），请持续关注 ${tank.name}`
        : `已保存 ${tank.name} 的水质记录`
    );
  }

  function submitTank(e: FormEvent) {
    e.preventDefault();
    setTankError("");
    if (tankName.trim() === "" || tankMaintainer.trim() === "") {
      setTankError("请填写鱼缸名称和维护人");
      return;
    }
    const volume = tankVolume.trim() === "" ? null : parseFloat(tankVolume);
    if (tankVolume.trim() !== "" && (Number.isNaN(volume) || volume! <= 0)) {
      setTankError("水体容积需为正数");
      return;
    }
    const tank: Tank = {
      id: uid(),
      name: tankName.trim(),
      type: tankType,
      maintainer: tankMaintainer.trim(),
      volumeL: volume,
      createdAt: new Date().toISOString(),
    };
    setState((s) => ({ ...s, tanks: [...s.tanks, tank] }));
    setTankName("");
    setTankMaintainer("");
    setTankVolume("");
  }

  function deleteRecord(id: string) {
    setState((s) => ({ ...s, records: s.records.filter((r) => r.id !== id) }));
  }

  const thresholdForTrend =
    trendTank && (trendMetric === "ammonia" || trendMetric === "nitrite")
      ? THRESHOLDS[trendTank.type][trendMetric]
      : undefined;

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">hxwl-05 · 水族养护</p>
          <h1>水族箱水质监测</h1>
          <p className="subtitle">
            给每口缸建档，记录 pH、氨氮、亚硝酸盐、硝酸盐、硬度和温度，超线自动提醒，趋势一目了然。数据保存在本机，重开页面可继续记录。
          </p>
        </div>
        <div className="stack-card">
          <span>当前筛选</span>
          <strong>
            {typeFilter} · {maintainerFilter === "全部" ? "全部维护人" : maintainerFilter}
          </strong>
          <span className="stack-sub">
            {filteredTanks.length} 口缸 · {filteredRecords.length} 条记录
          </span>
        </div>
      </section>

      <section className="metrics-grid">
        <article className="metric-card">
          <span>在管鱼缸</span>
          <strong>{filteredTanks.length}</strong>
          <i className="status-ok" />
        </article>
        <article className="metric-card">
          <span>水质记录</span>
          <strong>{filteredRecords.length}</strong>
          <i className="status-ok" />
        </article>
        <article className="metric-card">
          <span>异常记录（氨氮/亚硝酸盐超线）</span>
          <strong className={anomalyCount > 0 ? "danger-text" : ""}>{anomalyCount}</strong>
          <i className={anomalyCount > 0 ? "status-danger" : "status-ok"} />
        </article>
        <article className="metric-card">
          <span>最近换水</span>
          <strong className="metric-small">
            {lastWaterChange
              ? `${lastWaterChange.waterChangePct}% · ${formatDateTime(lastWaterChange.measuredAt)}`
              : "—"}
          </strong>
          <i className="status-watch" />
        </article>
      </section>

      <section className="panel filter-bar">
        <div className="filter-group">
          <span className="filter-label">鱼缸类型</span>
          <div className="chips">
            {(["全部", ...TANK_TYPES] as TypeFilter[]).map((t) => (
              <button
                key={t}
                className={typeFilter === t ? "chip active" : "chip"}
                onClick={() => setTypeFilter(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="filter-group">
          <span className="filter-label">维护人</span>
          <select
            value={maintainerFilter}
            onChange={(e) => setMaintainerFilter(e.target.value)}
          >
            <option value="全部">全部维护人</option>
            {maintainers.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="workspace">
        <aside className="panel narrow">
          <h2>鱼缸建档</h2>
          <form className="tank-form" onSubmit={submitTank}>
            <label>
              <span>鱼缸名称</span>
              <input
                value={tankName}
                onChange={(e) => setTankName(e.target.value)}
                placeholder="如 翠谷草缸"
              />
            </label>
            <label>
              <span>类型</span>
              <select value={tankType} onChange={(e) => setTankType(e.target.value as TankType)}>
                {TANK_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>维护人</span>
              <input
                value={tankMaintainer}
                onChange={(e) => setTankMaintainer(e.target.value)}
                placeholder="如 小林"
              />
            </label>
            <label>
              <span>水体容积（L，选填）</span>
              <input
                value={tankVolume}
                onChange={(e) => setTankVolume(e.target.value)}
                placeholder="如 90"
                inputMode="decimal"
              />
            </label>
            {tankError && <p className="form-error">{tankError}</p>}
            <button type="submit" className="primary-action">
              建立档案
            </button>
          </form>

          <h2 className="mt">在管鱼缸</h2>
          <div className="tank-list">
            {filteredTanks.length === 0 && <p className="empty-hint">当前筛选下没有鱼缸</p>}
            {filteredTanks.map((t) => {
              const tankRecords = filteredRecords.filter((r) => r.tankId === t.id);
              const tankAnomalies = tankRecords.filter(
                (r) => getAlerts(r, t.type).length > 0
              ).length;
              return (
                <button
                  key={t.id}
                  className={t.id === trendTankId ? "tank-item active" : "tank-item"}
                  onClick={() => setTrendTankId(t.id)}
                >
                  <span className="tank-name">{t.name}</span>
                  <span className="tank-meta">
                    {t.type} · {t.maintainer}
                    {t.volumeL ? ` · ${t.volumeL}L` : ""}
                  </span>
                  <span className="tank-meta">
                    {tankRecords.length} 条记录
                    {tankAnomalies > 0 && (
                      <em className="badge-danger">{tankAnomalies} 次异常</em>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="panel">
          <div className="section-heading">
            <div>
              <p>水质录入</p>
              <h2>新增记录</h2>
            </div>
            {formTank && (
              <span className="limit-hint">
                {formTank.type}限值：氨氮 ≤ {THRESHOLDS[formTank.type].ammonia} ppm · 亚硝酸盐 ≤{" "}
                {THRESHOLDS[formTank.type].nitrite} ppm
              </span>
            )}
          </div>

          {formAlerts.length > 0 && (
            <div className="alert-banner" role="alert">
              <strong>⚠ 指标超线：</strong>
              {formAlerts
                .map((a) => `${a.label} ${a.value} ppm（限值 ${a.limit} ppm）`)
                .join("；")}
              。保存前必须填写处理备注。
            </div>
          )}

          <form onSubmit={submitRecord}>
            <div className="field-grid">
              <label>
                <span>鱼缸</span>
                <select
                  value={recordForm.tankId}
                  onChange={(e) => setRecordForm({ ...recordForm, tankId: e.target.value })}
                >
                  {tanks.length === 0 && <option value="">请先在左侧建档</option>}
                  {tanks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}（{t.type}）
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>记录时间</span>
                <input
                  type="datetime-local"
                  value={recordForm.measuredAt}
                  onChange={(e) => setRecordForm({ ...recordForm, measuredAt: e.target.value })}
                />
              </label>
              {METRICS.map((meta) => {
                const over = formAlerts.some((a) => a.metricKey === meta.key);
                return (
                  <label key={meta.key} className={over ? "field-over" : ""}>
                    <span>
                      {meta.label}
                      {meta.unit ? `（${meta.unit}）` : ""}
                      {over && <em className="over-tag">超线</em>}
                    </span>
                    <input
                      value={recordForm[meta.key]}
                      onChange={(e) =>
                        setRecordForm({ ...recordForm, [meta.key]: e.target.value })
                      }
                      placeholder={meta.placeholder}
                      inputMode="decimal"
                    />
                  </label>
                );
              })}
              <label>
                <span>换水比例（%）</span>
                <input
                  value={recordForm.waterChangePct}
                  onChange={(e) =>
                    setRecordForm({ ...recordForm, waterChangePct: e.target.value })
                  }
                  placeholder="0–100"
                  inputMode="decimal"
                />
              </label>
              <label className={formAlerts.length > 0 ? "field-over span-2" : "span-2"}>
                <span>
                  处理备注
                  {formAlerts.length > 0 && <em className="over-tag">超线必填</em>}
                </span>
                <textarea
                  value={recordForm.note}
                  onChange={(e) => setRecordForm({ ...recordForm, note: e.target.value })}
                  placeholder={
                    formAlerts.length > 0
                      ? "请说明处理措施，如：停喂、换水比例、添加硝化菌、复测计划"
                      : "选填：换水、修剪、用药、投喂调整等"
                  }
                  rows={2}
                />
              </label>
            </div>
            {formError && <p className="form-error">{formError}</p>}
            {formOk && <p className="form-ok">{formOk}</p>}
            <div className="form-actions">
              <button type="submit" className="primary-action">
                保存记录
              </button>
            </div>
          </form>
        </section>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p>趋势</p>
            <h2>{trendTank ? `${trendTank.name} · 水质趋势` : "水质趋势"}</h2>
          </div>
          <div className="chips">
            {METRICS.map((m) => (
              <button
                key={m.key}
                className={trendMetric === m.key ? "chip active" : "chip"}
                onClick={() => setTrendMetric(m.key)}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
        {trendTank ? (
          <TrendChart
            records={trendRecords}
            metricKey={trendMetric}
            threshold={thresholdForTrend}
          />
        ) : (
          <div className="chart-empty">当前筛选下没有鱼缸，请调整筛选或先建档。</div>
        )}
      </section>

      <section className="records panel">
        <div className="section-heading">
          <div>
            <p>按测量时间倒序</p>
            <h2>最近记录</h2>
          </div>
          <span className="limit-hint">
            {filteredRecords.length} 条 · 异常 {anomalyCount} 条
          </span>
        </div>
        <div className="record-list">
          {recentRecords.length === 0 && (
            <p className="empty-hint">当前筛选下暂无记录，先在上方保存一条吧。</p>
          )}
          {recentRecords.map((r) => {
            const tank = tankById.get(r.tankId);
            if (!tank) return null;
            const alerts = getAlerts(r, tank.type);
            const danger = alerts.length > 0;
            return (
              <article key={r.id} className={danger ? "record-card danger" : "record-card"}>
                <div className={danger ? "record-index danger" : "record-index"}>
                  {danger ? "!" : "✓"}
                </div>
                <div className="record-body">
                  <h3>
                    {tank.name}
                    <span className="record-tag">{tank.type}</span>
                    <span className="record-tag muted">{tank.maintainer}</span>
                    <time>{formatDateTime(r.measuredAt)}</time>
                  </h3>
                  <p>
                    {METRICS.map((m) => (
                      <span
                        key={m.key}
                        className={
                          alerts.some((a) => a.metricKey === m.key)
                            ? "kv over"
                            : "kv"
                        }
                      >
                        {m.label} {formatMetric(m.key, r[m.key])}
                      </span>
                    ))}
                    {r.waterChangePct > 0 && (
                      <span className="kv water">换水 {r.waterChangePct}%</span>
                    )}
                  </p>
                  {danger && (
                    <p className="alert-line">
                      ⚠ {alerts.map((a) => `${a.label}超线（${a.value} > ${a.limit} ppm）`).join("，")}
                    </p>
                  )}
                  {r.note && <p className="note">备注：{r.note}</p>}
                </div>
                <button
                  className="ghost-danger"
                  title="删除这条记录"
                  onClick={() => deleteRecord(r.id)}
                >
                  删除
                </button>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}

export default App;
