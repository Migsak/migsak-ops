'use client';

import { useFormStatus } from 'react-dom';
import type { ReactNode } from 'react';
import { buttonClass } from '@/components/ui';

export function SubmitButton({
  children,
  pendingLabel,
  variant = 'primary',
  size = 'md',
  className
}: {
  children: ReactNode;
  pendingLabel?: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={buttonClass(variant, size, className)}>
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}
