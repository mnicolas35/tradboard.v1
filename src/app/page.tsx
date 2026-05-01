import { AccountTable } from "@/components/AccountTable";
import { MetricCard } from "@/components/MetricCard";
import { RecentTradingDays } from "@/components/RecentTradingDays";
import { formatCurrency } from "@/lib/format";
import { getDashboardData } from "@/server/dashboard";
import type { DashboardMetric } from "@/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const dashboard = await getDashboardData();

  const metrics: DashboardMetric[] = [
    {
      label: "Comptes actifs",
      value: String(dashboard.activeAccountsCount)
    },
    {
      label: "Gain total",
      value: formatCurrency(dashboard.totalProfitLoss),
      tone: dashboard.totalProfitLoss >= 0 ? "positive" : "negative"
    },
    {
      label: "Gain du mois",
      value: formatCurrency(dashboard.monthlyProfitLoss),
      tone: dashboard.monthlyProfitLoss >= 0 ? "positive" : "negative"
    },
    {
      label: "Depenses totales",
      value: formatCurrency(dashboard.totalExpenses),
      tone: "negative"
    },
    {
      label: "Payouts payes",
      value: formatCurrency(dashboard.totalPayouts),
      tone: "positive"
    },
    {
      label: "Resultat net",
      value: formatCurrency(dashboard.netResult),
      tone: dashboard.netResult >= 0 ? "positive" : "negative"
    }
  ];

  return (
    <main className="page-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">TradBoard v1</p>
          <h1>Dashboard trading</h1>
        </div>
        <div className="scope-pill">Vue utilisateur demo</div>
      </header>

      <section className="metrics-grid" aria-label="Indicateurs">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </section>

      <section className="content-grid">
        <AccountTable accounts={dashboard.accounts} />
        <RecentTradingDays tradingDays={dashboard.recentTradingDays} />
      </section>
    </main>
  );
}
