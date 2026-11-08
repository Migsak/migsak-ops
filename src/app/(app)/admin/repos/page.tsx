import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { githubToken, githubWebhookSecret } from '@/lib/env';
import { listRepos } from '@/lib/queries';
import { appTimezone } from '@/lib/env';
import { formatDateTime } from '@/lib/time';
import { removeRepo, toggleRepo } from '@/app/actions/admin';
import { Badge, Button, Card, CardBody, CardHeader, EmptyState, Notice, PageHeader, Table, Td, Th } from '@/components/ui';
import { AddRepoForm, SyncNowButton } from '@/components/admin/RepoForms';
import { CopyField } from '@/components/admin/CopyField';

export const metadata: Metadata = { title: 'Repositories' };

export default async function ReposPage() {
  const tz = appTimezone();
  const repos = await listRepos();
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'your-domain';
  const proto = h.get('x-forwarded-proto') ?? 'https';
  const webhookUrl = `${proto}://${host}/api/webhooks/github`;
  const hasToken = Boolean(githubToken());
  const hasSecret = Boolean(githubWebhookSecret());

  return (
    <>
      <PageHeader title="Repositories" description="Commits from these repositories are matched to people by their GitHub username." actions={<SyncNowButton />} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Tracked repositories" description="Sync loads history. The webhook keeps it live." />
            {repos.length === 0 ? (
              <EmptyState title="No repositories yet" description="Add the repositories your team works in." />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Repository</Th>
                    <Th>Status</Th>
                    <Th>Last sync</Th>
                    <Th className="text-right">Actions</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {repos.map((r) => (
                    <tr key={r.id}>
                      <Td>
                        <a href={`https://github.com/${r.full_name}`} target="_blank" rel="noreferrer" className="font-mono text-xs text-ink hover:text-brand-600 hover:underline">
                          {r.full_name}
                        </a>
                        {r.last_sync_error ? <p className="mt-1 whitespace-normal text-xs text-red-600">{r.last_sync_error}</p> : null}
                      </Td>
                      <Td>{r.active ? <Badge tone="green">Tracking</Badge> : <Badge>Paused</Badge>}</Td>
                      <Td className="text-xs text-ink-muted">{r.last_synced_at ? formatDateTime(r.last_synced_at, tz) : 'Never'}</Td>
                      <Td className="text-right">
                        <div className="flex justify-end gap-1">
                          <form action={toggleRepo}>
                            <input type="hidden" name="id" value={r.id} />
                            <input type="hidden" name="active" value={String(!r.active)} />
                            <Button type="submit" variant="ghost" size="sm">
                              {r.active ? 'Pause' : 'Resume'}
                            </Button>
                          </form>
                          <form action={removeRepo}>
                            <input type="hidden" name="id" value={r.id} />
                            <Button type="submit" variant="ghost" size="sm" className="text-red-700 hover:bg-red-50">
                              Remove
                            </Button>
                          </form>
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>

          <Card>
            <CardHeader title="Live updates with a webhook" description="Set this up once on the Migsak organisation to cover every repository." />
            <CardBody className="space-y-4">
              {!hasSecret ? <Notice tone="warn">GITHUB_WEBHOOK_SECRET is not set on the server yet, so webhook deliveries will be rejected.</Notice> : null}
              <ol className="list-decimal space-y-2 pl-5 text-sm text-ink">
                <li>On GitHub, open the organisation (or a single repository), then Settings, then Webhooks, then Add webhook.</li>
                <li>Paste the payload URL below and set the content type to application/json.</li>
                <li>Use the same secret as the GITHUB_WEBHOOK_SECRET environment variable.</li>
                <li>Choose &quot;Just the push event&quot; and save. GitHub sends a test ping, which should show a green tick.</li>
              </ol>
              <CopyField label="Payload URL" value={webhookUrl} />
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Add repository" />
            <CardBody>
              <AddRepoForm />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Connection" />
            <CardBody className="space-y-2 text-sm">
              <p className="flex items-center justify-between">
                <span className="text-ink-muted">GitHub token</span>
                {hasToken ? <Badge tone="green">Configured</Badge> : <Badge tone="amber">Missing</Badge>}
              </p>
              <p className="flex items-center justify-between">
                <span className="text-ink-muted">Webhook secret</span>
                {hasSecret ? <Badge tone="green">Configured</Badge> : <Badge tone="amber">Missing</Badge>}
              </p>
              <p className="pt-2 text-xs text-ink-muted">
                The token needs read-only access to Contents and Metadata on the repositories above. A daily job also backfills anything a webhook missed.
              </p>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
