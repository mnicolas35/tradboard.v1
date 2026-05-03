"use client";

import type { SelectOption } from "@/types";

export function Field({
  label,
  name,
  type = "text",
  required = false,
  defaultValue,
  placeholder,
  step
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string | number;
  placeholder?: string;
  step?: string;
}) {
  return (
    <label className="form-field">
      <span>{label}</span>
      <input defaultValue={defaultValue} name={name} placeholder={placeholder} required={required} step={step} type={type} />
    </label>
  );
}

export function TextArea({ label, name, defaultValue }: { label: string; name: string; defaultValue?: string | null }) {
  return (
    <label className="form-field wide">
      <span>{label}</span>
      <textarea defaultValue={defaultValue ?? ""} name={name} rows={4} />
    </label>
  );
}

export function SelectField({
  label,
  name,
  options,
  required = false,
  defaultValue = ""
}: {
  label: string;
  name: string;
  options: SelectOption[] | Array<{ id: string; label: string }>;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <label className="form-field">
      <span>{label}</span>
      <select defaultValue={defaultValue} name={name} required={required}>
        <option value="">Selectionner</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ActiveCheckbox({ defaultChecked = true }: { defaultChecked?: boolean } = {}) {
  return (
    <label className="check-field">
      <input defaultChecked={defaultChecked} name="isActive" type="checkbox" />
      <span>Actif</span>
    </label>
  );
}

export function SubmitButton({ label }: { label: string }) {
  return (
    <div className="form-actions">
      <button className="button" type="submit">
        {label}
      </button>
    </div>
  );
}

export const currencyOptions = [
  { id: "USD", label: "USD" },
  { id: "EUR", label: "EUR" }
];

export const accountTypeOptions = [
  { id: "EVALUATION", label: "EVALUATION" },
  { id: "FUNDED", label: "FUNDED" }
];

export const accountCreationTypeOptions = [
  { id: "EVALUATION", label: "EVALUATION" },
  { id: "FUNDED", label: "FUNDED" },
  { id: "DEMO", label: "DEMO" }
];

export const platformOptions = [
  { id: "RITHMIC", label: "Rithmic" },
  { id: "TRADOVATE", label: "Tradovate" },
  { id: "NINJATRADER", label: "NinjaTrader" },
  { id: "MT5", label: "MT5" },
  { id: "DXTRADE", label: "DXTrade" },
  { id: "MATCHTRADER", label: "MatchTrader" },
  { id: "OTHER", label: "Autre" }
];
