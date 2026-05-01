import type { DashboardMetric } from "@/types";

type MetricCardProps = {
  metric: DashboardMetric;
};

export function MetricCard({ metric }: MetricCardProps) {
  const toneClass = metric.tone ? ` tone-${metric.tone}` : "";

  return (
    <article className="metric-card">
      <p className="metric-label">{metric.label}</p>
      <p className={`metric-value${toneClass}`}>{metric.value}</p>
    </article>
  );
}
