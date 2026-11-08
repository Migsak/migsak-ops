import type { ReactNode } from 'react';
import { Logo } from '@/components/Logo';

/**
 * Two-panel frame for sign-in and password pages: a dark brand panel on
 * desktop with the mark motif, and a single centred form on phones.
 */
export function AuthShell({ title, description, children, footer }: { title: string; description: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <main className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <section className="relative hidden overflow-hidden bg-ink px-12 py-12 text-white lg:flex lg:flex-col lg:justify-between" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/migsak-mark.svg" alt="" width={40} height={27} className="block invert" />
        <svg className="pointer-events-none absolute -right-24 top-1/2 -translate-y-1/2" width="520" height="520" viewBox="0 0 520 520" fill="none">
          <g transform="rotate(-38 260 260)">
            <rect x="60" y="150" width="400" height="56" rx="28" fill="#8AB4F8" opacity="0.9" />
            <rect x="100" y="232" width="400" height="56" rx="28" fill="#1A73E8" />
            <rect x="140" y="314" width="400" height="56" rx="28" fill="#3C4043" />
          </g>
        </svg>
        <div className="relative max-w-sm">
          <p className="text-sm font-medium text-brand-300">Migsak Ops</p>
          <p className="mt-3 text-3xl font-semibold leading-tight tracking-heading [text-wrap:balance]">Attendance, updates and tasks for the team, in one place.</p>
          <p className="mt-4 text-sm font-light leading-relaxed text-white/70">Check in when you start, post a short update when you finish, and keep your tasks moving.</p>
        </div>
      </section>
      <section className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-10">
            <Logo size="lg" />
          </div>
          <h1 className="text-2xl font-semibold tracking-heading text-ink">{title}</h1>
          <p className="mt-2 text-sm text-ink-muted">{description}</p>
          <div className="mt-8">{children}</div>
          {footer ? <div className="mt-8 border-t border-line pt-6 text-xs text-ink-muted">{footer}</div> : null}
        </div>
      </section>
    </main>
  );
}
