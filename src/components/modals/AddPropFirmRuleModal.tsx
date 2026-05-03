"use client";

import { PropFirmRuleForm } from "@/components/forms/PropFirmRuleForm";
import { Modal } from "@/components/ui/Modal";
import type { AppData, SelectOption } from "@/types";

type AddPropFirmRuleModalProps = {
  isOpen: boolean;
  propFirms: SelectOption[];
  initialRule?: AppData["propFirmRules"][number] | null;
  onClose: () => void;
};

export function AddPropFirmRuleModal({ isOpen, propFirms, initialRule, onClose }: AddPropFirmRuleModalProps) {
  return (
    <Modal isOpen={isOpen} title={initialRule ? "Modifier une règle" : "Add règles des comptes"} onClose={onClose}>
      <PropFirmRuleForm propFirms={propFirms} initialRule={initialRule} onCancel={onClose} onSuccess={onClose} />
    </Modal>
  );
}
