"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AddPropFirmModal } from "@/components/modals/AddPropFirmModal";
import { AddPropFirmRuleModal } from "@/components/modals/AddPropFirmRuleModal";
import { Modal } from "@/components/ui/Modal";
import { sortPropFirmRules } from "@/lib/rule-sort";
import { deletePropFirm, deletePropFirmRule, updatePropFirm } from "@/server/actions/tradboard-actions";
import type { AppData } from "@/types";

type PropFirmManagerProps = {
  propFirms: AppData["propFirmDetails"];
  propFirmRules: AppData["propFirmRules"];
  isAdmin: boolean;
  canManageSharedRules: boolean;
  currentUserId: string;
};

export function PropFirmManager({ propFirms, propFirmRules, isAdmin, canManageSharedRules, currentUserId }: PropFirmManagerProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<"firm" | null>(null);
  const [collapsedFirmIds, setCollapsedFirmIds] = useState<string[]>([]);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [duplicatingRuleId, setDuplicatingRuleId] = useState<string | null>(null);
  const [deletingRuleId, setDeletingRuleId] = useState<string | null>(null);
  const [isDeletingRule, setIsDeletingRule] = useState(false);
  const [savingFirmId, setSavingFirmId] = useState<string | null>(null);
  const [savedFirmId, setSavedFirmId] = useState<string | null>(null);
  const [quickRuleFirm, setQuickRuleFirm] = useState<{ id: string; label: string } | null>(null);

  const rulesById = new Map(propFirmRules.map((rule) => [rule.id, rule]));
  const editingRule = editingRuleId ? rulesById.get(editingRuleId) ?? null : null;
  const duplicatingRule = duplicatingRuleId ? rulesById.get(duplicatingRuleId) ?? null : null;
  const deletingRule = deletingRuleId ? rulesById.get(deletingRuleId) ?? null : null;

  function canEditRule(rule: { createdByUserId: string | null }) {
    return canManageSharedRules || rule.createdByUserId === currentUserId;
  }

  function canDeleteRule(rule: { createdByUserId: string | null }) {
    return canManageSharedRules || rule.createdByUserId === currentUserId;
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
          </div>
        </div>
        {error ? <p className="form-error">{error}</p> : null}
        <div className="propfirm-tree">
          {propFirms.map((firm) => {
            const firmRules = propFirmRules
              .filter((rule) => rule.propFirmId === firm.id);
            const sortedFirmRules = sortPropFirmRules(firmRules, "EVALUATION", "drawdown-then-size");
            const isCollapsed = collapsedFirmIds.includes(firm.id);

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
                  <button
                    aria-label={isCollapsed ? `Afficher les règles de ${firm.name}` : `Masquer les règles de ${firm.name}`}
                    className="propfirm-toggle"
                    type="button"
                    title={isCollapsed ? "Afficher les règles" : "Masquer les règles"}
                    onClick={() => {
                      setCollapsedFirmIds((current) => (
                        current.includes(firm.id)
                          ? current.filter((id) => id !== firm.id)
                          : [...current, firm.id]
                      ));
                    }}
                  >
                    {isCollapsed ? ">" : "v"}
                  </button>
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
                    {isAdmin ? (
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
                    <button
                      aria-label="Ajouter une règle"
                      className="row-icon-button add"
                      title="Ajouter une règle"
                      type="button"
                      onClick={() => setQuickRuleFirm({ id: firm.id, label: `${firm.acronym} - ${firm.name}` })}
                    >
                      +
                    </button>
                  </div>
                </form>

                {!isCollapsed ? (
                  <div className="propfirm-rules">
                    {sortedFirmRules.length === 0 ? (
                      <p className="muted">Aucune règle active.</p>
                    ) : (
                    <div className="propfirm-rule-group-list compact">
                      {sortedFirmRules.map((rule) => (
                        <div className="propfirm-rule-name-row" key={rule.id}>
                          <span className="propfirm-rule-name">
                            {rule.isStandard ? "Règle standard" : "** Règle custom"} {rule.name}
                          </span>
                          <div className="rule-row-actions">
                            <div className={rule.isActive ? "status status-active" : "status"}>{rule.isActive ? "ACTIVE" : "INACTIVE"}</div>
                            <button
                              aria-label="Dupliquer la règle"
                              className="row-icon-button copy"
                              title="Dupliquer la règle"
                              type="button"
                              onClick={() => setDuplicatingRuleId(rule.id)}
                            >
                              ⧉
                            </button>
                            {canEditRule(rule) || canDeleteRule(rule) ? (
                              <>
                                {canEditRule(rule) ? (
                                  <button
                                    aria-label="Modifier la règle"
                                    className="row-icon-button edit"
                                    title="Modifier la règle"
                                    type="button"
                                    onClick={() => setEditingRuleId(rule.id)}
                                  >
                                    ⚙️
                                  </button>
                                ) : null}
                                {canDeleteRule(rule) ? (
                                  <button
                                    aria-label="Supprimer la règle"
                                    className="row-icon-button danger"
                                    title="Supprimer la règle"
                                    type="button"
                                    onClick={() => setDeletingRuleId(rule.id)}
                                  >
                                    🗑️
                                  </button>
                                ) : null}
                              </>
                            ) : (
                              <span className="muted rule-locked">Lecture seule</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    )}
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      </section>

      <AddPropFirmModal isOpen={modal === "firm"} onClose={() => setModal(null)} />
      <AddPropFirmRuleModal
        isOpen={Boolean(quickRuleFirm)}
        propFirms={propFirms.map((firm) => ({ id: firm.id, label: `${firm.acronym} - ${firm.name}` }))}
        propFirm={quickRuleFirm}
        allowStandardToggle={canManageSharedRules}
        defaultStandardRule={canManageSharedRules}
        onClose={() => setQuickRuleFirm(null)}
      />
      <AddPropFirmRuleModal
        isOpen={Boolean(editingRule)}
        propFirms={propFirms.map((firm) => ({ id: firm.id, label: `${firm.acronym} - ${firm.name}` }))}
        initialRule={editingRule}
        mode="edit"
        allowStandardToggle={canManageSharedRules}
        onClose={() => setEditingRuleId(null)}
      />
      <AddPropFirmRuleModal
        isOpen={Boolean(duplicatingRule)}
        propFirms={propFirms.map((firm) => ({ id: firm.id, label: `${firm.acronym} - ${firm.name}` }))}
        initialRule={duplicatingRule}
        mode="create"
        allowStandardToggle={canManageSharedRules}
        defaultStandardRule={canManageSharedRules}
        onClose={() => setDuplicatingRuleId(null)}
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
