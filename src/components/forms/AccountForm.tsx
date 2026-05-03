"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createAccount } from "@/server/actions/tradboard-actions";
import type { AppData } from "@/types";
import {
  accountTypeOptions,
  currencyOptions,
  Field,
  platformOptions,
  SelectField,
  TextArea
} from "./FormControls";

type AccountFormProps = Pick<AppData, "propFirms" | "propFirmRules" | "accounts"> & {
  onCancel?: () => void;
  onSuccess?: () => void;
};

const statusOptions = [
  { id: "ACTIVE", label: "ACTIVE" },
  { id: "PASSED", label: "PASSED" },
  { id: "FAILED", label: "FAILED" },
  { id: "CLOSED", label: "CLOSED" },
  { id: "ARCHIVED", label: "ARCHIVED" }
];

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Enregistrement impossible.";
}

export function AccountForm({ propFirms, propFirmRules, accounts = [], onCancel, onSuccess }: AccountFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <form
      className="form-panel"
      onSubmit={async (event) => {
        event.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
          await createAccount(new FormData(event.currentTarget));
          router.refresh();
          onSuccess?.();
        } catch (submitError) {
          setError(getErrorMessage(submitError));
        } finally {
          setIsSubmitting(false);
        }
      }}
    >
      <div className="panel-header">
        <h2>Ajouter un compte</h2>
      </div>
      <div className="form-grid">
        <SelectField label="Prop firm" name="propFirmId" options={propFirms} required />
        <SelectField label="Regle liee" name="propFirmRuleId" options={propFirmRules} />
        <SelectField
          label="Compte parent"
          name="parentAccountId"
          options={accounts.map((account) => ({ id: account.id, label: account.name }))}
        />
        <SelectField label="Type de compte" name="accountType" options={accountTypeOptions} required />
        <Field label="Taille" name="accountSize" placeholder="50000" required type="number" />
        <Field label="Nom personnalise" name="name" required />
        <Field label="Numero de compte" name="accountNumber" />
        <SelectField label="Plateforme" name="platform" options={platformOptions} />
        <SelectField label="Devise" name="currency" options={currencyOptions} defaultValue="USD" required />
        <Field label="Date achat" name="purchaseDate" type="date" />
        <Field label="Prix paye" name="purchasePrice" type="number" />
        <Field label="Promo utilisee" name="promoUsed" />
        <Field label="Date activation" name="activationDate" type="date" />
        <SelectField label="Statut" name="status" options={statusOptions} defaultValue="ACTIVE" required />
        <TextArea label="Notes" name="notes" />
      </div>
      {error ? <p className="form-error">{error}</p> : null}
      <div className="form-actions split">
        <button className="button secondary" disabled={isSubmitting} type="button" onClick={onCancel}>
          Annuler
        </button>
        <button className="button" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Enregistrement..." : "Creer le compte"}
        </button>
      </div>
    </form>
  );
}
