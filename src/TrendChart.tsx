import { WaterRecord, MetricKey, METRICS, formatDate, formatMetric } from "./types";

interface TrendChartProps {
  records: WaterRecord[];
  metricKey: MetricKey;
  /** 仅氨氮 / 亚硝酸盐有限值线 */
  threshold?: number;
}

const W = 720;
const H = 260;
const PAD = { top: 18, right: 20, bottom: 34, left: 52 };

export default function TrendChart({ records, metricKey, threshold }: TrendChartProps) {
  const meta = METRICS.find((m) => m.key === metricKey)!;

  if (records.length === 0) {
    return <div className="chart-empty">当前筛选下暂无记录，保存一条水质记录后即可看到趋势。</div>;
  }

  const sorted = [...records].sort(
    (a, b) => new Date(a.measuredAt).getTime() - new Date(b.measuredAt).getTime()
  );
  const values = sorted.map((r) => r[metricKey]);
  const times = sorted.map((r) => new Date(r.measuredAt).getTime());

  let min = Math.min(...values);
  let max = Math.max(...values);
  if (threshold !== undefined) {
    max = Math.max(max, threshold * 1.2);
    min = Math.min(min, 0);
  }
  if (max - min < 1e-6) {
    max += 1;
    min -= 1;
  }
  const padY = (max - min) * 0.12;
  min -= padY;
  max += padY;

  const tMin = Math.min(...times);
  const tMax = Math.max(...times);
  const spanT = Math.max(tMax - tMin, 1);

  const x = (t: number) => PAD.left + ((t - tMin) / spanT) * (W - PAD.left - PAD.right);
  const y = (v: number) => PAD.top + (1 - (v - min) / (max - min)) * (H - PAD.top - PAD.bottom);

  const points = sorted.map((r, i) => ({
    x: x(times[i]),
    y: y(values[i]),
    over: threshold !== undefined && values[i] > threshold,
    record: r,
  }));

  const gridLines = 4;
  const gridValues = Array.from({ length: gridLines + 1 }, (_, i) => min + ((max - min) * i) / gridLines);

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  return (
    <svg className="trend-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${meta.label}趋势图`}>
      {gridValues.map((v, i) => (
        <g key={i}>
          <line className="grid-line" x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} />
          <text className="axis-label" x={PAD.left - 8} y={y(v) + 4} textAnchor="end">
            {v.toFixed(meta.decimals)}
          </text>
        </g>
      ))}

      <text className="axis-label" x={PAD.left} y={H - 10} textAnchor="start">
        {formatDate(sorted[0].measuredAt)}
      </text>
      <text className="axis-label" x={W - PAD.right} y={H - 10} textAnchor="end">
        {formatDate(sorted[sorted.length - 1].measuredAt)}
      </text>

      {threshold !== undefined && (
        <g>
          <line
            className="threshold-line"
            x1={PAD.left}
            x2={W - PAD.right}
            y1={y(threshold)}
            y2={y(threshold)}
          />
          <text className="threshold-label" x={W - PAD.right} y={y(threshold) - 6} textAnchor="end">
            上限 {formatMetric(metricKey, threshold)}
          </text>
        </g>
      )}

      <path className="trend-line" d={path} fill="none" />

      {points.map((p, i) => (
        <circle
          key={i}
          className={p.over ? "trend-point over" : "trend-point"}
          cx={p.x}
          cy={p.y}
          r={p.over ? 5.5 : 4}
        >
          <title>
            {`${formatDate(p.record.measuredAt)} · ${formatMetric(metricKey, values[i])}` +
              (p.record.waterChangePct > 0 ? ` · 换水 ${p.record.waterChangePct}%` : "")}
          </title>
        </circle>
      ))}
    </svg>
  );
}
