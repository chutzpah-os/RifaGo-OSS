import type { RankingEntry } from "@/lib/types";

export function TopBuyersSection({ entries }: { entries: RankingEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-ink-soft">Ainda não há compradores confirmados.</p>;
  }

  return (
    <ol className="flex flex-col gap-3">
      {entries.map((entry, index) => (
        <li
          key={entry.buyerName}
          className="flex items-center justify-between border-b border-line/70 pb-3 last:border-0 last:pb-0"
        >
          <span className="flex items-center gap-3">
            <span className="font-display italic text-lg text-accent">{index + 1}º</span>
            <span className="text-ink">{entry.buyerName}</span>
          </span>
          <span className="font-tabular text-sm text-ink-soft">
            {entry.ticketCount} número{entry.ticketCount === 1 ? "" : "s"}
          </span>
        </li>
      ))}
    </ol>
  );
}
