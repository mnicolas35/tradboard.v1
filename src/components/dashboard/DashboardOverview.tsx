"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MetricCard } from "@/components/MetricCard";
import { GlobalPerformanceCalendar } from "@/components/dashboard/GlobalPerformanceCalendar";
import { formatCurrency, formatDate } from "@/lib/format";
import { updateUsdEurRateFromInternet } from "@/server/actions/tradboard-actions";
import type { AccountSummary, AppData, DashboardMetric } from "@/types";

type DashboardOverviewProps = {
  data: AppData;
};

function statusBadges(account: AccountSummary) {
  const badges: string[] = [];

  if (account.status === "ACTIVE") {
    badges.push("🟢 actif");
  }

  if (account.status === "FAILED") {
    badges.push("🔴 failed");
  }

  if (account.accountType === "EVALUATION" && account.status === "ACTIVE") {
    badges.push("🟡 en cours");
  }

  if (account.payoutEligibility.isEligible) {
    badges.push("💰 payout possible");
  }

  if (account.rule?.maxDrawdown && account.currentResultUsd < -account.rule.maxDrawdown * 0.75) {
    badges.push("⚠️ danger");
  }

  return badges.length > 0 ? badges : [account.status];
}

export function DashboardOverview({ data }: DashboardOverviewProps) {
  const router = useRouter();
  const [rateError, setRateError] = useState<string | null>(null);
  const [isUpdatingRate, setIsUpdatingRate] = useState(false);
  const payoutAvailable = data.activeAccounts.reduce(
    (total, account) => total + account.payoutEligibility.availableAmount,
    0
  );
  const topAccounts = [...data.accounts].sort((a, b) => b.netResultUsd - a.netResultUsd).slice(0, 5);
  const payoutAccounts = data.activeAccounts.filter((account) => account.payoutEligibility.availableAmount > 0);
  const alertAccounts = data.activeAccounts.filter(
    (account) => account.payoutEligibility.reasons.length > 0 || account.status === "FAILED"
  );
  const metrics: DashboardMetric[] = [
    { label: "Comptes", value: String(data.metrics.activeAccountsCount) },
    {
      label: "Net USD",
      value: formatCurrency(data.metrics.netResultUsd),
      tone: data.metrics.netResultUsd >= 0 ? "positive" : "negative"
    },
    {
      label: "Net EUR",
      value: data.metrics.netResultEur === null ? "-" : formatCurrency(data.metrics.netResultEur, "EUR"),
      tone: (data.metrics.netResultEur ?? 0) >= 0 ? "positive" : "negative"
    },
    {
      label: "Mois USD",
      value: formatCurrency(data.metrics.monthlyProfitLossUsd),
      tone: data.metrics.monthlyProfitLossUsd >= 0 ? "positive" : "negative"
    },
    { label: "Dépenses", value: formatCurrency(data.metrics.totalExpensesUsd), tone: "negative" },
    { label: "Payouts", value: formatCurrency(data.metrics.totalPayoutsUsd), tone: "positive" },
    { label: "Payout dispo", value: formatCurrency(payoutAvailable), tone: "positive" }
  ];

  return (
    <div className="stack">
      <section className="metrics-grid compact-metrics" aria-label="Indicateurs">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </section>

      <div className="rate-line rate-actions">
        <span>
          {data.metrics.latestUsdEurRate
            ? `Taux USD/EUR ${data.metrics.latestUsdEurRate.rate} au ${formatDate(
                new Date(`${data.metrics.latestUsdEurRate.rateDate}T00:00:00.000Z`)
              )}`
            : "Aucun taux USD/EUR saisi."}
        </span>
        <button
          className="button secondary"
          disabled={isUpdatingRate}
          type="button"
          onClick={async () => {
            setRateError(null);
            setIsUpdatingRate(true);
            try {
              await updateUsdEurRateFromInternet();
              router.refresh();
            } catch (error) {
              setRateError(error instanceof Error ? error.message : "Mise a jour impossible.");
            } finally {
              setIsUpdatingRate(false);
            }
          }}
        >
          {isUpdatingRate ? "Mise à jour..." : "Mettre à jour taux"}
        </button>
      </div>
      {rateError ? <p className="form-error">{rateError}</p> : null}

      <section className="dashboard-main-grid">
        <div className="stack">
          <section className="panel">
            <div className="panel-header">
              <h2>Comptes</h2>
              <span className="muted">{data.accounts.length} comptes</span>
            </div>
            <div className="table-wrap">
              <table className="compact-table">
                <thead>
                  <tr>
                    <th>Compte</th>
                    <th>PF</th>
                    <th>Badges</th>
                    <th>Net</th>
                    <th>Payout</th>
                  </tr>
                </thead>
                <tbody>
                  {data.accounts.map((account) => (
                    <tr key={account.id}>
                      <td>
                        <strong>{account.name}</strong>
                        <div className="muted">
                          {account.accountType} - {Math.round(account.accountSize / 1000)}k{" "}
                          {account.accountNumber ? `#${account.accountNumber}` : ""}
                        </div>
                      </td>
                      <td>{account.propFirmAcronym}</td>
                      <td>
                        <div className="badge-list">
                          {statusBadges(account).map((badge) => (
                            <span className="status" key={badge}>
                              {badge}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className={account.netResultUsd >= 0 ? "tone-positive" : "tone-negative"}>
                        {formatCurrency(account.netResultUsd)}
                      </td>
                      <td>{formatCurrency(account.payoutEligibility.availableAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <h2>Derniers trades</h2>
              <span className="muted">{data.recentTradingDays.length} lignes</span>
            </div>
            <div className="activity-list">
              {data.recentTradingDays.map((day) => (
                <article className="activity-item compact-activity" key={day.id}>
                  <div className="activity-topline">
                    <span className="activity-account">
                      {day.propFirmAcronym} {Math.round(day.accountSize / 1000)}k{" "}
                      {day.accountNumber ? `#${day.accountNumber}` : day.accountName}
                    </span>
                    <span className={day.profitLossUsd < 0 ? "day-result negative" : "day-result"}>
                      {formatCurrency(day.profitLossUsd)}
                    </span>
                  </div>
                  <div className="activity-meta">{formatDate(new Date(`${day.tradeDate}T00:00:00.000Z`))}</div>
                </article>
              ))}
            </div>
          </section>
        </div>

        <aside className="dashboard-side">
          <section className="panel">
            <div className="panel-header">
              <h2>Alertes</h2>
              <span className="muted">{alertAccounts.length}</span>
            </div>
            <div className="side-list">
              {alertAccounts.slice(0, 6).map((account) => (
                <article key={account.id}>
                  <strong>{account.name}</strong>
                  <span>{account.payoutEligibility.reasons[0] ?? account.status}</span>
                </article>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <h2>Top comptes</h2>
            </div>
            <div className="side-list">
              {topAccounts.map((account) => (
                <article key={account.id}>
                  <strong>{account.name}</strong>
                  <span>{formatCurrency(account.netResultUsd)}</span>
                </article>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <h2>Résumé payout</h2>
            </div>
            <div className="side-list">
              {payoutAccounts.slice(0, 6).map((account) => (
                <article key={account.id}>
                  <strong>{account.name}</strong>
                  <span>
                    Brut {formatCurrency(account.payoutEligibility.availableAmount)} · Net{" "}
                    {formatCurrency(account.payoutEligibility.netAmount)}
                  </span>
                </article>
              ))}
            </div>
          </section>
        </aside>
      </section>

      <GlobalPerformanceCalendar days={data.calendarTradingDays} />
    </div>
  );
}
