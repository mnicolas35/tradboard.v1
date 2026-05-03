"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createPropFirmRule, updatePropFirmRule } from "@/server/actions/tradboard-actions";
import type { AppData, SelectOption } from "@/types";
import {
  ActiveCheckbox,
  Field,
  SelectField
} from "./FormControls";

type PropFirmRuleFormProps = {
  propFirms: SelectOption[];
  initialRule?: AppData["propFirmRules"][number] | null;
  defaultPropFirmId?: string | null;
  propFirmLabel?: string | null;
  compact?: boolean;
  allowStandardToggle?: boolean;
  onCancel?: () => void;
  onSuccess?: () => void;
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Enregistrement impossible.";
}

export function PropFirmRuleForm({
  propFirms,
  initialRule,
  defaultPropFirmId,
  propFirmLabel,
  compact = false,
  allowStandardToggle = false,
  onCancel,
  onSuccess
}: PropFirmRuleFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = Boolean(initialRule);
  const selectedPropFirmLabel = propFirmLabel ?? propFirms.find((propFirm) => propFirm.id === defaultPropFirmId)?.label ?? null;

  return (
    <form
      className="form-panel"
      onSubmit={async (event) => {
        event.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
          const formData = new FormData(event.currentTarget);
          if (initialRule) {
            formData.set("id", initialRule.id);
            await updatePropFirmRule(formData);
          } else {
            await createPropFirmRule(formData);
          }
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
        <h2>{isEditing ? "Modifier la regle" : compact ? "Ajouter une regle" : "Ajouter une regle prop firm"}</h2>
        {selectedPropFirmLabel ? <p className="form-note">{selectedPropFirmLabel}</p> : null}
      </div>
      <div className="form-grid">
        {defaultPropFirmId ? (
          <input name="propFirmId" type="hidden" value={defaultPropFirmId} />
        ) : (
          <SelectField label="Prop firm" name="propFirmId" options={propFirms} required defaultValue={initialRule?.propFirmId} />
        )}
        <input name="accountType" type="hidden" value={initialRule?.accountType ?? "EVALUATION"} />
        <Field label="Nom règle" name="name" required defaultValue={initialRule?.name} />
        <Field label="Taille du compte" name="accountSize" placeholder="50000" required type="number" defaultValue={initialRule?.accountSize} />
        <Field label="Drawdown" name="maxDrawdown" required type="number" defaultValue={initialRule?.maxDrawdown} />
        <Field label="Coût du compte" name="defaultPurchasePrice" type="number" defaultValue={initialRule?.defaultPurchasePrice ?? undefined} />
        <Field label="Coût reset évaluation" name="defaultResetPrice" type="number" defaultValue={initialRule?.defaultResetPrice ?? undefined} />
        <Field label="Coût reset funded (PA)" name="defaultFundedResetPrice" type="number" defaultValue={initialRule?.defaultFundedResetPrice ?? undefined} />
      </div>
      <div className="rule-section">
        <div className="rule-section-title">Évaluation</div>
        <div className="form-grid">
          <Field label="Target" name="target" required type="number" defaultValue={initialRule?.target} />
          <Field label="Consistance" name="consistencyPercent" type="number" defaultValue={initialRule?.consistencyPercent ?? undefined} />
          <Field label="Nombre de jours de trade minimum" name="minTradingDays" type="number" defaultValue={initialRule?.minTradingDays ?? undefined} />
        </div>
      </div>
      <div className="rule-section">
        <div className="rule-section-title">Funded</div>
        <div className="form-grid">
          <Field label="Buffer" name="buffer" type="number" defaultValue={initialRule?.buffer ?? undefined} />
          <Field label="Consistance" name="fundedConsistencyPercent" type="number" defaultValue={initialRule?.fundedConsistencyPercent ?? undefined} />
          <Field label="Jours de trade minimum" name="minTradingDaysForPayout" type="number" defaultValue={initialRule?.minTradingDaysForPayout ?? undefined} />
          <Field label="Montant minimum par jour" name="minDailyProfitForPayout" type="number" defaultValue={initialRule?.minDailyProfitForPayout ?? undefined} />
        </div>
      </div>
      <div className="form-grid">
        {allowStandardToggle ? (
          <label className="check-field">
            <input defaultChecked={initialRule?.isStandard ?? false} name="isStandard" type="checkbox" />
            <span>Règle standard visible par tous</span>
          </label>
        ) : null}
        <ActiveCheckbox defaultChecked={initialRule?.isActive ?? true} />
      </div>
      {error ? <p className="form-error">{error}</p> : null}
      <div className="form-actions split">
        <button className="button secondary" disabled={isSubmitting} type="button" onClick={onCancel}>
          Annuler
        </button>
        <button className="button" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Enregistrement..." : isEditing ? "Sauvegarder" : "Creer la regle"}
        </button>
      </div>
    </form>
  );
}
