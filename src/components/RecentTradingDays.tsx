import type { Account, TradingDay } from "@prisma/client";
import { formatCurrency, formatDate } from "@/lib/format";

type TradingDayWithAccount = TradingDay & {
  account: Account;
};

type RecentTradingDaysProps = {
  tradingDays: TradingDayWithAccount[];
};

export function RecentTradingDays({ tradingDays }: RecentTradingDaysProps) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Derniers resultats</h2>
        <span className="muted">{tradingDays.length} lignes</span>
      </div>

      {tradingDays.length === 0 ? (
        <p className="empty-state">Aucun resultat journalier pour le moment.</p>
      ) : (
        <div className="activity-list">
          {tradingDays.map((day) => {
            const profitLoss = Number(day.profitLoss);

            return (
              <article className="activity-item" key={day.id}>
                <div className="activity-topline">
                  <span className="activity-account">{day.account.name}</span>
                  <span className={profitLoss < 0 ? "day-result negative" : "day-result"}>
                    {formatCurrency(profitLoss)}
                  </span>
                </div>
                <div className="activity-meta">
                  {formatDate(day.tradeDate)}
                  {day.tradeCount ? ` - ${day.tradeCount} trades` : ""}
                </div>
                {day.notes ? <div className="muted">{day.notes}</div> : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
