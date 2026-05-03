"use client";

import type { ReactNode } from "react";

type ModalProps = {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
};

export function Modal({ title, isOpen, onClose, children }: ModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay" role="presentation" onMouseDown={onClose}>
      <section
        aria-modal="true"
        className="modal-panel"
        role="dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <h2>{title}</h2>
          <button aria-label="Fermer" className="modal-close" type="button" onClick={onClose}>
            x
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </section>
    </div>
  );
}
