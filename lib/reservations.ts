import { randomUUID } from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { generatePixPayload } from "@/lib/pix";
import { MAX_TICKETS_PER_ORDER, MIN_DONATION_CENTS, RESERVATION_TTL_MINUTES } from "@/lib/config";
import { getPixConfig } from "@/lib/settings";
import type { Order, RaffleConfig, Ticket, TicketSummaryEntry } from "@/lib/types";

const TTL_MS = RESERVATION_TTL_MINUTES * 60 * 1000;

// The ticket number itself is the doc id — deliberately NOT zero-padded to
// a width derived from totalTickets, since that would tie every existing
// ticket's id to whatever totalTickets happened to be when it was created.
// Changing totalTickets later (the whole point of letting the admin edit
// it) would then silently point at the wrong docs. A plain number has no
// such ceiling and never needs to change format again.
export function ticketDocId(number: number): string {
  return String(number);
}

function isReservationExpired(ticket: Ticket): boolean {
  return ticket.status === "pending" && (ticket.reservedAt ?? 0) + TTL_MS < Date.now();
}

const ticketsSummaryRef = adminDb.collection("ticketsState").doc("summary");

/**
 * Updates the cheap-to-read ticket summary (see TicketsSummary in
 * lib/types.ts) as a side effect of a reservation change. Deliberately NOT
 * part of the same transaction: including it there would make every
 * reservation contend on this one shared document regardless of which
 * ticket numbers were involved — exactly the bottleneck doc-per-ticket was
 * chosen to avoid. A brief staleness window here is fine because the
 * actual reservation transaction always re-validates against the real
 * per-ticket docs, which remain the source of truth.
 */
async function syncTicketSummary(
  ticketIds: string[],
  entry: TicketSummaryEntry | null // null = ticket became available again
): Promise<void> {
  if (ticketIds.length === 0) return;
  const updates: Record<string, TicketSummaryEntry | FieldValue> = {};
  ticketIds.forEach((id) => {
    updates[`tickets.${id}`] = entry ?? FieldValue.delete();
  });
  await ticketsSummaryRef.update(updates);
}

const raffleStatsRef = adminDb.collection("raffleState").doc("stats");

/**
 * Adjusts the denormalized raised-amount/ranking totals (see RaffleStats in
 * lib/types.ts) as a side effect after a confirmed order's amount, buyer,
 * or ticket numbers change. Only ever called for orders that are (or just
 * became, or just stopped being) "confirmed" — pending/cancelled/expired
 * orders never contributed to these totals in the first place. Uses
 * FieldValue.increment so concurrent confirmations never clobber each
 * other's delta the way a read-then-write would.
 */
async function adjustRaffleStats(delta: {
  amountCents: number;
  buyerName?: string;
  ticketCountDelta?: number;
}): Promise<void> {
  const updates: Record<string, FieldValue> = {
    raisedCents: FieldValue.increment(delta.amountCents),
  };
  if (delta.buyerName && delta.ticketCountDelta) {
    updates[`buyerTicketCounts.${delta.buyerName}`] = FieldValue.increment(delta.ticketCountDelta);
  }
  await raffleStatsRef.update(updates);
}

export class TicketsUnavailableError extends Error {
  constructor(public unavailableNumbers: number[]) {
    super(`Ticket numbers no longer available: ${unavailableNumbers.join(", ")}`);
    this.name = "TicketsUnavailableError";
  }
}

