"use client";

import { useActionState, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { createDonationAction, type CreateDonationState } from "@/app/actions/orders";

const QUICK_AMOUNTS = [10, 20, 50, 100];

const initialState: CreateDonationState = {};

export function DonateModal() {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<number | null>(null);
  const [state, formAction, pending] = useActionState(createDonationAction, initialState);

  function close() {
    setOpen(false);
    setAmount(null);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex w-fit items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition-colors hover:border-primary hover:bg-primary hover:text-paper-raised"
      >
        <span aria-hidden="true">♥</span>
        Prefere só contribuir? Doe sem concorrer
      </button>

      <Modal open={open} onClose={close}>
        <h3 className="font-display text-2xl font-semibold text-primary">Fazer uma doação</h3>
        <p className="mt-1 text-sm text-ink-soft">
          Ajude sem concorrer a nenhum número — qualquer valor é bem-vindo.
        </p>

        <form action={formAction} className="mt-6 flex flex-col gap-5">
          <input type="hidden" name="amountReais" value={amount ?? ""} />

          <div className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-ink">Valor da doação</span>
            <div className="flex flex-wrap gap-2">
              {QUICK_AMOUNTS.map((value) => (
                <button
                  type="button"
                  key={value}
                  onClick={() => setAmount(value)}
                  className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                    amount === value
                      ? "border-primary bg-primary text-paper-raised"
                      : "border-line bg-paper-raised text-ink hover:border-primary"
                  }`}
                >
                  R$ {value}
                </button>
              ))}
            </div>
            <label className="mt-1 flex items-center gap-2">
              <span className="text-ink-soft">R$</span>
              <input
                type="number"
                min={1}
                step="0.01"
                placeholder="Outro valor"
                value={amount ?? ""}
                onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : null)}
                className="w-full rounded-lg border border-line bg-paper px-4 py-2.5 outline-none focus:border-primary"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-ink">Nome completo</span>
            <input
              name="buyerName"
              required
              placeholder="Ex: Maria da Silva Souza"
              className="rounded-lg border border-line bg-paper px-4 py-2.5 outline-none focus:border-primary"
            />
            <span className="text-xs text-ink-soft">
              Use o nome completo — é ele que vamos conferir com o remetente do Pix recebido.
            </span>
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-ink">Telefone</span>
            <input
              name="buyerPhone"
              required
              type="tel"
              placeholder="(00) 00000-0000"
              className="rounded-lg border border-line bg-paper px-4 py-2.5 outline-none focus:border-primary"
            />
          </label>

          {state.error && (
            <p className="text-sm text-danger" role="alert">
              {state.error}
            </p>
          )}

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={close} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={pending || !amount} className="flex-1">
              {pending ? "Gerando Pix..." : "Ir para pagamento"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
