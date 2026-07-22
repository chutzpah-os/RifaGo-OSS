"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { COOKIE_NAME, SESSION_DURATION_SECONDS, createSessionToken } from "@/lib/auth";
import { getAdminPasswordHash } from "@/lib/config";
import {
  adminDeleteConfirmedOrder,
  adminUpdateConfirmedOrder,
  cancelOrder,
  confirmOrder,
  createDonation,
  createOrder,
  TicketsUnavailableError,
} from "@/lib/reservations";
import { setTotalTickets, updatePixSettings, updateRaffleConfig } from "@/lib/settings";

const PLACEHOLDER_PHONE = "não informado";

export interface LoginState {
  error?: string;
}

export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const password = String(formData.get("password") ?? "");
  const valid = await bcrypt.compare(password, getAdminPasswordHash());

  if (!valid) {
    return { error: "Senha incorreta." };
  }

  const token = await createSessionToken();
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });

  redirect("/admin");
}

export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  redirect("/admin/login");
}

export async function confirmOrderAction(orderId: string): Promise<void> {
  await confirmOrder(orderId);
  revalidatePath("/admin/pedidos");
  revalidatePath("/");
}

export async function cancelOrderAction(orderId: string): Promise<void> {
  await cancelOrder(orderId);
  revalidatePath("/admin/pedidos");
  revalidatePath("/");
}

export interface UpdateConfirmedOrderState {
  error?: string;
  success?: boolean;
}

export async function updateConfirmedOrderAction(
  _prevState: UpdateConfirmedOrderState,
  formData: FormData
): Promise<UpdateConfirmedOrderState> {
  const orderId = String(formData.get("orderId") ?? "");
  const buyerName = String(formData.get("buyerName") ?? "");
  const buyerPhone = String(formData.get("buyerPhone") ?? "");
  const amountReais = String(formData.get("amountReais") ?? "").replace(",", ".");
  const ticketNumbersRaw = String(formData.get("ticketNumbers") ?? "");

  const amountCents = Math.round(parseFloat(amountReais) * 100);
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    return { error: "Valor inválido." };
  }

  const ticketNumbers: number[] = [];
  for (const part of ticketNumbersRaw.split(",")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const n = Number(trimmed);
    if (!Number.isInteger(n) || n <= 0) {
      return { error: `Número inválido: "${trimmed}".` };
    }
    ticketNumbers.push(n);
  }

  try {
    await adminUpdateConfirmedOrder(orderId, {
      buyerName,
      buyerPhone,
      amountCents,
      ticketNumbers,
    });
  } catch (err) {
    if (err instanceof TicketsUnavailableError) {
      return { error: `Número(s) já em uso: ${err.unavailableNumbers.join(", ")}.` };
    }
    return { error: err instanceof Error ? err.message : "Erro ao atualizar o pedido." };
  }

  revalidatePath("/admin");
  revalidatePath("/");
  return { success: true };
}

export interface UpdateRaffleConfigState {
  error?: string;
  success?: boolean;
}

