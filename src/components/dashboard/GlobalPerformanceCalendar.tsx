"use client";

import { formatCurrency } from "@/lib/format";
import type { TradingDaySummary } from "@/types";

type GlobalPerformanceCalendarProps = {
  days: TradingDaySummary[];
};

function compactSize(value: number) {
  return value >= 1000 ? `${Math.round(value / 1000)}k` : String(value);
}

function monthCells(reference = new Date()) {
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
    cells.push({
      day,
      iso: new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10)
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ day: null, iso: null });
  }

  return cells;
}

export function GlobalPerformanceCalendar({ days }: GlobalPerformanceCalendarProps) {
  const byDate = new Map<string, TradingDaySummary[]>();
  const byDateAndAccount = new Map<string, TradingDaySummary>();

  for (const day of days) {
    const key = `${day.tradeDate}:${day.accountId}`;
    const current = byDateAndAccount.get(key);

    if (current) {
      byDateAndAccount.set(key, {
        ...current,
        profitLossUsd: current.profitLossUsd + day.profitLossUsd,
        tradeCount:
          current.tradeCount === null && day.tradeCount === null
            ? null
            : (current.tradeCount ?? 0) + (day.tradeCount ?? 0)
      });
    } else {
      byDateAndAccount.set(key, day);
    }
  }

  for (const day of byDateAndAccount.values()) {
    byDate.set(day.tradeDate, [...(byDate.get(day.tradeDate) ?? []), day]);
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Calendrier global</h2>
        <span className="muted">Performances par compte</span>
      </div>
      <div className="global-calendar-grid">
        {["L", "M", "M", "J", "V", "S", "D"].map((label, index) => (
          <div className="calendar-weekday" key={`${label}-${index}`}>{label}</div>
        ))}
        {monthCells().map((cell, index) => {
          const entries = cell.iso ? byDate.get(cell.iso) ?? [] : [];
          const total = entries.reduce((sum, entry) => sum + entry.profitLossUsd, 0);
          const tone = entries.length === 0 || total === 0 ? "neutral" : total > 0 ? "positive" : "negative";

          return (
            <div className={`global-calendar-cell ${tone}`} key={`${cell.iso ?? "empty"}-${index}`}>
              {cell.day ? <strong>{cell.day}</strong> : null}
              <div className="global-calendar-events">
                {entries.map((entry) => (
                  <span key={entry.id}>
                    {entry.propFirmAcronym} {compactSize(entry.accountSize)} {entry.accountNumber ? `#${entry.accountNumber}` : "Sans numero"}{" "}
                    {formatCurrency(entry.profitLossUsd)}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
