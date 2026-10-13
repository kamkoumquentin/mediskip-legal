// Client Helper Supabase Unifié — Kamsoft Mobile
// Schéma complet : pharmacies, medicaments, offres, reaction, utilisateur,
//                  historiquerecherche, historiqueanonyme, consultations, superadmin

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://example.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'public-anon-key';

export function hasSupabaseConfig() {
  return Boolean(process.env.EXPO_PUBLIC_SUPABASE_URL && process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
}

if (!hasSupabaseConfig()) {
  console.warn(
    '[Supabase] Variables d’environnement manquantes : EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY. L’application démarrera avec un client factice pour éviter le crash startup.',
  );
}

const webAuthStorage = {
  getItem: async (key: string) => typeof window === 'undefined' ? null : window.localStorage.getItem(key),
  setItem: async (key: string, value: string) => {
    if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
  },
  removeItem: async (key: string) => {
    if (typeof window !== 'undefined') window.localStorage.removeItem(key);
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    flowType: 'pkce',
    storage: Platform.OS === 'web' ? webAuthStorage : AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

const PROFIL_UTILISATEUR_SELECT = 'id, auth_id, nom, prenom, email, photo';

// ─────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────

export interface Pharmacie {
  id: number;
  nom: string;
  longitude: number;
  latitude: number;
  photo: string;
  emplacement: string;
  statut: string;
  etat: string;
}

export interface Medicament {
  id: number;
  nom: string;
}

export interface Offre {
  id: number;
  id_pharmacie: number;
  id_medicament: number;
  prix: number;
  image: string;
  disponibilite: 'disponible' | 'rupture';
  pharmacie?: Pharmacie;
  medicament?: Medicament;
  distance_km?: number;
}

export interface Reaction {
  id: number;
  id_offre: number;
  id_utilisateur: number | null;
  avis: string;
  created_at: string;
}

export interface Utilisateur {
  id: number;
  auth_id?: string;
  nom: string;
  prenom: string;
  email?: string;
  photo?: string | null;
  password?: string;
}

export type InscriptionResultat =
  | {
      status: 'complete';
      user: {
        id: number;
        authId: string;
        nom: string;
        prenom: string;
        email: string;
        photo?: string | null;
        phone?: string;
      };
    }
  | {
      status: 'email_confirmation_required';
      email: string;
    };

export interface RechercherPharmaciesParams {
  latitude?: number | null;
  longitude?: number | null;
  nom?: string | null;
  status?: string;
  etat?: string | null;
  offset?: number;
  limit?: number;
}

export interface RechercherOffresParams {
  recherche?: string;
  latitude?: number | null;
  longitude?: number | null;
  idPharmacie?: string | null;
  offset?: number;
  limit?: number;
}

export interface ImporterOffreParams {
  nomMedicament: string;
  prix: number | string;
  imageUrl?: string;
  disponibilite?: string;
  idMedicament?: string | null;
}

// ─────────────────────────────────────────────────────────
// RECHERCHE
// ─────────────────────────────────────────────────────────

/**
 * Rechercher des pharmacies par nom avec tri par distance GPS.
 */
export async function rechercherPharmacies({
  latitude = null,
  longitude = null,
  nom = null,
  status = 'actif',
  etat = null,
  offset = 0,
  limit = 20,
}: RechercherPharmaciesParams = {}) {
  let query = supabase.from('pharmacies').select('*', { count: 'exact' });
  
  if (nom) {
    query = query.ilike('nom', `%${nom}%`);
  }
  if (status) {
    query = query.eq('statut', status);
  }
  if (etat) {
    query = query.eq('etat', etat);
  }

  const { data, error, count } = await query
    .order('id', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Erreur recherche pharmacies :', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    });
    throw error;
  }
  return { data: data ?? [], count: count ?? 0 };
}

/**
 * Charge toutes les pharmacies actives en une seule requête, avec uniquement
 * les colonnes nécessaires à l'affichage de la liste (pas de pagination).
 * Utilisé par la vue « Pharmacies » du menu latéral : le tri par distance est
 * alors fiable car il porte sur le jeu complet, pas sur une page de 20 lignes.
 */
export async function getToutesPharmaciesActives(nom: string | null = null): Promise<Pharmacie[]> {
  let query = supabase
    .from('pharmacies')
    .select('id, nom, emplacement, photo, latitude, longitude, statut, etat')
    .eq('statut', 'actif');

  if (nom && nom.trim()) {
    query = query.ilike('nom', `%${nom.trim()}%`);
  }

  const { data, error } = await query.order('nom', { ascending: true }).limit(1000);

  if (error) {
    console.error('Erreur chargement pharmacies actives :', error);
    throw error;
  }
  return (data ?? []) as Pharmacie[];
}

/**
 * Rechercher une page d'offres de médicaments avec jointures et total exact.
 */
export async function rechercherOffresMedicaments(params: RechercherOffresParams = {}) {
  // Use direct search as fallback for RPC
  const { data, count } = await rechercherOffresDirectement(params);
  
  // Mapper vers le format attendu (celui de l'ancienne RPC)
  return {
    data: data.map((item: any) => ({
      id_offre: item.id,
      id: item.id,
      prix: item.prix,
      image: item.image,
      disponibilite: item.disponibilite,
      // Infos médicament
      id_medicament: item.medicament?.id,
      nom_medicament: item.medicament?.nom,
      medicament_nom: item.medicament?.nom,
      forme: '',
      // Infos pharmacie
      id_pharmacie: item.pharmacie?.id,
      pharmacie_id: item.pharmacie?.id,
      pharmacie_nom: item.pharmacie?.nom,
      nom_pharmacie: item.pharmacie?.nom,
      latitude: item.pharmacie?.latitude,
      longitude: item.pharmacie?.longitude,
      lat_pharmacie: item.pharmacie?.latitude,
      lon_pharmacie: item.pharmacie?.longitude,
      photo_pharmacie: item.pharmacie?.photo,
      emplacement_pharmacie: item.pharmacie?.emplacement,
      emplacement: item.pharmacie?.emplacement
    })),
    count,
  };
}

/**
 * Recherche paginée sur les offres avec jointures vers médicaments et pharmacies.
 */
export async function rechercherOffresDirectement({
  recherche,
  latitude = null,
  longitude = null,
  offset = 0,
  limit = 20,
}: RechercherOffresParams = {}) {
  const { data, error, count } = await supabase
    .from('offres')
    .select(`
      id,
      prix,
      image,
      disponibilite,
      medicament:medicaments!inner ( id, nom ),
      pharmacie:pharmacies!inner ( id, nom, longitude, latitude, photo, emplacement, statut, etat )
    `, { count: 'exact' })
    .ilike('medicaments.nom', `%${recherche || ''}%`)
    .order('id', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Erreur recherche directe :', error);
    throw error;
  }
  return { data: data ?? [], count: count ?? 0 };
}

// ─────────────────────────────────────────────────────────
// OFFRES
// ─────────────────────────────────────────────────────────

/**
 * Récupérer toutes les offres d'une pharmacie donnée.
 */
export async function getOffresParPharmacie(idPharmacie: number) {
  const { data } = await getOffresParPharmaciePage({ idPharmacie, limit: 1000 });
  return data;
}

/**
 * Récupérer une page d'offres d'une pharmacie, avec recherche par nom de
 * médicament et total exact. Requête mutualisée (utilisée aussi par
 * `getOffresParPharmacie`).
 */
export async function getOffresParPharmaciePage({
  idPharmacie,
  recherche = null,
  offset = 0,
  limit = 20,
}: {
  idPharmacie: number;
  recherche?: string | null;
  offset?: number;
  limit?: number;
}) {
  let query = supabase
    .from('offres')
    .select(`
      id,
      prix,
      image,
      disponibilite,
      medicament:medicaments!inner ( id, nom )
    `, { count: 'exact' })
    .eq('id_pharmacie', idPharmacie);

  if (recherche) {
    query = query.ilike('medicaments.nom', `%${recherche}%`);
  }

  const { data, error, count } = await query
    .order('disponibilite', { ascending: true })
    .order('id', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Erreur get offres pharmacie :', error);
    throw error;
  }
  return { data: data ?? [], count: count ?? 0 };
}

/**
 * Importer ou créer une offre (Pharmacie connectée via admin).
 */
export async function importerOffreUnique({
  nomMedicament,
  prix,
  imageUrl,
  disponibilite = 'disponible',
  idMedicament = null,
}: ImporterOffreParams) {
  const { data, error } = await supabase.rpc('importer_offre_unique', {
    p_nom_medicament: nomMedicament,
    p_prix: prix,
    p_image_url: imageUrl,
    p_disponibilite: disponibilite,
    p_id_medicament: idMedicament,
  });

  if (error) {
    console.error("Erreur importation offre :", error);
    throw error;
  }
  return data;
}

// ─────────────────────────────────────────────────────────
// RÉACTIONS / AVIS
// ─────────────────────────────────────────────────────────

/**
 * Récupérer les avis/réactions sur une offre.
 */
export async function getReactionsOffre(idOffre: number): Promise<Reaction[]> {
  const { data, error } = await supabase
    .from('reaction')
    .select('id, id_offre, id_utilisateur, avis, created_at')
    .eq('id_offre', idOffre)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Erreur get réactions :', error);
    return [];
  }
  return data || [];
}

/**
 * Ajouter un avis/réaction sur une offre.
 */
export async function ajouterReaction({
  idOffre,
  idUtilisateur = null,
  avis,
}: {
  idOffre: number;
  idUtilisateur?: number | null;
  avis: string;
}): Promise<boolean> {
  const { error } = await supabase.from('reaction').insert([
    {
      id_offre: idOffre,
      id_utilisateur: idUtilisateur,
      avis: avis.trim(),
    },
  ]);

  if (error) {
    console.error('Erreur ajout réaction :', error);
    return false;
  }
  return true;
}

// ─────────────────────────────────────────────────────────
// AUTHENTIFICATION UTILISATEUR
// ─────────────────────────────────────────────────────────

function mapProfilUtilisateur(profil: {
  id: number;
  auth_id?: string | null;
  nom?: string | null;
  prenom?: string | null;
  email?: string | null;
  photo?: string | null;
}): Utilisateur {
  return {
    id: profil.id,
    auth_id: profil.auth_id ?? undefined,
    nom: profil.nom ?? '',
    prenom: profil.prenom ?? '',
    email: profil.email ?? undefined,
    photo: profil.photo ?? null,
  };
}

/**
 * Charge le profil métier MediGo (`public.utilisateur.id` BIGINT) via `auth_id`.
 * Ne retourne jamais l'UUID `auth.users.id` comme identifiant métier.
 */
export async function chargerProfilUtilisateurParAuthId(authId: string): Promise<Utilisateur | null> {
  const { data: profil, error: profilError } = await supabase
    .from('utilisateur')
    .select(PROFIL_UTILISATEUR_SELECT)
    .eq('auth_id', authId)
    .maybeSingle();

  if (profilError) {
    console.error('[Profil] Échec de la requête utilisateur par auth_id :', {
      code: profilError.code,
      message: profilError.message,
      details: profilError.details,
      hint: profilError.hint,
    });
    throw new Error('Erreur lors de la récupération du profil utilisateur.');
  }

  if (!profil || profil.id == null) {
    return null;
  }

  return mapProfilUtilisateur(profil);
}

export async function attendreProfilUtilisateur(authId: string, tentatives = 5, delaiMs = 250): Promise<Utilisateur | null> {
  for (let i = 0; i < tentatives; i += 1) {
    console.info(`[Profil] Recherche ${i + 1}/${tentatives} du profil utilisateur.`);
    const profil = await chargerProfilUtilisateurParAuthId(authId);
    if (profil?.id != null) {
      console.info(`[Profil] Profil utilisateur trouvé à la tentative ${i + 1}/${tentatives}.`);
      return profil;
    }
    console.warn(`[Profil] Aucun profil trouvé à la tentative ${i + 1}/${tentatives}.`);
    await new Promise((resolve) => setTimeout(resolve, delaiMs));
  }
  console.error(`[Profil] Profil absent après ${tentatives} tentatives.`);
  return null;
}

/**
 * Connexion via Supabase Auth (email + mot de passe), puis récupération du
 * profil `public.utilisateur` via `auth_id`. Le `id` retourné est le BIGINT
 * `public.utilisateur.id`, jamais l'UUID `auth.users.id`.
 */
export async function connexionUtilisateur({
  identifier,
  password,
}: {
  identifier: string;
  password?: string;
}) {
  if (!password) throw new Error('Mot de passe requis');

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: identifier,
    password: password,
  });

  if (authError || !authData.user) {
    throw new Error('Identifiants incorrects');
  }

  const profil = await chargerProfilUtilisateurParAuthId(authData.user.id);

  if (!profil) {
    throw new Error('Profil utilisateur introuvable pour ce compte.');
  }

  return {
    id: profil.id,
    authId: authData.user.id,
    nom: profil.nom,
    prenom: profil.prenom,
    email: profil.email ?? '',
    photo: profil.photo ?? null,
    phone: authData.user.phone ?? '',
  };
}