export async function updateRaffleConfigAction(
  _prevState: UpdateRaffleConfigState,
  formData: FormData
): Promise<UpdateRaffleConfigState> {
  const get = (name: string) => String(formData.get(name) ?? "");

  const ticketPriceCents = Math.round(parseFloat(get("ticketPriceReais").replace(",", ".")) * 100);
  const goalAmountCents = Math.round(parseFloat(get("goalAmountReais").replace(",", ".")) * 100);

  try {
    await updateRaffleConfig({
      title: get("title"),
      description: get("description"),
      photoURL: get("photoURL"),
      prizeTitle: get("prizeTitle"),
      prizeDescription: get("prizeDescription"),
      prizePhotoURL: get("prizePhotoURL"),
      ticketPriceCents,
      goalAmountCents,
      regulamento: get("regulamento"),
      premiacaoInfo: get("premiacaoInfo"),
      faqIntro: get("faqIntro"),
      whatsappNumber: get("whatsappNumber"),
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro ao salvar." };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/configuracoes");
  revalidatePath("/");
  return { success: true };
}

export interface SetTotalTicketsState {
  error?: string;
  success?: boolean;
}

export async function setTotalTicketsAction(
  _prevState: SetTotalTicketsState,
  formData: FormData
): Promise<SetTotalTicketsState> {
  const newTotal = Number(formData.get("totalTickets"));
  if (!Number.isInteger(newTotal) || newTotal <= 0) {
    return { error: "Informe um total de números válido." };
  }

  try {
    await setTotalTickets(newTotal);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro ao atualizar o total de números." };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/configuracoes");
  revalidatePath("/");
  return { success: true };
}

export interface UpdatePixSettingsState {
  error?: string;
  success?: boolean;
}

export async function updatePixSettingsAction(
  _prevState: UpdatePixSettingsState,
  formData: FormData
): Promise<UpdatePixSettingsState> {
  const get = (name: string) => String(formData.get(name) ?? "");

  try {
    await updatePixSettings({
      key: get("key"),
      merchantName: get("merchantName"),
      merchantCity: get("merchantCity"),
      receiverBankName: get("receiverBankName"),
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erro ao salvar a configuração do Pix." };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/configuracoes");
  return { success: true };
}

export async function deleteConfirmedOrderAction(orderId: string): Promise<void> {
  await adminDeleteConfirmedOrder(orderId);
  revalidatePath("/admin");
  revalidatePath("/");
}

export interface CreateManualOrderState {
  error?: string;
  success?: boolean;
}

/**
 * Registers a payment the admin already received outside the site (cash,
 * a Pix sent straight to a personal account, a legacy sale) and confirms it
 * immediately — there's no pending step or real Pix payload to generate for
 * money that's already in hand.
 */
export async function createManualOrderAction(
  _prevState: CreateManualOrderState,
  formData: FormData
): Promise<CreateManualOrderState> {
  const kind = String(formData.get("kind") ?? "tickets");
  const buyerName = String(formData.get("buyerName") ?? "").trim();
  const buyerPhoneRaw = String(formData.get("buyerPhone") ?? "").trim();
  const buyerPhone = buyerPhoneRaw || PLACEHOLDER_PHONE;

  if (!buyerName) {
    return { error: "Informe o nome do comprador." };
  }

  try {
    let orderId: string;

    if (kind === "donation") {
      const amountReais = String(formData.get("amountReais") ?? "").replace(",", ".");
      const amountCents = Math.round(parseFloat(amountReais) * 100);
      if (!Number.isFinite(amountCents) || amountCents <= 0) {
        return { error: "Valor inválido." };
      }
      const order = await createDonation({ buyerName, buyerPhone, amountCents });
      orderId = order.id;
    } else {
      const ticketNumbersRaw = String(formData.get("ticketNumbers") ?? "");
      const ticketNumbers: number[] = [];
      for (const part of ticketNumbersRaw.split(",")) {
        const trimmed = part.trim();
        if (!trimmed) continue;
        const n = Number(trimmed);
        if (!Number.isInteger(n) || n <= 0) {
          return { error: `Número inválido: "${trimmed}".` };
        }
        ticketNumbers.push(n);
      }
      if (ticketNumbers.length === 0) {
        return { error: "Informe ao menos um número." };
      }
      const order = await createOrder({ buyerName, buyerPhone, ticketNumbers });
      orderId = order.id;
    }

    await confirmOrder(orderId);
  } catch (err) {
    if (err instanceof TicketsUnavailableError) {
      return { error: `Número(s) já vendido(s) ou reservado(s): ${err.unavailableNumbers.join(", ")}.` };
    }
    return { error: err instanceof Error ? err.message : "Erro ao lançar pagamento." };
  }

  revalidatePath("/admin");
  revalidatePath("/");
  return { success: true };
}
