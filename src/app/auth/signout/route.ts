import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const REASONS = new Set(['no_profile', 'inactive', 'signed_out']);

async function signOut(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  const reason = request.nextUrl.searchParams.get('reason');
  const target = new URL('/login', request.url);
  if (reason && REASONS.has(reason)) target.searchParams.set('reason', reason);
  return NextResponse.redirect(target, { status: 303 });
}

export const GET = signOut;
export const POST = signOut;
