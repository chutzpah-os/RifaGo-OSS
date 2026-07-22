import { adminDb } from "@/lib/firebaseAdmin";
import type { RaffleConfig, RaffleProgress, RaffleStats, RankingEntry } from "@/lib/types";

/**
 * Fetches everything the homepage (and admin dashboard) needs from Firestore
 * in one shot, cached for a few seconds and shared across every visitor —
 * same pattern as /api/tickets. Raised amount and buyer ranking come from
 * the denormalized raffleState/stats doc (kept in sync by lib/reservations.ts
 * whenever a confirmed order's amount/buyer/tickets change) instead of
 * reading every confirmed order — that full-collection read only gets more
 * expensive as more orders come in over the life of the raffle, while this
 * stays a fixed 4 reads no matter how many orders exist.
 */
const CACHE_TTL_MS = 5000;
const TOP_BUYERS_LIMIT = 10;

export interface RaffleData {
  config: RaffleConfig | null;
  progress: RaffleProgress;
  topBuyers: RankingEntry[];
}

let cache: { data: RaffleData; fetchedAt: number } | null = null;
let inFlight: Promise<RaffleData> | null = null;

async function fetchRaffleData(): Promise<RaffleData> {
  const [configSnap, soldCountSnap, pendingCountSnap, statsSnap] = await Promise.all([
    adminDb.collection("config").doc("raffle").get(),
    // count() aggregations are billed as ~1 read regardless of how many docs
    // match — this is how we get ticket stats without ever reading all 500
    // ticket documents (that used to cost 500 reads per refresh).
    adminDb.collection("tickets").where("status", "==", "sold").count().get(),
    adminDb.collection("tickets").where("status", "==", "pending").count().get(),
    adminDb.collection("raffleState").doc("stats").get(),
  ]);

  const config = (configSnap.data() as RaffleConfig | undefined) ?? null;
  const soldCount = soldCountSnap.data().count;
  const pendingCount = pendingCountSnap.data().count;
  const totalTickets = config?.totalTickets ?? 0;
  const availableCount = Math.max(0, totalTickets - soldCount - pendingCount);

  const stats = statsSnap.data() as RaffleStats | undefined;
  const raisedCents = stats?.raisedCents ?? 0;
  const buyerTicketCounts = stats?.buyerTicketCounts ?? {};

  const goalAmountCents = config?.goalAmountCents ?? 0;
  const percent = goalAmountCents > 0 ? (raisedCents / goalAmountCents) * 100 : 0;

  const progress: RaffleProgress = {
    soldCount,
    availableCount,
    totalTickets,
    raisedCents,
    goalAmountCents,
    percent: Math.min(100, percent),
  };

  const topBuyers = Object.entries(buyerTicketCounts)
    .filter(([, ticketCount]) => ticketCount > 0)
    .map(([buyerName, ticketCount]) => ({ buyerName, ticketCount }))
    .sort((a, b) => b.ticketCount - a.ticketCount)
    .slice(0, TOP_BUYERS_LIMIT);

  return { config, progress, topBuyers };
}

export async function getCachedRaffleData(): Promise<RaffleData> {
  const isFresh = cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS;
  if (isFresh) return cache!.data;

  inFlight ??= fetchRaffleData().finally(() => {
    inFlight = null;
  });

  try {
    const data = await inFlight;
    cache = { data, fetchedAt: Date.now() };
    return data;
  } catch (err) {
    // Stale-while-error: keep serving the last good snapshot instead of
    // breaking the whole homepage on a transient Firestore hiccup.
    if (cache) return cache.data;
    throw err;
  }
}
