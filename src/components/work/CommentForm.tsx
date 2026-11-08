'use client';

import { useActionState, useEffect, useRef } from 'react';
import { addComment } from '@/app/actions/work';
import { initialActionState } from '@/lib/action-state';
import { SubmitButton } from '@/components/forms/SubmitButton';

export function CommentForm({ taskId }: { taskId: string }) {
  const [state, action] = useActionState(addComment, initialActionState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-2">
      <input type="hidden" name="task_id" value={taskId} />
      <label htmlFor="body" className="sr-only">
        Comment
      </label>
      <textarea id="body" name="body" rows={3} maxLength={4000} required placeholder="Write a comment" className="field-input" />
      {state.error ? <p className="text-xs text-red-600">{state.fieldErrors?.body ?? state.error}</p> : null}
      <div className="flex justify-end">
        <SubmitButton size="sm" pendingLabel="Posting...">
          Comment
        </SubmitButton>
      </div>
    </form>
  );
}