/**
 * Inscription d'un nouvel utilisateur : création du compte Supabase Auth ;
 * la ligne `public.utilisateur` est créée automatiquement par le trigger
 * PostgreSQL `synchroniser_nouvel_utilisateur`, puis récupérée via `auth_id`.
 */
export async function inscriptionUtilisateur({
  nom,
  prenom = '',
  email,
  password,
}: {
  nom: string;
  prenom?: string;
  email: string;
  password: string;
}): Promise<InscriptionResultat> {
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { nom, prenom } },
  });

  if (authError || !authData.user) {
    throw authError ?? new Error('Impossible de créer le compte.');
  }

  // A. Auth créé, mais confirmation e-mail requise : pas de session, pas de login applicatif.
  if (!authData.session) {
    return { status: 'email_confirmation_required', email };
  }

  const profil = await attendreProfilUtilisateur(authData.user.id);

  // B. Session + profil MediGo (BIGINT) obligatoires pour considérer l'inscription terminée.
  if (!profil?.id) {
    throw new Error(
      'Compte Auth créé, mais le profil MediGo n’a pas pu être résolu. Réessayez de vous connecter.',
    );
  }

  return {
    status: 'complete',
    user: {
      id: profil.id,
      authId: authData.user.id,
      nom: profil.nom,
      prenom: profil.prenom,
      email: profil.email ?? '',
      photo: profil.photo,
      phone: authData.user.phone ?? '',
    },
  };
}

