"use client";

import { PropFirmRuleForm } from "@/components/forms/PropFirmRuleForm";
import { Modal } from "@/components/ui/Modal";
import type { AppData, SelectOption } from "@/types";

type AddPropFirmRuleModalProps = {
  isOpen: boolean;
  propFirms: SelectOption[];
  initialRule?: AppData["propFirmRules"][number] | null;
  mode?: "create" | "edit";
  propFirm?: { id: string; label: string } | null;
  allowStandardToggle?: boolean;
  defaultStandardRule?: boolean;
  onClose: () => void;
};

export function AddPropFirmRuleModal({
  isOpen,
  propFirms,
  initialRule,
  mode,
  propFirm,
  allowStandardToggle = false,
  defaultStandardRule = false,
  onClose
}: AddPropFirmRuleModalProps) {
  const isQuickAdd = Boolean(propFirm);
  const isDuplicate = mode === "create" && Boolean(initialRule);
  const title = isDuplicate
    ? "Dupliquer une règle"
    : initialRule
      ? "Modifier une règle"
      : isQuickAdd
        ? `Ajouter une règle${propFirm?.label ? ` pour ${propFirm.label}` : ""}`
        : "Add règles des comptes";

  return (
    <Modal isOpen={isOpen} title={title} onClose={onClose}>
      <PropFirmRuleForm
        propFirms={propFirms}
        initialRule={initialRule}
        mode={mode}
        defaultPropFirmId={propFirm?.id ?? initialRule?.propFirmId}
        propFirmLabel={propFirm?.label ?? null}
        compact={isQuickAdd || isDuplicate}
        allowStandardToggle={allowStandardToggle}
        defaultStandardRule={defaultStandardRule}
        onCancel={onClose}
        onSuccess={onClose}
      />
    </Modal>
  );
}
