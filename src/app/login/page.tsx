import type { Metadata } from 'next';
import { Notice } from '@/components/ui';
import { AuthShell } from '@/components/AuthShell';
import { LoginForm } from './LoginForm';

export const metadata: Metadata = { title: 'Sign in' };

const REASONS: Record<string, { tone: 'warn' | 'neutral'; text: string }> = {
  no_profile: { tone: 'warn', text: 'Your account has not been set up yet. Ask your admin to add you.' },
  inactive: { tone: 'warn', text: 'Your account is inactive. Contact your admin if this is a mistake.' },
  signed_out: { tone: 'neutral', text: 'You have signed out.' }
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const reason = params.reason ? REASONS[params.reason] : undefined;
  return (
    <AuthShell
      title="Sign in"
      description="Use the email and password your admin shared with you."
      footer="Forgot your password? Ask your admin to reset it."
    >
      <div className="space-y-4">
        {reason ? <Notice tone={reason.tone}>{reason.text}</Notice> : null}
        <LoginForm next={params.next} />
      </div>
    </AuthShell>
  );
}
