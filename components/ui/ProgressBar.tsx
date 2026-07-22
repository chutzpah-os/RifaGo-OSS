export function ProgressBar({ percent }: { percent: number }) {
  const clamped = Math.max(0, Math.min(100, percent));
  // A real but tiny percentage (e.g. 0.4%) rounds to a sliver of a pixel and
  // reads as an empty bar — give any nonzero progress a visible minimum width.
  const displayWidth = clamped > 0 ? Math.max(clamped, 2) : 0;
  return (
    <div className="h-3 w-full overflow-hidden rounded-full bg-accent-soft/60">
      <div
        className="h-full rounded-full bg-gradient-to-r from-accent to-primary transition-[width] duration-700 ease-out"
        style={{ width: `${displayWidth}%` }}
      />
    </div>
  );
}
