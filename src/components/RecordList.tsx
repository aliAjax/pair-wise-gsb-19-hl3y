import { Tank, TANK_TYPE_TAG_CLASS, THRESHOLDS, WaterRecord } from "../types";
import { fmt, formatDateTime, isAnomaly } from "../utils";

interface RecordListProps {
  records: WaterRecord[]; // 已筛选、按时间倒序
  tanksById: Map<string, Tank>;
  onDelete: (record: WaterRecord) => void;
}

export default function RecordList({ records, tanksById, onDelete }: RecordListProps) {
  if (records.length === 0) {
    return <p className="empty-state">当前筛选下还没有水质记录。</p>;
  }

  return (
    <div className="record-list">
      {records.map((rec) => {
        const tank = tanksById.get(rec.tankId);
        if (!tank) return null;
        const th = THRESHOLDS[tank.type];
        const anomaly = isAnomaly(rec, tank.type);
        const ammoniaHit = rec.ammonia > th.ammonia;
        const nitriteHit = rec.nitrite > th.nitrite;

        return (
          <article key={rec.id} className={`record-card${anomaly ? " danger" : ""}`}>
            <div className="record-main">
              <div className="record-head">
                <strong>{tank.name}</strong>
                <span className={`tag ${TANK_TYPE_TAG_CLASS[tank.type]}`}>{tank.type}</span>
                <span className="record-time">{formatDateTime(rec.measuredAt)}</span>
                {anomaly && <span className="badge-danger">超标</span>}
              </div>
              <p className="record-metrics">
                <span>pH {fmt(rec.ph, 2)}</span>
                <span className={ammoniaHit ? "metric-hit" : undefined}>氨氮 {fmt(rec.ammonia, 2)}ppm</span>
                <span className={nitriteHit ? "metric-hit" : undefined}>亚硝酸盐 {fmt(rec.nitrite, 2)}ppm</span>
                <span>硝酸盐 {fmt(rec.nitrate, 1)}ppm</span>
                <span>硬度 {fmt(rec.hardness, 1)}°dH</span>
                <span>温度 {fmt(rec.temperature, 1)}°C</span>
                <span className={rec.waterChangePct > 0 ? "metric-water" : undefined}>
                  换水 {fmt(rec.waterChangePct, 0)}%
                </span>
              </p>
              {rec.note && <p className="record-note">备注：{rec.note}</p>}
              <p className="record-sub">维护人 {tank.maintainer}</p>
            </div>
            <button type="button" className="icon-btn" title="删除这条记录" onClick={() => onDelete(rec)}>
              删除
            </button>
          </article>
        );
      })}
    </div>
  );
}
