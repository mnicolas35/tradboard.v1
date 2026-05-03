"use client";

import { PropFirmRuleForm } from "@/components/forms/PropFirmRuleForm";
import { Modal } from "@/components/ui/Modal";
import type { AppData, SelectOption } from "@/types";

type AddPropFirmRuleModalProps = {
  isOpen: boolean;
  propFirms: SelectOption[];
  initialRule?: AppData["propFirmRules"][number] | null;
  propFirm?: { id: string; label: string } | null;
  allowStandardToggle?: boolean;
  onClose: () => void;
};

export function AddPropFirmRuleModal({ isOpen, propFirms, initialRule, propFirm, allowStandardToggle = false, onClose }: AddPropFirmRuleModalProps) {
  const isQuickAdd = Boolean(propFirm);
  const title = initialRule ? "Modifier une règle" : isQuickAdd ? `Ajouter une règle${propFirm?.label ? ` pour ${propFirm.label}` : ""}` : "Add règles des comptes";

  return (
    <Modal isOpen={isOpen} title={title} onClose={onClose}>
      <PropFirmRuleForm
        propFirms={propFirms}
        initialRule={initialRule}
        defaultPropFirmId={propFirm?.id ?? initialRule?.propFirmId}
        propFirmLabel={propFirm?.label ?? null}
        compact={isQuickAdd}
        allowStandardToggle={allowStandardToggle}
        onCancel={onClose}
        onSuccess={onClose}
      />
    </Modal>
  );
}
