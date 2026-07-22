"use client";

import { useActionState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { updateConfirmedOrderAction, type UpdateConfirmedOrderState } from "@/app/actions/admin";
import type { ConfirmedOrderSummary } from "@/components/admin/ConfirmedOrdersList";

const initialState: UpdateConfirmedOrderState = {};

// Mount this component only while editing (parent conditionally renders it)
// so useActionState always starts fresh — otherwise a stale `success: true`
// from the last edit would auto-close the modal the next time it opens.
export function EditConfirmedOrderModal({
  order,
  onClose,
}: {
  order: ConfirmedOrderSummary;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(updateConfirmedOrderAction, initialState);

  useEffect(() => {
    if (state.success) onClose();
  }, [state.success, onClose]);

  return (
    <Modal open onClose={onClose}>
      <h3 className="font-display text-2xl font-semibold text-primary">Editar pedido</h3>
      <p className="mt-1 text-sm text-ink-soft">
        {order.kind === "donation" ? "Doação" : "Rifa"} confirmada de {order.buyerName}.
      </p>

      <form action={formAction} className="mt-6 flex flex-col gap-5">
        <input type="hidden" name="orderId" value={order.id} />

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink">Nome completo</span>
          <input
            name="buyerName"
            required
            defaultValue={order.buyerName}
            className="rounded-lg border border-line bg-paper px-4 py-2.5 outline-none focus:border-primary"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink">Telefone</span>
          <input
            name="buyerPhone"
            required
            defaultValue={order.buyerPhone}
            className="rounded-lg border border-line bg-paper px-4 py-2.5 outline-none focus:border-primary"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink">Valor (R$)</span>
          <input
            name="amountReais"
            required
            type="text"
            inputMode="decimal"
            defaultValue={(order.amountCents / 100).toFixed(2)}
            className="rounded-lg border border-line bg-paper px-4 py-2.5 font-tabular outline-none focus:border-primary"
          />
        </label>

        {order.kind === "tickets" && (
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-ink">Números (separados por vírgula)</span>
            <input
              name="ticketNumbers"
              required
              defaultValue={order.ticketNumbers.join(", ")}
              placeholder="Ex: 12, 45, 199"
              className="rounded-lg border border-line bg-paper px-4 py-2.5 font-tabular outline-none focus:border-primary"
            />
            <span className="text-xs text-ink-soft">
              Trocar um número aqui libera o antigo e reserva o novo — o sistema valida que o
              novo número está mesmo disponível.
            </span>
          </label>
        )}

        {state.error && (
          <p className="text-sm text-danger" role="alert">
            {state.error}
          </p>
        )}

        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button type="submit" disabled={pending} className="flex-1">
            {pending ? "Salvando..." : "Salvar alterações"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
