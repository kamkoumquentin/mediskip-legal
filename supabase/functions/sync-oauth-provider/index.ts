import { withSupabase } from 'npm:@supabase/server@1';

const supportedProviders = new Set(['google', 'facebook']);

function textValue(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

function pictureValue(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (value && typeof value === 'object') {
      const picture = value as { url?: unknown; data?: { url?: unknown } };
      const url = textValue(picture.url, picture.data?.url);
      if (url) return url;
    }
  }
  return null;
}

function nameParts(metadata: Record<string, unknown>) {
  let firstName = textValue(metadata.given_name, metadata.first_name);
  let lastName = textValue(metadata.family_name, metadata.last_name);
  const fullName = textValue(metadata.full_name, metadata.name);

  if (fullName && (!firstName || !lastName)) {
    const parts = fullName.split(/\s+/).filter(Boolean);
    if (!firstName) firstName = parts.shift() ?? null;
    if (!lastName) lastName = parts.join(' ') || null;
  }

  return { firstName, lastName };
}

Deno.serve(withSupabase({ auth: 'user' }, async (request, ctx) => {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const { data: authData, error: authError } = await ctx.supabase.auth.getUser();
  if (authError || !authData.user) {
    return Response.json({ error: 'Invalid session' }, { status: 401 });
  }

  const authUser = authData.user;
  const identities = (authUser.identities ?? []).filter((identity) => supportedProviders.has(identity.provider));
  if (identities.length === 0) {
    return Response.json({ error: 'No supported Google or Facebook identity found' }, { status: 422 });
  }

  const providerIdentities = identities.map((identity) => {
    const identityData = (identity.identity_data ?? {}) as Record<string, unknown>;
    const providerUserId = textValue(identity.provider_id, identityData.sub);
    return providerUserId ? { identity, identityData, providerUserId } : null;
  });
  if (providerIdentities.some((identity) => identity == null)) {
    return Response.json({ error: 'Provider identity has no verified provider ID' }, { status: 422 });
  }
  const verifiedIdentities = providerIdentities.filter((identity) => identity !== null);

  const admin = ctx.supabaseAdmin;

  const { data: profile, error: profileError } = await admin
    .from('utilisateur')
    .select('id, nom, prenom, email, photo')
    .eq('auth_id', authUser.id)
    .maybeSingle();

  if (profileError) {
    console.error('[sync-oauth-provider] Profile lookup failed:', {
      code: profileError.code,
      message: profileError.message,
      details: profileError.details,
      hint: profileError.hint,
    });
    return Response.json({ error: 'Profile lookup failed' }, { status: 500 });
  }
  if (!profile?.id) {
    console.error('[sync-oauth-provider] Business profile is missing for the authenticated user.');
    return Response.json({ error: 'Business profile not found for authenticated user' }, { status: 404 });
  }

  const identityData = verifiedIdentities[0].identityData;
  const metadata = { ...identityData, ...(authUser.user_metadata ?? {}) } as Record<string, unknown>;
  const { firstName, lastName } = nameParts(metadata);
  const photo = pictureValue(metadata.picture, metadata.avatar_url, metadata.photo_url);
  const profileUpdates: Record<string, string> = {};

  if (profile.nom == null && lastName) profileUpdates.nom = lastName;
  if (profile.prenom == null && firstName) profileUpdates.prenom = firstName;
  if (profile.photo == null && photo) profileUpdates.photo = photo;
  if (profile.email == null && authUser.email) profileUpdates.email = authUser.email;

  if (Object.keys(profileUpdates).length > 0) {
    for (const [field, value] of Object.entries(profileUpdates)) {
      const { error: updateError } = await admin
        .from('utilisateur')
        .update({ [field]: value })
        .eq('auth_id', authUser.id)
        .is(field, null);
      if (updateError) {
        console.error('[sync-oauth-provider] Profile update failed:', {
          code: updateError.code,
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint,
        });
        return Response.json({ error: 'Profile update failed' }, { status: 500 });
      }
    }
  }

  for (const { identity, providerUserId } of verifiedIdentities) {
    const { error: upsertError } = await admin.from('user_providers').upsert(
      {
        id_utilisateur: profile.id,
        provider: identity.provider,
        provider_user_id: providerUserId,
      },
      { onConflict: 'provider,provider_user_id', ignoreDuplicates: true },
    );

    if (upsertError) {
      console.error('[sync-oauth-provider] Provider association write failed:', {
        code: upsertError.code,
        message: upsertError.message,
        details: upsertError.details,
        hint: upsertError.hint,
      });
      return Response.json({ error: 'Provider association write failed' }, { status: 500 });
    }

    const { data: association, error: associationError } = await admin
      .from('user_providers')
      .select('id_utilisateur')
      .eq('provider', identity.provider)
      .eq('provider_user_id', providerUserId)
      .maybeSingle();

    if (associationError || association?.id_utilisateur !== profile.id) {
      console.error('[sync-oauth-provider] Provider association verification failed:', {
        code: associationError?.code,
        message: associationError?.message,
        details: associationError?.details,
      });
      return Response.json({ error: 'Provider identity is already associated with another profile' }, { status: 409 });
    }
  }

  return Response.json({ ok: true });
}));