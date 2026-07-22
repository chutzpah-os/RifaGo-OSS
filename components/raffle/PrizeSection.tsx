import { ImageWithFallback } from "@/components/ui/ImageWithFallback";

export function PrizeSection({
  prizeTitle,
  prizeDescription,
  prizePhotoURL,
}: {
  prizeTitle: string;
  prizeDescription: string;
  prizePhotoURL: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
        <ImageWithFallback
          src={prizePhotoURL || "/none"}
          alt={prizeTitle}
          fill
          className="object-cover"
          fallbackLabel="Foto do prêmio"
        />
      </div>
      <div>
        <h4 className="font-display text-xl text-ink">{prizeTitle}</h4>
        <p className="mt-1 whitespace-pre-line text-sm text-ink-soft">{prizeDescription}</p>
      </div>
    </div>
  );
}
