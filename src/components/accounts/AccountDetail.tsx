"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AccountPerformanceCalendar } from "@/components/accounts/AccountPerformanceCalendar";
import { GrowthCurveChart, formatMonthYear } from "@/components/accounts/GrowthCurveChart";
import { Field } from "@/components/forms/FormControls";
import { TradingDayForm } from "@/components/forms/TradingDayForm";
import { Modal } from "@/components/ui/Modal";
import { formatCurrency } from "@/lib/format";
import {
  closeAccount,
  closeFailedEvaluation,
  createPayout,
  deleteAccount,
  deletePayout,
  resetEvaluation,
  updateAccountDetails,
  validateEvaluation
} from "@/server/actions/tradboard-actions";
import type { AccountSummary, TradingDaySummary } from "@/types";

type AccountDetailProps = {
  account: AccountSummary;
};

type DetailModal = "activation" | "delete" | "failed" | "reset" | "settings" | "trade" | "close" | "payout" | null;
type ChartRange = "all" | "7j" | "1M" | "3M" | "6M";

const chartRanges: Array<{ id: ChartRange; label: string; months?: number; days?: number }> = [
  { id: "all", label: "all" },
  { id: "7j", label: "7j", days: 7 },
  { id: "1M", label: "1M", months: 1 },
  { id: "3M", label: "3M", months: 3 },
  { id: "6M", label: "6M", months: 6 }
];

function DetailField({
  label,
  value,
  tone
}: {
  label: string;
  value: string | number | null | undefined;
  tone?: "positive" | "negative";
}) {
  const toneClass = tone ? ` tone-${tone}` : "";

  return (
    <div className="detail-field">
      <span>{label}</span>
      <strong className={toneClass}>{value ?? "-"}</strong>
    </div>
  );
}

function cumulativeBalancePoints(days: TradingDaySummary[], accountSize: number) {
  const sorted = [...days].sort((a, b) => a.tradeDate.localeCompare(b.tradeDate));
  let total = accountSize;

  return sorted.map((day) => {
    total += day.profitLossUsd;
    return { date: day.tradeDate, value: total };
  });
}

function todayDateValue() {
  return new Date().toISOString().slice(0, 10);
}

function formatDisplayDate(date: string) {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(`${date}T00:00:00`));
}

function tradingDaysFrom(days: TradingDaySummary[], startDate: string | null) {
  if (!startDate) {
    return days;
  }

  return days.filter((day) => day.tradeDate >= startDate);
}

