"use client";

import { formatCurrency } from "@/lib/format";
import type { TradingDaySummary } from "@/types";

type AccountPerformanceCalendarProps = {
  days: TradingDaySummary[];
};

function getMonthDays(reference = new Date()) {
  const year = reference.getFullYear();
  const month = reference.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const leading = (first.getDay() + 6) % 7;
  const cells: Array<{ day: number | null; iso: string | null }> = [];

  for (let index = 0; index < leading; index += 1) {
    cells.push({ day: null, iso: null });
  }

  for (let day = 1; day <= last.getDate(); day += 1) {
    const iso = new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);
    cells.push({ day, iso });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ day: null, iso: null });
  }

  return cells;
}

export function AccountPerformanceCalendar({ days }: AccountPerformanceCalendarProps) {
  const byDate = new Map(days.map((day) => [day.tradeDate, day.profitLossUsd]));
  const formatter = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" });

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Calendrier mensuel</h2>
        <span className="muted">{formatter.format(new Date())}</span>
      </div>
      <div className="calendar-grid" aria-label="Calendrier des performances">
        {["L", "M", "M", "J", "V", "S", "D"].map((label, index) => (
          <div className="calendar-weekday" key={`${label}-${index}`}>
            {label}
          </div>
        ))}
        {getMonthDays().map((cell, index) => {
          const value = cell.iso ? byDate.get(cell.iso) : undefined;
          const tone = value === undefined || value === 0 ? "neutral" : value > 0 ? "positive" : "negative";

          return (
            <div className={`calendar-cell ${tone}`} key={`${cell.iso ?? "empty"}-${index}`}>
              {cell.day ? <strong>{cell.day}</strong> : null}
              {value !== undefined ? <span>{formatCurrency(value)}</span> : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
