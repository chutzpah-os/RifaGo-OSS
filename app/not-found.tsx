"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

// A server-side redirect() doesn't reliably produce a real HTTP redirect for
// this special route on Vercel (it kept coming back as a 404 even with a
// Location header). A client-side redirect sidesteps that entirely — it
// doesn't depend on which status code the platform assigns to this page.
export default function NotFound() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/");
  }, [router]);

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg rounded-2xl border border-line bg-paper-raised p-6 text-center">
        <h1 className="font-display text-xl font-semibold text-primary">Página não encontrada</h1>
        <p className="mt-2 text-sm text-ink-soft">Redirecionando você para a rifa...</p>
        <div className="mt-4 flex justify-center">
          <Button variant="outline" onClick={() => router.replace("/")}>
            Voltar para a rifa
          </Button>
        </div>
      </div>
    </main>
  );
}
