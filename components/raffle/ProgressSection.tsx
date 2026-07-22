import { ProgressBar } from "@/components/ui/ProgressBar";
import { formatCents, formatPercent } from "@/lib/format";
import type { RaffleProgress } from "@/lib/types";

export function ProgressSection({ progress }: { progress: RaffleProgress }) {
  return (
    <section className="reveal">
      <div className="flex items-baseline justify-between">
        <p className="font-tabular text-xs uppercase tracking-[0.25em] text-accent">Meta</p>
        <span className="font-tabular text-sm font-semibold text-primary">
          {formatPercent(progress.percent)}
        </span>
      </div>
      <div className="mt-3">
        <ProgressBar percent={progress.percent} />
      </div>
      <div className="mt-3 flex items-baseline justify-between font-tabular text-sm text-ink-soft">
        <span>{formatCents(progress.raisedCents)}</span>
        <span>{formatCents(progress.goalAmountCents)}</span>
      </div>
      <p className="mt-1 text-xs text-ink-soft">
        {progress.soldCount} de {progress.totalTickets} números vendidos
      </p>
    </section>
  );
}
