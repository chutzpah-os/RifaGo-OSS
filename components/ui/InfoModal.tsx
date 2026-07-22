"use client";

import { ReactNode, useState } from "react";
import { Modal } from "@/components/ui/Modal";

export function InfoModal({
  label,
  title,
  children,
}: {
  label: string;
  title: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-ink-soft underline decoration-line decoration-1 underline-offset-4 transition-colors hover:text-primary hover:decoration-primary"
      >
        {label}
      </button>
      <Modal open={open} onClose={() => setOpen(false)}>
        <h3 className="font-display text-2xl text-primary">{title}</h3>
        <div className="mt-4 leading-relaxed text-ink-soft">{children}</div>
      </Modal>
    </>
  );
}
