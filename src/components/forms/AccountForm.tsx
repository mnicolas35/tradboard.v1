"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createAccount } from "@/server/actions/tradboard-actions";
import type { AppData } from "@/types";
import {
  Field,
  SelectField,
  TextArea
} from "./FormControls";

type AccountFormProps = Pick<AppData, "propFirms" | "propFirmRules"> & {
  onCancel?: () => void;
  onSuccess?: () => void;
};

const accountTypeOptions = [
  { id: "EVALUATION", label: "EVALUATION" },
  { id: "FUNDED", label: "FUNDED" }
];

const statusOptions = [
  { id: "ACTIVE", label: "ACTIVE" },
  { id: "PASSED", label: "PASSED" },
  { id: "FAILED", label: "FAILED" },
  { id: "CLOSED", label: "CLOSED" }
];

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Enregistrement impossible.";
}

function todayDateValue() {
  return new Date().toISOString().slice(0, 10);
}

export function AccountForm({ propFirms, propFirmRules, onCancel, onSuccess }: AccountFormProps) {
  const router = useRouter();
  const today = todayDateValue();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPropFirmId, setSelectedPropFirmId] = useState("");
  const [selectedRuleId, setSelectedRuleId] = useState("");
  const [selectedAccountType, setSelectedAccountType] = useState("EVALUATION");
  const [promoPercent, setPromoPercent] = useState("");

  const filteredRules = propFirmRules.filter((rule) => rule.propFirmId === selectedPropFirmId);
  const selectedRule = propFirmRules.find((rule) => rule.id === selectedRuleId) ?? null;
  const baseCost = selectedRule?.defaultPurchasePrice ?? 0;
  const promoValue = Number(promoPercent || 0);
  const promo = Number.isNaN(promoValue) ? 0 : Math.min(Math.max(promoValue, 0), 100);
  const realCost = baseCost > 0 ? baseCost * (1 - promo / 100) : null;

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
        <label className="form-field">
          <span>PropFirm</span>
          <select
            name="propFirmId"
            required
            value={selectedPropFirmId}
            onChange={(event) => {
              setSelectedPropFirmId(event.target.value);
              setSelectedRuleId("");
            }}
          >
            <option value="">Selectionner</option>
            {propFirms.map((propFirm) => (
              <option key={propFirm.id} value={propFirm.id}>
                {propFirm.label}
              </option>
            ))}
          </select>
        </label>
        <label className="form-field">
          <span>Règle liée à cette PropFirm</span>
          <select
            name="propFirmRuleId"
            required
            value={selectedRuleId}
            onChange={(event) => setSelectedRuleId(event.target.value)}
          >
            <option value="">Selectionner</option>
            {filteredRules.map((rule) => (
              <option key={rule.id} value={rule.id}>
                {rule.label}
              </option>
            ))}
          </select>
        </label>
        <label className="form-field">
          <span>Type de compte</span>
          <select
            name="accountType"
            required
            value={selectedAccountType}
            onChange={(event) => {
              setSelectedAccountType(event.target.value);
              setSelectedRuleId("");
            }}
          >
            {accountTypeOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <Field label="Numéro du compte" name="accountNumber" placeholder="APX-001" required />
        <Field label="Date de création" name="purchaseDate" type="date" required defaultValue={today} />
        <label className="form-field">
          <span>Promo en %</span>
          <input
            name="promoPercent"
            type="number"
            value={promoPercent}
            onChange={(event) => setPromoPercent(event.target.value)}
          />
        </label>
        {selectedAccountType === "FUNDED" ? (
          <Field label="Date activation" name="activationDate" type="date" required defaultValue={today} />
        ) : null}
        <SelectField label="Statut" name="status" options={statusOptions} defaultValue="ACTIVE" required />
        <TextArea label="Notes" name="notes" />
      </div>
      {selectedRule ? (
        <p className="form-note">
          Coût règle: {baseCost.toFixed(2)} USD
          {realCost !== null ? ` - Coût réel: ${realCost.toFixed(2)} USD` : ""}
        </p>
      ) : null}
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
