import type { Metadata } from 'next';
import { Logo } from '@/components/Logo';
import { Notice } from '@/components/ui';
import { LoginForm } from './LoginForm';

export const metadata: Metadata = { title: 'Sign in' };

const REASONS: Record<string, string> = {
  no_profile: 'Your account has not been set up yet. Ask your admin to add you.',
  inactive: 'Your account is inactive. Contact your admin if this is a mistake.'
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const reason = params.reason ? REASONS[params.reason] : undefined;
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="rounded-lg border border-line bg-white p-6 shadow-card">
          <h1 className="text-base font-semibold text-ink">Sign in</h1>
          <p className="mt-1 text-xs text-ink-muted">Use the email and password your admin shared with you.</p>
          <div className="mt-5 space-y-4">
            {reason ? <Notice tone="warn">{reason}</Notice> : null}
            <LoginForm next={params.next} />
          </div>
        </div>
        <p className="mt-6 text-center text-xs text-ink-subtle">Forgot your password? Ask your admin to reset it.</p>
      </div>
    </main>
  );
}
