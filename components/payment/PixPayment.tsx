"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { doc, onSnapshot } from "firebase/firestore";
import QRCode from "qrcode";
import { db } from "@/lib/firebase";
import { CopyButton } from "@/components/ui/CopyButton";
import { Button } from "@/components/ui/Button";
import { formatCents, formatPhone } from "@/lib/format";
import type { Order } from "@/lib/types";
import {
  cancelOwnOrderAction,
  markBuyerConfirmedPaymentAction,
  updateOrderContactAction,
  type UpdateContactState,
} from "@/app/actions/orders";

const STATUS_LABEL: Record<Order["status"], string> = {
  pending: "Aguardando pagamento",
  confirmed: "Pagamento confirmado",
  expired: "Reserva expirada",
  cancelled: "Pedido cancelado",
};

const STATUS_STYLE: Record<Order["status"], string> = {
  pending: "bg-accent-soft/60 text-ink border-accent",
  confirmed: "bg-primary/10 text-primary border-primary",
  expired: "bg-danger/10 text-danger border-danger",
  cancelled: "bg-danger/10 text-danger border-danger",
};

function useCountdown(expiresAt: number) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);
  return now === null ? null : expiresAt - now;
}

const editInitialState: UpdateContactState = {};

function EditContactForm({ order, onClose }: { order: Order; onClose: () => void }) {
  const [state, formAction, pending] = useActionState(updateOrderContactAction, editInitialState);

  useEffect(() => {
    if (state.success) onClose();
  }, [state.success, onClose]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="orderId" value={order.id} />

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-ink">Nome completo</span>
        <input
          name="buyerName"
          required
          defaultValue={order.buyerName}
          className="rounded-lg border border-line bg-paper px-4 py-2.5 outline-none focus:border-primary"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-ink">Telefone</span>
        <input
          name="buyerPhone"
          required
          type="tel"
          defaultValue={order.buyerPhone}
          className="rounded-lg border border-line bg-paper px-4 py-2.5 outline-none focus:border-primary"
        />
      </label>

      {state.error && (
        <p className="text-sm text-danger" role="alert">
          {state.error}
        </p>
      )}

      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onClose} className="flex-1">
          Cancelar
        </Button>
        <Button type="submit" disabled={pending} className="flex-1">
          {pending ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  );
}