export interface CreateOrderInput {
  buyerName: string;
  buyerPhone: string;
  ticketNumbers: number[];
}

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  const ticketNumbers = [...new Set(input.ticketNumbers)].sort((a, b) => a - b);
  if (ticketNumbers.length === 0) {
    throw new Error("Select at least one ticket number.");
  }
  if (ticketNumbers.length > MAX_TICKETS_PER_ORDER) {
    throw new Error(`You can select at most ${MAX_TICKETS_PER_ORDER} tickets per order.`);
  }

  const orderRef = adminDb.collection("orders").doc();
  const pix = await getPixConfig();
  let reservedTicketIds: string[] = [];

  const order = await adminDb.runTransaction(async (tx) => {
    const configSnap = await tx.get(adminDb.collection("config").doc("raffle"));
    const config = configSnap.data() as RaffleConfig | undefined;
    if (!config) throw new Error("Raffle config not found.");

    const ticketRefs = ticketNumbers.map((n) =>
      adminDb.collection("tickets").doc(ticketDocId(n))
    );
    const ticketSnaps = await Promise.all(ticketRefs.map((ref) => tx.get(ref)));

    const unavailable: number[] = [];
    const staleOrderIds = new Set<string>();

    ticketSnaps.forEach((snap, i) => {
      const ticket = snap.data() as Ticket | undefined;
      if (!ticket) {
        unavailable.push(ticketNumbers[i]);
        return;
      }
      if (ticket.status === "available") return;
      if (isReservationExpired(ticket)) {
        if (ticket.orderId) staleOrderIds.add(ticket.orderId);
        return;
      }
      unavailable.push(ticketNumbers[i]);
    });

    if (unavailable.length > 0) {
      throw new TicketsUnavailableError(unavailable);
    }

    const amountCents = ticketNumbers.length * config.ticketPriceCents;
    const now = Date.now();
    const txid = randomUUID().replace(/[^A-Za-z0-9]/g, "").slice(0, 25);
    const pixPayload = generatePixPayload({
      key: pix.key,
      merchantName: pix.merchantName,
      merchantCity: pix.merchantCity,
      amountCents,
      txid,
    });

    const order: Order = {
      id: orderRef.id,
      buyerName: input.buyerName.trim(),
      buyerPhone: input.buyerPhone.trim(),
      ticketNumbers,
      kind: "tickets",
      amountCents,
      status: "pending",
      pixTxid: txid,
      pixPayload,
      createdAt: now,
      expiresAt: now + TTL_MS,
      confirmedAt: null,
      buyerConfirmedPaymentAt: null,
    };

    tx.set(orderRef, order);

    ticketRefs.forEach((ref) => {
      tx.set(
        ref,
        {
          status: "pending",
          orderId: orderRef.id,
          reservedAt: now,
          updatedAt: now,
        } satisfies Partial<Ticket>,
        { merge: true }
      );
    });

    staleOrderIds.forEach((staleId) => {
      tx.set(
        adminDb.collection("orders").doc(staleId),
        { status: "expired" } satisfies Partial<Order>,
        { merge: true }
      );
    });

    reservedTicketIds = ticketRefs.map((ref) => ref.id);
    return order;
  });

  await syncTicketSummary(reservedTicketIds, {
    status: "pending",
    reservedAt: order.createdAt,
  });

  return order;
}

export interface CreateDonationInput {
  buyerName: string;
  buyerPhone: string;
  amountCents: number;
}

/**
 * A donation is just an order with no ticket numbers — no contested
 * resource to reserve, so unlike createOrder this needs no transaction.
 */
export async function createDonation(input: CreateDonationInput): Promise<Order> {
  if (!Number.isInteger(input.amountCents) || input.amountCents < MIN_DONATION_CENTS) {
    throw new Error(`Minimum donation amount is ${MIN_DONATION_CENTS} cents.`);
  }

  const pix = await getPixConfig();
  const orderRef = adminDb.collection("orders").doc();
  const now = Date.now();
  const txid = randomUUID().replace(/[^A-Za-z0-9]/g, "").slice(0, 25);
  const pixPayload = generatePixPayload({
    key: pix.key,
    merchantName: pix.merchantName,
    merchantCity: pix.merchantCity,
    amountCents: input.amountCents,
    txid,
  });

  const order: Order = {
    id: orderRef.id,
    buyerName: input.buyerName.trim(),
    buyerPhone: input.buyerPhone.trim(),
    ticketNumbers: [],
    kind: "donation",
    amountCents: input.amountCents,
    status: "pending",
    pixTxid: txid,
    pixPayload,
    createdAt: now,
    expiresAt: now + TTL_MS,
    confirmedAt: null,
    buyerConfirmedPaymentAt: null,
  };

  await orderRef.set(order);
  return order;
}

