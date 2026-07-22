"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

export default function RootError({
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
      <div className="w-full max-w-lg rounded-2xl border border-danger bg-danger/5 p-6 text-center">
        <h1 className="font-display text-xl font-semibold text-danger">
          Algo deu errado por aqui
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          Pode ser uma instabilidade temporária. Tente novamente em instantes.
        </p>
        <div className="mt-4 flex justify-center">
          <Button variant="outline" onClick={reset}>
            Tentar de novo
          </Button>
        </div>
      </div>
    </main>
  );
}
