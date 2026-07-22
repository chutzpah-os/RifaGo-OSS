import { notFound } from "next/navigation";
import { adminDb } from "@/lib/firebaseAdmin";
import { getPixReceiverInfo } from "@/lib/settings";
import type { Order } from "@/lib/types";
import { PixPayment } from "@/components/payment/PixPayment";

export default async function OrderPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const snap = await adminDb.collection("orders").doc(orderId).get();
  const order = snap.data() as Order | undefined;

  if (!order) notFound();

  const receiver = await getPixReceiverInfo();

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <PixPayment initialOrder={order} receiver={receiver} />
    </main>
  );
}
