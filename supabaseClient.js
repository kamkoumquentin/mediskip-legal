// Client Helper Supabase Unifié pour les applications Frontend (Next.js & React Native)
// Remplace tous les appels HTTP vers l'API Express par des appels natifs Supabase

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://utvzubstnocxnztrrzqs.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'votre_cle_anon_ici';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Rechercher des pharmacies avec calcul automatique et tri par distance GPS (Haversine)
 */
export async function rechercherPharmacies({ latitude = null, longitude = null, nom = null, status = 'actif', etat = null }) {
  const { data, error } = await supabase.rpc('rechercher_pharmacies_proches', {
    lat_client: latitude,
    lon_client: longitude,
    nom_filtre: nom,
    statut_filtre: status,
    etat_filtre: etat
  });

  if (error) {
    console.error("Erreur lors de la recherche des pharmacies :", error);
    throw error;
  }
  return data;
}

/**
 * Rechercher des offres de médicaments avec jointures et tri par distance GPS & prix
 */
export async function rechercherOffresMedicaments({ recherche, latitude = null, longitude = null, idPharmacie = null }) {
  const { data, error } = await supabase.rpc('rechercher_offres_medicament', {
    recherche_nom: recherche,
    lat_client: latitude,
    lon_client: longitude,
    id_pharmacie_filtre: idPharmacie
  });

  if (error) {
    console.error("Erreur lors de la recherche des offres :", error);
    throw error;
  }
  return data;
}

/**
 * Importer ou créer une offre de produit (Pharmacie connectée)
 */
export async function importerOffreUnique({ nomMedicament, prix, imageUrl, disponibilite = 'disponible', idMedicament = null }) {
  const { data, error } = await supabase.rpc('importer_offre_unique', {
    p_nom_medicament: nomMedicament,
    p_prix: prix,
    p_image_url: imageUrl,
    p_disponibilite: disponibilite,
    p_id_medicament: idMedicament
  });

  if (error) {
    console.error("Erreur lors de l'importation de l'offre :", error);
    throw error;
  }
  return data;
}

/**
 * Analyser un document ou une ordonnance avec l'IA Gemini via la Supabase Edge Function
 */
export async function analyserDocumentIA(fileBase64, mimeType) {
  const { data, error } = await supabase.functions.invoke('analyser-document', {
    body: { fileBase64, mimeType }
  });

  if (error) {
    console.error("Erreur lors de l'analyse du document par l'IA :", error);
    throw error;
  }
  return data;
}

/**
 * Obtenir les statistiques du tableau de bord Superadmin
 */
export async function ObtenirStatistiquesAdmin() {
  const { data, error } = await supabase.rpc('get_admin_stats');
  if (error) {
    console.error("Erreur lors de la récupération des stats admin :", error);
    throw error;
  }
  return data;
}
