/**
 * One-off migration: (re)builds ticketsState/summary from the current state
 * of the tickets collection. Needed because the live project was seeded
 * before the summary doc existed. Safe to re-run — it fully recomputes the
 * doc from the tickets collection (source of truth), it doesn't merge.
 * Run with: npx tsx scripts/backfill-tickets-summary.ts
 */
import { adminDb } from "@/lib/firebaseAdmin";
import type { Ticket, TicketSummaryEntry } from "@/lib/types";

async function backfill() {
  const snap = await adminDb.collection("tickets").get();
  const tickets: Record<string, TicketSummaryEntry> = {};

  snap.docs.forEach((doc) => {
    const ticket = doc.data() as Ticket;
    if (ticket.status === "pending") {
      tickets[doc.id] = { status: "pending", reservedAt: ticket.reservedAt ?? null };
    } else if (ticket.status === "sold") {
      tickets[doc.id] = { status: "sold", reservedAt: null };
    }
  });

  await adminDb.collection("ticketsState").doc("summary").set({ tickets });
  console.log(
    `ticketsState/summary reconstruído: ${Object.keys(tickets).length} ticket(s) não disponível(is) de ${snap.size} total.`
  );
}

backfill()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
