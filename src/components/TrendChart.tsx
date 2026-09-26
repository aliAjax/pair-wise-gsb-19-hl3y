import { useState } from "react";
import { fmt } from "../utils";

export interface ChartPoint {
  time: number; // 时间戳
  value: number;
  axisLabel: string; // 横轴短标签
  tipLabel: string; // 悬停完整时间
}

interface TrendChartProps {
  points: ChartPoint[]; // 已按时间升序
  unit: string;
  precision: number;
  color: string;
  threshold?: number; // 超标线，仅氨氮/亚硝酸盐传入
  thresholdLabel?: string;
}

const W = 760;
const H = 300;
const PAD = { top: 20, right: 24, bottom: 36, left: 56 };
const INNER_W = W - PAD.left - PAD.right;
const INNER_H = H - PAD.top - PAD.bottom;
const TICKS = 4;

export default function TrendChart({ points, unit, precision, color, threshold, thresholdLabel }: TrendChartProps) {
  const [hover, setHover] = useState<number | null>(null);

  if (points.length === 0) return null;

  const values = points.map((p) => p.value);
  let minV = Math.min(...values);
  let maxV = Math.max(...values);
  if (threshold !== undefined) {
    minV = Math.min(minV, threshold);
    maxV = Math.max(maxV, threshold);
  }
  if (minV === maxV) {
    minV -= 1;
    maxV += 1;
  }
  const padV = (maxV - minV) * 0.15;
  minV = Math.max(0, minV - padV);
  maxV += padV;

  const times = points.map((p) => p.time);
  const minT = Math.min(...times);
  const maxT = Math.max(...times);
  const spanT = maxT - minT || 1;

  const x = (t: number) =>
    points.length === 1 ? PAD.left + INNER_W / 2 : PAD.left + ((t - minT) / spanT) * INNER_W;
  const y = (v: number) => PAD.top + (1 - (v - minV) / (maxV - minV)) * INNER_H;

  const yTicks = Array.from({ length: TICKS + 1 }, (_, i) => minV + ((maxV - minV) * i) / TICKS);
  const xTickIdx = Array.from(new Set([0, Math.floor((points.length - 1) / 2), points.length - 1]));

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.time).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const areaPath =
    points.length > 1
      ? `${linePath} L${x(points[points.length - 1].time).toFixed(1)},${(PAD.top + INNER_H).toFixed(1)} L${x(points[0].time).toFixed(1)},${(PAD.top + INNER_H).toFixed(1)} Z`
      : null;

  const handleMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    let best = 0;
    let bestDist = Infinity;
    points.forEach((p, i) => {
      const d = Math.abs(x(p.time) - px);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    setHover(best);
  };

  const hoverPoint = hover !== null ? points[hover] : null;
  const overLimit = (v: number) => threshold !== undefined && v > threshold;

  return (
    <div className="chart-wrap">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="水质趋势图"
        onMouseMove={handleMove}
        onMouseLeave={() => setHover(null)}
      >
        {/* 网格与纵轴 */}
        {yTicks.map((v) => (
          <g key={v}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} className="chart-grid" />
            <text x={PAD.left - 8} y={y(v) + 4} textAnchor="end" className="chart-tick">
              {fmt(v, precision)}
            </text>
          </g>
        ))}
        {/* 横轴标签 */}
        {xTickIdx.map((i) => (
          <text key={i} x={x(points[i].time)} y={H - 10} textAnchor="middle" className="chart-tick">
            {points[i].axisLabel}
          </text>
        ))}
        {/* 超标线 */}
        {threshold !== undefined && (
          <g>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(threshold)}
              y2={y(threshold)}
              className="chart-threshold"
            />
            <text x={W - PAD.right} y={y(threshold) - 6} textAnchor="end" className="chart-threshold-label">
              {thresholdLabel}
            </text>
          </g>
        )}
        {/* 面积 + 折线 */}
        {areaPath && <path d={areaPath} fill={color} opacity={0.08} />}
        {points.length > 1 && <path d={linePath} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" />}
        {/* 数据点 */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={x(p.time)}
            cy={y(p.value)}
            r={hover === i ? 6 : overLimit(p.value) ? 5 : 4}
            className={overLimit(p.value) ? "chart-dot danger" : "chart-dot"}
            style={overLimit(p.value) ? undefined : { fill: color }}
          />
        ))}
        {/* 悬停竖线 */}
        {hoverPoint && (
          <line
            x1={x(hoverPoint.time)}
            x2={x(hoverPoint.time)}
            y1={PAD.top}
            y2={PAD.top + INNER_H}
            className="chart-crosshair"
          />
        )}
      </svg>
      {hoverPoint && (
        <div
          className="chart-tooltip"
          style={{
            left: `${(x(hoverPoint.time) / W) * 100}%`,
            top: `${(y(hoverPoint.value) / H) * 100}%`,
          }}
        >
          <strong className={overLimit(hoverPoint.value) ? "danger-text" : undefined}>
            {fmt(hoverPoint.value, precision)}
            {unit && ` ${unit}`}
            {overLimit(hoverPoint.value) && " · 超标"}
          </strong>
          <span>{hoverPoint.tipLabel}</span>
        </div>
      )}
    </div>
  );
}
