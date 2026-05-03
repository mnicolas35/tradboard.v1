"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AddAccountModal } from "@/components/modals/AddAccountModal";
import { AddPropFirmModal } from "@/components/modals/AddPropFirmModal";
import { AddPropFirmRuleModal } from "@/components/modals/AddPropFirmRuleModal";
import { Modal } from "@/components/ui/Modal";
import { deletePropFirm, deletePropFirmRule, updatePropFirm } from "@/server/actions/tradboard-actions";
import type { AccountSummary, AppData } from "@/types";

type PropFirmManagerProps = {
  propFirms: AppData["propFirmDetails"];
  accounts: AccountSummary[];
  propFirmRules: AppData["propFirmRules"];
  isAdmin: boolean;
  currentUserId: string;
};

export function PropFirmManager({ propFirms, accounts, propFirmRules, isAdmin, currentUserId }: PropFirmManagerProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<"firm" | "account" | "rules" | null>(null);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [deletingRuleId, setDeletingRuleId] = useState<string | null>(null);
  const [isDeletingRule, setIsDeletingRule] = useState(false);
  const [savingFirmId, setSavingFirmId] = useState<string | null>(null);
  const [savedFirmId, setSavedFirmId] = useState<string | null>(null);

  const rulesById = new Map(propFirmRules.map((rule) => [rule.id, rule]));
  const editingRule = editingRuleId ? rulesById.get(editingRuleId) ?? null : null;
  const deletingRule = deletingRuleId ? rulesById.get(deletingRuleId) ?? null : null;

  function canManageRule(rule: { isStandard: boolean; createdByUserId: string | null }) {
    return isAdmin || (!rule.isStandard && rule.createdByUserId === currentUserId);
  }

  return (
    <div className="stack">
      <section className="panel">
        <div className="panel-header">
          <h2>PropFirm</h2>
          <div className="icon-action-row" aria-label="Actions PropFirm">
            <button
              aria-label="Ajouter une prop firm"
              className="icon-button"
              title="Ajouter une prop firm"
              type="button"
              onClick={() => setModal("firm")}
            >
              ➕
            </button>
            <button
              aria-label="Ajouter un compte"
              className="icon-button"
              title="Ajouter un compte"
              type="button"
              onClick={() => setModal("account")}
            >
              <span aria-hidden="true">➕</span>
              <span className="icon-button-mark">C</span>
            </button>
            <button
              aria-label="Gérer les règles"
              className="icon-button"
              title="Gérer les règles"
              type="button"
              onClick={() => setModal("rules")}
            >
              ⚙️
            </button>
          </div>
        </div>
        {error ? <p className="form-error">{error}</p> : null}
        <div className="propfirm-tree">
          {propFirms.map((firm) => {
            const firmAccountsCount = accounts.filter((account) => account.propFirmId === firm.id).length;

            return (
              <section className="propfirm-node" key={firm.id}>
                <form
                  className="propfirm-row"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    setError(null);
                    setSavingFirmId(firm.id);
                    setSavedFirmId(null);
                    try {
                      await updatePropFirm(new FormData(event.currentTarget));
                      setSavedFirmId(firm.id);
                      router.refresh();
                    } catch (submitError) {
                      setError(submitError instanceof Error ? submitError.message : "Modification impossible.");
                    } finally {
                      setSavingFirmId(null);
                      window.setTimeout(() => setSavedFirmId((current) => (current === firm.id ? null : current)), 1600);
                    }
                  }}
                >
                  <input name="id" type="hidden" value={firm.id} />
                  <label className="compact-field">
                    <span>Acronyme</span>
                    <input name="acronym" required defaultValue={firm.acronym} />
                  </label>
                  <label className="compact-field grow">
                    <span>Nom</span>
                    <input name="name" required defaultValue={firm.name} />
                  </label>
                  <input name="website" type="hidden" defaultValue={firm.website ?? ""} />
                  <input name="notes" type="hidden" defaultValue={firm.notes ?? ""} />
                  <label className="toggle-field">
                    <input name="isActive" type="checkbox" defaultChecked={firm.isActive} />
                    <span>Actif</span>
                  </label>
                  <div className="row-icon-actions">
                    <button
                      aria-label="Sauvegarder"
                      className="row-icon-button save"
                      disabled={savingFirmId === firm.id}
                      title="Sauvegarder"
                      type="submit"
                    >
                      {savingFirmId === firm.id ? "…" : savedFirmId === firm.id ? "✔️" : "💾"}
                    </button>
                    <button
                      aria-label="Modifier"
                      className="row-icon-button edit"
                      type="button"
                      title="Modifier"
                      onClick={(event) => {
                        const form = event.currentTarget.closest("form");
                        const input = form?.querySelector<HTMLInputElement>('input[name="name"]');
                        input?.focus();
                        input?.select();
                      }}
                    >
                      ⚙️
                    </button>
                    {isAdmin && firmAccountsCount === 0 ? (
                      <button
                        aria-label="Supprimer"
                        className="row-icon-button danger"
                        title="Supprimer"
                        type="button"
                        onClick={async () => {
                          if (!window.confirm(`Supprimer ${firm.name} ?`)) {
                            return;
                          }

                          const formData = new FormData();
                          formData.set("id", firm.id);
                          setError(null);
                          try {
                            await deletePropFirm(formData);
                            router.refresh();
                          } catch (submitError) {
                            setError(submitError instanceof Error ? submitError.message : "Suppression impossible.");
                          }
                        }}
                      >
                        🗑️
                      </button>
                    ) : null}
                  </div>
                </form>

                <div className="propfirm-rules">
                  {firm.rules.length === 0 ? (
                    <p className="muted">Aucune règle active.</p>
                  ) : (
                    firm.rules.map((rule) => {
                      const canManage = canManageRule(rule);

                      return (
                        <div className="propfirm-rule-row" key={rule.id}>
                          <strong>{rule.isStandard ? "Règle standard" : "** Règle custom"} {rule.name}</strong>
                          <span>
                            {rule.accountType} - {Math.round(rule.accountSize / 1000)}k
                          </span>
                          <span className={rule.isActive ? "status status-active" : "status"}>
                            {rule.isActive ? "ACTIVE" : "INACTIVE"}
                          </span>
                          <div className="rule-action-row">
                            {canManage ? (
                              <>
                                <button
                                  aria-label="Modifier la règle"
                                  className="row-icon-button edit"
                                  title="Modifier la règle"
                                  type="button"
                                  onClick={() => setEditingRuleId(rule.id)}
                                >
                                  ⚙️
                                </button>
                                <button
                                  aria-label="Supprimer la règle"
                                  className="row-icon-button danger"
                                  title="Supprimer la règle"
                                  type="button"
                                  onClick={() => setDeletingRuleId(rule.id)}
                                >
                                  🗑️
                                </button>
                              </>
                            ) : (
                              <span className="muted rule-locked">Lecture seule</span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </section>

      <AddPropFirmModal isOpen={modal === "firm"} onClose={() => setModal(null)} />
      <AddAccountModal
        isOpen={modal === "account"}
        accounts={accounts}
        propFirms={propFirms.map((firm) => ({ id: firm.id, label: `${firm.acronym} - ${firm.name}` }))}
        propFirmRules={propFirmRules}
        onClose={() => setModal(null)}
      />
      <AddPropFirmRuleModal
        isOpen={modal === "rules"}
        propFirms={propFirms.map((firm) => ({ id: firm.id, label: `${firm.acronym} - ${firm.name}` }))}
        onClose={() => setModal(null)}
      />
      <AddPropFirmRuleModal
        isOpen={Boolean(editingRule)}
        propFirms={propFirms.map((firm) => ({ id: firm.id, label: `${firm.acronym} - ${firm.name}` }))}
        initialRule={editingRule}
        onClose={() => setEditingRuleId(null)}
      />
      <Modal isOpen={Boolean(deletingRule)} title="Supprimer cette règle ?" onClose={() => setDeletingRuleId(null)}>
        <div className="confirm-panel">
          <p>
            Supprimer cette règle ?
            {deletingRule ? <strong> {deletingRule.label}</strong> : null}
          </p>
          {error ? <p className="form-error">{error}</p> : null}
          <div className="form-actions split">
            <button className="button secondary" disabled={isDeletingRule} type="button" onClick={() => setDeletingRuleId(null)}>
              Annuler
            </button>
            <button
              className="button danger"
              disabled={isDeletingRule}
              type="button"
              onClick={async () => {
                if (!deletingRule) {
                  return;
                }

                const formData = new FormData();
                formData.set("id", deletingRule.id);
                setError(null);
                setIsDeletingRule(true);
                try {
                  await deletePropFirmRule(formData);
                  setDeletingRuleId(null);
                  router.refresh();
                } catch (submitError) {
                  setError(submitError instanceof Error ? submitError.message : "Suppression impossible.");
                } finally {
                  setIsDeletingRule(false);
                }
              }}
            >
              {isDeletingRule ? "Suppression..." : "Supprimer"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
