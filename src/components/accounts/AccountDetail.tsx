"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AccountPerformanceCalendar } from "@/components/accounts/AccountPerformanceCalendar";
import { TradingDayForm } from "@/components/forms/TradingDayForm";
import { Modal } from "@/components/ui/Modal";
import { formatCurrency } from "@/lib/format";
import {
  closeAccount,
  closeFailedEvaluation,
  deleteAccount,
  resetEvaluation,
  updateAccountDetails,
  validateEvaluation
} from "@/server/actions/tradboard-actions";
import type { AccountSummary, TradingDaySummary } from "@/types";

type AccountDetailProps = {
  account: AccountSummary;
};

type DetailModal = "activation" | "delete" | "failed" | "reset" | "settings" | "trade" | "close" | null;

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

function tradingDaysFrom(days: TradingDaySummary[], startDate: string | null) {
  if (!startDate) {
    return days;
  }

  return days.filter((day) => day.tradeDate >= startDate);
}

function consistencySnapshot(account: AccountSummary, days: TradingDaySummary[]) {
  const rulePercent =
    account.accountType === "FUNDED" ? account.rule?.fundedConsistencyPercent ?? null : account.rule?.consistencyPercent ?? null;
  const bestDay = Math.max(0, ...days.map((day) => day.profitLossUsd));
  const consistencyBase =
    account.accountType !== "FUNDED" && account.rule?.target != null
      ? account.rule.target
      : account.currentResultUsd > 0 ? account.currentResultUsd : null;
  const currentRatio = consistencyBase !== null ? (bestDay / consistencyBase) * 100 : null;
  const missingProfit =
    rulePercent && rulePercent > 0 ? Math.max(0, bestDay / (rulePercent / 100) - account.currentResultUsd) : null;

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
  const isPositive = account.accountBalanceUsd >= account.accountSize;
  const ruleDrawdown = account.rule?.maxDrawdown ?? null;
  const ruleTarget = account.rule?.target ?? null;
  const targetValue = ruleTarget === null ? null : `${formatCurrency(account.currentResultUsd)} / ${formatCurrency(ruleTarget)}`;
  const payoutEligible = account.accountType === "FUNDED" && account.payoutEligibility.isEligible;
  const payoutValue = account.accountType === "FUNDED" ? formatCurrency(account.payoutEligibility.availableAmount) : "-";
  const closeOptions = account.accountType === "EVALUATION" ? ["FAILED", "PASSED"] : ["FAILED", "PASSED", "CLOSED"];
  const isActiveEvaluation = account.accountType === "EVALUATION" && account.status === "ACTIVE";
  const canActivateEvaluation = isActiveEvaluation && account.evaluationEligibility.isEligible;
  const canFailEvaluation = isActiveEvaluation && account.evaluationEligibility.isFailed;
  const tradingDaysStartDate = account.accountType === "FUNDED" ? account.activationDate : account.purchaseDate;
  const ruleTradingDays = tradingDaysFrom(account.dailyResults, tradingDaysStartDate);
  const consistency = consistencySnapshot(account, ruleTradingDays);

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
                <button className="button secondary" type="button" onClick={() => setModal("reset")}>
                  Reset
                </button>
                <button className="button danger" type="button" onClick={() => setModal("failed")}>
                  Failed
                </button>
              </>
            ) : null}
            <button className="button secondary" type="button" onClick={() => setModal("trade")}>
              Add trade
            </button>
            <button className="button secondary" type="button" onClick={() => setModal("close")}>
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
        <div className={account.accountType === "EVALUATION" ? "account-info-row three" : "account-info-row two"}>
          <DetailField label="Solde" value={formatCurrency(account.accountBalanceUsd)} tone={isPositive ? "positive" : "negative"} />
          {account.accountType === "EVALUATION" ? (
            <DetailField
              label="Target"
              value={targetValue}
              tone={account.currentResultUsd >= (ruleTarget ?? Number.POSITIVE_INFINITY) ? "positive" : account.currentResultUsd < 0 ? "negative" : undefined}
            />
          ) : null}
          <DetailField label="Drawdown règle" value={ruleDrawdown === null ? null : formatCurrency(ruleDrawdown)} />
        </div>
        <div className="account-info-row payout-row">
          <div className={payoutEligible ? "detail-field payout-field eligible" : "detail-field payout-field"}>
            <span>Payout possible</span>
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
      </section>

      <section className="panel account-performance-panel">
        <div className="panel-header">
          <h2>Performance</h2>
          <span className="muted">{account.tradedDaysCount} jour(s)</span>
        </div>
        <div className="account-performance-layout">
          <PerformanceChart accountSize={account.accountSize} days={account.dailyResults} />
          <AccountPerformanceCalendar days={account.dailyResults} trades={account.tradeEntries} />
        </div>
      </section>

      <Modal isOpen={modal === "trade"} title="Add trading day" onClose={() => setModal(null)}>
        <TradingDayForm accounts={[account]} hideAccountSelect onCancel={() => setModal(null)} onSuccess={() => setModal(null)} />
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

      <Modal isOpen={modal === "reset"} title="Reset evaluation" onClose={() => setModal(null)}>
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
              <label className="check-field" key={status}>
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
            <button className="button" disabled={isSubmitting} type="submit">
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
