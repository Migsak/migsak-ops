'use client';

import { useState } from 'react';
import { KeyRound } from 'lucide-react';

/** One-time display of login details after creating a person or resetting a password. */
export function CredentialsNotice({ email, password, intro }: { email?: string; password: string; intro?: string }) {
  const [copied, setCopied] = useState(false);
  const loginUrl = typeof window === 'undefined' ? '' : `${window.location.origin}/login`;
  const text = [email ? `Email: ${email}` : null, `Temporary password: ${password}`, loginUrl ? `Sign in at: ${loginUrl}` : null]
    .filter(Boolean)
    .join('\n');

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
      <div className="flex items-start gap-3">
        <KeyRound size={18} className="mt-0.5 text-emerald-700" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          {intro ? <p className="text-sm font-medium text-emerald-900">{intro}</p> : null}
          <p className="mt-1 text-xs text-emerald-800">
            Share these details privately. This password is shown only once. They will be asked to choose a new one when they first sign in.
          </p>
          <pre className="mt-3 overflow-x-auto rounded-md bg-white px-3 py-2 font-mono text-xs text-ink ring-1 ring-emerald-100">{text}</pre>
          <button type="button" onClick={copy} className="mt-3 text-xs font-medium text-emerald-800 underline underline-offset-2 hover:text-emerald-950">
            {copied ? 'Copied' : 'Copy details'}
          </button>
        </div>
      </div>
    </div>
  );
}
