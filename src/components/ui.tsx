import clsx from 'clsx';
import Link from 'next/link';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';

/** Small design-system primitives. Server-safe: no hooks or browser APIs. */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md';

const buttonBase =
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-[background-color,box-shadow,color] duration-150 ease-standard disabled:cursor-not-allowed disabled:opacity-60 whitespace-nowrap';
const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-brand-500 text-white hover:bg-brand-600 hover:shadow-card',
  secondary: 'border border-gray-300 bg-white text-brand-700 hover:bg-brand-50',
  ghost: 'text-ink-muted hover:bg-canvas hover:text-ink',
  danger: 'border border-red-200 bg-white text-red-700 hover:bg-red-50'
};
const buttonSizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-9 px-4 text-sm'
};

export function buttonClass(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', className?: string) {
  return clsx(buttonBase, buttonVariants[variant], buttonSizes[size], className);
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ComponentPropsWithoutRef<'button'> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({
  href,
  variant = 'primary',
  size = 'md',
  className,
  children
}: {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)}>
      {children}
    </Link>
  );
}

export function Card({ className, children, ...props }: ComponentPropsWithoutRef<'section'>) {
  return (
    <section className={clsx('rounded-xl border border-line bg-white', className)} {...props}>
      {children}
    </section>
  );
}

export function CardHeader({
  title,
  description,
  action
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {description ? <p className="mt-0.5 text-xs text-ink-muted">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function CardBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={clsx('px-5 py-4', className)}>{children}</div>;
}

export function PageHeader({
  title,
  description,
  actions
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-heading text-ink [text-wrap:balance]">{title}</h1>
        {description ? <p className="mt-1 text-sm text-ink-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

type Tone = 'neutral' | 'blue' | 'green' | 'amber' | 'red';
const tones: Record<Tone, string> = {
  neutral: 'bg-gray-100 text-gray-800',
  blue: 'bg-brand-50 text-brand-700',
  green: 'bg-emerald-50 text-emerald-700',
  amber: 'bg-amber-50 text-amber-700',
  red: 'bg-red-50 text-red-700'
};

export function Badge({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={clsx('inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-[0.02em]', tones[tone], className)}>
      {children}
    </span>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: 'default' | 'warn' | 'good';
}) {
  return (
    <Card className="px-5 py-4">
      <p className="text-xs font-medium text-ink-muted">{label}</p>
      <p
        className={clsx(
          'tabular mt-1.5 text-2xl font-semibold tracking-heading',
          tone === 'warn' ? 'text-amber-700' : tone === 'good' ? 'text-emerald-700' : 'text-ink'
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-ink-muted">{hint}</p> : null}
    </Card>
  );
}

export function ProgressBar({ value, className, label, width = 'w-full' }: { value: number; className?: string; label?: string; width?: string }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div
      className={clsx('h-2 overflow-hidden rounded-full bg-gray-100', width, className)}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className={clsx('h-full rounded-full transition-[width] duration-500', pct >= 100 ? 'bg-emerald-500' : 'bg-brand-500')}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
  const sizes = { sm: 'h-7 w-7 text-[11px]', md: 'h-9 w-9 text-xs', lg: 'h-14 w-14 text-base' };
  return (
    <span
      aria-hidden="true"
      className={clsx('inline-flex shrink-0 items-center justify-center rounded-full bg-gray-100 font-semibold text-gray-800', sizes[size])}
    >
      {initials || '?'}
    </span>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
      <p className="text-sm font-medium text-ink">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-xs text-ink-muted">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className
}: {
  label: string;
  htmlFor: string;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-medium text-ink">
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1 text-xs text-ink-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function Notice({ tone = 'neutral', children }: { tone?: 'neutral' | 'error' | 'success' | 'warn'; children: ReactNode }) {
  const styles = {
    neutral: 'border-line bg-canvas text-ink-muted',
    error: 'border-red-200 bg-red-50 text-red-800',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    warn: 'border-amber-200 bg-amber-50 text-amber-900'
  };
  return <div className={clsx('rounded-lg border px-3 py-2 text-sm', styles[tone])}>{children}</div>;
}

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-line text-sm">{children}</table>
    </div>
  );
}

export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return <th className={clsx('whitespace-nowrap px-4 py-2.5 text-left text-xs font-medium text-ink-muted', className)}>{children}</th>;
}

export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={clsx('whitespace-nowrap px-4 py-3 align-middle text-ink', className)}>{children}</td>;
}
