"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createTradingDay } from "@/server/actions/tradboard-actions";
import type { AccountSummary } from "@/types";
import { Field, TextArea } from "./FormControls";

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

function calcDrawdown(profitLoss: string, currentDrawdown: number | null, ruleDrawdown: number | null): string {
  if (ruleDrawdown === null) return "";
  const pl = parseFloat(profitLoss);
  if (isNaN(pl)) return "";
  const base = currentDrawdown ?? ruleDrawdown;
  // Trailing DD: floor rises with gains, remaining stays ≈ ruleDrawdown
  // Capped DD (post-buffer funded): floor is frozen, remaining grows with gains
  const suggested = base >= ruleDrawdown ? ruleDrawdown : base + pl;
  return String(Math.round(suggested * 100) / 100);
}

export function TradingDayForm({ accounts, hideAccountSelect = false, onCancel, onSuccess }: TradingDayFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id ?? "");
  const [profitLossInput, setProfitLossInput] = useState("");
  const [drawdownInput, setDrawdownInput] = useState("");

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) ?? accounts[0];
  const currentDrawdown = selectedAccount?.currentDrawdown ?? null;
  const ruleDrawdown = selectedAccount?.rule?.maxDrawdown ?? null;

  const options = accounts.map((account) => ({
    id: account.id,
    label: account.accountNumber ? `#${account.accountNumber}` : "Sans numero"
  }));

  function handleAccountChange(id: string) {
    setSelectedAccountId(id);
    const account = accounts.find((a) => a.id === id);
    const accCurrentDD = account?.currentDrawdown ?? null;
    const accRuleDD = account?.rule?.maxDrawdown ?? null;
    setDrawdownInput(calcDrawdown(profitLossInput, accCurrentDD, accRuleDD));
  }

  function handleProfitLossChange(value: string) {
    setProfitLossInput(value);
    setDrawdownInput(calcDrawdown(value, currentDrawdown, ruleDrawdown));
  }

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
          <label className="form-field">
            <span>Compte actif</span>
            <select
              name="accountId"
              required
              value={selectedAccountId}
              onChange={(e) => handleAccountChange(e.target.value)}
            >
              <option value="">Selectionner</option>
              {options.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
          </label>
        )}
        <Field label="Date" name="tradeDate" required type="date" defaultValue={todayInputValue()} />
        <label className="form-field">
          <span>Gain / perte USD</span>
          <input
            name="profitLoss"
            required
            type="number"
            step="any"
            value={profitLossInput}
            onChange={(e) => handleProfitLossChange(e.target.value)}
          />
        </label>
        <label className="form-field">
          <span>
            Drawdown disponible (DD suiveur)
            {ruleDrawdown !== null ? (
              <small className="muted"> — base {currentDrawdown === null ? "règle" : ""} : {currentDrawdown ?? ruleDrawdown}</small>
            ) : null}
          </span>
          <input
            name="drawdownAtClose"
            type="number"
            step="any"
            value={drawdownInput}
            onChange={(e) => setDrawdownInput(e.target.value)}
          />
        </label>
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