export function PixPayment({
  initialOrder,
  receiver,
}: {
  initialOrder: Order;
  receiver: { name: string; bankName: string };
}) {
  const [order, setOrder] = useState(initialOrder);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const msLeft = useCountdown(order.expiresAt);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "orders", initialOrder.id), (snap) => {
      const data = snap.data() as Order | undefined;
      if (data) setOrder(data);
    });
    return unsubscribe;
  }, [initialOrder.id]);

  useEffect(() => {
    QRCode.toDataURL(order.pixPayload, { margin: 1, width: 260 }).then(setQrDataUrl);
  }, [order.pixPayload]);

  const minutesLeft = Math.max(0, Math.floor((msLeft ?? 0) / 60000));
  const secondsLeft = Math.max(0, Math.floor(((msLeft ?? 0) % 60000) / 1000));
  const isExpiredByTime = msLeft !== null && msLeft <= 0 && order.status === "pending";
  const isPendingActive = order.status === "pending" && !isExpiredByTime;

  async function handleMarkPaid() {
    setMarkingPaid(true);
    try {
      await markBuyerConfirmedPaymentAction(order.id);
    } finally {
      setMarkingPaid(false);
    }
  }

  async function handleCancel() {
    setCancelling(true);
    try {
      await cancelOwnOrderAction(order.id);
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
      <Link href="/" className="w-fit text-sm text-ink-soft hover:text-primary">
        ← Voltar para a rifa
      </Link>

      <div className="flex flex-col gap-4 rounded-2xl border border-line bg-paper-raised p-5 sm:p-6">
        <div>
          <p className="font-tabular text-xs uppercase tracking-[0.2em] text-accent">Pagamento</p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-primary">
            {formatCents(order.amountCents)}
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            {order.kind === "donation"
              ? "Doação, sem número associado"
              : `Números: ${order.ticketNumbers.map((n) => String(n).padStart(3, "0")).join(", ")}`}
          </p>
          <p className="mt-3 text-sm text-ink-soft">
            Você está pagando para{" "}
            <span className="font-medium text-ink">{receiver.name}</span>
            {receiver.bankName && ` · ${receiver.bankName}`}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-paper px-4 py-3 text-sm">
          <span className="text-ink-soft">
            {order.buyerName} · {formatPhone(order.buyerPhone)}
          </span>
          {isPendingActive && !editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-sm text-primary underline decoration-1 underline-offset-4 hover:text-primary-strong"
            >
              Editar informações
            </button>
          )}
        </div>

        {editing ? (
          <EditContactForm order={order} onClose={() => setEditing(false)} />
        ) : (
          <>
            <span
              className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-medium ${STATUS_STYLE[isExpiredByTime ? "expired" : order.status]}`}
            >
              {isExpiredByTime
                ? STATUS_LABEL.expired
                : order.status === "pending" && order.buyerConfirmedPaymentAt
                  ? "Pix enviado — aguardando confirmação"
                  : STATUS_LABEL[order.status]}
            </span>

            {isPendingActive && (
              <>
                <p className="text-sm text-ink-soft">
                  Essa reserva expira em{" "}
                  <span className="font-tabular font-semibold text-primary">
                    {minutesLeft}:{String(secondsLeft).padStart(2, "0")}
                  </span>
                </p>

                {/* Primary actions come first so they're reachable without scrolling
                    past the QR code — that's what the buyer needs most immediately. */}
                {!confirmingCancel ? (
                  <div className="flex items-center gap-3">
                    {order.buyerConfirmedPaymentAt ? (
                      <p className="flex-1 rounded-lg bg-primary/10 px-4 py-3 text-sm text-primary">
                        Você confirmou o envio do Pix. Aguarde a confirmação do administrador.
                      </p>
                    ) : (
                      <Button
                        variant="accent"
                        onClick={handleMarkPaid}
                        disabled={markingPaid}
                        className="flex-1"
                      >
                        {markingPaid ? "Enviando..." : "Já paguei / Pix enviado"}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={() => setConfirmingCancel(true)}
                      className="shrink-0"
                    >
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 rounded-lg border border-danger bg-danger/5 p-4">
                    <p className="text-sm text-ink">
                      Tem certeza? Isso libera{" "}
                      {order.kind === "donation" ? "essa doação" : "seus números"} para outras
                      pessoas.
                    </p>
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={() => setConfirmingCancel(false)}
                        className="flex-1"
                      >
                        Voltar
                      </Button>
                      <Button
                        variant="danger"
                        onClick={handleCancel}
                        disabled={cancelling}
                        className="flex-1"
                      >
                        {cancelling ? "Cancelando..." : "Sim, cancelar"}
                      </Button>
                    </div>
                  </div>
                )}

                {qrDataUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qrDataUrl}
                    alt="QR Code Pix"
                    className="mx-auto h-40 w-40 rounded-lg border border-line"
                  />
                )}

                <div className="rounded-lg border border-line bg-paper p-3">
                  <p className="break-all font-tabular text-xs text-ink-soft">
                    {order.pixPayload}
                  </p>
                </div>

                <CopyButton value={order.pixPayload} />

                <p className="rounded-lg border border-accent bg-accent-soft/40 px-4 py-3 text-xs leading-relaxed text-ink">
                  <strong>Atenção:</strong>{" "}
                  {order.kind === "donation"
                    ? "sua doação só é registrada após a confirmação manual do pagamento."
                    : "seus números só ficam garantidos após a confirmação manual do pagamento."}{" "}
                  Pague com o nome completo informado, para conferência.
                </p>
              </>
            )}

            {order.status === "confirmed" && (
              <p className="text-sm text-ink-soft">
                {order.kind === "donation"
                  ? "Doação confirmada! Muito obrigado pelo apoio 💛"
                  : "Pagamento confirmado! Seus números estão garantidos. Boa sorte 🍀"}
              </p>
            )}

            {(order.status === "cancelled" || isExpiredByTime || order.status === "expired") && (
              <p className="text-sm text-ink-soft">
                {order.kind === "donation"
                  ? "Essa doação não foi confirmada a tempo. Se você já pagou, entre em contato pelo WhatsApp informado na página da rifa."
                  : "Essa reserva não está mais ativa. Se você já pagou e o número consta como disponível novamente, entre em contato pelo WhatsApp informado na página da rifa."}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
