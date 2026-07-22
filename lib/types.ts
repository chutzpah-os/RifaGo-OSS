export type TicketStatus = "available" | "pending" | "sold";

export interface RaffleConfig {
  title: string;
  description: string;
  photoURL: string;
  prizeTitle: string;
  prizeDescription: string;
  prizePhotoURL: string;
  ticketPriceCents: number;
  totalTickets: number;
  goalAmountCents: number;
  regulamento: string;
  premiacaoInfo: string;
  /** Intro text shown above the WhatsApp contact form in the "Dúvidas" section. */
  faqIntro: string;
  /** International format, no symbols (e.g. 5511987654321) — used to build the wa.me link. */
  whatsappNumber: string;
  createdAt: number;
}

export interface Ticket {
  number: number;
  status: TicketStatus;
  orderId: string | null;
  reservedAt: number | null;
  soldAt: number | null;
  updatedAt: number;
}

export type OrderStatus = "pending" | "confirmed" | "expired" | "cancelled";

export type OrderKind = "tickets" | "donation";

export interface Order {
  id: string;
  buyerName: string;
  buyerPhone: string;
  ticketNumbers: number[];
  kind: OrderKind;
  amountCents: number;
  status: OrderStatus;
  pixTxid: string;
  pixPayload: string;
  createdAt: number;
  expiresAt: number;
  confirmedAt: number | null;
  /** Set when the buyer clicks "Já paguei" — a signal for the admin, not proof of payment. */
  buyerConfirmedPaymentAt: number | null;
}

export interface RankingEntry {
  buyerName: string;
  ticketCount: number;
}

export interface RaffleProgress {
  soldCount: number;
  availableCount: number;
  totalTickets: number;
  raisedCents: number;
  goalAmountCents: number;
  percent: number;
}

/**
 * A cheap-to-read projection of ticket state, kept only for non-available
 * tickets (sold/pending). Updated as a side effect right after each
 * reservation transaction commits — NOT itself part of that transaction, so
 * concurrent reservations of different numbers never contend on this doc.
 * The 500 individual ticket docs remain the source of truth for
 * correctness; this doc exists purely so the picker grid can be read in a
 * single Firestore read instead of 500.
 */
export interface TicketSummaryEntry {
  status: "pending" | "sold";
  reservedAt: number | null;
}

export interface TicketsSummary {
  tickets: Record<string, TicketSummaryEntry>;
}

/**
 * Denormalized totals kept in sync as a side effect whenever a confirmed
 * order's amount/buyer/tickets change (confirm, admin edit, admin delete).
 * Exists purely so the homepage/admin can get the raised amount and buyer
 * ranking with a single read instead of reading every confirmed order —
 * that full-collection read only gets more expensive as more orders come
 * in over the life of the raffle.
 */
export interface RaffleStats {
  raisedCents: number;
  buyerTicketCounts: Record<string, number>;
}

/**
 * Pix receiving details, editable by the admin instead of living in env
 * vars — lets the organizer set/change the receiving key without a
 * redeploy. Kept in a collection the client can never read (unlike
 * config/raffle), since this is where-the-money-goes data.
 */
export interface PixSettings {
  key: string;
  merchantName: string;
  merchantCity: string;
  /** Shown on the payment page so buyers can double-check they're paying the right person. Optional. */
  receiverBankName: string;
}
