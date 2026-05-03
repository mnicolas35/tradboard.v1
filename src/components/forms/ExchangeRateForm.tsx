"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createExchangeRate, updateUsdEurRateFromInternet } from "@/server/actions/tradboard-actions";
import { formatDate } from "@/lib/format";
import type { ExchangeRateSummary } from "@/types";
import { currencyOptions, Field, SelectField, SubmitButton } from "./FormControls";

type ExchangeRateFormProps = {
  rates: ExchangeRateSummary[];
};

export function ExchangeRateForm({ rates }: ExchangeRateFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const latest = rates[0];

  return (
    <div className="stack">
      <form action={createExchangeRate} className="panel form-panel">
        <div className="panel-header">
          <h2>Taux de change</h2>
          {latest ? (
            <span className="muted">
              Dernier {latest.baseCurrency}/{latest.targetCurrency}: {latest.rate}
            </span>
          ) : null}
        </div>
        <p className="form-note">
          Les taux peuvent etre saisis manuellement ou recuperes via Frankfurter sans cle API.
        </p>
        <div className="form-actions">
          <button
            className="button secondary"
            disabled={isUpdating}
            type="button"
            onClick={async () => {
              setError(null);
              setIsUpdating(true);
              try {
                await updateUsdEurRateFromInternet();
                router.refresh();
              } catch (submitError) {
                setError(submitError instanceof Error ? submitError.message : "Mise a jour impossible.");
              } finally {
                setIsUpdating(false);
              }
            }}
          >
            {isUpdating ? "Mise a jour..." : "Mettre à jour taux"}
          </button>
        </div>
        <div className="form-grid">
          <SelectField label="Devise source" name="baseCurrency" options={currencyOptions} defaultValue="USD" required />
          <SelectField label="Devise cible" name="targetCurrency" options={currencyOptions} defaultValue="EUR" required />
          <Field label="Taux" name="rate" required step="0.000001" type="number" />
          <Field label="Date du taux" name="rateDate" required type="date" />
          <Field label="Source" name="source" />
        </div>
        {error ? <p className="form-error">{error}</p> : null}
        <SubmitButton label="Enregistrer le taux" />
      </form>

      <section className="panel">
        <div className="panel-header">
          <h2>Historique USD/EUR</h2>
          <span className="muted">{rates.length} taux</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Paire</th>
                <th>Taux</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {rates.map((rate) => (
                <tr key={rate.id}>
                  <td>{formatDate(new Date(`${rate.rateDate}T00:00:00.000Z`))}</td>
                  <td>
                    {rate.baseCurrency}/{rate.targetCurrency}
                  </td>
                  <td>{rate.rate}</td>
                  <td>{rate.source ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
