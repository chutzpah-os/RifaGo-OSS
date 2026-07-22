import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { RESERVATION_TTL_MINUTES } from "@/lib/config";
import { ticketDocId } from "@/lib/reservations";
import type { RaffleConfig, TicketsSummary } from "@/lib/types";

/**
 * Returns which ticket numbers are still available, computed by exclusion
 * from a single denormalized summary doc (ticketsState/summary) instead of
 * reading all 500 individual ticket docs. That's 2 reads total (summary +
 * config) no matter how many tickets exist or how often this is polled,
 * versus 500 reads per call under the old approach — the modal alone could
 * burn 10k+ reads in a few minutes of being left open.
 */
const CACHE_TTL_MS = 5000;
const TTL_MS = RESERVATION_TTL_MINUTES * 60 * 1000;

interface CacheEntry {
  totalTickets: number;
  unavailable: TicketsSummary["tickets"];
  fetchedAt: number;
}

let cache: CacheEntry | null = null;
let inFlight: Promise<CacheEntry> | null = null;

async function refresh(): Promise<CacheEntry> {
  const [summarySnap, configSnap] = await Promise.all([
    adminDb.collection("ticketsState").doc("summary").get(),
    adminDb.collection("config").doc("raffle").get(),
  ]);

  const summary = summarySnap.data() as TicketsSummary | undefined;
  const config = configSnap.data() as RaffleConfig | undefined;
  if (!config) throw new Error("Raffle config not found.");

  const entry: CacheEntry = {
    totalTickets: config.totalTickets,
    unavailable: summary?.tickets ?? {},
    fetchedAt: Date.now(),
  };
  cache = entry;
  return entry;
}

export async function GET() {
  const isFresh = cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS;

  if (!isFresh) {
    inFlight ??= refresh().finally(() => {
      inFlight = null;
    });

    try {
      await inFlight;
    } catch (err) {
      if (!cache) {
        console.error("Failed to fetch ticket summary and no cache available:", err);
        return NextResponse.json({ error: "Unavailable" }, { status: 503 });
      }
    }
  }

  const { totalTickets, unavailable } = cache!;
  const now = Date.now();
  const availableNumbers: number[] = [];

  for (let n = 1; n <= totalTickets; n += 1) {
    const entry = unavailable[ticketDocId(n)];
    if (!entry) {
      availableNumbers.push(n);
      continue;
    }
    // A "pending" entry past its reservation TTL is available again even
    // before the cron job (or the next reservation attempt) formally frees
    // it in the summary doc.
    if (entry.status === "pending" && (entry.reservedAt ?? 0) + TTL_MS < now) {
      availableNumbers.push(n);
    }
  }

  return NextResponse.json(
    { availableNumbers },
    { headers: { "Cache-Control": "public, max-age=0, must-revalidate" } }
  );
}
