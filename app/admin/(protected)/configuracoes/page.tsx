import Link from "next/link";
import { adminDb } from "@/lib/firebaseAdmin";
import { getPixSettings } from "@/lib/settings";
import type { RaffleConfig } from "@/lib/types";
import { RaffleConfigForm } from "@/components/admin/RaffleConfigForm";
import { TotalTicketsForm } from "@/components/admin/TotalTicketsForm";
import { PixSettingsForm } from "@/components/admin/PixSettingsForm";

export const dynamic = "force-dynamic";

export default async function ConfiguracoesPage() {
  const [configSnap, pixSettings] = await Promise.all([
    adminDb.collection("config").doc("raffle").get(),
    getPixSettings(),
  ]);

  const config = configSnap.data() as RaffleConfig | undefined;
  if (!config) {
    throw new Error("Raffle config not found.");
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/admin" className="w-fit text-sm text-ink-soft hover:text-primary">
          ← Voltar
        </Link>
        <h1 className="mt-2 font-display text-2xl font-semibold text-primary">Configurações</h1>
      </div>

      <section className="flex flex-col gap-4 rounded-xl border border-line bg-paper-raised p-6">
        <h2 className="font-display text-xl font-semibold text-primary">Página inicial</h2>
        <RaffleConfigForm config={config} />
      </section>

      <section className="flex flex-col gap-4 rounded-xl border border-line bg-paper-raised p-6">
        <h2 className="font-display text-xl font-semibold text-primary">Total de números</h2>
        <TotalTicketsForm currentTotal={config.totalTickets} />
      </section>

      <section className="flex flex-col gap-4 rounded-xl border border-line bg-paper-raised p-6">
        <h2 className="font-display text-xl font-semibold text-primary">Chave Pix</h2>
        <PixSettingsForm settings={pixSettings} />
      </section>
    </div>
  );
}
