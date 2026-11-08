'use client';

import { useActionState } from 'react';
import { resetPassword } from '@/app/actions/admin';
import { initialActionState } from '@/lib/action-state';
import { FormStatus } from '@/components/forms/FormStatus';
import { SubmitButton } from '@/components/forms/SubmitButton';
import { CredentialsNotice } from './CredentialsNotice';

export function ResetPasswordButton({ personId, email }: { personId: string; email: string }) {
  const [state, action] = useActionState(resetPassword, initialActionState);
  if (state.ok && state.data?.password) {
    return <CredentialsNotice email={email} password={state.data.password} intro={state.message} />;
  }
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={personId} />
      {state.error ? <FormStatus state={state} /> : null}
      <p className="text-xs text-ink-muted">Creates a new temporary password. Their current password stops working immediately.</p>
      <SubmitButton variant="secondary" size="sm" pendingLabel="Resetting...">
        Reset password
      </SubmitButton>
    </form>
  );
}
