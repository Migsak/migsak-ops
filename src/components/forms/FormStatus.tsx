'use client';

import type { ActionState } from '@/lib/action-state';
import { Notice } from '@/components/ui';

/** Shows the top-level error or success message from an action. */
export function FormStatus({ state }: { state: ActionState }) {
  if (state.error) return <Notice tone="error">{state.error}</Notice>;
  if (state.ok && state.message) return <Notice tone="success">{state.message}</Notice>;
  return null;
}
