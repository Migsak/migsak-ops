/**
 * Creates the first admin account (or promotes an existing login to admin).
 *
 *   npm run create-admin -- you@migsak.com "Your Name"
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local.
 * Prints a temporary password; you will be asked to change it on first sign-in.
 */
import { randomInt } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

function fail(message: string): never {
  console.error(`Error: ${message}`);
  process.exit(1);
}

const [email, ...nameParts] = process.argv.slice(2);
const fullName = nameParts.join(' ').trim();
if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fail('Usage: npm run create-admin -- you@example.com "Full Name"');
if (fullName.length < 2) fail('Provide the full name in quotes after the email.');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, '');
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!url || !key) fail('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.');

const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
const chunk = (n: number) => Array.from({ length: n }, () => alphabet[randomInt(alphabet.length)]).join('');
const password = `Ops-${chunk(4)}-${chunk(4)}-${randomInt(10, 100)}`;
const normalizedEmail = email.toLowerCase();

async function findUserId(): Promise<string | null> {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) fail(error.message);
    const match = data.users.find((u) => u.email?.toLowerCase() === normalizedEmail);
    if (match) return match.id;
    if (data.users.length < 200) return null;
  }
  return null;
}

async function main() {
  let userId = await findUserId();
  let printedPassword: string | null = null;

  if (userId) {
    const { error } = await supabase.auth.admin.updateUserById(userId, { password, email_confirm: true });
    if (error) fail(error.message);
    printedPassword = password;
    console.log('Existing login found. Password reset and promoted to admin.');
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName }
    });
    if (error || !data.user) fail(error?.message ?? 'Could not create user.');
    userId = data.user.id;
    printedPassword = password;
    console.log('Admin login created.');
  }

  const { error: profileError } = await supabase.from('profiles').upsert({
    id: userId,
    email: normalizedEmail,
    full_name: fullName,
    app_role: 'admin',
    member_type: 'employee',
    status: 'active',
    job_title: 'Founder',
    must_change_password: true
  });
  if (profileError) fail(`Profile: ${profileError.message}`);

  console.log('');
  console.log(`  Email:              ${normalizedEmail}`);
  console.log(`  Temporary password: ${printedPassword}`);
  console.log('');
  console.log('Sign in and you will be asked to set your own password.');
}

main().catch((err) => fail(err instanceof Error ? err.message : String(err)));
