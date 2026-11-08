/* eslint-disable @next/next/no-img-element -- static SVG brand assets; next/image adds nothing for SVG. */

/**
 * Migsak wordmark with the product name. Uses the brand files from
 * public/brand exactly as supplied by the Migsak Brand design system.
 */
export function Logo({ compact = false, size = 'md' }: { compact?: boolean; size?: 'md' | 'lg' }) {
  const height = size === 'lg' ? 22 : 16;
  if (compact) {
    return <img src="/brand/migsak-mark.svg" alt="Migsak" width={Math.round(height * 1.46)} height={height} className="block" />;
  }
  return (
    <span className="inline-flex items-center gap-2.5">
      <img src="/brand/migsak-logo.svg" alt="Migsak" height={height} width={Math.round(height * 5.83)} className="block" />
      <span aria-hidden="true" className="h-4 w-px bg-line" />
      <span className={size === 'lg' ? 'text-base font-medium text-ink-muted' : 'text-sm font-medium text-ink-muted'}>Ops</span>
    </span>
  );
}
