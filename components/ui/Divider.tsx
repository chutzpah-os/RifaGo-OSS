export function Divider() {
  return (
    <div className="flex items-center gap-4" aria-hidden="true">
      <span className="h-px flex-1 bg-line" />
      <svg width="18" height="18" viewBox="0 0 18 18" className="text-accent">
        <path
          d="M9 0 L11 7 L18 9 L11 11 L9 18 L7 11 L0 9 L7 7 Z"
          fill="currentColor"
          opacity="0.8"
        />
      </svg>
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}
