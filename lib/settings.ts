import { adminDb } from "@/lib/firebaseAdmin";
import { ticketDocId } from "@/lib/reservations";
import type { PixSettings, RaffleConfig, Ticket } from "@/lib/types";

const pixSettingsRef = adminDb.collection("paymentSettings").doc("pix");
const raffleConfigRef = adminDb.collection("config").doc("raffle");

export async function getPixSettings(): Promise<PixSettings | null> {
  const snap = await pixSettingsRef.get();
  return (snap.data() as PixSettings | undefined) ?? null;
}

/** Validated read used when actually generating a Pix payload — throws with
 *  a clear, admin-facing message instead of shipping a broken/missing key. */
export async function getPixConfig(): Promise<{
  key: string;
  merchantName: string;
  merchantCity: string;
}> {
  const settings = await getPixSettings();
  if (!settings || !settings.key) {
    throw new Error("Chave Pix ainda não configurada. Configure em /admin/configuracoes.");
  }

  // A key that's exactly "55" + 10-11 digits can only be a Brazilian phone
  // number missing its required "+" prefix (CPF has 11 digits, CNPJ has 14 —
  // neither overlaps this length). The Central Bank's DICT format for phone
  // keys is "+55DDNNNNNNNNN", and banking apps reject the QR code outright
  // if that "+" is missing.
  if (/^55\d{10,11}$/.test(settings.key)) {
    throw new Error(
      `A chave Pix parece ser um telefone sem o "+". Use "+${settings.key}" em vez de "${settings.key}".`
    );
  }

  return {
    key: settings.key,
    merchantName: settings.merchantName,
    merchantCity: settings.merchantCity,
  };
}

/** Display-only info shown on the payment page — never throws, so a missing
 *  bank name/receiver name can't break actual order/Pix payload creation. */
export async function getPixReceiverInfo(): Promise<{ name: string; bankName: string }> {
  const settings = await getPixSettings();
  return {
    name: settings?.merchantName ?? "",
    bankName: settings?.receiverBankName ?? "",
  };
}

export interface UpdatePixSettingsInput {
  key: string;
  merchantName: string;
  merchantCity: string;
  receiverBankName: string;
}

export async function updatePixSettings(input: UpdatePixSettingsInput): Promise<void> {
  const key = input.key.trim();
  const merchantName = input.merchantName.trim();
  const merchantCity = input.merchantCity.trim();

  if (!key) throw new Error("Informe a chave Pix.");
  if (!merchantName) throw new Error("Informe o nome do recebedor.");
  if (!merchantCity) throw new Error("Informe a cidade do recebedor.");
  if (/^55\d{10,11}$/.test(key)) {
    throw new Error(`A chave parece ser um telefone sem o "+". Use "+${key}" em vez de "${key}".`);
  }

  await pixSettingsRef.set(
    {
      key,
      merchantName,
      merchantCity,
      receiverBankName: input.receiverBankName.trim(),
    } satisfies PixSettings,
    { merge: true }
  );
}

export interface UpdateRaffleConfigInput {
  title: string;
  description: string;
  photoURL: string;
  prizeTitle: string;
  prizeDescription: string;
  prizePhotoURL: string;
  ticketPriceCents: number;
  goalAmountCents: number;
  regulamento: string;
  premiacaoInfo: string;
  faqIntro: string;
  whatsappNumber: string;
}

/** Edits the homepage content — everything in config/raffle except
 *  totalTickets, which has its own function (setTotalTickets) since
 *  changing it has to create/validate ticket docs, not just write a field. */
export async function updateRaffleConfig(input: UpdateRaffleConfigInput): Promise<void> {
  if (!Number.isInteger(input.ticketPriceCents) || input.ticketPriceCents <= 0) {
    throw new Error("Preço por número inválido.");
  }
  if (!Number.isInteger(input.goalAmountCents) || input.goalAmountCents <= 0) {
    throw new Error("Meta inválida.");
  }

  await raffleConfigRef.set(
    {
      title: input.title.trim(),
      description: input.description.trim(),
      photoURL: input.photoURL.trim(),
      prizeTitle: input.prizeTitle.trim(),
      prizeDescription: input.prizeDescription.trim(),
      prizePhotoURL: input.prizePhotoURL.trim(),
      ticketPriceCents: input.ticketPriceCents,
      goalAmountCents: input.goalAmountCents,
      regulamento: input.regulamento.trim(),
      premiacaoInfo: input.premiacaoInfo.trim(),
      faqIntro: input.faqIntro.trim(),
      whatsappNumber: input.whatsappNumber.trim(),
    } satisfies Partial<RaffleConfig>,
    { merge: true }
  );
}

/**
 * Changes how many ticket numbers the raffle has. Ticket doc ids are plain
 * numbers (see ticketDocId in lib/reservations.ts), so growing or shrinking
 * this never touches any existing ticket's id — growing just creates new
 * "available" docs for the added numbers, and shrinking is only blocked if
 * a number being removed from the range is still sold/reserved (so a real
 * sale can never silently fall outside the raffle).
 */
export async function setTotalTickets(newTotal: number): Promise<void> {
  if (!Number.isInteger(newTotal) || newTotal <= 0) {
    throw new Error("Total de números inválido.");
  }

  const configSnap = await raffleConfigRef.get();
  const config = configSnap.data() as RaffleConfig | undefined;
  if (!config) throw new Error("Raffle config not found.");

  const currentTotal = config.totalTickets;
  if (newTotal === currentTotal) return;

  if (newTotal > currentTotal) {
    const now = Date.now();
    const numbersToAdd = Array.from(
      { length: newTotal - currentTotal },
      (_, i) => currentTotal + i + 1
    );

    const batchSize = 400; // Firestore batch write limit is 500
    for (let start = 0; start < numbersToAdd.length; start += batchSize) {
      const batch = adminDb.batch();
      numbersToAdd.slice(start, start + batchSize).forEach((number) => {
        const ticket: Ticket = {
          number,
          status: "available",
          orderId: null,
          reservedAt: null,
          soldAt: null,
          updatedAt: now,
        };
        batch.set(adminDb.collection("tickets").doc(ticketDocId(number)), ticket);
      });
      await batch.commit();
    }
  } else {
    const numbersToRemove = Array.from(
      { length: currentTotal - newTotal },
      (_, i) => newTotal + i + 1
    );
    const snaps = await Promise.all(
      numbersToRemove.map((n) => adminDb.collection("tickets").doc(ticketDocId(n)).get())
    );
    const stillInUse: number[] = [];
    snaps.forEach((snap, i) => {
      const ticket = snap.data() as Ticket | undefined;
      if (ticket && ticket.status !== "available") {
        stillInUse.push(numbersToRemove[i]);
      }
    });
    if (stillInUse.length > 0) {
      throw new Error(
        `Não é possível reduzir para ${newTotal}: os números ${stillInUse.join(", ")} ainda estão reservados ou vendidos.`
      );
    }
  }

  await raffleConfigRef.set({ totalTickets: newTotal } satisfies Partial<RaffleConfig>, {
    merge: true,
  });
}
