import type { Metadata } from 'next';
import { requireViewer } from '@/lib/auth';
import { Logo } from '@/components/Logo';
import { PasswordForm } from './PasswordForm';

export const metadata: Metadata = { title: 'Set your password' };

export default async function ChangePasswordPage() {
  const viewer = await requireViewer({ allowPasswordChange: true });
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="rounded-lg border border-line bg-white p-6 shadow-card">
          <h1 className="text-base font-semibold text-ink">Set your password</h1>
          <p className="mt-1 text-xs text-ink-muted">
            {viewer.profile.must_change_password
              ? `Welcome, ${viewer.profile.full_name.split(' ')[0]}. Choose a new password to replace the temporary one.`
              : 'Choose a new password for your account.'}
          </p>
          <div className="mt-5">
            <PasswordForm />
          </div>
        </div>
      </div>
    </main>
  );
}
