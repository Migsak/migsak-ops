import { expect, test } from './fixtures';

test.describe('access control', () => {
  test('sends signed-out visitors to the sign-in page', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login\?next=%2Fadmin/);
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    const logo = page.getByRole('img', { name: 'Migsak' }).first();
    await expect(logo).toBeVisible();
    // The logo must actually load for signed-out visitors, not fall back to its alt text.
    await expect.poll(() => logo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  });

  test('validates the sign-in form before contacting the server', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByText('Enter a valid email.')).toBeVisible();
  });

  test('keeps members out of admin pages', async ({ page, asMember }) => {
    void asMember;
    await page.goto('/admin/people');
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('navigation', { name: 'Main' }).getByText('Admin')).toHaveCount(0);
  });

  test('shows the admin section to admins', async ({ page, asAdmin }) => {
    void asAdmin;
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Main' });
    await expect(nav.getByRole('link', { name: 'Dashboard' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'People' })).toBeVisible();
  });
});
