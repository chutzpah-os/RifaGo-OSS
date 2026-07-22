"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { MIN_DONATION_CENTS } from "@/lib/config";
import {
  cancelOrder,
  createDonation,
  createOrder,
  markBuyerConfirmedPayment,
  TicketsUnavailableError,
  updateOrderContactInfo,
} from "@/lib/reservations";

const buyerSchema = {
  buyerName: z
    .string()
    .trim()
    .min(1, "Informe seu nome completo.")
    .refine((v) => v.split(/\s+/).length >= 2, "Informe nome e sobrenome (nome completo)."),
  buyerPhone: z.string().trim().min(8, "Informe um telefone válido."),
};

const orderSchema = z.object({
  ...buyerSchema,
  ticketNumbers: z.array(z.number().int().positive()).min(1, "Selecione ao menos um número."),
});

const donationSchema = z.object({
  ...buyerSchema,
  amountCents: z
    .number()
    .int()
    .min(MIN_DONATION_CENTS, `O valor mínimo para doação é ${MIN_DONATION_CENTS / 100} reais.`),
});

export interface CreateOrderState {
  error?: string;
  unavailableNumbers?: number[];
}

export async function createOrderAction(
  _prevState: CreateOrderState,
  formData: FormData
): Promise<CreateOrderState> {
  let ticketNumbers: unknown;
  try {
    ticketNumbers = JSON.parse(String(formData.get("ticketNumbers") ?? "[]"));
  } catch {
    return { error: "Seleção de números inválida." };
  }

  const parsed = orderSchema.safeParse({
    buyerName: formData.get("buyerName"),
    buyerPhone: formData.get("buyerPhone"),
    ticketNumbers,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  let orderId: string;
  try {
    const order = await createOrder(parsed.data);
    orderId = order.id;
  } catch (err) {
    if (err instanceof TicketsUnavailableError) {
      return {
        error: "Alguns números escolhidos acabaram de ficar indisponíveis. Ajuste sua seleção.",
        unavailableNumbers: err.unavailableNumbers,
      };
    }
    return { error: err instanceof Error ? err.message : "Erro ao criar pedido." };
  }

  redirect(`/pedido/${orderId}`);
}

export interface CreateDonationState {
  error?: string;
}

export async function createDonationAction(
  _prevState: CreateDonationState,
  formData: FormData
): Promise<CreateDonationState> {
  const amountReais = Number(String(formData.get("amountReais") ?? "").replace(",", "."));
  const amountCents = Math.round(amountReais * 100);

  const parsed = donationSchema.safeParse({
    buyerName: formData.get("buyerName"),
    buyerPhone: formData.get("buyerPhone"),
    amountCents,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  let orderId: string;
  try {
    const order = await createDonation(parsed.data);
    orderId = order.id;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro ao criar doação." };
  }

  redirect(`/pedido/${orderId}`);
}

// The buyer's own order id acts as the access token for these actions (same
// model as the get-only Firestore rule on `orders`) — no separate auth needed.

export async function markBuyerConfirmedPaymentAction(orderId: string): Promise<void> {
  await markBuyerConfirmedPayment(orderId);
}

export async function cancelOwnOrderAction(orderId: string): Promise<void> {
  await cancelOrder(orderId);
  revalidatePath("/");
}

export interface UpdateContactState {
  error?: string;
  success?: boolean;
}

export async function updateOrderContactAction(
  _prevState: UpdateContactState,
  formData: FormData
): Promise<UpdateContactState> {
  const orderId = String(formData.get("orderId") ?? "");
  if (!orderId) return { error: "Pedido inválido." };

  const parsed = z.object(buyerSchema).safeParse({
    buyerName: formData.get("buyerName"),
    buyerPhone: formData.get("buyerPhone"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  try {
    await updateOrderContactInfo(orderId, parsed.data);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro ao atualizar dados." };
  }

  return { success: true };
}
