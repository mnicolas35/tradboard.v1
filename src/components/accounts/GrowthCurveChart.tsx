"use client";

import { useMemo } from "react";
import { formatCurrency } from "@/lib/format";

const MONTHS_FR = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];

function formatMonthYear(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${MONTHS_FR[d.getMonth()]} ${d.getFullYear()}`;
}

function formatYLabel(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

function smoothCurvePath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;

  let d = `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;

  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }

  return d;
}

type DdPoint = { x: number; y: number; color: string };

function buildDdSegments(pts: Array<DdPoint | null>): { path: string; color: string }[] {
  const segments: { path: string; color: string }[] = [];

  for (let i = 0; i < pts.length - 1; i++) {
    const p1 = pts[i];
    const p2 = pts[i + 1];
    if (!p1 || !p2) continue;

    const p0 = (i > 0 ? pts[i - 1] : null) ?? p1;
    const p3 = (i + 2 < pts.length ? pts[i + 2] : null) ?? p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    segments.push({
      path: `M ${p1.x.toFixed(1)},${p1.y.toFixed(1)} C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`,
      color: p1.color,
    });
  }

  return segments;
}

export interface GrowthCurveChartProps {
  title?: string;
  period?: string;
  data: { date: string; value: number }[];
  referenceValue?: number;
  drawdownRuleFloor?: number;
  drawdownCurrentData?: Array<null | { value: number; color: string }>;
  status?: "success" | "failure" | "neutral";
  statusLabel?: string;
  colorCurve?: string;
  colorGradientTop?: string;
  colorGradientBottom?: string;
  colorReference?: string;
  colorBadge?: string;
}

