'use client';

import { useActionState, useEffect, useRef } from 'react';
import { RefreshCw } from 'lucide-react';
import { addRepo, syncReposNow } from '@/app/actions/admin';
import { initialActionState } from '@/lib/action-state';
import { Field } from '@/components/ui';
import { FormStatus } from '@/components/forms/FormStatus';
import { SubmitButton } from '@/components/forms/SubmitButton';

export function AddRepoForm() {
  const [state, action] = useActionState(addRepo, initialActionState);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="space-y-3" noValidate>
      <FormStatus state={state} />
      <Field label="Repository" htmlFor="full_name" hint="owner/repository, or paste the GitHub link." error={state.fieldErrors?.full_name}>
        <input id="full_name" name="full_name" required placeholder="Migsak/migsak-ops" className="field-input font-mono text-xs" />
      </Field>
      <div className="flex justify-end">
        <SubmitButton size="sm" pendingLabel="Adding...">
          Track repository
        </SubmitButton>
      </div>
    </form>
  );
}

export function SyncNowButton() {
  const [state, action] = useActionState(syncReposNow, initialActionState);
  return (
    <form action={action} className="space-y-3">
      <FormStatus state={state} />
      <SubmitButton variant="secondary" size="sm" pendingLabel="Syncing...">
        <RefreshCw size={14} aria-hidden="true" />
        Sync now
      </SubmitButton>
    </form>
  );
}
