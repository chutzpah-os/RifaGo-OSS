"use client";

import { useTransition } from "react";
import { cancelOrderAction, confirmOrderAction } from "@/app/actions/admin";

export function OrderRowActions({ orderId }: { orderId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={isPending}
        onClick={() => startTransition(() => confirmOrderAction(orderId))}
        className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-paper-raised hover:bg-primary-strong disabled:cursor-not-allowed disabled:opacity-50"
      >
        Confirmar
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={() => startTransition(() => cancelOrderAction(orderId))}
        className="rounded-full border border-danger px-4 py-2 text-sm font-medium text-danger hover:bg-danger hover:text-paper-raised disabled:cursor-not-allowed disabled:opacity-50"
      >
        Cancelar
      </button>
    </div>
  );
}
