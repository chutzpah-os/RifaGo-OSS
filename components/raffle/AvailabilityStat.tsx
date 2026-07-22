/**
 * Plain server-rendered value — no client-side fetching. The count comes
 * from a cheap Firestore count() aggregation already computed once for the
 * whole page (see lib/raffleData.ts), instead of every visitor's browser
 * polling the full 500-doc tickets collection just to display a number.
 */
export function AvailabilityStat({
  availableCount,
  totalTickets,
}: {
  availableCount: number;
  totalTickets: number;
}) {
  return (
    <p className="flex items-center gap-2 text-sm text-ink-soft">
      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
      {availableCount} de {totalTickets} números disponíveis
    </p>
  );
}
