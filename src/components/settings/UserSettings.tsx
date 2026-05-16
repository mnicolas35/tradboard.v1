"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { updateThemePreference } from "@/server/actions/tradboard-actions";
import type { AppData } from "@/types";
import type { ThemePreference } from "@prisma/client";

type UserSettingsProps = {
  user: AppData["currentUser"];
};

export function UserSettings({ user }: UserSettingsProps) {
  const router = useRouter();
  const [theme, setTheme] = useState<ThemePreference>(user.themePreference as ThemePreference);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <section className="panel settings-panel">
      <div className="panel-header">
        <h2>Parametres utilisateur</h2>
        <span className="muted">{user.email}</span>
      </div>
      <form
        className="settings-body"
        onSubmit={async (event) => {
          event.preventDefault();
          setError(null);
          setIsSaving(true);

          try {
            await updateThemePreference(new FormData(event.currentTarget));
            router.refresh();
          } catch (submitError) {
            setError(submitError instanceof Error ? submitError.message : "Sauvegarde impossible.");
          } finally {
            setIsSaving(false);
          }
        }}
      >
        <label className="form-field">
          <span>Theme</span>
          <select
            name="themePreference"
            value={theme}
            onChange={(event) => setTheme(event.currentTarget.value as ThemePreference)}
          >
            <option value="LIGHT">Clair</option>
            <option value="DARK">Sombre</option>
            <option value="DARKY">Darky</option>
          </select>
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        <button className="button" disabled={isSaving} type="submit">
          {isSaving ? "Sauvegarde..." : "Sauvegarder"}
        </button>
      </form>
    </section>
  );
}
