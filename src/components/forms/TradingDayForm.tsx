"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createTradingDay } from "@/server/actions/tradboard-actions";
import type { AccountSummary } from "@/types";
import { Field, SelectField, TextArea } from "./FormControls";

type TradingDayFormProps = {
  accounts: AccountSummary[];
  hideAccountSelect?: boolean;
  onCancel?: () => void;
  onSuccess?: () => void;
};

function todayInputValue() {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${today.getFullYear()}-${month}-${day}`;
}

export function TradingDayForm({ accounts, hideAccountSelect = false, onCancel, onSuccess }: TradingDayFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const options = accounts.map((account) => ({
    id: account.id,
    label: account.accountNumber ? `#${account.accountNumber}` : "Sans numero"
  }));

  return (
    <form
      className="form-panel"
      onSubmit={async (event) => {
        event.preventDefault();
        setError(null);
        setIsSubmitting(true);
        try {
          await createTradingDay(new FormData(event.currentTarget));
          router.refresh();
          onSuccess?.();
        } catch (submitError) {
          setError(submitError instanceof Error ? submitError.message : "Enregistrement impossible.");
        } finally {
          setIsSubmitting(false);
        }
      }}
    >
      <div className="panel-header">
        <h2>Ajouter un resultat journalier</h2>
      </div>
      <div className="form-grid">
        {hideAccountSelect && accounts[0] ? (
          <input name="accountId" type="hidden" value={accounts[0].id} />
        ) : (
          <SelectField label="Compte actif" name="accountId" options={options} required />
        )}
        <Field label="Date" name="tradeDate" required type="date" defaultValue={todayInputValue()} />
        <Field label="Gain / perte USD" name="profitLoss" required type="number" />
        <Field label="Nombre de trades" name="tradeCount" type="number" />
        <TextArea label="Notes" name="notes" />
      </div>
      {error ? <p className="form-error">{error}</p> : null}
      <div className="form-actions split">
        <button className="button secondary" disabled={isSubmitting} type="button" onClick={onCancel}>
          Annuler
        </button>
        <button className="button" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Enregistrement..." : "Enregistrer le resultat"}
        </button>
      </div>
    </form>
  );
}
