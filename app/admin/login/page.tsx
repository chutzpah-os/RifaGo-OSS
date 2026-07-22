"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "@/app/actions/admin";

const initialState: LoginState = {};

export default function AdminLoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <form
        action={formAction}
        className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-line bg-paper-raised p-8"
      >
        <h1 className="font-display text-2xl font-semibold text-primary">Painel Admin</h1>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink">Senha</span>
          <input
            type="password"
            name="password"
            required
            autoFocus
            className="rounded-lg border border-line bg-paper px-4 py-2.5 outline-none focus:border-primary"
          />
        </label>

        {state.error && (
          <p className="text-sm text-danger" role="alert">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-primary px-6 py-3 text-sm font-medium text-paper-raised hover:bg-primary-strong disabled:opacity-60"
        >
          {pending ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </main>
  );
}
