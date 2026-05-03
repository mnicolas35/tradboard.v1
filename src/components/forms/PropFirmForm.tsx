"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createPropFirm } from "@/server/actions/tradboard-actions";
import { ActiveCheckbox, Field, TextArea } from "./FormControls";

type PropFirmFormProps = {
  onCancel?: () => void;
  onSuccess?: () => void;
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Enregistrement impossible.";
}

export function PropFirmForm({ onCancel, onSuccess }: PropFirmFormProps) {
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
          await createPropFirm(new FormData(event.currentTarget));
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
        <h2>Ajouter une prop firm</h2>
      </div>
      <div className="form-grid">
        <Field label="Nom" name="name" required />
        <Field label="Acronyme" name="acronym" required placeholder="APX" />
        <Field label="Site web" name="website" type="url" />
        <TextArea label="Notes" name="notes" />
        <ActiveCheckbox />
      </div>
      {error ? <p className="form-error">{error}</p> : null}
      <div className="form-actions split">
        <button className="button secondary" disabled={isSubmitting} type="button" onClick={onCancel}>
          Annuler
        </button>
        <button className="button" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Enregistrement..." : "Creer la prop firm"}
        </button>
      </div>
    </form>
  );
}
