import { requireViewer } from '@/lib/auth';
import { Sidebar } from '@/components/shell/Sidebar';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireViewer();
  const { profile } = viewer;
  const roleLabel = viewer.isAdmin
    ? 'Admin'
    : [profile.job_title, profile.member_type === 'intern' ? 'Intern' : 'Employee'].filter(Boolean).join(' · ');

  return (
    <div className="min-h-screen">
      <Sidebar name={profile.full_name} roleLabel={roleLabel} isAdmin={viewer.isAdmin} />
      <main className="lg:pl-60">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
      </main>
    </div>
  );
}
