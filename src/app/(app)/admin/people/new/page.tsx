import type { Metadata } from 'next';
import Link from 'next/link';
import { listTeams } from '@/lib/queries';
import { Card, CardBody, PageHeader } from '@/components/ui';
import { PersonForm } from '@/components/admin/PersonForm';

export const metadata: Metadata = { title: 'Add person' };

export default async function NewPersonPage() {
  const teams = await listTeams();
  return (
    <>
      <Link href="/admin/people" className="mb-2 inline-block text-xs text-ink-muted hover:text-ink">
        Back to people
      </Link>
      <PageHeader title="Add a person" description="Creates their login and profile. You will get a temporary password to share with them." />
      <Card>
        <CardBody className="py-6">
          <PersonForm teams={teams} />
        </CardBody>
      </Card>
    </>
  );
}
