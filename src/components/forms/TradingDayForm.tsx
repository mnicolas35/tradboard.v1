"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { calculateNextTradeDrawdown } from "@/lib/drawdown";
import { createTradingDay } from "@/server/actions/tradboard-actions";
import type { AccountSummary } from "@/types";
import { Field, TextArea } from "./FormControls";

type TradingDayFormProps = {
  accounts: AccountSummary[];
  hideAccountSelect?: boolean;
  defaultTradeDate?: string | null;
  onCancel?: () => void;
  onSuccess?: () => void;
};

function todayInputValue() {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${today.getFullYear()}-${month}-${day}`;
}

function calcDrawdown(
  profitLoss: string,
  currentResultUsd: number,
  currentActualDrawdown: number,
  drawdownLimit: number | null,
  accountType: "EVALUATION" | "FUNDED",
  fundedBuffer: number | null
): string {
  const pl = parseFloat(profitLoss);
  if (isNaN(pl)) return "";
  const suggested = calculateNextTradeDrawdown(
    currentResultUsd,
    currentActualDrawdown,
    pl,
    drawdownLimit,
    accountType,
    fundedBuffer
  );
  return suggested === null ? "" : String(suggested);
}

export function TradingDayForm({ accounts, hideAccountSelect = false, defaultTradeDate, onCancel, onSuccess }: TradingDayFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id ?? "");
  const [profitLossInput, setProfitLossInput] = useState("");
  const [drawdownInput, setDrawdownInput] = useState("");

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) ?? accounts[0];
  const ruleDrawdown = selectedAccount?.rule?.maxDrawdown ?? null;
  const drawdownLimit = ruleDrawdown;
  const currentActualDrawdown = selectedAccount?.currentActualDrawdown ?? 0;
  const currentResultUsd = selectedAccount?.currentResultUsd ?? 0;
  const accountType = (selectedAccount?.accountType as "EVALUATION" | "FUNDED") ?? "EVALUATION";
  const fundedBuffer = accountType === "FUNDED" ? (selectedAccount?.rule?.buffer ?? null) : null;

  const options = accounts.map((account) => ({
    id: account.id,
    label: account.accountNumber ? `#${account.accountNumber}` : "Sans numero"
  }));

  function handleAccountChange(id: string) {
    setSelectedAccountId(id);
    const account = accounts.find((a) => a.id === id);
    setDrawdownInput(
      calcDrawdown(
        profitLossInput,
        account?.currentResultUsd ?? 0,
        account?.currentActualDrawdown ?? 0,
        account?.rule?.maxDrawdown ?? null,
        (account?.accountType as "EVALUATION" | "FUNDED") ?? "EVALUATION",
        account?.accountType === "FUNDED" ? (account.rule?.buffer ?? null) : null
      )
    );
  }

  function handleProfitLossChange(value: string) {
    setProfitLossInput(value);
    setDrawdownInput(calcDrawdown(value, currentResultUsd, currentActualDrawdown, drawdownLimit, accountType, fundedBuffer));
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
        <Field label="Date" name="tradeDate" required type="date" defaultValue={defaultTradeDate ?? todayInputValue()} />
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
            Drawdown actuel après trade
            {ruleDrawdown !== null ? (
              <small className="muted"> — base actuelle {selectedAccount?.currentActualDrawdown ?? 0}, plafond disponible {drawdownLimit ?? ruleDrawdown}</small>
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