export function GrowthCurveChart({
  title = "Solde du compte",
  period,
  data,
  referenceValue,
  drawdownRuleFloor,
  drawdownCurrentData,
  status = "neutral",
  statusLabel,
  colorCurve = "var(--accent)",
  colorGradientTop = "rgba(99,102,241,0.22)",
  colorGradientBottom = "rgba(99,102,241,0)",
  colorReference = "#9ca3af",
  colorBadge,
}: GrowthCurveChartProps) {
  const chart = useMemo(() => {
    const SVG_W = 600;
    const SVG_H = 240;
    const PAD_LEFT = 56;
    const PAD_RIGHT = 16;
    const PAD_TOP = 14;
    const PAD_BOTTOM = 20;
    const PLOT_W = SVG_W - PAD_LEFT - PAD_RIGHT;
    const PLOT_H = SVG_H - PAD_TOP - PAD_BOTTOM;

    const dataValues = data.map((d) => d.value);
    const refValues = referenceValue !== undefined ? [referenceValue] : [];
    const ddValues = drawdownCurrentData
      ? drawdownCurrentData.filter((d): d is { value: number; color: string } => d !== null).map((d) => d.value)
      : [];
    const allValues = [
      ...dataValues,
      ...refValues,
      ...(drawdownRuleFloor !== undefined ? [drawdownRuleFloor] : []),
      ...ddValues,
    ];

    if (allValues.length === 0) return null;

    let minV = Math.min(...allValues);
    let maxV = Math.max(...allValues);
    if (minV === maxV) { minV -= 500; maxV += 500; }
    const range = maxV - minV;
    const paddedMin = minV - range * 0.10;
    const paddedMax = maxV + range * 0.08;
    const paddedRange = paddedMax - paddedMin;

    const toX = (i: number) =>
      PAD_LEFT + (data.length <= 1 ? PLOT_W / 2 : (i / (data.length - 1)) * PLOT_W);
    const toY = (v: number) =>
      PAD_TOP + ((paddedMax - v) / paddedRange) * PLOT_H;

    const pts = data.map((d, i) => ({ x: toX(i), y: toY(d.value) }));
    const curvePath = smoothCurvePath(pts);

    const firstX = pts[0]?.x ?? PAD_LEFT;
    const lastX = pts[pts.length - 1]?.x ?? PAD_LEFT + PLOT_W;
    const bottomY = PAD_TOP + PLOT_H;
    const fillPath =
      pts.length > 0
        ? `${curvePath} L ${lastX.toFixed(1)},${bottomY} L ${firstX.toFixed(1)},${bottomY} Z`
        : "";

    const tickCount = 4;
    const yTicks = Array.from({ length: tickCount }, (_, i) => {
      const v = minV + ((maxV - minV) / (tickCount - 1)) * i;
      return { value: v, y: toY(v) };
    }).reverse();

    const refY = referenceValue !== undefined ? toY(referenceValue) : null;
    const drawdownRuleY = drawdownRuleFloor !== undefined ? toY(drawdownRuleFloor) : null;

    const ddPts: Array<DdPoint | null> = drawdownCurrentData
      ? drawdownCurrentData.map((d, i) =>
          d === null ? null : { x: toX(i), y: toY(d.value), color: d.color }
        )
      : [];
    const ddSegments = buildDdSegments(ddPts);
    const lastDdPt = [...ddPts].reverse().find(Boolean) ?? null;

    return {
      curvePath,
      fillPath,
      yTicks,
      refY,
      drawdownRuleY,
      ddSegments,
      lastDdPt,
      SVG_W,
      SVG_H,
      PAD_LEFT,
      PAD_RIGHT,
      PAD_TOP,
      PLOT_W,
    };
  }, [data, referenceValue, drawdownRuleFloor, drawdownCurrentData]);

  const badgeColor =
    colorBadge ??
    (status === "success" ? "#22c55e" : status === "failure" ? "#ef4444" : "#9ca3af");

  return (
    <div className="growth-curve-card">
      <div className="growth-curve-header">
        <div className="growth-curve-title-block">
          <span className="growth-curve-title">{title}</span>
          {data.length > 0 && data[data.length - 1] !== undefined && (
            <span className="growth-curve-period">{formatCurrency(data[data.length - 1]!.value)}</span>
          )}
        </div>
        {statusLabel && (
          <span
            className="growth-curve-badge"
            style={{ borderColor: badgeColor, color: badgeColor }}
          >
            {statusLabel}
          </span>
        )}
      </div>

      {!chart || data.length === 0 ? (
        <div className="growth-curve-empty">Aucune donnée.</div>
      ) : (
        <svg
          className="growth-curve-svg"
          viewBox={`0 0 ${chart.SVG_W} ${chart.SVG_H}`}
          role="img"
          aria-label="Graphique de croissance du compte"
        >
          <defs>
            <linearGradient id="growthGradFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colorGradientTop} />
              <stop offset="100%" stopColor={colorGradientBottom} />
            </linearGradient>
          </defs>

          {chart.yTicks.map((tick, i) => (
            <g key={i}>
              <line
                x1={chart.PAD_LEFT}
                x2={chart.SVG_W - chart.PAD_RIGHT}
                y1={tick.y}
                y2={tick.y}
                stroke="var(--border)"
                strokeWidth="1"
                strokeOpacity="0.7"
              />
              <text
                x={chart.PAD_LEFT - 7}
                y={tick.y}
                textAnchor="end"
                dominantBaseline="middle"
                className="growth-curve-y-label"
              >
                {formatYLabel(tick.value)}
              </text>
            </g>
          ))}

          {chart.drawdownRuleY !== null && (
            <line
              x1={chart.PAD_LEFT}
              x2={chart.SVG_W - chart.PAD_RIGHT}
              y1={chart.drawdownRuleY}
              y2={chart.drawdownRuleY}
              stroke="#6b7280"
              strokeWidth="1.5"
              strokeDasharray="5 5"
              strokeOpacity="0.85"
            />
          )}

          {chart.ddSegments.map((seg, i) => (
            <path
              key={i}
              d={seg.path}
              fill="none"
              stroke={seg.color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {chart.lastDdPt && (
            <circle
              cx={chart.lastDdPt.x}
              cy={chart.lastDdPt.y}
              r="3.5"
              fill={chart.lastDdPt.color}
            />
          )}

          <path d={chart.fillPath} fill="url(#growthGradFill)" />
          <path
            d={chart.curvePath}
            fill="none"
            stroke={colorCurve}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </div>
  );
}

export { formatMonthYear };
