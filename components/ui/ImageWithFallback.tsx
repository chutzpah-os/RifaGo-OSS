"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";

export function ImageWithFallback({
  fallbackLabel,
  className,
  alt,
  ...props
}: ImageProps & { fallbackLabel: string }) {
  const [errored, setErrored] = useState(false);

  if (errored) {
    return (
      <div
        className={`flex items-center justify-center border border-dashed border-line bg-paper-raised text-center text-sm text-ink-soft ${className ?? ""}`}
      >
        {fallbackLabel}
      </div>
    );
  }

  return (
    <Image {...props} alt={alt} className={className} onError={() => setErrored(true)} />
  );
}
