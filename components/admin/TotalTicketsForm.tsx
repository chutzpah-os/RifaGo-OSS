"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { setTotalTicketsAction, type SetTotalTicketsState } from "@/app/actions/admin";

const initialState: SetTotalTicketsState = {};

export function TotalTicketsForm({ currentTotal }: { currentTotal: number }) {
  const [state, formAction, pending] = useActionState(setTotalTicketsAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <p className="text-sm text-ink-soft">
        Total atual: <span className="font-tabular font-semibold text-ink">{currentTotal}</span>{" "}
        números.
      </p>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-ink">Novo total de números</span>
        <input
          name="totalTickets"
          required
          type="number"
          min={1}
          defaultValue={currentTotal}
          className="w-40 rounded-lg border border-line bg-paper px-4 py-2.5 font-tabular outline-none focus:border-primary"
        />
        <span className="text-xs text-ink-soft">
          Aumentar cria os novos números como disponíveis. Diminuir só é permitido se nenhum
          número no intervalo removido já estiver reservado ou vendido.
        </span>
      </label>

      {state.error && (
        <p className="text-sm text-danger" role="alert">
          {state.error}
        </p>
      )}
      {state.success && <p className="text-sm text-primary">Total atualizado com sucesso.</p>}

      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Salvando..." : "Salvar total"}
      </Button>
    </form>
  );
}