/** Buyer-side signal ("Já paguei") — not proof of payment, just a hint for the admin. */
export async function markBuyerConfirmedPayment(orderId: string): Promise<void> {
  const orderRef = adminDb.collection("orders").doc(orderId);
  const snap = await orderRef.get();
  const order = snap.data() as Order | undefined;
  if (!order) throw new Error("Order not found.");
  if (order.status !== "pending") {
    throw new Error(`Order is ${order.status}, cannot mark as paid.`);
  }
  await orderRef.set(
    { buyerConfirmedPaymentAt: Date.now() } satisfies Partial<Order>,
    { merge: true }
  );
}

export interface UpdateOrderContactInfoInput {
  buyerName: string;
  buyerPhone: string;
}

/** Lets the buyer fix a typo'd name/phone while the order is still pending. */
export async function updateOrderContactInfo(
  orderId: string,
  input: UpdateOrderContactInfoInput
): Promise<void> {
  const orderRef = adminDb.collection("orders").doc(orderId);
  const snap = await orderRef.get();
  const order = snap.data() as Order | undefined;
  if (!order) throw new Error("Order not found.");
  if (order.status !== "pending") {
    throw new Error(`Order is ${order.status}, cannot edit.`);
  }
  await orderRef.set(
    {
      buyerName: input.buyerName.trim(),
      buyerPhone: input.buyerPhone.trim(),
    } satisfies Partial<Order>,
    { merge: true }
  );
}

export async function confirmOrder(orderId: string): Promise<void> {
  let confirmedTicketIds: string[] = [];
  let confirmedOrder: Order | null = null;

  await adminDb.runTransaction(async (tx) => {
    const orderRef = adminDb.collection("orders").doc(orderId);
    const orderSnap = await tx.get(orderRef);
    const order = orderSnap.data() as Order | undefined;
    if (!order) throw new Error("Order not found.");
    // Already confirmed is treated as a no-op success rather than an error —
    // a double-click on the button (no client-side guard against it) fires
    // this twice, and the second call shouldn't crash the admin's screen.
    if (order.status === "confirmed") return;
    if (order.status !== "pending") {
      throw new Error(`Order is ${order.status}, cannot confirm.`);
    }

    const now = Date.now();
    const ticketIds: string[] = [];
    order.ticketNumbers.forEach((number) => {
      const id = ticketDocId(number);
      ticketIds.push(id);
      tx.set(
        adminDb.collection("tickets").doc(id),
        { status: "sold", soldAt: now, updatedAt: now } satisfies Partial<Ticket>,
        { merge: true }
      );
    });

    tx.set(orderRef, { status: "confirmed", confirmedAt: now } satisfies Partial<Order>, {
      merge: true,
    });

    confirmedTicketIds = ticketIds;
    confirmedOrder = order;
  });

  // Sold tickets stay flagged (not removed) in the summary — they're still
  // "not available", just no longer "pending".
  await syncTicketSummary(confirmedTicketIds, { status: "sold", reservedAt: null });

  if (confirmedOrder) {
    const order: Order = confirmedOrder;
    await adjustRaffleStats({
      amountCents: order.amountCents,
      buyerName: order.buyerName,
      ticketCountDelta: order.ticketNumbers.length,
    });
  }
}

export async function cancelOrder(orderId: string): Promise<void> {
  let freedTicketIds: string[] = [];

  await adminDb.runTransaction(async (tx) => {
    const orderRef = adminDb.collection("orders").doc(orderId);
    const orderSnap = await tx.get(orderRef);
    const order = orderSnap.data() as Order | undefined;
    if (!order) throw new Error("Order not found.");
    // Already cancelled is a no-op success, not an error — see confirmOrder
    // for why (double-click with no client-side guard against it).
    if (order.status === "cancelled") return;
    if (order.status !== "pending") {
      throw new Error(`Order is ${order.status}, cannot cancel.`);
    }

    const now = Date.now();
    const ticketIds: string[] = [];
    order.ticketNumbers.forEach((number) => {
      const id = ticketDocId(number);
      ticketIds.push(id);
      tx.set(
        adminDb.collection("tickets").doc(id),
        {
          status: "available",
          orderId: null,
          reservedAt: null,
          updatedAt: now,
        } satisfies Partial<Ticket>,
        { merge: true }
      );
    });

    tx.set(orderRef, { status: "cancelled" } satisfies Partial<Order>, { merge: true });

    freedTicketIds = ticketIds;
  });

  await syncTicketSummary(freedTicketIds, null);
}

