"use client";

import { useActionState, useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { formatCents } from "@/lib/format";
import { createOrderAction, type CreateOrderState } from "@/app/actions/orders";

const initialState: CreateOrderState = {};

// Only fetches while the modal is open, and stops the moment it closes.
// The server computes availability from a single denormalized summary doc
// (1-2 Firestore reads total, cached briefly), so polling this while the
// modal is open is now cheap — no per-poll cost tied to the raffle size.
const POLL_INTERVAL_MS = 8000;

function useAvailableNumbersWhileOpen(open: boolean): number[] | null {
  const [numbers, setNumbers] = useState<number[] | null>(null);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/api/tickets", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { availableNumbers: number[] };
        if (!cancelled) setNumbers(data.availableNumbers);
      } catch {
        // Keep showing the last known list on a transient network hiccup.
      }
    }

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [open]);

  return numbers;
}

export function JoinModal({
  ticketPriceCents,
  totalTickets,
}: {
  ticketPriceCents: number;
  totalTickets: number;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const availableNumbers = useAvailableNumbersWhileOpen(open);
  const [state, formAction, pending] = useActionState(createOrderAction, initialState);
  const totalDigits = String(totalTickets).length;

  function toggle(number: number) {
    setSelected((prev) =>
      prev.includes(number) ? prev.filter((n) => n !== number) : [...prev, number]
    );
  }

  function close() {
    setOpen(false);
    setSelected([]);
  }

  const totalCents = selected.length * ticketPriceCents;

  return (
    <>
      <Button onClick={() => setOpen(true)} className="w-full sm:w-auto">
        Quero participar
      </Button>

      <Modal open={open} onClose={close}>
        <h3 className="font-display text-2xl font-semibold text-primary">Quero participar</h3>
        <p className="mt-1 text-sm text-ink-soft">
          Preencha seus dados e escolha os números desejados.
        </p>

        <form action={formAction} className="mt-6 flex flex-col gap-5">
          <input type="hidden" name="ticketNumbers" value={JSON.stringify(selected)} />

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

          <div className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-ink">
              Escolha os números ({selected.length} selecionado{selected.length === 1 ? "" : "s"})
            </span>
            <div className="max-h-56 overflow-y-auto rounded-lg border border-line bg-paper p-2">
              {!availableNumbers ? (
                <p className="p-2 text-xs text-ink-soft">Carregando disponibilidade...</p>
              ) : (
                <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8">
                  {availableNumbers.map((number) => {
                    const isSelected = selected.includes(number);
                    return (
                      <button
                        type="button"
                        key={number}
                        onClick={() => toggle(number)}
                        className={`aspect-[3/2] rounded-md border font-tabular text-xs transition-colors ${
                          isSelected
                            ? "border-primary bg-primary text-paper-raised"
                            : "border-line bg-paper-raised text-ink hover:border-primary"
                        }`}
                      >
                        {String(number).padStart(totalDigits, "0")}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-accent-soft/50 px-4 py-3 text-sm">
            <span>Total</span>
            <span className="font-tabular font-semibold text-primary">
              {formatCents(totalCents)}
            </span>
          </div>

          <p className="rounded-lg border border-accent bg-accent-soft/40 px-4 py-3 text-xs leading-relaxed text-ink">
            <strong>Atenção:</strong> os números só são garantidos após a confirmação do
            pagamento via Pix. Não é possível reservar sem o pagamento.
          </p>

          {state.error && (
            <p className="text-sm text-danger" role="alert">
              {state.error}
            </p>
          )}

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={close} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={pending || selected.length === 0} className="flex-1">
              {pending ? "Gerando Pix..." : "Ir para pagamento"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
