"use client";

import { useId, useMemo } from "react";
import { formatCurrency } from "@/lib/format";

const MONTHS_FR = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];

function formatMonthYear(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${MONTHS_FR[d.getMonth()]} ${d.getFullYear()}`;
}

function formatYLabel(value: number): string {
  return `$${Math.round(value)}`;
}

function formatDayMonth(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}`;
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

function spreadLabels(
  labels: Array<{ y: number; value: number; color: string; endX: number }>,
  minGap = 14
): Array<{ y: number; value: number; color: string; endX: number; displayY: number }> {
  const sorted = [...labels].sort((a, b) => a.y - b.y);
  const result = sorted.map((l) => ({ ...l, displayY: l.y }));

  for (let i = 1; i < result.length; i++) {
    const prev = result[i - 1]!;
    const curr = result[i]!;
    if (curr.displayY - prev.displayY < minGap) {
      curr.displayY = prev.displayY + minGap;
    }
  }

  return result;
}

function splitSegmentsByThreshold(
  data: { value: number }[],
  pts: { x: number; y: number }[],
  threshold: number
) {
  const segments: Array<{ fromX: number; toX: number; isBlue: boolean }> = [];
  if (data.length === 0 || pts.length === 0) return segments;

  if (data.length === 1) {
    segments.push({ fromX: pts[0]!.x, toX: pts[0]!.x, isBlue: data[0]!.value >= threshold });
    return segments;
  }

  let fromX = pts[0]!.x;
  let isBlue = data[0]!.value >= threshold;

  for (let i = 1; i < data.length; i += 1) {
    const prevValue = data[i - 1]!.value;
    const currentValue = data[i]!.value;
    const prevX = pts[i - 1]!.x;
    const currentX = pts[i]!.x;
    const crossesDown = prevValue >= threshold && currentValue < threshold;
    const crossesUp = prevValue < threshold && currentValue >= threshold;

    if (crossesDown || crossesUp) {
      const t = currentValue !== prevValue ? (threshold - prevValue) / (currentValue - prevValue) : 0;
      const crossingX = prevX + t * (currentX - prevX);
      segments.push({ fromX, toX: crossingX, isBlue });
      fromX = crossingX;
      isBlue = currentValue >= threshold;
    }
  }

  segments.push({ fromX, toX: pts[pts.length - 1]!.x, isBlue });
  return segments;
}

export interface GrowthCurveChartProps {
  title?: string;
  data: { date: string; value: number }[];
  referenceValue?: number;
  drawdownRuleData?: number[];
  capitalInitial?: number;
  maxDrawdown?: number;
  colorLimitLine?: string;
  showLimitLine?: boolean;
  status?: "success" | "failure" | "neutral";
  statusLabel?: string;
  colorBadge?: string;
  dangerThresholdValue?: number;
  fundedBufferValue?: number;
  payoutMarkers?: { index: number; value: number; amount: number }[];
}

export function GrowthCurveChart({
  title = "Solde du compte",
  data,
  referenceValue,
  drawdownRuleData,
  capitalInitial,
  maxDrawdown,
  colorLimitLine = "#ef4444",
  showLimitLine = true,
  status = "neutral",
  statusLabel,
  colorBadge,
  dangerThresholdValue,
  fundedBufferValue,
  payoutMarkers = [],
}: GrowthCurveChartProps) {
  const uid = useId().replace(/:/g, "");

  const chart = useMemo(() => {
    const SVG_W = 600;
    const SVG_H = 240;
    const PAD_LEFT = 68;
    const PAD_RIGHT = 16;
    const PAD_TOP = 14;
    const PAD_BOTTOM = 32;
    const PLOT_W = SVG_W - PAD_LEFT - PAD_RIGHT;
    const PLOT_H = SVG_H - PAD_TOP - PAD_BOTTOM;

    const dataValues = data.map((d) => d.value);
    const refValues = referenceValue !== undefined ? [referenceValue] : [];
    const ruleValues = drawdownRuleData ?? [];
    const thresholdValues = dangerThresholdValue !== undefined ? [dangerThresholdValue] : [];
    const bufferValues = fundedBufferValue !== undefined ? [fundedBufferValue] : [];

    const showRed =
      showLimitLine &&
      capitalInitial !== undefined &&
      maxDrawdown !== undefined &&
      maxDrawdown > 0 &&
      data.length > 0;

    let redLineValues: number[] = [];
    if (showRed && capitalInitial !== undefined && maxDrawdown !== undefined) {
      let runningMax = capitalInitial;
      redLineValues = data.map((point) => {
        runningMax = Math.max(runningMax, point.value);
        return Math.min(runningMax - maxDrawdown, capitalInitial);
      });
    }

    const allValues = [...dataValues, ...refValues, ...ruleValues, ...redLineValues, ...thresholdValues, ...bufferValues];
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
    const payoutPts = payoutMarkers.map((marker) => ({
      x: toX(marker.index),
      y: toY(marker.value),
      amount: marker.amount
    }));
    const curvePath = smoothCurvePath(pts);

    const firstX = pts[0]?.x ?? PAD_LEFT;
    const lastX = pts[pts.length - 1]?.x ?? PAD_LEFT + PLOT_W;
    const bottomY = PAD_TOP + PLOT_H;
    const topY = PAD_TOP;
    const fillPath =
      pts.length > 0
        ? `${curvePath} L ${lastX.toFixed(1)},${bottomY} L ${firstX.toFixed(1)},${bottomY} Z`
        : "";

    const tickCount = 4;
    const yTicks = Array.from({ length: tickCount }, (_, i) => {
      const v = minV + ((maxV - minV) / (tickCount - 1)) * i;
      return { y: toY(v) };
    }).reverse();
    const xTickCount = Math.min(6, data.length);
    const xTicks = Array.from({ length: xTickCount }, (_, i) => {
      const index = xTickCount <= 1
        ? data.length - 1
        : Math.round((i / (xTickCount - 1)) * (data.length - 1));
      return {
        x: toX(index),
        y: bottomY,
        label: formatDayMonth(data[index]!.date),
        index
      };
    }).filter((tick, index, ticks) => index === 0 || tick.index !== ticks[index - 1]!.index);

    const drawdownRulePts = drawdownRuleData
      ? drawdownRuleData.map((v, i) => ({ x: toX(i), y: toY(v) }))
      : [];
    const drawdownRulePath = smoothCurvePath(drawdownRulePts);

    const redLinePts = redLineValues.map((v, i) => ({ x: toX(i), y: toY(v) }));
    const redLinePath = smoothCurvePath(redLinePts);

    const rawLabels: Array<{ y: number; value: number; color: string; endX: number }> = [];

    const lastDataPt = pts[pts.length - 1];
    const lastDataVal = data[data.length - 1];
    if (lastDataPt && lastDataVal) {
      rawLabels.push({ y: lastDataPt.y, value: lastDataVal.value, color: "#3b82f6", endX: lastDataPt.x });
    }

    const lastRedPt = redLinePts[redLinePts.length - 1];
    const lastRedVal = redLineValues[redLineValues.length - 1];
    if (lastRedPt && lastRedVal !== undefined) {
      rawLabels.push({ y: lastRedPt.y, value: lastRedVal, color: colorLimitLine, endX: lastRedPt.x });
    }

    const lastRulePt = drawdownRulePts[drawdownRulePts.length - 1];
    const lastRuleVal = drawdownRuleData?.[drawdownRuleData.length - 1];
    if (lastRulePt && lastRuleVal !== undefined) {
      rawLabels.push({ y: lastRulePt.y, value: lastRuleVal, color: "#6b7280", endX: lastRulePt.x });
    }

    let dangerThresholdY: number | null = null;
    let thresholdSegments: Array<{ fromX: number; toX: number; isBlue: boolean }> = [];
    if (dangerThresholdValue !== undefined && pts.length > 0) {
      dangerThresholdY = toY(dangerThresholdValue);
      thresholdSegments = splitSegmentsByThreshold(data, pts, dangerThresholdValue);
    }

    const fundedBufferY = fundedBufferValue !== undefined ? toY(fundedBufferValue) : null;
    if (fundedBufferY !== null && fundedBufferValue !== undefined) {
      rawLabels.push({
        y: fundedBufferY,
        value: fundedBufferValue,
        color: "#f97316",
        endX: SVG_W - PAD_RIGHT
      });
    }

    const yLabels = spreadLabels(rawLabels);

    return {
      curvePath,
      fillPath,
      yTicks,
      xTicks,
      drawdownRulePath,
      redLinePath,
      yLabels,
      SVG_W,
      SVG_H,
      PAD_LEFT,
      PAD_RIGHT,
      PAD_TOP,
      PLOT_W,
      PLOT_H,
      bottomY,
      topY,
      dangerThresholdY,
      thresholdSegments,
      fundedBufferY,
      payoutPts,
    };
  }, [data, referenceValue, drawdownRuleData, capitalInitial, maxDrawdown, showLimitLine, colorLimitLine, dangerThresholdValue, fundedBufferValue, payoutMarkers]);

  const badgeColor =
    colorBadge ??
    (status === "success" ? "#22c55e" : status === "failure" ? "#ef4444" : "#9ca3af");

  const hasDangerThreshold = chart !== null && chart.dangerThresholdY !== null;

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
            <linearGradient id={`${uid}blueGrad`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(59,130,246,0.25)" />
              <stop offset="100%" stopColor="rgba(59,130,246,0)" />
            </linearGradient>
            <linearGradient id={`${uid}redGrad`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(239,68,68,0.28)" />
              <stop offset="100%" stopColor="rgba(239,68,68,0)" />
            </linearGradient>
            {hasDangerThreshold && chart.dangerThresholdY !== null ? (
              <>
                {/* Zone bleue : solde au-dessus du seuil 50% DD */}
                <clipPath id={`${uid}blueClip`}>
                  <rect x={0} y={0} width={chart.SVG_W} height={chart.dangerThresholdY} />
                </clipPath>
                <clipPath id={`${uid}blueFillClip`}>
                  {chart.thresholdSegments
                    .filter((segment) => segment.isBlue)
                    .map((segment, index) => (
                      <rect
                        key={`blue-fill-${index}`}
                        x={segment.fromX}
                        y={0}
                        width={Math.max(0, segment.toX - segment.fromX)}
                        height={chart.SVG_H}
                      />
                    ))}
                </clipPath>
                {/* Zone rouge : solde sous le seuil 50% DD */}
                <clipPath id={`${uid}redClip`}>
                  <rect
                    x={0}
                    y={chart.dangerThresholdY}
                    width={chart.SVG_W}
                    height={chart.SVG_H - chart.dangerThresholdY}
                  />
                </clipPath>
                <clipPath id={`${uid}redFillClip`}>
                  {chart.thresholdSegments
                    .filter((segment) => !segment.isBlue)
                    .map((segment, index) => (
                      <rect
                        key={`red-fill-${index}`}
                        x={segment.fromX}
                        y={0}
                        width={Math.max(0, segment.toX - segment.fromX)}
                        height={chart.SVG_H}
                      />
                    ))}
                </clipPath>
              </>
            ) : null}
          </defs>

          {/* Grilles horizontales */}
          {chart.yTicks.map((tick, i) => (
            <line
              key={i}
              x1={chart.PAD_LEFT}
              x2={chart.SVG_W - chart.PAD_RIGHT}
              y1={tick.y}
              y2={tick.y}
              stroke="var(--border)"
              strokeWidth="1"
              strokeOpacity="0.7"
            />
          ))}

          {chart.xTicks.map((tick, i) => (
            <g key={`x-tick-${i}`}>
              <line
                x1={tick.x}
                x2={tick.x}
                y1={tick.y}
                y2={tick.y + 4}
                stroke="var(--muted)"
                strokeOpacity="0.65"
                strokeWidth="1"
              />
              <text
                x={tick.x}
                y={tick.y + 15}
                textAnchor="middle"
                className="growth-curve-x-label"
              >
                {tick.label}
              </text>
            </g>
          ))}

          {/* Labels courants sur l'axe Y + pointillé rejoignant la courbe */}
          {chart.yLabels.map((label, i) => (
            <g key={i}>
              <line
                x1={chart.PAD_LEFT}
                x2={label.endX}
                y1={label.y}
                y2={label.y}
                stroke={label.color}
                strokeWidth="0.75"
                strokeDasharray="3 3"
                strokeOpacity="0.5"
              />
              <line
                x1={chart.PAD_LEFT - 4}
                x2={chart.PAD_LEFT}
                y1={label.displayY}
                y2={label.displayY}
                stroke={label.color}
                strokeWidth="1.5"
              />
              <text
                x={chart.PAD_LEFT - 7}
                y={label.displayY}
                textAnchor="end"
                dominantBaseline="middle"
                className="growth-curve-y-label"
                fill={label.color}
              >
                {formatYLabel(label.value)}
              </text>
            </g>
          ))}

          {/* Ligne rouge : plancher de perte trailing plafonné au capital initial */}
          {chart.redLinePath && (
            <path
              d={chart.redLinePath}
              fill="none"
              stroke={colorLimitLine}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Ligne grise pointillée : floor du drawdown selon la règle */}
          {chart.drawdownRulePath && (
            <path
              d={chart.drawdownRulePath}
              fill="none"
              stroke="#6b7280"
              strokeWidth="1.5"
              strokeDasharray="5 5"
              strokeOpacity="0.85"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Courbe bleue + dégradé (zone hors buffer) */}
          <path
            d={chart.fillPath}
            fill={`url(#${uid}blueGrad)`}
            clipPath={hasDangerThreshold ? `url(#${uid}blueFillClip)` : undefined}
          />
          <path
            d={chart.curvePath}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            clipPath={hasDangerThreshold ? `url(#${uid}blueClip)` : undefined}
          />

          {/* Courbe rouge + dégradé : sous 50% du DD disponible */}
          {hasDangerThreshold ? (
            <>
              <path
                d={chart.fillPath}
                fill={`url(#${uid}redGrad)`}
                clipPath={`url(#${uid}redFillClip)`}
              />
              <path
                d={chart.curvePath}
                fill="none"
                stroke="#ef4444"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                clipPath={`url(#${uid}redClip)`}
              />
            </>
          ) : null}

          {chart.fundedBufferY !== null ? (
            <g>
              <line
                x1={chart.PAD_LEFT}
                x2={chart.SVG_W - chart.PAD_RIGHT}
                y1={chart.fundedBufferY}
                y2={chart.fundedBufferY}
                stroke="#f97316"
                strokeWidth="1"
                shapeRendering="crispEdges"
                vectorEffect="non-scaling-stroke"
              />
              <text
                x={chart.SVG_W - chart.PAD_RIGHT - 4}
                y={chart.fundedBufferY - 5}
                textAnchor="end"
                fill="#f97316"
                fontSize="9"
                fontWeight="600"
              >
                buffer
              </text>
            </g>
          ) : null}

          {chart.payoutPts.map((marker, index) => (
            <g key={`payout-marker-${index}`}>
              <circle
                cx={marker.x}
                cy={marker.y}
                r="5"
                fill="#22c55e"
                stroke="var(--surface)"
                strokeWidth="2"
              />
              <circle
                cx={marker.x}
                cy={marker.y}
                r="9"
                fill="#22c55e"
                opacity="0.14"
              />
            </g>
          ))}
        </svg>
      )}
    </div>
  );
}

export { formatMonthYear };
