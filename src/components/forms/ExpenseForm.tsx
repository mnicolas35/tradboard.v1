"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createExpense } from "@/server/actions/tradboard-actions";
import type { AccountSummary } from "@/types";
import { currencyOptions, Field, SelectField, TextArea } from "./FormControls";

type ExpenseFormProps = {
  accounts: AccountSummary[];
  onCancel?: () => void;
  onSuccess?: () => void;
};

const expenseTypes = [
  { id: "PURCHASE", label: "PURCHASE" },
  { id: "RESET", label: "RESET" },
  { id: "SUBSCRIPTION", label: "SUBSCRIPTION" },
  { id: "ACTIVATION", label: "ACTIVATION" },
  { id: "OTHER", label: "OTHER" }
];

export function ExpenseForm({ accounts, onCancel, onSuccess }: ExpenseFormProps) {
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
          await createExpense(new FormData(event.currentTarget));
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
        <h2>Ajouter une depense / reset</h2>
      </div>
      <div className="form-grid">
        <SelectField label="Compte" name="accountId" options={options} required />
        <SelectField label="Type" name="type" options={expenseTypes} required />
        <Field label="Montant" name="amount" required type="number" />
        <SelectField label="Devise" name="currency" options={currencyOptions} defaultValue="USD" required />
        <Field label="Date" name="expenseDate" required type="date" />
        <TextArea label="Notes" name="notes" />
      </div>
      {error ? <p className="form-error">{error}</p> : null}
      <div className="form-actions split">
        <button className="button secondary" disabled={isSubmitting} type="button" onClick={onCancel}>
          Annuler
        </button>
        <button className="button" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Enregistrement..." : "Enregistrer la depense"}
        </button>
      </div>
    </form>
  );
}
