"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AccountPerformanceCalendar } from "@/components/accounts/AccountPerformanceCalendar";
import { ExpenseForm } from "@/components/forms/ExpenseForm";
import { PayoutForm } from "@/components/forms/PayoutForm";
import { TradingDayForm } from "@/components/forms/TradingDayForm";
import { Modal } from "@/components/ui/Modal";
import { formatCurrency } from "@/lib/format";
import {
  archiveAccount,
  deleteAccount,
  saveAccountRuleOverride,
  validateEvaluation
} from "@/server/actions/tradboard-actions";
import type { AccountSummary } from "@/types";

type AccountDetailProps = {
  account: AccountSummary;
};

function pct(value: number) {
  return `${Math.max(0, Math.min(100, value)).toFixed(0)}%`;
}

function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="detail-field">
      <span>{label}</span>
      <strong>{value ?? "-"}</strong>
    </div>
  );
}

export function AccountDetail({ account }: AccountDetailProps) {
  const router = useRouter();
  const [modal, setModal] = useState<"delete" | "validate" | "rules" | "trade" | "expense" | "payout" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const target = account.rule?.target ?? 0;
  const progress = target > 0 ? (account.currentResultUsd / target) * 100 : 0;
  const canValidateEvaluation =
    account.accountType === "EVALUATION" && account.status === "ACTIVE" && target > 0 && account.currentResultUsd >= target;

  async function submitAction(action: (formData: FormData) => Promise<void>, formData: FormData, close = true) {
    setError(null);
    setIsSubmitting(true);

    try {
      await action(formData);
      router.refresh();
      if (close) {
        setModal(null);
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Action impossible.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="stack">
      <section className="panel detail-hero">
        <div>
          <p className="eyebrow">{account.propFirmName}</p>
          <h1>{account.name}</h1>
          <p className="muted">{account.notes ?? "Compte de trading suivi dans TradBoard."}</p>
        </div>
        <div className="detail-actions">
          <div className="detail-result">
            <span>Resultat actuel</span>
            <strong className={account.currentResultUsd >= 0 ? "tone-positive" : "tone-negative"}>
              {formatCurrency(account.currentResultUsd)}
            </strong>
            <small>
              {account.currentResultEur === null
                ? "EUR indisponible"
                : `${formatCurrency(account.currentResultEur, "EUR")} estime`}
            </small>
          </div>
          <div className="button-row">
            {canValidateEvaluation ? (
              <button className="button" type="button" onClick={() => setModal("validate")}>
                Valider l&apos;evaluation
              </button>
            ) : null}
            <button className="button secondary" type="button" onClick={() => setModal("rules")}>
              Edit regles
            </button>
            <button className="button secondary" type="button" onClick={() => setModal("trade")}>
              Add trade
            </button>
            <button className="button secondary" type="button" onClick={() => setModal("expense")}>
              Add depense
            </button>
            <button className="button secondary" type="button" onClick={() => setModal("payout")}>
              Add payout
            </button>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void submitAction(archiveAccount, new FormData(event.currentTarget), false);
              }}
            >
              <input name="accountId" type="hidden" value={account.id} />
              <button className="button secondary" disabled={isSubmitting} type="submit">
                Archiver
              </button>
            </form>
            <button className="button danger" type="button" onClick={() => setModal("delete")}>
              Supprimer
            </button>
          </div>
        </div>
      </section>

      <section className="detail-grid">
        <Field label="Numero" value={account.accountNumber} />
        <Field label="Regle" value={account.propFirmRuleName} />
        <Field label="Plateforme" value={account.platform} />
        <Field label="Devise" value={account.currency} />
        <Field label="Type" value={account.accountType} />
        <Field label="Taille" value={formatCurrency(account.accountSize)} />
        <Field label="Statut" value={account.status} />
        <Field label="Date achat" value={account.purchaseDate} />
        <Field label="Prix paye" value={account.purchasePrice ? formatCurrency(account.purchasePrice) : null} />
        <Field label="Promo" value={account.promoUsed} />
        <Field label="Activation" value={account.activationDate} />
        <Field label="Target" value={target ? formatCurrency(target) : null} />
        <Field label="Max drawdown" value={account.rule ? formatCurrency(account.rule.maxDrawdown) : null} />
        <Field label="Daily drawdown" value={account.rule?.dailyDrawdown ? formatCurrency(account.rule.dailyDrawdown) : null} />
        <Field label="Buffer" value={account.rule?.buffer ? formatCurrency(account.rule.buffer) : null} />
        <Field label="Buffer payout" value={account.rule?.payoutBuffer ? formatCurrency(account.rule.payoutBuffer) : null} />
        <Field label="Consistance" value={account.rule?.consistencyPercent ? `${account.rule.consistencyPercent}%` : null} />
        <Field label="Part trader" value={account.rule?.traderSharePercent ? `${account.rule.traderSharePercent}%` : null} />
        <Field label="Jours trades" value={account.tradedDaysCount} />
        <Field label="Jours min eval" value={account.rule?.minTradingDays} />
        <Field label="Jours min payout" value={account.rule?.minPayoutTradingDays} />
        <Field label="Regle effective" value={account.rule?.source} />
      </section>

      <section className="panel progress-panel">
        <div className="panel-header">
          <h2>Progression et bilan</h2>
          <span>{pct(progress)}</span>
        </div>
        <div className="progress-track">
          <div style={{ width: pct(progress) }} />
        </div>
        <div className="kpi-row">
          <Field label="Payout brut disponible" value={formatCurrency(account.payoutEligibility.availableAmount)} />
          <Field label="Payout net estime" value={formatCurrency(account.payoutEligibility.netAmount)} />
          <Field label="Payouts bruts deja pris" value={formatCurrency(account.payoutsGrossUsd)} />
          <Field label="Payouts nets deja pris" value={formatCurrency(account.payoutsNetUsd)} />
          <Field label="Depenses liees" value={formatCurrency(account.expensesUsd)} />
          <Field label="Bilan net" value={formatCurrency(account.netResultUsd)} />
          <Field label="Bilan net EUR" value={account.netResultEur === null ? null : formatCurrency(account.netResultEur, "EUR")} />
          <Field label="ROI" value={account.roiPercent === null ? null : `${account.roiPercent.toFixed(1)}%`} />
        </div>
        {account.payoutEligibility.reasons.length > 0 ? (
          <div className="reason-list">
            {account.payoutEligibility.reasons.map((reason) => (
              <span key={reason}>{reason}</span>
            ))}
          </div>
        ) : null}
      </section>

      <AccountPerformanceCalendar days={account.dailyResults} />

      <section className="panel">
        <div className="panel-header">
          <h2>Resultats journaliers</h2>
          <span className="muted">{account.dailyResults.length} jours</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Resultat</th>
                <th>Trades</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {account.dailyResults.map((day) => (
                <tr key={day.id}>
                  <td>{day.tradeDate}</td>
                  <td className={day.profitLossUsd >= 0 ? "tone-positive" : "tone-negative"}>
                    {formatCurrency(day.profitLossUsd)}
                  </td>
                  <td>{day.tradeCount ?? "-"}</td>
                  <td>{day.notes ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="content-grid">
        <section className="panel">
          <div className="panel-header">
            <h2>Depenses</h2>
            <span className="muted">{account.expenses.length} lignes</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Montant</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {account.expenses.map((expense) => (
                  <tr key={expense.id}>
                    <td>{expense.date}</td>
                    <td>{expense.type ?? "-"}</td>
                    <td>{formatCurrency(expense.amount, expense.currency)}</td>
                    <td>{expense.notes ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="panel">
          <div className="panel-header">
            <h2>Payouts</h2>
            <span className="muted">{account.payouts.length} lignes</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Statut</th>
                  <th>Brut</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {account.payouts.map((payout) => (
                  <tr key={payout.id}>
                    <td>{payout.date}</td>
                    <td>{payout.status ?? "-"}</td>
                    <td>{formatCurrency(payout.amount, payout.currency)}</td>
                    <td>{payout.notes ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </section>

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
              <span>Retaper le nom du compte</span>
              <input name="confirmationName" required placeholder={account.name} />
            </label>
          </div>
          {error ? <p className="form-error">{error}</p> : null}
          <div className="form-actions split">
            <button className="button secondary" type="button" onClick={() => setModal(null)}>
              Annuler
            </button>
            <button className="button danger" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Suppression..." : "Supprimer definitivement"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={modal === "validate"} title="Valider l'evaluation" onClose={() => setModal(null)}>
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
              <span>Nom nouveau compte</span>
              <input name="name" required />
            </label>
            <label className="form-field">
              <span>Numero</span>
              <input name="accountNumber" />
            </label>
            <input name="accountType" type="hidden" value="FUNDED" />
            <Field label="Type nouveau compte" value="FUNDED" />
            <label className="form-field">
              <span>Date activation</span>
              <input name="activationDate" type="date" />
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
              {isSubmitting ? "Validation..." : "Valider"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={modal === "rules"} title="Edit regles compte" onClose={() => setModal(null)}>
        <form
          className="form-panel"
          onSubmit={(event) => {
            event.preventDefault();
            void submitAction(saveAccountRuleOverride, new FormData(event.currentTarget));
          }}
        >
          <div className="form-grid">
            <input name="accountId" type="hidden" value={account.id} />
            <label className="form-field"><span>Target</span><input name="target" type="number" defaultValue={account.rule?.target ?? ""} /></label>
            <label className="form-field"><span>Max drawdown</span><input name="maxDrawdown" type="number" defaultValue={account.rule?.maxDrawdown ?? ""} /></label>
            <label className="form-field"><span>Daily drawdown</span><input name="dailyDrawdown" type="number" defaultValue={account.rule?.dailyDrawdown ?? ""} /></label>
            <label className="form-field"><span>Buffer</span><input name="buffer" type="number" defaultValue={account.rule?.buffer ?? ""} /></label>
            <label className="form-field"><span>Buffer payout</span><input name="payoutBuffer" type="number" defaultValue={account.rule?.payoutBuffer ?? ""} /></label>
            <label className="form-field"><span>Jours min payout</span><input name="minPayoutTradingDays" type="number" defaultValue={account.rule?.minPayoutTradingDays ?? ""} /></label>
            <label className="form-field"><span>Profit min jour</span><input name="minDailyProfitForPayout" type="number" defaultValue={account.rule?.minDailyProfitForPayout ?? ""} /></label>
            <label className="form-field"><span>Consistance %</span><input name="consistencyPercent" type="number" defaultValue={account.rule?.consistencyPercent ?? ""} /></label>
            <label className="form-field"><span>Part trader %</span><input name="traderSharePercent" type="number" defaultValue={account.rule?.traderSharePercent ?? ""} /></label>
            <label className="form-field">
              <span>Type regle payout</span>
              <select name="payoutRuleType" defaultValue={account.rule?.payoutRuleType ?? "NONE"}>
                <option value="NONE">NONE</option>
                <option value="BUFFER_ONLY">BUFFER_ONLY</option>
                <option value="APEX">APEX</option>
                <option value="TAKE_PROFIT_TRADER">TAKE_PROFIT_TRADER</option>
                <option value="CUSTOM">CUSTOM</option>
              </select>
            </label>
          </div>
          {error ? <p className="form-error">{error}</p> : null}
          <div className="form-actions split">
            <button className="button secondary" type="button" onClick={() => setModal(null)}>
              Annuler
            </button>
            <button className="button" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Sauvegarde..." : "Sauvegarder"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={modal === "trade"} title="Add trading day" onClose={() => setModal(null)}>
        <TradingDayForm accounts={[account]} onCancel={() => setModal(null)} onSuccess={() => setModal(null)} />
      </Modal>

      <Modal isOpen={modal === "expense"} title="Add expense/reset" onClose={() => setModal(null)}>
        <ExpenseForm accounts={[account]} onCancel={() => setModal(null)} onSuccess={() => setModal(null)} />
      </Modal>

      <Modal isOpen={modal === "payout"} title="Add payout" onClose={() => setModal(null)}>
        <PayoutForm accounts={[account]} onCancel={() => setModal(null)} onSuccess={() => setModal(null)} />
      </Modal>
    </div>
  );
}
