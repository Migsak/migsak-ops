import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Profile } from '@/lib/types';

export interface Viewer {
  userId: string;
  email: string;
  profile: Profile;
  isAdmin: boolean;
}

/**
 * The signed-in user and their profile, or null. Cached per request so layouts
 * and pages can both call it without extra round trips.
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle<Profile>();
  if (!profile) return null;

  return {
    userId: user.id,
    email: user.email ?? profile.email,
    profile,
    isAdmin: profile.app_role === 'admin' && profile.status === 'active'
  };
});

/** For pages inside the app shell. Handles missing profiles, inactive accounts and first-login password changes. */
export async function requireViewer(options: { allowPasswordChange?: boolean } = {}): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect('/auth/signout?reason=no_profile');
  if (viewer.profile.status !== 'active') redirect('/auth/signout?reason=inactive');
  if (viewer.profile.must_change_password && !options.allowPasswordChange) redirect('/change-password');
  return viewer;
}

export async function requireAdmin(): Promise<Viewer> {
  const viewer = await requireViewer();
  if (!viewer.isAdmin) redirect('/');
  return viewer;
}
