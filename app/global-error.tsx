"use client";

import Link from "next/link";
import "./globals.css";

// Catches errors in the root layout itself, which app/error.tsx can't reach.
// Needs its own <html>/<body> since it replaces the whole root layout when
// active. Kept dependency-free (no shared Button/Link components) since
// this is the last line of defense if something upstream is broken.
export default function GlobalError() {
  return (
    <html lang="pt-BR">
      <body className="flex min-h-dvh items-center justify-center bg-paper px-4 text-ink">
        <div className="w-full max-w-lg rounded-2xl border border-danger bg-danger/5 p-6 text-center">
          <h1 className="font-display text-xl font-semibold text-danger">
            Algo deu errado por aqui
          </h1>
          <p className="mt-2 text-sm text-ink-soft">
            Pode ser uma instabilidade temporária. Tente novamente em instantes.
          </p>
          <div className="mt-4">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-line px-6 py-3 text-sm font-medium text-ink transition-colors hover:border-primary hover:text-primary"
            >
              Voltar para a rifa
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
