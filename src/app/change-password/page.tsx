import type { Metadata } from 'next';
import Link from 'next/link';
import { requireViewer } from '@/lib/auth';
import { AuthShell } from '@/components/AuthShell';
import { PasswordForm } from './PasswordForm';

export const metadata: Metadata = { title: 'Set your password' };

export default async function ChangePasswordPage() {
  const viewer = await requireViewer({ allowPasswordChange: true });
  const firstName = viewer.profile.full_name.split(' ')[0];
  return (
    <AuthShell
      title="Set your password"
      description={
        viewer.profile.must_change_password
          ? `Welcome, ${firstName}. Choose a new password to replace the temporary one.`
          : 'Choose a new password for your account.'
      }
      footer={
        viewer.profile.must_change_password ? undefined : (
          <Link href="/profile" className="text-brand-700 hover:underline">
            Back to your profile
          </Link>
        )
      }
    >
      <PasswordForm />
    </AuthShell>
  );
}