/** Best-effort tidy-up for the cron route; correctness does not depend on this running. */
export async function expireStaleReservations(): Promise<number> {
  const cutoff = Date.now() - TTL_MS;
  // Single equality filter (no composite index needed); the reservedAt
  // cutoff is applied in memory since "pending" tickets are always bounded
  // by the raffle size.
  const pendingTickets = await adminDb.collection("tickets").where("status", "==", "pending").get();
  const staleDocs = pendingTickets.docs.filter((doc) => {
    const ticket = doc.data() as Ticket;
    return (ticket.reservedAt ?? 0) < cutoff;
  });

  const staleOrderIds = new Set<string>();
  const batch = adminDb.batch();
  const now = Date.now();

  staleDocs.forEach((doc) => {
    const ticket = doc.data() as Ticket;
    if (ticket.orderId) staleOrderIds.add(ticket.orderId);
    batch.set(
      doc.ref,
      { status: "available", orderId: null, reservedAt: null, updatedAt: now } satisfies Partial<Ticket>,
      { merge: true }
    );
  });

  // Donation orders hold no ticket, so they aren't reachable from the
  // tickets collection above — expire stale pending ones directly.
  const pendingOrders = await adminDb.collection("orders").where("status", "==", "pending").get();
  let staleDonationCount = 0;
  pendingOrders.docs.forEach((doc) => {
    const order = doc.data() as Order;
    if (order.kind === "donation" && order.createdAt < cutoff) {
      staleOrderIds.add(doc.id);
      staleDonationCount += 1;
    }
  });

  if (staleDocs.length === 0 && staleDonationCount === 0) return 0;

  staleOrderIds.forEach((orderId) => {
    batch.set(
      adminDb.collection("orders").doc(orderId),
      { status: "expired" } satisfies Partial<Order>,
      { merge: true }
    );
  });

  await batch.commit();
  await syncTicketSummary(staleDocs.map((doc) => doc.id), null);
  return staleDocs.length + staleDonationCount;
}

export interface AdminUpdateOrderInput {
  buyerName: string;
  buyerPhone: string;
  amountCents: number;
  /** Ignored for donation orders — a donation never has ticket numbers. */
  ticketNumbers: number[];
}

/**
 * Lets the admin correct a mistake on an already-confirmed order: typo'd
 * contact info, wrong amount, or the wrong ticket number(s). Changing ticket
 * numbers still validates the newly-added ones against the real per-ticket
 * docs inside a transaction (same as createOrder) so this can never silently
 * double-sell a number — only the diff (added/removed numbers) is touched,
 * not the whole ticket set, so the cost stays proportional to the edit size.
 */
