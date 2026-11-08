import { expect, IDS, resetData, test } from './fixtures';

test.beforeEach(async () => {
  await resetData();
});

test.describe('admin workspace', () => {
  test('dashboard summarises the team and leaves admins out', async ({ page, asAdmin }) => {
    void asAdmin;
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByText('Working now')).toBeVisible();
    await expect(page.getByText('Updates today')).toBeVisible();
    const people = page.locator('section', { has: page.getByRole('heading', { name: 'People' }) });
    await expect(people.getByRole('link', { name: 'Asha Rao' })).toBeVisible();
    await expect(people.getByText('Ops Admin')).toHaveCount(0);
    await expect(page.getByText('Target met')).toBeVisible();
  });

  test('filters the dashboard by team', async ({ page, asAdmin }) => {
    void asAdmin;
    await page.goto('/admin');
    await page.getByRole('navigation', { name: 'Filter by team' }).getByRole('link', { name: 'Developers' }).click();
    await expect(page).toHaveURL(/team=/);
  });

  test('opens a person with activity, attendance and private notes', async ({ page, asAdmin }) => {
    void asAdmin;
    await page.goto(`/admin/people/${IDS.asha}`);
    await expect(page.getByRole('heading', { name: 'Asha Rao' })).toBeVisible();
    await page.getByRole('link', { name: 'Attendance log' }).click();
    await expect(page.getByText('Check-in history')).toBeVisible();
    await page.getByRole('link', { name: 'Details' }).click();
    await expect(page.getByText('Strong on backend work.')).toBeVisible();
  });

  test('validates the add person form', async ({ page, asAdmin }) => {
    void asAdmin;
    await page.goto('/admin/people/new');
    await page.getByRole('button', { name: 'Add person and create login' }).click();
    await expect(page.getByText('Check the highlighted fields.')).toBeVisible();
    await expect(page.getByText('Name is required.')).toBeVisible();
    await expect(page.getByText('Enter a valid email.')).toBeVisible();
  });

  test('lists tasks with status filters', async ({ page, asAdmin }) => {
    void asAdmin;
    await page.goto('/admin/tasks?status=overdue');
    await expect(page.getByRole('link', { name: 'Fix mobile navigation overlap' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Webhook signature tests' })).toHaveCount(0);
  });

  test('shows repository setup with the webhook address', async ({ page, asAdmin }) => {
    void asAdmin;
    await page.goto('/admin/repos');
    await expect(page.getByText('Migsak/example-app')).toBeVisible();
    await expect(page.getByText(/\/api\/webhooks\/github/)).toBeVisible();
  });
});