// ─────────────────────────────────────────────────────────
// HISTORIQUE
// ─────────────────────────────────────────────────────────

/**
 * Enregistrer une recherche dans `historiquerecherche` (utilisateur connecté)
 * ou `historiqueanonyme` (visiteur anonyme).
 */
export async function enregistrerHistoriqueRecherche({
  recherche,
  idUtilisateur = null,
  latitude = null,
  longitude = null,
}: {
  recherche: string;
  idUtilisateur?: number | string | null;
  latitude?: number | null;
  longitude?: number | null;
}) {
  try {
    if (idUtilisateur && !Number.isNaN(Number(idUtilisateur))) {
      await supabase.from('historiquerecherche').insert([
        { recherche, id_utilisateur: Number(idUtilisateur) },
      ]);
    } else {
      await supabase.from('historiqueanonyme').insert([
        { recherche, latitude, longitude, date: new Date().toISOString().split('T')[0] },
      ]);
    }
  } catch (err) {
    console.warn("Erreur enregistrement historique :", err);
  }
}

/**
 * Récupérer l'historique de recherche d'un utilisateur connecté.
 */
export async function getHistoriqueUtilisateur(idUtilisateur: number): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('historiquerecherche')
      .select('recherche')
      .eq('id_utilisateur', idUtilisateur)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error || !data) return [];
    return data.map((r: any) => r.recherche).filter(Boolean);
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────────────────
// CONSULTATIONS
// ─────────────────────────────────────────────────────────

