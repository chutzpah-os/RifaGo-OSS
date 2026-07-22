"use client";

import { useActionState, useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import {
  createManualOrderAction,
  type CreateManualOrderState,
} from "@/app/actions/admin";

const initialState: CreateManualOrderState = {};

type Kind = "tickets" | "donation";

export function LaunchPaymentModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-fit rounded-full border border-primary px-6 py-3 text-sm font-medium text-primary hover:bg-primary hover:text-paper-raised"
      >
        Lançar pagamento
      </button>

      {open && <LaunchPaymentForm onClose={() => setOpen(false)} />}
    </>
  );
}

// Mounted only while open (parent conditionally renders it) so
// useActionState always starts fresh — otherwise a stale error or
// `success: true` from the last submission would leak into the next time
// this modal opens.
function LaunchPaymentForm({ onClose }: { onClose: () => void }) {
  const [kind, setKind] = useState<Kind>("tickets");
  const [state, formAction, pending] = useActionState(
    createManualOrderAction,
    initialState,
  );

  useEffect(() => {
    if (state.success) onClose();
  }, [state.success, onClose]);

  return (
    <Modal open onClose={onClose}>
      <h3 className="font-display text-2xl font-semibold text-primary">
        Lançar pagamento
      </h3>
      <p className="mt-1 text-sm text-ink-soft">
        Para registrar um pagamento recebido fora do site (dinheiro, Pix direto,
        venda antiga) — já entra como confirmado, sem gerar QR code.
      </p>

      <form action={formAction} className="mt-6 flex flex-col gap-5">
        <input type="hidden" name="kind" value={kind} />

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setKind("tickets")}
            className={`flex-1 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
              kind === "tickets"
                ? "border-primary bg-primary text-paper-raised"
                : "border-line bg-paper-raised text-ink-soft hover:border-primary hover:text-primary"
            }`}
          >
            Rifa (números)
          </button>
          <button
            type="button"
            onClick={() => setKind("donation")}
            className={`flex-1 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
              kind === "donation"
                ? "border-primary bg-primary text-paper-raised"
                : "border-line bg-paper-raised text-ink-soft hover:border-primary hover:text-primary"
            }`}
          >
            Doação
          </button>
        </div>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink">Nome do comprador</span>
          <input
            name="buyerName"
            required
            placeholder="Ex: Maria"
            className="rounded-lg border border-line bg-paper px-4 py-2.5 outline-none focus:border-primary"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink">Telefone (opcional)</span>
          <input
            name="buyerPhone"
            placeholder="Deixe em branco se não souber"
            className="rounded-lg border border-line bg-paper px-4 py-2.5 outline-none focus:border-primary"
          />
        </label>

        {kind === "tickets" ? (
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-ink">
              Números (separados por vírgula)
            </span>
            <input
              name="ticketNumbers"
              required
              placeholder="Ex: 12, 45, 199"
              className="rounded-lg border border-line bg-paper px-4 py-2.5 font-tabular outline-none focus:border-primary"
            />
            <span className="text-xs text-ink-soft">
              O sistema valida que cada número está mesmo disponível antes de
              confirmar.
            </span>
          </label>
        ) : (
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-ink">Valor (R$)</span>
            <input
              name="amountReais"
              required
              type="text"
              inputMode="decimal"
              placeholder="Ex: 50"
              className="rounded-lg border border-line bg-paper px-4 py-2.5 font-tabular outline-none focus:border-primary"
            />
          </label>
        )}

        {state.error && (
          <p className="text-sm text-danger" role="alert">
            {state.error}
          </p>
        )}

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={pending} className="flex-1">
            {pending ? "Lançando..." : "Lançar como confirmado"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
