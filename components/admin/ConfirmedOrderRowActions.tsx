"use client";

import { useState, useTransition } from "react";
import { deleteConfirmedOrderAction } from "@/app/actions/admin";

export function ConfirmedOrderRowActions({
  orderId,
  onEdit,
}: {
  orderId: string;
  onEdit: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-ink-soft">Excluir de vez?</span>
        <button
          type="button"
          disabled={isPending}
          onClick={() => startTransition(() => deleteConfirmedOrderAction(orderId))}
          className="rounded-full bg-danger px-3 py-1.5 text-xs font-medium text-paper-raised hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Excluindo..." : "Confirmar"}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => setConfirming(false)}
          className="rounded-full border border-line px-3 py-1.5 text-xs font-medium text-ink-soft hover:text-ink"
        >
          Voltar
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onEdit}
        className="rounded-full border border-line px-3 py-1.5 text-xs font-medium text-ink-soft hover:border-primary hover:text-primary"
      >
        Editar
      </button>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded-full border border-danger px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger hover:text-paper-raised"
      >
        Excluir
      </button>
    </div>
  );
}