/**
 * Enregistrer une consultation de médicament / pharmacie (tracking analytics).
 */
export async function enregistrerConsultation({
  idUtilisateur = null,
  idMedicament = null,
  idPharmacie = null,
  latitude = null,
  longitude = null,
}: {
  idUtilisateur?: number | string | null;
  idMedicament?: number | string | null;
  idPharmacie?: number | string | null;
  latitude?: number | null;
  longitude?: number | null;
}) {
  try {
    await supabase.from('consultations').insert([
      {
        id_utilisateur: (idUtilisateur && !Number.isNaN(Number(idUtilisateur))) ? Number(idUtilisateur) : null,
        id_medicament: idMedicament ? Number(idMedicament) : null,
        id_pharmacie: idPharmacie ? Number(idPharmacie) : null,
        latitude,
        longitude,
      },
    ]);
  } catch (err) {
    console.warn('Erreur enregistrement consultation :', err);
  }
}

// ─────────────────────────────────────────────────────────
// DOCUMENT IA
// ─────────────────────────────────────────────────────────

/**
 * Analyser un document ou une ordonnance avec l'IA Gemini via Supabase Edge Function.
 */
export async function analyserDocumentIA(fileBase64: string, mimeType: string) {
  const { data, error } = await supabase.functions.invoke('analyser-document', {
    body: { fileBase64, mimeType },
  });

  if (error) {
    console.error("Erreur analyse IA :", error);
    throw error;
  }
  return data;
}

// ─────────────────────────────────────────────────────────
// ADMIN
// ─────────────────────────────────────────────────────────

/**
 * Statistiques du tableau de bord Superadmin.
 */
export async function ObtenirStatistiquesAdmin() {
  const { data, error } = await supabase.rpc('get_admin_stats');
  if (error) {
    console.error('Erreur stats admin :', error);
    throw error;
  }
  return data;
}
