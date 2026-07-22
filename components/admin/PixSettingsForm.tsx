"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { updatePixSettingsAction, type UpdatePixSettingsState } from "@/app/actions/admin";
import type { PixSettings } from "@/lib/types";

const initialState: UpdatePixSettingsState = {};

const inputClass =
  "rounded-lg border border-line bg-paper px-4 py-2.5 outline-none focus:border-primary";

export function PixSettingsForm({ settings }: { settings: PixSettings | null }) {
  const [state, formAction, pending] = useActionState(updatePixSettingsAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-ink">Chave Pix</span>
        <input
          name="key"
          required
          defaultValue={settings?.key ?? ""}
          placeholder="CPF, CNPJ, e-mail, telefone (+55...) ou chave aleatória"
          className={`font-tabular ${inputClass}`}
        />
        <span className="text-xs text-ink-soft">
          Chave de telefone precisa do &quot;+&quot; na frente (ex: +5579981234567), senão o banco
          recusa o QR code.
        </span>
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink">Nome do recebedor</span>
          <input
            name="merchantName"
            required
            defaultValue={settings?.merchantName ?? ""}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink">Cidade do recebedor</span>
          <input
            name="merchantCity"
            required
            defaultValue={settings?.merchantCity ?? ""}
            className={inputClass}
          />
        </label>
      </div>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-ink">Banco do recebedor (opcional)</span>
        <input
          name="receiverBankName"
          defaultValue={settings?.receiverBankName ?? ""}
          placeholder="Ex: Nubank"
          className={inputClass}
        />
        <span className="text-xs text-ink-soft">
          Só aparece na tela de pagamento pra ajudar o comprador a confirmar que está pagando a
          pessoa certa.
        </span>
      </label>

      {state.error && (
        <p className="text-sm text-danger" role="alert">
          {state.error}
        </p>
      )}
      {state.success && <p className="text-sm text-primary">Configuração do Pix salva.</p>}

      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Salvando..." : "Salvar Pix"}
      </Button>
    </form>
  );
}
