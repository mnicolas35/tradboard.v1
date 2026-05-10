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
  bufferLevel?: number;
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
  bufferLevel,
}: GrowthCurveChartProps) {
  const uid = useId().replace(/:/g, "");

  const chart = useMemo(() => {
    const SVG_W = 600;
    const SVG_H = 240;
    const PAD_LEFT = 68;
    const PAD_RIGHT = 16;
    const PAD_TOP = 14;
    const PAD_BOTTOM = 20;
    const PLOT_W = SVG_W - PAD_LEFT - PAD_RIGHT;
    const PLOT_H = SVG_H - PAD_TOP - PAD_BOTTOM;

    const dataValues = data.map((d) => d.value);
    const refValues = referenceValue !== undefined ? [referenceValue] : [];
    const ruleValues = drawdownRuleData ?? [];

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

    const allValues = [...dataValues, ...refValues, ...ruleValues, ...redLineValues];
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
      return { y: toY(v) };
    }).reverse();

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

    const yLabels = spreadLabels(rawLabels);

    // Buffer crossings
    let firstCrossingX: number | null = null;  // solde dépasse bufferLevel pour la 1ère fois
    let secondCrossingX: number | null = null; // solde repasse SOUS bufferLevel après l'avoir dépassé
    let bufferLineY: number | null = null;
    if (bufferLevel !== undefined && bufferLevel > 0 && pts.length > 0) {
      bufferLineY = toY(bufferLevel);

      for (let i = 0; i < data.length; i++) {
        if ((data[i]?.value ?? 0) >= bufferLevel) {
          if (i === 0) {
            firstCrossingX = pts[0]!.x;
          } else {
            const prevVal = data[i - 1]!.value;
            const currVal = data[i]!.value;
            const t = currVal !== prevVal ? (bufferLevel - prevVal) / (currVal - prevVal) : 0;
            firstCrossingX = pts[i - 1]!.x + t * (pts[i]!.x - pts[i - 1]!.x);
          }
          break;
        }
      }

      if (firstCrossingX !== null) {
        for (let i = 1; i < data.length; i++) {
          const prevVal = data[i - 1]!.value;
          const currVal = data[i]!.value;
          if (prevVal >= bufferLevel && currVal < bufferLevel) {
            const t = prevVal !== currVal ? (bufferLevel - prevVal) / (currVal - prevVal) : 0;
            secondCrossingX = pts[i - 1]!.x + t * (pts[i]!.x - pts[i - 1]!.x);
            break;
          }
        }
      }
    }

    return {
      curvePath,
      fillPath,
      yTicks,
      drawdownRulePath,
      redLinePath,
      yLabels,
      SVG_W,
      SVG_H,
      PAD_LEFT,
      PAD_RIGHT,
      PAD_TOP,
      PLOT_W,
      firstCrossingX,
      secondCrossingX,
      bufferLineY,
    };
  }, [data, referenceValue, drawdownRuleData, capitalInitial, maxDrawdown, showLimitLine, colorLimitLine, bufferLevel]);

  const badgeColor =
    colorBadge ??
    (status === "success" ? "#22c55e" : status === "failure" ? "#ef4444" : "#9ca3af");

  // Rouge uniquement si le solde est repassé SOUS le buffer après l'avoir dépassé
  const hasBuffer = chart !== null && chart.secondCrossingX !== null && chart.bufferLineY !== null;

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
            {hasBuffer && chart.secondCrossingX !== null && chart.bufferLineY !== null ? (
              <>
                {/* Zone bleue : à gauche du 2e croisement OU au-dessus du buffer */}
                <clipPath id={`${uid}blueClip`}>
                  <rect x={0} y={0} width={chart.secondCrossingX} height={chart.SVG_H} />
                  <rect x={0} y={0} width={chart.SVG_W} height={chart.bufferLineY} />
                </clipPath>
                {/* Zone rouge : à droite du 2e croisement ET en dessous du buffer */}
                <clipPath id={`${uid}redClip`}>
                  <rect
                    x={chart.secondCrossingX}
                    y={chart.bufferLineY}
                    width={chart.SVG_W - chart.secondCrossingX}
                    height={chart.SVG_H - chart.bufferLineY}
                  />
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
            clipPath={hasBuffer ? `url(#${uid}blueClip)` : undefined}
          />
          <path
            d={chart.curvePath}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            clipPath={hasBuffer ? `url(#${uid}blueClip)` : undefined}
          />

          {/* Courbe rouge + dégradé (zone sous buffer après croisement) */}
          {hasBuffer ? (
            <>
              <path
                d={chart.fillPath}
                fill={`url(#${uid}redGrad)`}
                clipPath={`url(#${uid}redClip)`}
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
        </svg>
      )}
    </div>
  );
}

export { formatMonthYear };
