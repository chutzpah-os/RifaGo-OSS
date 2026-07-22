"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

export default function AdminError({
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
    <div className="flex flex-col gap-4">
      <Link href="/admin" className="w-fit text-sm text-ink-soft hover:text-primary">
        ← Voltar
      </Link>
      <div className="rounded-xl border border-danger bg-danger/5 p-6">
        <h1 className="font-display text-xl font-semibold text-danger">Algo deu errado</h1>
        <p className="mt-2 text-sm text-ink-soft">
          {error.message || "Tente novamente. Se persistir, atualize a página."}
        </p>
        <div className="mt-4">
          <Button variant="outline" onClick={reset}>
            Tentar de novo
          </Button>
        </div>
      </div>
    </div>
  );
}
