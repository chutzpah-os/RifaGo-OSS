"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { updateRaffleConfigAction, type UpdateRaffleConfigState } from "@/app/actions/admin";
import type { RaffleConfig } from "@/lib/types";

const initialState: UpdateRaffleConfigState = {};

const inputClass =
  "rounded-lg border border-line bg-paper px-4 py-2.5 outline-none focus:border-primary";

export function RaffleConfigForm({ config }: { config: RaffleConfig }) {
  const [state, formAction, pending] = useActionState(updateRaffleConfigAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-ink">Título da rifa</span>
        <input name="title" required defaultValue={config.title} className={inputClass} />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-ink">Descrição</span>
        <textarea
          name="description"
          required
          defaultValue={config.description}
          rows={3}
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-ink">Foto principal (URL ou caminho)</span>
        <input name="photoURL" defaultValue={config.photoURL} className={inputClass} />
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink">Título do prêmio</span>
          <input name="prizeTitle" required defaultValue={config.prizeTitle} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink">Foto do prêmio (URL ou caminho)</span>
          <input name="prizePhotoURL" defaultValue={config.prizePhotoURL} className={inputClass} />
        </label>
      </div>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-ink">Descrição do prêmio</span>
        <textarea
          name="prizeDescription"
          required
          defaultValue={config.prizeDescription}
          rows={2}
          className={inputClass}
        />
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink">Preço por número (R$)</span>
          <input
            name="ticketPriceReais"
            required
            type="text"
            inputMode="decimal"
            defaultValue={(config.ticketPriceCents / 100).toFixed(2)}
            className={`font-tabular ${inputClass}`}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink">Meta (R$)</span>
          <input
            name="goalAmountReais"
            required
            type="text"
            inputMode="decimal"
            defaultValue={(config.goalAmountCents / 100).toFixed(2)}
            className={`font-tabular ${inputClass}`}
          />
        </label>
      </div>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-ink">Regulamento</span>
        <textarea
          name="regulamento"
          required
          defaultValue={config.regulamento}
          rows={4}
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-ink">Informações sobre a premiação</span>
        <textarea
          name="premiacaoInfo"
          required
          defaultValue={config.premiacaoInfo}
          rows={3}
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-ink">Texto de introdução em &quot;Dúvidas&quot;</span>
        <textarea
          name="faqIntro"
          required
          defaultValue={config.faqIntro}
          rows={2}
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-ink">WhatsApp de contato</span>
        <input
          name="whatsappNumber"
          required
          placeholder="Formato internacional sem símbolos, ex: 5579981234567"
          defaultValue={config.whatsappNumber}
          className={`font-tabular ${inputClass}`}
        />
      </label>

      {state.error && (
        <p className="text-sm text-danger" role="alert">
          {state.error}
        </p>
      )}
      {state.success && <p className="text-sm text-primary">Salvo com sucesso.</p>}

      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Salvando..." : "Salvar alterações"}
      </Button>
    </form>
  );
}
