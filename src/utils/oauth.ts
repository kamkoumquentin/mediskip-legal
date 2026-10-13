import { attendreProfilUtilisateur, supabase } from '@/utils/supabaseClient';
import { FunctionsHttpError } from '@supabase/supabase-js';
import type { User } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';

export type OAuthProvider = 'google' | 'facebook';

export const OAUTH_CALLBACK_URL = 'kamsoftmobile://auth/callback';

type OAuthCompletion = { authUserId: string };
type OAuthCallbackResult = { status: 'success' | 'duplicate' | 'ignored' };

const callbackTasks = new Map<string, Promise<OAuthCompletion>>();
const completedCodes = new Set<string>();
const preparedAuthIds = new Set<string>();
let pendingCallback: {
  authUserId: string | null;
  promise: Promise<OAuthCompletion>;
} | null = null;
let lastOAuthCompletionAt = 0;

function isOAuthProvider(value: unknown): value is OAuthProvider {
  return value === 'google' || value === 'facebook';
}

export function hasOAuthIdentity(user: User): boolean {
  return Boolean(
    user.identities?.some((identity) => isOAuthProvider(identity.provider)) ||
    isOAuthProvider(user.app_metadata?.provider),
  );
}

export async function synchroniserIdentiteOAuth(): Promise<{ ok: true }> {
  console.info('[OAuth] Début de la synchronisation du profil et de l’identité fournisseur.');
  const { data, error } = await supabase.functions.invoke('sync-oauth-provider', {
    body: {},
  });

  if (error) {
    const status = error instanceof FunctionsHttpError ? error.context.status : undefined;
    console.error('[OAuth] Échec de synchronisation serveur :', {
      name: error.name,
      message: error.message,
      status,
    });
    throw new Error('Impossible de finaliser le profil et l’association du compte OAuth.');
  }

  if (data?.ok !== true) {
    console.error('[OAuth] Réponse invalide de sync-oauth-provider :', {
      receivedOk: data?.ok,
    });
    throw new Error('Réponse invalide lors de la synchronisation du compte OAuth.');
  }

  console.info('[OAuth] Synchronisation du profil et de l’identité fournisseur terminée.');
  return { ok: true };
}

export async function attendrePreparationOAuth(authUserId: string): Promise<boolean> {
  if (preparedAuthIds.has(authUserId)) return true;

  const current = pendingCallback;
  if (!current) return false;

  const completion = await current.promise;
  return completion.authUserId === authUserId;
}

export async function handleOAuthCallback(url: string): Promise<OAuthCallbackResult> {
  let callback: URL;
  try {
    callback = new URL(url);
  } catch {
    return { status: 'ignored' };
  }

  if (
    callback.protocol !== 'kamsoftmobile:' ||
    callback.hostname !== 'auth' ||
    callback.pathname !== '/callback'
  ) {
    return { status: 'ignored' };
  }

  const providerError = callback.searchParams.get('error');
  if (providerError) {
    const description = callback.searchParams.get('error_description');
    throw new Error(description || providerError);
  }

  const code = callback.searchParams.get('code');
  if (!code) {
    throw new Error('Le callback OAuth ne contient pas de code PKCE.');
  }

  if (completedCodes.has(code)) return { status: 'duplicate' };

  const existingTask = callbackTasks.get(code);
  if (existingTask) {
    await existingTask;
    return { status: 'duplicate' };
  }

  const completionTask = (async (): Promise<OAuthCompletion> => {
    console.info('[OAuth] Échange du code OAuth contre une session.');
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw new Error(`Échange du code OAuth impossible : ${error.message}`);

    const authUser = data.session?.user;
    if (!authUser) throw new Error('Supabase n’a pas confirmé de session OAuth.');
    console.info('[OAuth] Session confirmée ; démarrage de la synchronisation serveur.');

    if (pendingCallback) pendingCallback.authUserId = authUser.id;
    await synchroniserIdentiteOAuth();

    console.info('[OAuth] Synchronisation serveur réussie ; attente du profil métier.');
    const profile = await attendreProfilUtilisateur(authUser.id);
    console.info('[OAuth] Résultat de la recherche du profil métier :', {
      found: Boolean(profile?.id),
    });
    if (!profile?.id) {
      throw new Error('Le profil MediGo (ID métier) est introuvable après OAuth.');
    }

    preparedAuthIds.add(authUser.id);
    return { authUserId: authUser.id };
  })();

  const callbackRecord = { authUserId: null as string | null, promise: completionTask };
  pendingCallback = callbackRecord;
  callbackTasks.set(code, completionTask);

  try {
    await completionTask;
    lastOAuthCompletionAt = Date.now();
    completedCodes.add(code);
    if (completedCodes.size > 20) {
      const oldestCode = completedCodes.values().next().value;
      if (oldestCode) completedCodes.delete(oldestCode);
    }
    return { status: 'success' };
  } finally {
    callbackTasks.delete(code);
    if (pendingCallback === callbackRecord) pendingCallback = null;
  }
}

async function lancerOAuth(provider: OAuthProvider): Promise<{ status: 'success' | 'cancelled' }> {
  const launchedAt = Date.now();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: OAUTH_CALLBACK_URL,
      skipBrowserRedirect: true,
    },
  });

  if (error) throw new Error(`Démarrage OAuth ${provider} impossible : ${error.message}`);
  if (!data.url) throw new Error(`Supabase n’a pas fourni d’URL OAuth pour ${provider}.`);

  const browserResult = await WebBrowser.openAuthSessionAsync(data.url, OAUTH_CALLBACK_URL);
  if (browserResult.type !== 'success') {
    if (pendingCallback) {
      await pendingCallback.promise;
      return { status: 'success' };
    }
    if (lastOAuthCompletionAt >= launchedAt) return { status: 'success' };
    return { status: 'cancelled' };
  }

  await handleOAuthCallback(browserResult.url);
  return { status: 'success' };
}

export function signInWithGoogle() {
  return lancerOAuth('google');
}

export function signInWithFacebook() {
  return lancerOAuth('facebook');
}