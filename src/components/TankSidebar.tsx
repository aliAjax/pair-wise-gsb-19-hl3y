import { useState } from "react";
import { Tank, TANK_TYPES, TANK_TYPE_TAG_CLASS, TankType } from "../types";
import { uid } from "../utils";

export interface TankSummary {
  recordCount: number;
  latestStatus: "ok" | "danger" | "none";
}

interface TankSidebarProps {
  tanks: Tank[];
  summaries: Map<string, TankSummary>;
  selectedId: string | null;
  maintainers: string[];
  onSelect: (id: string) => void;
  onAdd: (tank: Tank) => void;
  onDelete: (tank: Tank) => void;
}

const STATUS_TEXT: Record<TankSummary["latestStatus"], string> = {
  ok: "最近正常",
  danger: "最近超标",
  none: "暂无记录",
};

export default function TankSidebar({
  tanks,
  summaries,
  selectedId,
  maintainers,
  onSelect,
  onAdd,
  onDelete,
}: TankSidebarProps) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<TankType>("草缸");
  const [maintainer, setMaintainer] = useState("");
  const [volume, setVolume] = useState("");
  const [error, setError] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("请填写鱼缸名称");
      return;
    }
    if (!maintainer.trim()) {
      setError("请填写维护人，方便交接时追溯");
      return;
    }
    const volumeN = volume.trim() === "" ? null : Number(volume);
    if (volume.trim() !== "" && (!Number.isFinite(volumeN) || volumeN! <= 0 || volumeN! > 100000)) {
      setError("水体升数需为 0–100000 之间的数字");
      return;
    }
    onAdd({
      id: uid(),
      name: name.trim(),
      type,
      maintainer: maintainer.trim(),
      volumeL: volumeN,
      createdAt: new Date().toISOString(),
    });
    setName("");
    setMaintainer("");
    setVolume("");
    setError("");
    setShowForm(false);
  };

  return (
    <aside className="panel narrow">
      <div className="section-heading">
        <div>
          <p>建档</p>
          <h2>鱼缸档案</h2>
        </div>
        <button type="button" className="primary-action" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "收起" : "＋ 新建"}
        </button>
      </div>

      {showForm && (
        <form className="new-tank-form" onSubmit={submit}>
          <label>
            <span>鱼缸名称 *</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="如：草缸·玄关造景" />
          </label>
          <label>
            <span>缸型 *</span>
            <select value={type} onChange={(e) => setType(e.target.value as TankType)}>
              {TANK_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>维护人 *</span>
            <input
              value={maintainer}
              onChange={(e) => setMaintainer(e.target.value)}
              placeholder="负责人姓名"
              list="maintainer-options"
            />
            <datalist id="maintainer-options">
              {maintainers.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </label>
          <label>
            <span>水体（升，选填）</span>
            <input value={volume} onChange={(e) => setVolume(e.target.value)} placeholder="如：120" inputMode="decimal" />
          </label>
          {error && <p className="field-error">{error}</p>}
          <button type="submit" className="primary-action block">
            保存档案
          </button>
        </form>
      )}

      {tanks.length === 0 ? (
        <p className="empty-state">当前筛选下没有鱼缸，调整筛选或新建一口缸。</p>
      ) : (
        <div className="tank-list">
          {tanks.map((tank) => {
            const summary = summaries.get(tank.id) ?? { recordCount: 0, latestStatus: "none" as const };
            return (
              <div
                key={tank.id}
                className={`tank-card${tank.id === selectedId ? " selected" : ""}`}
                onClick={() => onSelect(tank.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && onSelect(tank.id)}
              >
                <div className="tank-card-head">
                  <strong>{tank.name}</strong>
                  <span className={`tag ${TANK_TYPE_TAG_CLASS[tank.type]}`}>{tank.type}</span>
                </div>
                <p className="tank-meta">
                  维护人 {tank.maintainer}
                  {tank.volumeL ? ` · ${tank.volumeL}L` : ""} · {summary.recordCount} 条记录
                </p>
                <div className="tank-card-foot">
                  <span className={`status-pill ${summary.latestStatus}`}>
                    <i />
                    {STATUS_TEXT[summary.latestStatus]}
                  </span>
                  <button
                    type="button"
                    className="icon-btn"
                    title="删除鱼缸及其全部记录"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(tank);
                    }}
                  >
                    删除
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </aside>
  );
}
