'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  ChartLine,
  ClipboardList,
  GitBranch,
  House,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  Network,
  UserRound,
  Users,
  UsersRound,
  X
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Avatar } from '@/components/ui';

const MEMBER_NAV = [
  { href: '/', label: 'Home', icon: House },
  { href: '/tasks', label: 'My tasks', icon: ListChecks },
  { href: '/team', label: 'Team', icon: Users },
  { href: '/performance', label: 'Performance', icon: ChartLine },
  { href: '/profile', label: 'Profile', icon: UserRound }
];

const ADMIN_NAV = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/people', label: 'People', icon: UsersRound },
  { href: '/admin/teams', label: 'Teams', icon: Network },
  { href: '/admin/tasks', label: 'All tasks', icon: ClipboardList },
  { href: '/admin/repos', label: 'Repositories', icon: GitBranch }
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/' || href === '/admin') return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavList({ items, pathname }: { items: typeof MEMBER_NAV; pathname: string }) {
  return (
    <ul className="space-y-0.5">
      {items.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <li key={href}>
            <Link
              href={href}
              aria-current={active ? 'page' : undefined}
              className={clsx(
                'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors',
                active ? 'bg-brand-50 font-medium text-brand-700' : 'text-ink-muted hover:bg-canvas hover:text-ink'
              )}
            >
              <Icon size={16} strokeWidth={1.9} aria-hidden="true" />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function Sidebar({ name, roleLabel, isAdmin }: { name: string; roleLabel: string; isAdmin: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  const content = (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center px-4">
        <Link href="/" aria-label="Migsak Ops home">
          <Logo />
        </Link>
      </div>
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-2" aria-label="Main">
        <NavList items={MEMBER_NAV} pathname={pathname} />
        {isAdmin ? (
          <div>
            <p className="mb-1.5 px-2.5 text-[11px] font-medium uppercase tracking-wider text-ink-subtle">Admin</p>
            <NavList items={ADMIN_NAV} pathname={pathname} />
          </div>
        ) : null}
      </nav>
      <div className="border-t border-line p-3">
        <div className="flex items-center gap-2.5 px-1">
          <Avatar name={name} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink">{name}</p>
            <p className="truncate text-xs text-ink-muted">{roleLabel}</p>
          </div>
          <form action="/auth/signout?reason=signed_out" method="post">
            <button type="submit" className="rounded-md p-1.5 text-ink-muted hover:bg-canvas hover:text-ink" aria-label="Sign out" title="Sign out">
              <LogOut size={16} aria-hidden="true" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-white px-4 lg:hidden">
        <Link href="/" aria-label="Migsak Ops home">
          <Logo />
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-md p-2 text-ink-muted hover:bg-canvas"
          aria-label="Open menu"
          aria-expanded={open}
        >
          <Menu size={18} aria-hidden="true" />
        </button>
      </header>

      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 border-r border-line bg-white lg:block">{content}</aside>

      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" className="absolute inset-0 bg-ink/30" aria-label="Close menu" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-white shadow-xl">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 rounded-md p-2 text-ink-muted hover:bg-canvas"
              aria-label="Close menu"
            >
              <X size={18} aria-hidden="true" />
            </button>
            {content}
          </div>
        </div>
      ) : null}
    </>
  );
}
