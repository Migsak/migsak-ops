'use client';

import { useActionState } from 'react';
import { changePassword } from '@/app/actions/auth';
import { initialActionState } from '@/lib/action-state';
import { Field } from '@/components/ui';
import { FormStatus } from '@/components/forms/FormStatus';
import { SubmitButton } from '@/components/forms/SubmitButton';

export function PasswordForm() {
  const [state, action] = useActionState(changePassword, initialActionState);
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormStatus state={state} />
      <Field label="New password" htmlFor="password" hint="At least 10 characters, with letters and a number." error={state.fieldErrors?.password}>
        <input id="password" name="password" type="password" autoComplete="new-password" required className="field-input" />
      </Field>
      <Field label="Confirm password" htmlFor="confirm" error={state.fieldErrors?.confirm}>
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" required className="field-input" />
      </Field>
      <SubmitButton className="w-full" pendingLabel="Saving...">
        Set password
      </SubmitButton>
    </form>
  );
}
