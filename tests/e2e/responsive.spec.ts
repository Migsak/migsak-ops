import { expect, signInAs, test } from './fixtures';

const MEMBER_PAGES = ['/', '/tasks', '/team', '/performance', '/profile'];
const ADMIN_PAGES = ['/admin', '/admin/people', '/admin/tasks', '/admin/teams', '/admin/repos', '/admin/people/new'];

async function expectNoSideScroll(page: import('@playwright/test').Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, `page is ${overflow}px wider than the screen`).toBeLessThanOrEqual(1);
}

test('member pages fit a phone screen', async ({ page, context, baseURL }) => {
  await signInAs(context, 'asha', baseURL!);
  for (const path of MEMBER_PAGES) {
    await page.goto(path);
    await expectNoSideScroll(page);
  }
});

test('admin pages fit a phone screen', async ({ page, context, baseURL }) => {
  await signInAs(context, 'admin', baseURL!);
  for (const path of ADMIN_PAGES) {
    await page.goto(path);
    await expectNoSideScroll(page);
  }
});

test('the menu opens and closes on phones', async ({ page, context, baseURL }) => {
  await signInAs(context, 'asha', baseURL!);
  await page.goto('/');
  await page.getByRole('button', { name: 'Open menu' }).click();
  const dialog = page.getByRole('dialog', { name: 'Menu' });
  await expect(dialog.getByRole('link', { name: 'My tasks' })).toBeVisible();
  await dialog.getByRole('link', { name: 'My tasks' }).click();
  await expect(page).toHaveURL(/\/tasks$/);
  await expect(dialog).toHaveCount(0);
});

test('the sign-in page fits a phone screen', async ({ page }) => {
  await page.goto('/login');
  await expectNoSideScroll(page);
  await expect(page.getByLabel('Email')).toBeVisible();
});