export async function adminUpdateConfirmedOrder(
  orderId: string,
  input: AdminUpdateOrderInput
): Promise<void> {
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
    throw new Error("Valor inválido.");
  }

  let freedTicketIds: string[] = [];
  let addedTicketIds: string[] = [];
  let oldBuyerName = "";
  let oldAmountCents = 0;
  let oldTicketCount = 0;
  let newTicketCount = 0;

  await adminDb.runTransaction(async (tx) => {
    const orderRef = adminDb.collection("orders").doc(orderId);
    const orderSnap = await tx.get(orderRef);
    const order = orderSnap.data() as Order | undefined;
    if (!order) throw new Error("Order not found.");
    if (order.status !== "confirmed") {
      throw new Error(`Order is ${order.status}, cannot edit as a confirmed order.`);
    }

    oldBuyerName = order.buyerName;
    oldAmountCents = order.amountCents;
    oldTicketCount = order.ticketNumbers.length;

    const newNumbers =
      order.kind === "donation"
        ? []
        : [...new Set(input.ticketNumbers)].sort((a, b) => a - b);

    const oldSet = new Set(order.ticketNumbers);
    const newSet = new Set(newNumbers);
    const removed = order.ticketNumbers.filter((n) => !newSet.has(n));
    const added = newNumbers.filter((n) => !oldSet.has(n));

    const addedRefs = added.map((n) =>
      adminDb.collection("tickets").doc(ticketDocId(n))
    );
    const addedSnaps = await Promise.all(addedRefs.map((ref) => tx.get(ref)));

    const unavailable: number[] = [];
    addedSnaps.forEach((snap, i) => {
      const ticket = snap.data() as Ticket | undefined;
      if (!ticket) return;
      if (ticket.status === "available") return;
      if (isReservationExpired(ticket)) return;
      unavailable.push(added[i]);
    });
    if (unavailable.length > 0) {
      throw new TicketsUnavailableError(unavailable);
    }

    const now = Date.now();

    removed.forEach((n) => {
      tx.set(
        adminDb.collection("tickets").doc(ticketDocId(n)),
        {
          status: "available",
          orderId: null,
          reservedAt: null,
          soldAt: null,
          updatedAt: now,
        } satisfies Partial<Ticket>,
        { merge: true }
      );
    });

    added.forEach((n) => {
      tx.set(
        adminDb.collection("tickets").doc(ticketDocId(n)),
        { status: "sold", orderId: orderRef.id, soldAt: now, updatedAt: now } satisfies Partial<Ticket>,
        { merge: true }
      );
    });

    tx.set(
      orderRef,
      {
        buyerName: input.buyerName.trim(),
        buyerPhone: input.buyerPhone.trim(),
        amountCents: input.amountCents,
        ticketNumbers: newNumbers,
      } satisfies Partial<Order>,
      { merge: true }
    );

    freedTicketIds = removed.map((n) => ticketDocId(n));
    addedTicketIds = added.map((n) => ticketDocId(n));
    newTicketCount = newNumbers.length;
  });

  await syncTicketSummary(freedTicketIds, null);
  await syncTicketSummary(addedTicketIds, { status: "sold", reservedAt: null });

  const newBuyerName = input.buyerName.trim();
  const amountDelta = input.amountCents - oldAmountCents;

  if (oldBuyerName === newBuyerName) {
    await adjustRaffleStats({
      amountCents: amountDelta,
      buyerName: newBuyerName,
      ticketCountDelta: newTicketCount - oldTicketCount,
    });
  } else {
    await adjustRaffleStats({
      amountCents: amountDelta,
      buyerName: oldBuyerName,
      ticketCountDelta: -oldTicketCount,
    });
    await adjustRaffleStats({
      amountCents: 0,
      buyerName: newBuyerName,
      ticketCountDelta: newTicketCount,
    });
  }
}

/**
 * Removes a confirmed order entirely and frees whatever ticket numbers it
 * held — used when the admin confirmed something by mistake (e.g. test
 * data, duplicate entry). Only touches that order's own tickets, bounded by
 * MAX_TICKETS_PER_ORDER, never the full collection.
 */
export async function adminDeleteConfirmedOrder(orderId: string): Promise<void> {
  let freedTicketIds: string[] = [];
  let deletedOrder: Order | null = null;

  await adminDb.runTransaction(async (tx) => {
    const orderRef = adminDb.collection("orders").doc(orderId);
    const orderSnap = await tx.get(orderRef);
    const order = orderSnap.data() as Order | undefined;
    if (!order) throw new Error("Order not found.");
    if (order.status !== "confirmed") {
      throw new Error(`Order is ${order.status}, cannot delete as a confirmed order.`);
    }
    deletedOrder = order;

    const now = Date.now();
    const ticketIds: string[] = [];
    order.ticketNumbers.forEach((number) => {
      const id = ticketDocId(number);
      ticketIds.push(id);
      tx.set(
        adminDb.collection("tickets").doc(id),
        {
          status: "available",
          orderId: null,
          reservedAt: null,
          soldAt: null,
          updatedAt: now,
        } satisfies Partial<Ticket>,
        { merge: true }
      );
    });

    tx.delete(orderRef);

    freedTicketIds = ticketIds;
  });

  await syncTicketSummary(freedTicketIds, null);

  if (deletedOrder) {
    const order: Order = deletedOrder;
    await adjustRaffleStats({
      amountCents: -order.amountCents,
      buyerName: order.buyerName,
      ticketCountDelta: -order.ticketNumbers.length,
    });
  }
}
