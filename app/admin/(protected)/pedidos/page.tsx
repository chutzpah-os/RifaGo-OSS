import Link from "next/link";
import { adminDb } from "@/lib/firebaseAdmin";
import type { Order } from "@/lib/types";
import { formatCents, formatPhone } from "@/lib/format";
import { OrderRowActions } from "@/components/admin/OrderRowActions";

// Firestore reads aren't a signal Next.js recognizes for dynamic rendering,
// so without this the pending-orders list would get statically frozen at
// build time instead of showing real, current orders.
export const dynamic = "force-dynamic";

export default async function PedidosPage() {
  const snap = await adminDb.collection("orders").where("status", "==", "pending").get();

  const orders = snap.docs
    .map((doc) => doc.data() as Order)
    .sort((a, b) => {
      // Orders the buyer already flagged as paid float to the top — those
      // are the ones actually waiting on an admin decision right now.
      const aFlagged = a.buyerConfirmedPaymentAt ? 1 : 0;
      const bFlagged = b.buyerConfirmedPaymentAt ? 1 : 0;
      if (aFlagged !== bFlagged) return bFlagged - aFlagged;
      return b.createdAt - a.createdAt;
    });

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin" className="w-fit text-sm text-ink-soft hover:text-primary">
        ← Voltar
      </Link>
      <h1 className="font-display text-2xl font-semibold text-primary">Pedidos pendentes</h1>

      {orders.length === 0 ? (
        <p className="text-sm text-ink-soft">Nenhum pedido pendente no momento.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="flex flex-col gap-3 rounded-xl border border-line bg-paper-raised p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-ink">{order.buyerName}</p>
                  {order.buyerConfirmedPaymentAt ? (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      Pix enviado pelo comprador
                    </span>
                  ) : (
                    <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-ink-soft">
                      Ainda não confirmou envio
                    </span>
                  )}
                </div>
                <p className="text-sm text-ink-soft">{formatPhone(order.buyerPhone)}</p>
                <p className="mt-1 font-tabular text-sm text-ink-soft">
                  {order.kind === "donation"
                    ? "Doação (sem número)"
                    : `Números: ${order.ticketNumbers.map((n) => String(n).padStart(3, "0")).join(", ")}`}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <span className="font-tabular text-lg font-semibold text-primary">
                  {formatCents(order.amountCents)}
                </span>
                <OrderRowActions orderId={order.id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
