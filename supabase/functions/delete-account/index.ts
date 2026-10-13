import { withSupabase } from 'npm:@supabase/server@1';

function extractPhotoProfilStoragePath(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const publicPrefix = '/storage/v1/object/public/photo_profil/';
  const lower = trimmed.toLowerCase();

  if (lower.includes(publicPrefix)) {
    const start = trimmed.indexOf(publicPrefix) + publicPrefix.length;
    const rawPath = trimmed.slice(start).split('?')[0].split('#')[0].trim();
    return decodeURIComponent(rawPath.replace(/^\/+/, '')) || null;
  }

  try {
    const parsed = new URL(trimmed);
    const pathname = parsed.pathname;
    const index = pathname.indexOf(publicPrefix);
    if (index >= 0) {
      const rawPath = pathname.slice(index + publicPrefix.length).split('?')[0].split('#')[0].trim();
      return decodeURIComponent(rawPath.replace(/^\/+/, '')) || null;
    }
  } catch {
    // Value is not a valid absolute URL.
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return null;
  }

  return trimmed.replace(/^\/+/, '');
}

async function deleteProfilePhotoIfNeeded(admin: any, photoValue: string | null | undefined) {
  if (!photoValue) return;

  try {
    const storagePath = extractPhotoProfilStoragePath(photoValue);
    if (!storagePath) return;

    const { error } = await admin.storage.from('photo_profil').remove([storagePath]);
    if (error) {
      console.warn('[delete-account] Photo cleanup skipped.');
    }
  } catch {
    console.warn('[delete-account] Photo cleanup failed.');
  }
}

Deno.serve(withSupabase({ auth: 'user' }, async (request, ctx) => {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const { data: authData, error: authError } = await ctx.supabase.auth.getUser();
  if (authError || !authData.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const authUser = authData.user;
  const admin = ctx.supabaseAdmin;

  let profile: { id: number; photo?: string | null } | null = null;

  const { data: profileRow, error: profileError } = await admin
    .from('utilisateur')
    .select('id, photo')
    .eq('auth_id', authUser.id)
    .maybeSingle();

  if (profileError) {
    return Response.json({ error: 'Unable to read user profile.' }, { status: 500 });
  }

  if (profileRow) {
    profile = profileRow;
  }

  if (profile?.id) {
    await deleteProfilePhotoIfNeeded(admin, profile.photo ?? null);

    const { error: consultationsError } = await admin
      .from('consultations')
      .delete()
      .eq('id_utilisateur', profile.id);

    if (consultationsError) {
      console.error('[delete-account] Consultation cleanup failed.');
      return Response.json({ error: 'Unable to delete user consultation history.' }, { status: 500 });
    }

    const { error: profileDeleteError } = await admin
      .from('utilisateur')
      .delete()
      .eq('id', profile.id);

    if (profileDeleteError) {
      console.error('[delete-account] User profile deletion failed.');
      return Response.json({ error: 'Unable to delete user profile.' }, { status: 500 });
    }
  }

  const { error: deleteUserError } = await admin.auth.admin.deleteUser(authUser.id);
  if (deleteUserError) {
    console.error('[delete-account] Auth user deletion failed.');
    return Response.json({ error: 'Unable to delete the authentication account.' }, { status: 500 });
  }

  return Response.json({ ok: true, message: 'Account deleted successfully.' }, { status: 200 });
}));
