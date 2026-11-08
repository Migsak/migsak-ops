import type { Metadata } from 'next';
import { requireViewer } from '@/lib/auth';
import { listTeams } from '@/lib/queries';
import { ButtonLink, PageHeader } from '@/components/ui';
import { ProfileSummary } from '@/components/work/ProfileSummary';

export const metadata: Metadata = { title: 'Profile' };

export default async function ProfilePage() {
  const viewer = await requireViewer();
  const teams = await listTeams();
  const team = teams.find((t) => t.id === viewer.profile.team_id) ?? null;
  return (
    <>
      <PageHeader
        title="Profile"
        description="To change any of these details, ask your admin."
        actions={
          <ButtonLink href="/change-password" variant="secondary">
            Change password
          </ButtonLink>
        }
      />
      <ProfileSummary profile={viewer.profile} team={team} />
    </>
  );
}
