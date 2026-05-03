"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createPropFirmRule, updatePropFirmRule } from "@/server/actions/tradboard-actions";
import type { AppData, SelectOption } from "@/types";
import {
  accountTypeOptions,
  ActiveCheckbox,
  Field,
  SelectField,
  TextArea
} from "./FormControls";

type PropFirmRuleFormProps = {
  propFirms: SelectOption[];
  initialRule?: AppData["propFirmRules"][number] | null;
  onCancel?: () => void;
  onSuccess?: () => void;
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Enregistrement impossible.";
}

export function PropFirmRuleForm({ propFirms, initialRule, onCancel, onSuccess }: PropFirmRuleFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = Boolean(initialRule);

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
        <h2>{isEditing ? "Modifier la regle" : "Ajouter une regle prop firm"}</h2>
      </div>
      <div className="form-grid">
        <SelectField label="Prop firm" name="propFirmId" options={propFirms} required defaultValue={initialRule?.propFirmId} />
        <Field label="Nom de regle" name="name" required defaultValue={initialRule?.name} />
        <SelectField label="Type compte" name="accountType" options={accountTypeOptions} required defaultValue={initialRule?.accountType} />
        <Field label="Taille" name="accountSize" placeholder="50000" required type="number" defaultValue={initialRule?.accountSize} />
        <Field label="Target" name="target" required type="number" defaultValue={initialRule?.target} />
        <Field label="Max drawdown" name="maxDrawdown" required type="number" defaultValue={initialRule?.maxDrawdown} />
        <Field label="Daily drawdown" name="dailyDrawdown" type="number" defaultValue={initialRule?.dailyDrawdown ?? undefined} />
        <Field label="Buffer" name="buffer" type="number" defaultValue={initialRule?.buffer ?? undefined} />
        <Field label="Buffer payout" name="payoutBuffer" type="number" defaultValue={initialRule?.payoutBuffer ?? undefined} />
        <SelectField
          label="Type regle payout"
          name="payoutRuleType"
          options={[
            { id: "NONE", label: "NONE" },
            { id: "BUFFER_ONLY", label: "BUFFER_ONLY" },
            { id: "APEX", label: "APEX" },
            { id: "TAKE_PROFIT_TRADER", label: "TAKE_PROFIT_TRADER" },
            { id: "CUSTOM", label: "CUSTOM" }
          ]}
          defaultValue={initialRule?.payoutRuleType ?? "NONE"}
        />
        <Field label="Consistance %" name="consistencyPercent" type="number" defaultValue={initialRule?.consistencyPercent ?? undefined} />
        <Field label="Part trader %" name="traderSharePercent" type="number" defaultValue={initialRule?.traderSharePercent ?? undefined} />
        <Field label="Jours min validation eval" name="minTradingDays" type="number" defaultValue={initialRule?.minTradingDays ?? undefined} />
        <Field label="Jours min payout" name="minTradingDaysForPayout" type="number" defaultValue={initialRule?.minTradingDaysForPayout ?? undefined} />
        <Field label="Jours payout valides" name="minPayoutTradingDays" type="number" defaultValue={initialRule?.minPayoutTradingDays ?? undefined} />
        <Field label="Profit min / jour payout" name="minDailyProfitForPayout" type="number" defaultValue={initialRule?.minDailyProfitForPayout ?? undefined} />
        <Field label="Prix achat par defaut" name="defaultPurchasePrice" type="number" defaultValue={initialRule?.defaultPurchasePrice ?? undefined} />
        <Field label="Prix activation par defaut" name="defaultActivationPrice" type="number" defaultValue={initialRule?.defaultActivationPrice ?? undefined} />
        <Field label="Prix reset par defaut" name="defaultResetPrice" type="number" defaultValue={initialRule?.defaultResetPrice ?? undefined} />
        <Field label="Note promo" name="promoNote" defaultValue={initialRule?.promoNote ?? undefined} />
        <TextArea label="Notes" name="notes" defaultValue={initialRule?.notes} />
        <label className="check-field">
          <input defaultChecked={initialRule?.isStandard ?? false} name="isStandard" type="checkbox" />
          <span>Regle standard visible par tous (admin)</span>
        </label>
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
