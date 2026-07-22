"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

export default function OrderPageError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="flex w-full max-w-lg flex-col gap-4">
        <Link href="/" className="w-fit text-sm text-ink-soft hover:text-primary">
          ← Voltar para a rifa
        </Link>
        <div className="rounded-2xl border border-danger bg-danger/5 p-6">
          <h1 className="font-display text-xl font-semibold text-danger">
            Não foi possível carregar seu pedido
          </h1>
          <p className="mt-2 text-sm text-ink-soft">
            Pode ser uma instabilidade temporária. Tente novamente em instantes — seu pedido e
            seus dados continuam salvos.
          </p>
          <div className="mt-4">
            <Button variant="outline" onClick={reset}>
              Tentar de novo
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
