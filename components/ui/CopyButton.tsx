"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button type="button" variant="primary" onClick={handleCopy}>
      {copied ? "Copiado!" : "Copiar código Pix"}
    </Button>
  );
}
