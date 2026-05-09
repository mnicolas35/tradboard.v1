"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { formatCurrency } from "@/lib/format";
import { deleteTradingDay, updateTradingDay } from "@/server/actions/tradboard-actions";
import type { TradeEntrySummary, TradingDaySummary } from "@/types";

type AccountPerformanceCalendarProps = {
  days: TradingDaySummary[];
  trades: TradeEntrySummary[];
};

function getMonthDays(reference: Date) {
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

export function AccountPerformanceCalendar({ days, trades }: AccountPerformanceCalendarProps) {
  const router = useRouter();
  const [visibleMonth, setVisibleMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editingTrade, setEditingTrade] = useState<TradeEntrySummary | null>(null);
  const [deletingTrade, setDeletingTrade] = useState<TradeEntrySummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const byDate = useMemo(() => {
    const totals = new Map<string, number>();

    for (const day of days) {
      totals.set(day.tradeDate, (totals.get(day.tradeDate) ?? 0) + day.profitLossUsd);
    }

    return totals;
  }, [days]);
  const tradesByDate = useMemo(() => {
    const grouped = new Map<string, TradeEntrySummary[]>();

    for (const trade of trades) {
      grouped.set(trade.tradeDate, [...(grouped.get(trade.tradeDate) ?? []), trade]);
    }

    return grouped;
  }, [trades]);
  const selectedTrades = selectedDate ? tradesByDate.get(selectedDate) ?? [] : [];
  const selectedTotal = selectedDate ? byDate.get(selectedDate) ?? 0 : 0;
  const formatter = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" });
  const selectedDateLabel = selectedDate
    ? new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${selectedDate}T00:00:00.000Z`))
    : null;
  const monthCells = useMemo(() => getMonthDays(visibleMonth), [visibleMonth]);

  function moveMonth(offset: number) {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  async function submitTradeAction(action: (formData: FormData) => Promise<void>, formData: FormData) {
    setError(null);
    setIsSubmitting(true);

    try {
      await action(formData);
      router.refresh();
      setEditingTrade(null);
      setDeletingTrade(null);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Action impossible.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="account-calendar-card">
      <div className="account-calendar-header">
        <h3>Calendrier</h3>
        <div className="calendar-month-nav">
          <button aria-label="Mois précédent" className="icon-button" type="button" onClick={() => moveMonth(-1)}>
            ‹
          </button>
          <span className="muted">{formatter.format(visibleMonth)}</span>
          <button aria-label="Mois suivant" className="icon-button" type="button" onClick={() => moveMonth(1)}>
            ›
          </button>
        </div>
      </div>
      <div className="calendar-grid" aria-label="Calendrier des performances">
        {["L", "M", "M", "J", "V", "S", "D"].map((label, index) => (
          <div className="calendar-weekday" key={`${label}-${index}`}>
            {label}
          </div>
        ))}
        {monthCells.map((cell, index) => {
          const value = cell.iso ? byDate.get(cell.iso) : undefined;
          const tone = value === undefined || value === 0 ? "neutral" : value > 0 ? "positive" : "negative";
          const isSelected = cell.iso !== null && cell.iso === selectedDate;

          return cell.iso ? (
            <button
              aria-pressed={isSelected}
              className={`calendar-cell calendar-cell-button ${tone}${isSelected ? " selected" : ""}`}
              key={cell.iso}
              type="button"
              onClick={() => setSelectedDate(cell.iso)}
            >
              <strong>{cell.day}</strong>
              {value !== undefined ? <span>{formatCurrency(value)}</span> : null}
            </button>
          ) : (
            <div className="calendar-cell neutral" key={`empty-${index}`} />
          );
        })}
      </div>
      {selectedDate ? (
        <div className="trade-day-detail">
          <div className="trade-day-detail-header">
            <div>
              <h3>Trades du {selectedDateLabel}</h3>
              <span className="muted">{selectedTrades.length} trade(s)</span>
            </div>
            <strong className={selectedTotal >= 0 ? "tone-positive" : "tone-negative"}>{formatCurrency(selectedTotal)}</strong>
          </div>
          {selectedTrades.length === 0 ? (
            <p className="sidebar-empty">Aucun trade sur cette date.</p>
          ) : (
            <div className="trade-entry-list">
              {selectedTrades.map((trade) => (
                <article className="trade-entry-row" key={trade.id}>
                  <div>
                    <span className="muted">{trade.createdAtTime ?? "--:--"}</span>
                    <strong className={trade.profitLossUsd >= 0 ? "tone-positive" : "tone-negative"}>
                      {formatCurrency(trade.profitLossUsd)}
                    </strong>
                    {trade.notes ? <p>{trade.notes}</p> : null}
                  </div>
                  <div className="row-icon-actions">
                    <button
                      aria-label="Modifier le trade"
                      className="row-icon-button edit"
                      title="Modifier le trade"
                      type="button"
                      onClick={() => setEditingTrade(trade)}
                    >
                      ⚙️
                    </button>
                    <button
                      aria-label="Supprimer le trade"
                      className="row-icon-button delete"
                      title="Supprimer le trade"
                      type="button"
                      onClick={() => setDeletingTrade(trade)}
                    >
                      🗑️
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      ) : null}

      <Modal isOpen={Boolean(editingTrade)} title="Modifier le trade" onClose={() => setEditingTrade(null)}>
        {editingTrade ? (
          <form
            className="form-panel"
            onSubmit={(event) => {
              event.preventDefault();
              void submitTradeAction(updateTradingDay, new FormData(event.currentTarget));
            }}
          >
            <div className="form-grid">
              <input name="tradingDayId" type="hidden" value={editingTrade.id} />
              <label className="form-field">
                <span>Date</span>
                <input defaultValue={editingTrade.tradeDate} name="tradeDate" required type="date" />
              </label>
              <label className="form-field">
                <span>Gain / perte USD</span>
                <input defaultValue={editingTrade.profitLossUsd} name="profitLoss" required type="number" />
              </label>
              <label className="form-field">
                <span>Drawdown disponible (DD suiveur)</span>
                <input defaultValue={editingTrade.drawdownAtClose ?? ""} name="drawdownAtClose" type="number" step="any" />
              </label>
              <label className="form-field">
                <span>Nombre de trades</span>
                <input defaultValue={editingTrade.tradeCount ?? ""} name="tradeCount" type="number" />
              </label>
              <label className="form-field wide">
                <span>Notes</span>
                <textarea defaultValue={editingTrade.notes ?? ""} name="notes" rows={4} />
              </label>
            </div>
            {error ? <p className="form-error">{error}</p> : null}
            <div className="form-actions split">
              <button className="button secondary" type="button" onClick={() => setEditingTrade(null)}>
                Annuler
              </button>
              <button className="button" disabled={isSubmitting} type="submit">
                {isSubmitting ? "Sauvegarde..." : "Sauvegarder"}
              </button>
            </div>
          </form>
        ) : null}
      </Modal>

      <Modal isOpen={Boolean(deletingTrade)} title="Supprimer le trade" onClose={() => setDeletingTrade(null)}>
        {deletingTrade ? (
          <form
            className="form-panel"
            onSubmit={(event) => {
              event.preventDefault();
              void submitTradeAction(deleteTradingDay, new FormData(event.currentTarget));
            }}
          >
            <div className="form-grid">
              <input name="tradingDayId" type="hidden" value={deletingTrade.id} />
              <p className="form-note wide">
                Suppression definitive du trade de {formatCurrency(deletingTrade.profitLossUsd)}. Tapez SUPPRIMER pour confirmer.
              </p>
              <label className="form-field wide">
                <span>Confirmation</span>
                <input name="confirmation" required />
              </label>
            </div>
            {error ? <p className="form-error">{error}</p> : null}
            <div className="form-actions split">
              <button className="button secondary" type="button" onClick={() => setDeletingTrade(null)}>
                Annuler
              </button>
              <button className="button danger" disabled={isSubmitting} type="submit">
                {isSubmitting ? "Suppression..." : "Supprimer"}
              </button>
            </div>
          </form>
        ) : null}
      </Modal>
    </div>
  );
}
