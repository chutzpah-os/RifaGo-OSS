/**
 * One-off setup script: creates config/raffle and all tickets/{number} docs.
 * Run with: npx tsx scripts/seed.ts
 * Edit the RAFFLE constant below to match the real raffle before running.
 */
import { adminDb } from "@/lib/firebaseAdmin";
import { ticketDocId } from "@/lib/reservations";
import type { RaffleConfig, Ticket } from "@/lib/types";

const TOTAL_TICKETS = 500;
const TICKET_PRICE_CENTS = 2000; // R$ 20,00

const RAFFLE: RaffleConfig = {
  title: "Rifa de Exemplo",
  description: "Ajude a nossa causa e concorra a um prêmio! Edite este texto em scripts/seed.ts.",
  // Pode ser um caminho local (arquivo em public/) ou uma URL externa — nesse
  // caso adicione o domínio em images.remotePatterns no next.config.ts.
  photoURL: "https://images.unsplash.com/photo-1517457373958-b7bdd4587205",
  prizeTitle: "Prêmio de exemplo",
  prizeDescription: "Descreva aqui o prêmio da sua rifa.",
  prizePhotoURL: "https://images.unsplash.com/photo-1517457373958-b7bdd4587205",
  ticketPriceCents: TICKET_PRICE_CENTS,
  totalTickets: TOTAL_TICKETS,
  goalAmountCents: TOTAL_TICKETS * TICKET_PRICE_CENTS,
  regulamento:
    "Cada número custa R$ 20,00. A reserva de um número só é confirmada após o " +
    "pagamento via Pix ser efetivado e conferido manualmente — não há reserva " +
    "sem pagamento. Em caso de não confirmação do pagamento dentro do prazo, o " +
    "número volta a ficar disponível para outros participantes.",
  premiacaoInfo:
    "O sorteio será realizado ao vivo (vídeo/Instagram) após a venda de todos " +
    "os números, com data e horário divulgados com antecedência a todos os participantes.",
  faqIntro: "Deixe seu nome e telefone que te chamamos no WhatsApp.",
  whatsappNumber: "5500000000000", // formato internacional sem símbolos
  createdAt: Date.now(),
};

async function seed() {
  await adminDb.collection("config").doc("raffle").set(RAFFLE);
  console.log("config/raffle criado.");

  await adminDb.collection("ticketsState").doc("summary").set({ tickets: {} });
  console.log("ticketsState/summary criado.");

  await adminDb
    .collection("raffleState")
    .doc("stats")
    .set({ raisedCents: 0, buyerTicketCounts: {} });
  console.log("raffleState/stats criado.");

  const batchSize = 400; // Firestore batch write limit is 500
  for (let start = 1; start <= TOTAL_TICKETS; start += batchSize) {
    const batch = adminDb.batch();
    const end = Math.min(start + batchSize - 1, TOTAL_TICKETS);
    for (let number = start; number <= end; number++) {
      const ticket: Ticket = {
        number,
        status: "available",
        orderId: null,
        reservedAt: null,
        soldAt: null,
        updatedAt: Date.now(),
      };
      batch.set(adminDb.collection("tickets").doc(ticketDocId(number)), ticket);
    }
    await batch.commit();
    console.log(`Tickets ${start}-${end} criados.`);
  }

  console.log("Seed concluído.");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
