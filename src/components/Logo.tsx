export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg width="24" height="24" viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="7" fill="#1A73E8" />
        <path d="M8 22V10h3.2l4.8 6.6L20.8 10H24v12h-3v-7.4l-5 6.6-5-6.6V22z" fill="#fff" />
      </svg>
      {compact ? null : (
        <span className="text-sm font-semibold tracking-tight text-ink">
          Migsak <span className="font-normal text-ink-muted">Ops</span>
        </span>
      )}
    </span>
  );
}
