"use client";

import { AccountForm } from "@/components/forms/AccountForm";
import { Modal } from "@/components/ui/Modal";
import type { AppData } from "@/types";

type AddAccountModalProps = Pick<AppData, "propFirms" | "propFirmRules" | "accounts"> & {
  isOpen: boolean;
  onClose: () => void;
};

export function AddAccountModal({ isOpen, propFirms, propFirmRules, accounts, onClose }: AddAccountModalProps) {
  return (
    <Modal isOpen={isOpen} title="Add compte" onClose={onClose}>
      <AccountForm
        propFirms={propFirms}
        propFirmRules={propFirmRules}
        accounts={accounts}
        onCancel={onClose}
        onSuccess={onClose}
      />
    </Modal>
  );
}