function addDays(dateStr: string, days: number) {
  const date = new Date(`${dateStr}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function currentDrawdownPoints(account: AccountSummary, days: TradingDaySummary[]) {
  const maxDrawdown = account.rule?.maxDrawdown ?? null;
  if (maxDrawdown === null || days.length === 0) {
    return undefined;
  }

  const sorted = [...days].sort((a, b) => a.tradeDate.localeCompare(b.tradeDate));
  const trades = [...account.tradeEntries].sort((a, b) => (
    a.tradeDate.localeCompare(b.tradeDate) || (a.createdAtTime ?? "").localeCompare(b.createdAtTime ?? "")
  ));
  const drawdownByDate = new Map<string, number>();
  let runningDrawdown = maxDrawdown;

  for (const trade of trades) {
    runningDrawdown = trade.drawdownAtClose ?? runningDrawdown + trade.profitLossUsd;
    drawdownByDate.set(trade.tradeDate, runningDrawdown);
  }

  let latestDrawdown = maxDrawdown;
  return sorted.map((day) => {
    latestDrawdown = drawdownByDate.get(day.tradeDate) ?? latestDrawdown + day.profitLossUsd;
    return latestDrawdown;
  });
}

function accountChartSeries(account: AccountSummary) {
  const balanceEvents = account.tradeEntries.map((trade) => ({
    date: trade.tradeDate,
    createdAt: trade.createdAt,
    amount: trade.profitLossUsd,
    drawdownAtClose: trade.drawdownAtClose,
    type: "trade" as const
  }));
  const payoutEvents = account.payouts
    .filter((payout) => payout.status === "PAID")
    .map((payout) => ({
      date: addDays(payout.date, 1),
      createdAt: payout.createdAt ?? `${payout.date}T23:59:59.999Z`,
      amount: payout.amount,
      drawdownAtClose: null,
      type: "payout" as const
    }));
  const events = [...balanceEvents, ...payoutEvents].sort((a, b) => (
    a.date.localeCompare(b.date) ||
    (a.type === b.type ? 0 : a.type === "payout" ? -1 : 1) ||
    a.createdAt.localeCompare(b.createdAt)
  ));
  const maxDrawdown = account.rule?.maxDrawdown ?? null;
  let balance = account.accountSize;
  let currentDrawdown = maxDrawdown ?? 0;
  const balanceData: { date: string; value: number }[] = [];
  const drawdownData: number[] = [];
  const payoutMarkers: { index: number; value: number; amount: number }[] = [];

  for (const event of events) {
    if (event.type === "trade") {
      balance += event.amount;
      currentDrawdown = event.drawdownAtClose ?? currentDrawdown + event.amount;
    } else {
      balance -= event.amount;
      currentDrawdown -= event.amount;
    }

    const index = balanceData.length;
    balanceData.push({ date: event.date, value: balance });
    drawdownData.push(currentDrawdown);

    if (event.type === "payout") {
      payoutMarkers.push({ index, value: balance, amount: event.amount });
    }
  }

  if (drawdownData.length > 0) {
    drawdownData[drawdownData.length - 1] = account.currentActualDrawdown;
  }

  return {
    balanceData,
    drawdownData: maxDrawdown === null || drawdownData.length === 0 ? undefined : drawdownData,
    payoutMarkers
  };
}

function filterChartSeries(
  data: { date: string; value: number }[],
  drawdownRuleData: number[] | undefined,
  payoutMarkers: { index: number; value: number; amount: number }[],
  range: ChartRange
) {
  const rangeConfig = chartRanges.find((item) => item.id === range);
  if ((!rangeConfig?.months && !rangeConfig?.days) || data.length === 0) {
    return { data, drawdownRuleData, payoutMarkers };
  }

  const latestDate = data.reduce((latest, point) => (point.date > latest ? point.date : latest), data[0]!.date);
  const cutoff = new Date(`${latestDate}T00:00:00`);
  if (rangeConfig.days) {
    cutoff.setDate(cutoff.getDate() - rangeConfig.days);
  } else if (rangeConfig.months) {
    cutoff.setMonth(cutoff.getMonth() - rangeConfig.months);
  }
  const cutoffDate = cutoff.toISOString().slice(0, 10);
  const includedIndexes = data
    .map((point, index) => ({ point, index }))
    .filter(({ point }) => point.date >= cutoffDate);

  if (includedIndexes.length === 0) {
    return { data, drawdownRuleData, payoutMarkers };
  }

  const indexMap = new Map(includedIndexes.map(({ index }, viewIndex) => [index, viewIndex]));

  return {
    data: includedIndexes.map(({ point }) => point),
    drawdownRuleData: drawdownRuleData ? includedIndexes.map(({ index }) => drawdownRuleData[index]!) : undefined,
    payoutMarkers: payoutMarkers.flatMap((marker) => {
      const index = indexMap.get(marker.index);
      return index === undefined ? [] : [{ ...marker, index }];
    })
  };
}

function consistencySnapshot(account: AccountSummary, days: TradingDaySummary[]) {
  const rulePercent =
    account.accountType === "FUNDED" ? account.rule?.fundedConsistencyPercent ?? null : account.rule?.consistencyPercent ?? null;
  const bestDay = Math.max(0, ...days.map((day) => day.profitLossUsd));
  const currentResult = days.reduce((sum, day) => sum + day.profitLossUsd, 0);
  const target = account.accountType !== "FUNDED" ? (account.rule?.target ?? null) : null;
  // Si target définie : base = target tant qu'on ne la dépasse pas, total réel au-delà
  const consistencyBase =
    target !== null
      ? Math.max(target, currentResult)
      : currentResult > 0 ? currentResult : null;
  const currentRatio = consistencyBase !== null ? (bestDay / consistencyBase) * 100 : null;
  const missingProfit =
    rulePercent && rulePercent > 0 ? Math.max(0, bestDay / (rulePercent / 100) - currentResult) : null;

  return {
    rulePercent,
    currentRatio,
    missingProfit,
    isOk: rulePercent === null || (currentRatio !== null && currentRatio <= rulePercent)
  };
}

function PerformanceChart({ accountSize, days }: { accountSize: number; days: TradingDaySummary[] }) {
  const points = useMemo(() => cumulativeBalancePoints(days, accountSize), [accountSize, days]);

  if (points.length === 0) {
    return (
      <div className="account-performance-empty">
        <span>Aucun trade.</span>
      </div>
    );
  }

  const values = points.map((point) => point.value);
  const min = Math.min(accountSize, ...values);
  const max = Math.max(accountSize, ...values);
  const range = max - min || 1;
  const width = 640;
  const height = 260;
  const padding = 24;
  const plotWidth = width - padding * 2;
  const plotHeight = height - padding * 2;
  const coordinates = points.map((point, index) => {
    const x = padding + (points.length === 1 ? plotWidth : (index / (points.length - 1)) * plotWidth);
    const y = padding + ((max - point.value) / range) * plotHeight;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const startBalanceY = padding + ((max - accountSize) / range) * plotHeight;
  const last = points[points.length - 1];

  return (
    <div className="account-performance-chart">
      <div className="account-performance-chart-head">
        <div>
          <span className="muted">Solde du compte</span>
          <strong className={last.value >= accountSize ? "tone-positive" : "tone-negative"}>{formatCurrency(last.value)}</strong>
        </div>
        <span className="muted">{points.length} jour(s)</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Graphique de performance du compte">
        <line className="chart-zero" x1={padding} x2={width - padding} y1={startBalanceY} y2={startBalanceY} />
        <polyline className="chart-line" fill="none" points={coordinates.join(" ")} />
        {coordinates.map((coordinate, index) => {
          const [x, y] = coordinate.split(",");
          return <circle className="chart-point" cx={x} cy={y} key={`${points[index].date}-${index}`} r="4" />;
        })}
      </svg>
    </div>
  );
}

export function AccountDetail({ account }: AccountDetailProps) {
  const router = useRouter();
  const today = todayDateValue();
  const accountNumberLabel = account.accountNumber ? `#${account.accountNumber}` : "Sans numero";
  const [modal, setModal] = useState<DetailModal>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [chartRange, setChartRange] = useState<ChartRange>("all");
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);
  const isPositive = account.accountBalanceUsd >= account.accountSize;
  const ruleDrawdown = account.rule?.maxDrawdown ?? null;
  const drawdownLimit = ruleDrawdown;
  const dangerThresholdValue =
    drawdownLimit === null
      ? undefined
      : account.accountType === "FUNDED"
        ? account.accountSize + drawdownLimit * 0.5
        : account.accountSize - drawdownLimit * 0.5;
  const ruleTarget = account.rule?.target ?? null;
  const targetValue = ruleTarget === null ? null : `${formatCurrency(account.currentResultUsd)} / ${formatCurrency(ruleTarget)}`;
  const payoutEligible = account.accountType === "FUNDED" && account.payoutEligibility.isEligible;
  const payoutValue = account.accountType === "FUNDED" ? formatCurrency(account.payoutEligibility.availableAmount) : "-";
  const accountCostTotal = account.costHistory.reduce((sum, line) => sum + line.amount, 0);
  const closeOptions = account.accountType === "EVALUATION" ? ["FAILED", "PASSED"] : ["FAILED", "CLOSED"];
  const isActiveEvaluation = account.accountType === "EVALUATION" && account.status === "ACTIVE";
  const isActiveFunded = account.accountType === "FUNDED" && account.status === "ACTIVE";
  const isCrashedFunded = isActiveFunded && account.currentDrawdown !== null && account.currentDrawdown <= 0;
  const fundedResetPrice = account.rule?.defaultFundedResetPrice ?? 0;
  const canActivateEvaluation = isActiveEvaluation && account.evaluationEligibility.isEligible;
  const canFailEvaluation = isActiveEvaluation && account.evaluationEligibility.isFailed;
  const canResetFunded = isCrashedFunded && fundedResetPrice > 0;
  const resetCostDefault = account.accountType === "FUNDED" ? fundedResetPrice : account.rule?.defaultResetPrice ?? 0;
  const tradingDaysStartDate = account.accountType === "FUNDED" ? account.activationDate : account.purchaseDate;
  const ruleTradingDays = tradingDaysFrom(account.dailyResults, tradingDaysStartDate);
  const consistency = consistencySnapshot(account, ruleTradingDays);

  const chartSeries = useMemo(() => accountChartSeries(account), [account]);
  const fullChartData = chartSeries.balanceData;
  const fundedBuffer = account.accountType === "FUNDED" ? (account.rule?.buffer ?? account.rule?.payoutBuffer ?? null) : null;
  const fundedBufferValue = fundedBuffer !== null ? account.accountSize + fundedBuffer : undefined;

  const fullDrawdownRuleData = useMemo((): number[] | undefined => {
    if (!ruleDrawdown || fullChartData.length === 0) return undefined;

    // Le floor est toujours trailing (EOD ou INTRADAY) : il suit le pic de solde.
    // "EOD" signifie que le check se fait à la clôture, pas que le floor est fixe.
    // Pour les funded avec buffer : le floor se fige à accountSize + buffer.
    const isFunded = account.accountType === "FUNDED";
    const buffer = account.rule?.buffer ?? null;
    const floorCap = isFunded && buffer !== null ? account.accountSize + buffer : null;

    let peakBalance = account.accountSize;
    return fullChartData.map((point) => {
      if (point.value > peakBalance) peakBalance = point.value;
      const floor = peakBalance - ruleDrawdown;
      return floorCap !== null ? Math.min(floor, floorCap) : floor;
    });
  }, [ruleDrawdown, fullChartData, account.accountSize, account.accountType, account.rule?.buffer]);

  const filteredChartSeries = useMemo(
    () => filterChartSeries(
      fullChartData,
      fullDrawdownRuleData,
      chartSeries.payoutMarkers,
      chartRange
    ),
    [fullChartData, fullDrawdownRuleData, chartSeries.payoutMarkers, chartRange]
  );

  const chartPeriod = useMemo(() => {
    const startDate = tradingDaysStartDate;
    const dates = account.dailyResults.map((d) => d.tradeDate).sort();
    const endDate = dates[dates.length - 1] ?? today;
    if (!startDate && dates.length === 0) return undefined;
    const from = formatMonthYear(startDate ?? dates[0] ?? today);
    const to = formatMonthYear(endDate);
    return from === to ? from : `${from} → ${to}`;
  }, [account.dailyResults, tradingDaysStartDate, today]);

  const chartStatus = useMemo((): { status: "success" | "failure" | "neutral"; label: string | undefined } => {
    if (account.accountType === "EVALUATION") {
      if (account.status === "FAILED" || account.status === "CLOSED") return { status: "failure", label: "Challenge échoué" };
      if (account.status === "PASSED") return { status: "success", label: "Challenge réussi" };
      return { status: "neutral", label: "Challenge en cours" };
    }
    if (account.status === "CLOSED" || account.status === "ARCHIVED") return { status: "neutral", label: "Funded clôturé" };
    return { status: "neutral", label: undefined };
  }, [account.accountType, account.status]);

  async function submitAction(action: (formData: FormData) => Promise<void>, formData: FormData) {
    setError(null);
    setIsSubmitting(true);

    try {
      await action(formData);
      router.refresh();
      setModal(null);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Action impossible.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="account-detail-v2">
      <section className="panel account-detail-hero">
        <div>
          <p className="eyebrow">{account.propFirmName}</p>
          <h1>{accountNumberLabel}</h1>
          <p className="muted">{account.propFirmRuleName ?? "Aucune règle associée"}</p>
        </div>
        <div className="account-detail-hero-side">
          <div className="detail-result">
            <span>Solde du compte</span>
            <strong className={isPositive ? "tone-positive" : "tone-negative"}>{formatCurrency(account.accountBalanceUsd)}</strong>
          </div>
          <div className="button-row">
            {canActivateEvaluation ? (
              <button className="button positive" type="button" onClick={() => setModal("activation")}>
                Activation
              </button>
            ) : null}
            {canFailEvaluation ? (
              <>
                <button className="button danger" type="button" onClick={() => setModal("reset")}>
                  Reset
                </button>
                <button className="button danger" type="button" onClick={() => setModal("failed")}>
                  Failed
                </button>
              </>
            ) : null}
            {canResetFunded ? (
              <button className="button danger" type="button" onClick={() => setModal("reset")}>
                Reset
              </button>
            ) : null}
            <button className="button secondary" type="button" onClick={() => setModal("trade")}>
              Add trade
            </button>
            <button className="button danger" type="button" onClick={() => setModal("close")}>
              Closed
            </button>
            <button
              aria-label="Modifier le compte"
              className="icon-button"
              title="Modifier le compte"
              type="button"
              onClick={() => setModal("settings")}
            >
              ⚙
            </button>
            <button
              aria-label="Supprimer le compte"
              className="icon-button danger"
              title="Supprimer le compte"
              type="button"
              onClick={() => setModal("delete")}
            >
              🗑️
            </button>
          </div>
        </div>
      </section>

      <section className="panel account-info-panel">
        <div className="account-info-row">
          <DetailField label="Numéro compte" value={account.accountNumber ?? "Sans numero"} />
          <DetailField label="Taille" value={formatCurrency(account.accountSize)} />
          <DetailField label="Règle" value={account.propFirmRuleName} />
          <DetailField label="Type" value={account.accountType} />
          <DetailField label="Statut" value={account.status} />
        </div>
        <div className={account.accountType === "EVALUATION" ? "account-info-row four" : "account-info-row three"}>
          <DetailField label="Solde" value={formatCurrency(account.accountBalanceUsd)} tone={isPositive ? "positive" : "negative"} />
          {account.accountType === "EVALUATION" ? (
            <DetailField
              label="Target"
              value={targetValue}
              tone={account.currentResultUsd >= (ruleTarget ?? Number.POSITIVE_INFINITY) ? "positive" : account.currentResultUsd < 0 ? "negative" : undefined}
            />
          ) : null}
          <DetailField
            label="Drawdown actuel"
            value={formatCurrency(account.currentActualDrawdown)}
            tone={account.currentActualDrawdown < 0 ? "negative" : account.currentActualDrawdown > 0 ? "positive" : undefined}
          />
          <DetailField
            label="Drawdown disponible"
            value={`${account.currentDrawdown !== null ? formatCurrency(account.currentDrawdown) : "-"} / ${ruleDrawdown !== null ? formatCurrency(ruleDrawdown) : "-"}`}
            tone={
              account.currentDrawdown !== null && ruleDrawdown !== null
                ? account.currentDrawdown < ruleDrawdown * 0.5
                  ? "negative"
                  : undefined
                : undefined
            }
          />
        </div>
        <div className="account-info-row payout-row">
          <div className={payoutEligible ? "detail-field payout-field eligible" : "detail-field payout-field"}>
            <div className="payout-field-head">
              <span>Payout possible</span>
              <button
                aria-label="Effectuer un payout"
                className={payoutEligible ? "payout-action-button active" : "payout-action-button"}
                disabled={!payoutEligible}
                title={payoutEligible ? "Effectuer un payout" : account.payoutEligibility.reasons[0] ?? "Payout non disponible"}
                type="button"
                onClick={() => setModal("payout")}
              >
                $
              </button>
            </div>
            <strong>{payoutValue}</strong>
            {account.accountType === "FUNDED" && account.payoutEligibility.reasons.length > 0 ? (
              <small>{account.payoutEligibility.reasons[0]}</small>
            ) : null}
          </div>
          <div
            className={
              consistency.rulePercent === null
                ? "detail-field payout-field"
                : consistency.isOk
                  ? "detail-field payout-field consistency-ok"
                  : "detail-field payout-field consistency-bad"
            }
          >
            <span>Consistance</span>
            <strong>
              {consistency.currentRatio === null ? "-" : `${consistency.currentRatio.toFixed(1)}%`}
              {consistency.rulePercent !== null ? ` / ${consistency.rulePercent.toFixed(1)}%` : ""}
            </strong>
            {consistency.rulePercent !== null ? (
              <small>Manquant: {formatCurrency(consistency.missingProfit ?? 0)}</small>
            ) : (
              <small>Aucune règle de consistance</small>
            )}
          </div>
          <DetailField label="Jours tradés" value={ruleTradingDays.length} />
        </div>
        <div className="account-payout-history">
          <div className="payout-history-header">
            <span>Coût du compte</span>
            <strong>{formatCurrency(accountCostTotal)}</strong>
          </div>
          {account.costHistory.length === 0 ? (
            <p className="payout-history-empty">Aucun coût enregistré.</p>
          ) : (
            <div className="cost-history-list">
              {account.costHistory.map((line) => (
                <div className="cost-history-row" key={line.id}>
                  <span>
                    {formatDisplayDate(line.date)} · {line.label}
                  </span>
                  <strong>{formatCurrency(line.amount)}</strong>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="account-payout-history">
          <div className="payout-history-header">
            <span>Historique payouts</span>
            <strong>{formatCurrency(account.payouts.filter((payout) => payout.status === "PAID").reduce((sum, payout) => sum + payout.amount, 0))}</strong>
          </div>
          {account.payouts.length === 0 ? (
            <p className="payout-history-empty">Aucun payout enregistré.</p>
          ) : (
            <div className="payout-history-list">
              {[...account.payouts]
                .sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
                .map((payout) => (
                  <form
                    className="payout-history-row"
                    key={payout.id}
                    onSubmit={(event) => {
                      event.preventDefault();
                      void submitAction(deletePayout, new FormData(event.currentTarget));
                    }}
                  >
                    <input name="payoutId" type="hidden" value={payout.id} />
                    <span>{formatDisplayDate(payout.date)}</span>
                    <strong>{formatCurrency(payout.amount)}</strong>
                    <button
                      aria-label="Supprimer ce payout"
                      className="row-icon-button delete"
                      disabled={isSubmitting}
                      title="Supprimer ce payout"
                      type="submit"
                    >
                      🗑️
                    </button>
                  </form>
                ))}
            </div>
          )}
        </div>
      </section>

      <section className="panel account-performance-panel">
        <div className="panel-header">
          <h2>Performance</h2>
          <div className="performance-header-actions">
            <span className="muted">{account.tradedDaysCount} jour(s)</span>
            <div className="chart-range-toggle" aria-label="Filtre du graphique">
              {chartRanges.map((range) => (
                <button
                  aria-pressed={chartRange === range.id}
                  className={chartRange === range.id ? "active" : ""}
                  key={range.id}
                  type="button"
                  onClick={() => setChartRange(range.id)}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="account-performance-layout">
          <GrowthCurveChart
            data={filteredChartSeries.data}
            referenceValue={account.accountSize}
            drawdownRuleData={filteredChartSeries.drawdownRuleData}
            capitalInitial={account.accountSize}
            maxDrawdown={ruleDrawdown ?? undefined}
            dangerThresholdValue={dangerThresholdValue}
            fundedBufferValue={fundedBufferValue}
            payoutMarkers={filteredChartSeries.payoutMarkers}
            status={chartStatus.status}
            statusLabel={chartStatus.label}
          />
          <AccountPerformanceCalendar
            days={account.dailyResults}
            trades={account.tradeEntries}
            currentDrawdown={account.currentDrawdown}
            currentActualDrawdown={account.currentActualDrawdown}
            currentResultUsd={account.currentResultUsd}
            drawdownLimit={drawdownLimit}
            fundedBuffer={account.accountType === "FUNDED" ? (account.rule?.buffer ?? null) : null}
            accountType={account.accountType as "EVALUATION" | "FUNDED"}
            ruleDrawdown={account.rule?.maxDrawdown ?? null}
            onSelectedDateChange={setSelectedCalendarDate}
          />
        </div>
      </section>

      <Modal isOpen={modal === "trade"} title="Add trading day" onClose={() => setModal(null)}>
        <TradingDayForm
          accounts={[account]}
          defaultTradeDate={selectedCalendarDate}
          hideAccountSelect
          onCancel={() => setModal(null)}
          onSuccess={() => setModal(null)}
        />
      </Modal>

      <Modal isOpen={modal === "payout"} title="Effectuer un payout" onClose={() => setModal(null)}>
        <form
          className="form-panel"
          onSubmit={(event) => {
            event.preventDefault();
            void submitAction(createPayout, new FormData(event.currentTarget));
          }}
        >
          <div className="form-grid">
            <input name="accountId" type="hidden" value={account.id} />
            <input name="currency" type="hidden" value="USD" />
            <input name="status" type="hidden" value="PAID" />
            <label className="form-field">
              <span>Montant payout - max {formatCurrency(account.payoutEligibility.availableAmount)}</span>
              <input
                max={account.payoutEligibility.availableAmount}
                min={0}
                name="amount"
                required
                step="any"
                type="number"
              />
            </label>
            <Field label="Date" name="payoutDate" required type="date" defaultValue={today} />
            <label className="form-field wide">
              <span>Notes</span>
              <textarea name="notes" rows={3} />
            </label>
          </div>
          {error ? <p className="form-error">{error}</p> : null}
          <div className="form-actions split">
            <button className="button secondary" disabled={isSubmitting} type="button" onClick={() => setModal(null)}>
              Annuler
            </button>
            <button className="button positive" disabled={isSubmitting || !payoutEligible} type="submit">
              {isSubmitting ? "Enregistrement..." : "Valider le payout"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={modal === "settings"} title="Modifier le compte" onClose={() => setModal(null)}>
        <form
          className="form-panel"
          onSubmit={(event) => {
            event.preventDefault();
            void submitAction(updateAccountDetails, new FormData(event.currentTarget));
          }}
        >
          <div className="form-grid">
            <input name="accountId" type="hidden" value={account.id} />
            <label className="form-field">
              <span>Numéro du compte</span>
              <input defaultValue={account.accountNumber ?? ""} name="accountNumber" placeholder="APX-001" required />
            </label>
            <label className="form-field">
              <span>Date de création</span>
              <input defaultValue={account.purchaseDate ?? today} name="purchaseDate" required type="date" />
            </label>
            <label className="form-field">
              <span>Date activation</span>
              <input
                defaultValue={account.activationDate ?? (account.accountType === "FUNDED" ? today : "")}
                name="activationDate"
                required={account.accountType === "FUNDED"}
                type="date"
              />
            </label>
          </div>
          {error ? <p className="form-error">{error}</p> : null}
          <div className="form-actions split">
            <button className="button secondary" type="button" onClick={() => setModal(null)}>
              Annuler
            </button>
            <button className="button" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={modal === "activation"} title="Activation funded" onClose={() => setModal(null)}>
        <form
          className="form-panel"
          onSubmit={(event) => {
            event.preventDefault();
            void submitAction(validateEvaluation, new FormData(event.currentTarget));
          }}
        >
          <div className="form-grid">
            <input name="accountId" type="hidden" value={account.id} />
            <label className="form-field">
              <span>Numéro du compte funded</span>
              <input name="accountNumber" placeholder={account.accountNumber ?? "FD-001"} required />
            </label>
            <label className="form-field">
              <span>Date activation</span>
              <input defaultValue={today} name="activationDate" type="date" />
            </label>
            <label className="form-field">
              <span>Coût activation USD</span>
              <input
                defaultValue={account.rule?.defaultActivationPrice ?? 0}
                min="0"
                name="activationCost"
                required
                step="any"
                type="number"
              />
            </label>
            <label className="form-field wide">
              <span>Notes</span>
              <textarea name="notes" rows={3} />
            </label>
          </div>
          {error ? <p className="form-error">{error}</p> : null}
          <div className="form-actions split">
            <button className="button secondary" type="button" onClick={() => setModal(null)}>
              Annuler
            </button>
            <button className="button positive" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Activation..." : "Activer"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={modal === "reset"} title={account.accountType === "FUNDED" ? "Reset funded" : "Reset evaluation"} onClose={() => setModal(null)}>
        <form
          className="form-panel"
          onSubmit={(event) => {
            event.preventDefault();
            void submitAction(resetEvaluation, new FormData(event.currentTarget));
          }}
        >
          <div className="form-grid">
            <input name="accountId" type="hidden" value={account.id} />
            <label className="form-field">
              <span>Numéro du nouveau compte</span>
              <input name="accountNumber" placeholder={account.accountNumber ?? "RESET-001"} required />
            </label>
            <label className="form-field">
              <span>Coût reset USD</span>
              <input defaultValue={resetCostDefault} min="0" name="resetCost" required step="any" type="number" />
            </label>
            <label className="form-field wide">
              <span>Notes</span>
              <textarea name="notes" rows={3} />
            </label>
          </div>
          {error ? <p className="form-error">{error}</p> : null}
          <div className="form-actions split">
            <button className="button secondary" type="button" onClick={() => setModal(null)}>
              Annuler
            </button>
            <button className="button" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Reset..." : "Reset"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={modal === "failed"} title="Marquer failed" onClose={() => setModal(null)}>
        <form
          className="form-panel"
          onSubmit={(event) => {
            event.preventDefault();
            void submitAction(closeFailedEvaluation, new FormData(event.currentTarget));
          }}
        >
          <div className="form-grid">
            <input name="accountId" type="hidden" value={account.id} />
            <p className="form-note wide">Cette evaluation sera classee en failed.</p>
          </div>
          {error ? <p className="form-error">{error}</p> : null}
          <div className="form-actions split">
            <button className="button secondary" type="button" onClick={() => setModal(null)}>
              Annuler
            </button>
            <button className="button danger" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Classement..." : "Failed"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={modal === "close"} title="Fermer le compte" onClose={() => setModal(null)}>
        <form
          className="form-panel"
          onSubmit={(event) => {
            event.preventDefault();
            void submitAction(closeAccount, new FormData(event.currentTarget));
          }}
        >
          <div className="form-grid">
            <input name="accountId" type="hidden" value={account.id} />
            {closeOptions.map((status) => (
              <label className={status === "CLOSED" || status === "FAILED" ? "check-field danger" : "check-field"} key={status}>
                <input name="closeStatus" required type="radio" value={status} />
                <span>{status}</span>
              </label>
            ))}
          </div>
          {error ? <p className="form-error">{error}</p> : null}
          <div className="form-actions split">
            <button className="button secondary" type="button" onClick={() => setModal(null)}>
              Annuler
            </button>
            <button className="button danger" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Fermeture..." : "Fermer"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={modal === "delete"} title="Supprimer le compte" onClose={() => setModal(null)}>
        <form
          className="form-panel"
          onSubmit={(event) => {
            event.preventDefault();
            void submitAction(deleteAccount, new FormData(event.currentTarget));
          }}
        >
          <div className="form-grid">
            <input name="accountId" type="hidden" value={account.id} />
            <label className="form-field wide">
              <span>Retaper le numéro du compte</span>
              <input name="confirmationNumber" placeholder={account.accountNumber ?? "Sans numero"} required />
            </label>
          </div>
          {error ? <p className="form-error">{error}</p> : null}
          <div className="form-actions split">
            <button className="button secondary" type="button" onClick={() => setModal(null)}>
              Annuler
            </button>
            <button className="button danger" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Suppression..." : "Supprimer définitivement"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
