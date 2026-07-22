import Link from "next/link";
import { adminDb } from "@/lib/firebaseAdmin";
import { getCachedRaffleData } from "@/lib/raffleData";
import type { Order } from "@/lib/types";
import { ConfirmedOrdersList, type ConfirmedOrderSummary } from "@/components/admin/ConfirmedOrdersList";
import { LaunchPaymentModal } from "@/components/admin/LaunchPaymentModal";
import { formatCents } from "@/lib/format";

// Firestore reads aren't a signal Next.js recognizes for dynamic rendering,
// so without this the dashboard would get statically frozen at build time.
export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [{ progress }, pendingSnap, confirmedSnap] = await Promise.all([
    getCachedRaffleData(),
    adminDb.collection("orders").where("status", "==", "pending").count().get(),
    adminDb.collection("orders").where("status", "==", "confirmed").get(),
  ]);

  const pendingCount = pendingSnap.data().count;

  const confirmedOrders: ConfirmedOrderSummary[] = confirmedSnap.docs
    .map((doc) => doc.data() as Order)
    .sort((a, b) => (b.confirmedAt ?? 0) - (a.confirmedAt ?? 0))
    .map((order) => ({
      id: order.id,
      buyerName: order.buyerName,
      buyerPhone: order.buyerPhone,
      kind: order.kind,
      ticketNumbers: order.ticketNumbers,
      amountCents: order.amountCents,
      confirmedAt: order.confirmedAt ?? 0,
    }));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold text-primary">Visão geral</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Valor total arrecadado" value={formatCents(progress.raisedCents)} />
        <Stat label="Números vendidos" value={`${progress.soldCount} / ${progress.totalTickets}`} />
        <Stat label="Progresso da meta" value={`${Math.round(progress.percent)}%`} />
        <Stat label="Pedidos pendentes" value={String(pendingCount)} highlight={pendingCount > 0} />
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/admin/pedidos"
          className="w-fit rounded-full bg-primary px-6 py-3 text-sm font-medium text-paper-raised hover:bg-primary-strong"
        >
          Ver pedidos pendentes
        </Link>
        <LaunchPaymentModal />
        <Link
          href="/admin/configuracoes"
          className="w-fit rounded-full border border-line px-6 py-3 text-sm font-medium text-ink-soft hover:border-primary hover:text-primary"
        >
          Configurações
        </Link>
      </div>

      <ConfirmedOrdersList orders={confirmedOrders} />
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-xl border border-line bg-paper-raised p-5">
      <p className="text-xs text-ink-soft">{label}</p>
      <p className={`mt-1 font-tabular text-2xl font-semibold ${highlight ? "text-accent" : "text-primary"}`}>
        {value}
      </p>
    </div>
  );
}
