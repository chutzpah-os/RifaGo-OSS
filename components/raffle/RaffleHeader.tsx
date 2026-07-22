import { ImageWithFallback } from "@/components/ui/ImageWithFallback";
import { JoinModal } from "@/components/modal/JoinModal";
import { DonateModal } from "@/components/modal/DonateModal";
import { AvailabilityStat } from "@/components/raffle/AvailabilityStat";
import { formatCents } from "@/lib/format";

export function RaffleHeader({
  title,
  description,
  photoURL,
  ticketPriceCents,
  totalTickets,
  availableCount,
}: {
  title: string;
  description: string;
  photoURL: string;
  ticketPriceCents: number;
  totalTickets: number;
  availableCount: number;
}) {
  return (
    <div className="reveal grid items-center gap-4 md:grid-cols-[1.1fr_0.9fr] md:gap-12">
      <div>
        <p className="font-tabular text-xs uppercase tracking-[0.25em] text-accent">Rifa</p>
        <h1 className="mt-1 font-display text-3xl italic leading-[1.05] text-primary sm:text-4xl md:text-5xl">
          {title}
        </h1>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-soft sm:text-base">
          {description}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-ink-soft">Cada número</p>
            <p className="font-tabular text-2xl font-semibold text-ink">
              {formatCents(ticketPriceCents)}
            </p>
          </div>
          <JoinModal ticketPriceCents={ticketPriceCents} totalTickets={totalTickets} />
        </div>

        <div className="mt-2">
          <AvailabilityStat availableCount={availableCount} totalTickets={totalTickets} />
        </div>

        <div className="mt-3">
          <DonateModal />
        </div>
      </div>

      <div className="relative aspect-[4/3] max-h-[22dvh] overflow-hidden rounded-3xl shadow-[0_30px_60px_-30px_rgba(43,33,24,0.35)] sm:max-h-[32dvh] md:max-h-[48dvh]">
        <ImageWithFallback
          src={photoURL || "/none"}
          alt={title}
          fill
          className="object-cover"
          fallbackLabel="Imagem da rifa"
          priority
        />
      </div>
    </div>
  );
}
