"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";

export function FaqContactSection({
  whatsappNumber,
  intro,
}: {
  whatsappNumber: string;
  intro: string;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const message = `Olá! Meu nome é ${name}, telefone ${phone}. Tenho uma dúvida sobre a rifa.`;
    const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div>
      <p className="text-sm text-ink-soft">{intro}</p>
      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Seu nome"
          className="rounded-lg border border-line bg-paper px-4 py-2.5 text-sm outline-none focus:border-primary"
        />
        <input
          required
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Seu telefone"
          className="rounded-lg border border-line bg-paper px-4 py-2.5 text-sm outline-none focus:border-primary"
        />
        <Button type="submit" variant="outline">
          Falar no WhatsApp
        </Button>
      </form>
    </div>
  );
}
