"use client";

import { useMemo, useState } from "react";
import { formatCents, formatPhone } from "@/lib/format";
import { ConfirmedOrderRowActions } from "@/components/admin/ConfirmedOrderRowActions";
import { EditConfirmedOrderModal } from "@/components/admin/EditConfirmedOrderModal";

export interface ConfirmedOrderSummary {
  id: string;
  buyerName: string;
  buyerPhone: string;
  kind: "tickets" | "donation";
  ticketNumbers: number[];
  amountCents: number;
  confirmedAt: number;
}

type KindFilter = "all" | "tickets" | "donation";

const KIND_LABELS: Record<KindFilter, string> = {
  all: "Todos",
  tickets: "Rifa",
  donation: "Doação",
};

export function ConfirmedOrdersList({ orders }: { orders: ConfirmedOrderSummary[] }) {
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [editingOrder, setEditingOrder] = useState<ConfirmedOrderSummary | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter((order) => {
      if (kindFilter !== "all" && order.kind !== kindFilter) return false;
      if (!q) return true;
      return order.buyerName.toLowerCase().includes(q) || order.buyerPhone.includes(q);
    });
  }, [orders, query, kindFilter]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-semibold text-primary">
          Pagamentos confirmados{" "}
          <span className="font-sans text-sm font-normal text-ink-soft">
            ({filtered.length}
            {filtered.length !== orders.length ? ` de ${orders.length}` : ""})
          </span>
        </h2>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(KIND_LABELS) as KindFilter[]).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setKindFilter(value)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                kindFilter === value
                  ? "border-primary bg-primary text-paper-raised"
                  : "border-line bg-paper-raised text-ink-soft hover:border-primary hover:text-primary"
              }`}
            >
              {KIND_LABELS[value]}
            </button>
          ))}
        </div>
      </div>

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar por nome ou telefone..."
        className="rounded-lg border border-line bg-paper px-4 py-2.5 text-sm outline-none focus:border-primary"
      />

      {filtered.length === 0 ? (
        <p className="text-sm text-ink-soft">Nenhum pagamento confirmado encontrado.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((order) => (
            <div
              key={order.id}
              className="flex flex-col gap-2 rounded-xl border border-line bg-paper-raised p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-ink">{order.buyerName}</p>
                  <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-ink-soft">
                    {order.kind === "donation" ? "Doação" : "Rifa"}
                  </span>
                </div>
                <p className="text-sm text-ink-soft">{formatPhone(order.buyerPhone)}</p>
                {order.kind === "tickets" && (
                  <p className="mt-1 font-tabular text-sm text-ink-soft">
                    Números: {order.ticketNumbers.map((n) => String(n).padStart(3, "0")).join(", ")}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <span className="font-tabular text-lg font-semibold text-primary">
                  {formatCents(order.amountCents)}
                </span>
                <span className="text-xs text-ink-soft">
                  {new Date(order.confirmedAt).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "2-digit",
                  })}
                </span>
                <ConfirmedOrderRowActions
                  orderId={order.id}
                  onEdit={() => setEditingOrder(order)}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {editingOrder && (
        <EditConfirmedOrderModal
          key={editingOrder.id}
          order={editingOrder}
          onClose={() => setEditingOrder(null)}
        />
      )}
    </div>
  );
}
