"use client";

import { PropFirmForm } from "@/components/forms/PropFirmForm";
import { Modal } from "@/components/ui/Modal";

type AddPropFirmModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function AddPropFirmModal({ isOpen, onClose }: AddPropFirmModalProps) {
  return (
    <Modal isOpen={isOpen} title="Add propfirme" onClose={onClose}>
      <PropFirmForm onCancel={onClose} onSuccess={onClose} />
    </Modal>
  );
}
