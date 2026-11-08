import { expect, resetData, test } from './fixtures';

test.beforeEach(async () => {
  await resetData();
});

test.describe('member workspace', () => {
  test('checks in and out with a live timer', async ({ page, asMember }) => {
    void asMember;
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Asha/ })).toBeVisible();
    await expect(page.getByText('You are not checked in')).toBeVisible();

    await page.getByPlaceholder('What are you working on? (optional)').fill('Task review flow');
    await page.getByRole('button', { name: 'Check in' }).click();
    await expect(page.getByText(/Checked in at/)).toBeVisible();
    await expect(page.getByText('Working', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Check out' }).click();
    await expect(page.getByText('You are not checked in')).toBeVisible();
  });

  test('requires a meaningful daily update, then saves it', async ({ page, asMember }) => {
    void asMember;
    await page.goto('/');
    const done = page.getByLabel('What did you work on today?');
    await done.fill('stuff');
    await page.getByRole('button', { name: 'Submit update' }).click();
    await expect(page.getByText(/at least 10 characters/)).toBeVisible();

    await done.fill('Finished the review flow and wrote tests for it.');
    await page.getByLabel('Links').fill('github.com/Migsak/example-app/pull/15');
    await page.getByRole('button', { name: 'Submit update' }).click();
    await expect(page.getByText("Today's update is saved.")).toBeVisible();
  });

  test('lists open tasks and opens a task with its discussion', async ({ page, asMember }) => {
    void asMember;
    await page.goto('/tasks');
    await expect(page.getByRole('heading', { name: 'My tasks' })).toBeVisible();
    await page.getByRole('link', { name: /Attendance heatmap on the dashboard/ }).click();
    await expect(page.getByRole('heading', { name: 'Attendance heatmap on the dashboard' })).toBeVisible();
    await expect(page.getByText('Pull request is up.')).toBeVisible();
    await expect(page.getByText('Only your admin can mark a task as done.')).toBeVisible();
  });

  test('shows the profile with internship progress', async ({ page, asMember }) => {
    void asMember;
    await page.goto('/profile');
    await expect(page.getByText('asha@example.com')).toBeVisible();
    await expect(page.getByText(/days left/)).toBeVisible();
    await expect(page.getByText('Example Institute of Technology')).toBeVisible();
  });

  test('shows performance charts for the last 30 days', async ({ page, asMember }) => {
    void asMember;
    await page.goto('/performance');
    await expect(page.getByText('Hours, last 30 days')).toBeVisible();
    await expect(page.getByRole('img', { name: 'Hours worked per day compared with target' })).toBeVisible();
  });

  test('shows teammates on the team page', async ({ page, asMember }) => {
    void asMember;
    await page.goto('/team');
    await expect(page.getByRole('heading', { name: 'Developers' })).toBeVisible();
    const table = page.getByRole('table');
    await expect(table.getByText('Dev Menon', { exact: true })).toBeVisible();
    await expect(table.getByText('Neha Iyer', { exact: true })).toBeVisible();
    await expect(table.getByText('Ops Admin')).toHaveCount(0);
  });
});
