import { test as base, expect, type BrowserContext } from '@playwright/test';

/** Ids of the fictional people in tests/e2e/mock-supabase.mjs. */
export const IDS = {
  admin: '00000000-0000-4000-8000-000000000001',
  asha: '00000000-0000-4000-8000-000000000002',
  dev: '00000000-0000-4000-8000-000000000003',
  neha: '00000000-0000-4000-8000-000000000004'
} as const;

const MOCK_URL = 'http://127.0.0.1:54321';

/**
 * Signs a browser context in as one of the fixture people by writing the
 * Supabase session cookie the app reads. The mock backend trusts the token's
 * subject, so no password flow is needed.
 */
export async function signInAs(context: BrowserContext, who: keyof typeof IDS, baseURL: string): Promise<void> {
  const b64 = (s: string) => Buffer.from(s).toString('base64url');
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const jwt = `${b64(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${b64(JSON.stringify({ sub: IDS[who], exp, role: 'authenticated', aud: 'authenticated' }))}.test`;
  const session = { access_token: jwt, token_type: 'bearer', expires_in: 3600, expires_at: exp, refresh_token: 'test-refresh', user: { id: IDS[who], aud: 'authenticated', role: 'authenticated' } };
  const { hostname } = new URL(baseURL);
  await context.addCookies([{ name: 'sb-127-auth-token', value: `base64-${b64(JSON.stringify(session))}`, domain: hostname, path: '/' }]);
}

export async function resetData(): Promise<void> {
  const res = await fetch(`${MOCK_URL}/__reset`);
  if (!res.ok) throw new Error('Could not reset mock data');
}

export const test = base.extend<{ asAdmin: void; asMember: void }>({
  asAdmin: async ({ context, baseURL }, use) => {
    await signInAs(context, 'admin', baseURL!);
    await use();
  },
  asMember: async ({ context, baseURL }, use) => {
    await signInAs(context, 'asha', baseURL!);
    await use();
  }
});

export { expect };
