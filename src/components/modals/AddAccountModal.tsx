"use client";

import { AccountForm } from "@/components/forms/AccountForm";
import { Modal } from "@/components/ui/Modal";
import type { AppData } from "@/types";

type AddAccountModalProps = Pick<AppData, "propFirms" | "propFirmRules"> & {
  isOpen: boolean;
  title?: string;
  onClose: () => void;
};

export function AddAccountModal({ isOpen, title = "Ajouter un compte", propFirms, propFirmRules, onClose }: AddAccountModalProps) {
  return (
    <Modal isOpen={isOpen} title={title} onClose={onClose}>
      <AccountForm
        propFirms={propFirms}
        propFirmRules={propFirmRules}
        onCancel={onClose}
        onSuccess={onClose}
      />
    </Modal>
  );
}
