-- ============================================================================
-- SCRIPT DE MIGRATION SUPABASE NATIVE (Fichier: supabase_migration.sql)
-- Remplace totalement le serveur Express `apikamsoft` par du SQL natif Supabase
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. EXTENSIONS & INDEXATION HAUTE PERFORMANCE
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Indexation B-Tree sur les clés étrangères
CREATE INDEX IF NOT EXISTS idx_offres_pharmacie ON public.offres(id_pharmacie);
CREATE INDEX IF NOT EXISTS idx_offres_medicament ON public.offres(id_medicament);
CREATE INDEX IF NOT EXISTS idx_offres_dispo ON public.offres(disponibilite);
CREATE INDEX IF NOT EXISTS idx_pharmacies_statut ON public.pharmacies(statut);
CREATE INDEX IF NOT EXISTS idx_consultations_pharmacie ON public.consultations(id_pharmacie);

-- Index Trigramme GIN pour la recherche floue de texte sur les médicaments
CREATE INDEX IF NOT EXISTS idx_medicaments_nom_trgm ON public.medicaments USING gin (nom gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_pharmacies_nom_trgm ON public.pharmacies USING gin (nom gin_trgm_ops);

-- ----------------------------------------------------------------------------
-- 2. TRIGGER AUTOMATIQUE DE SYNCHRONISATION INSCRIPTION (auth.users)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.synchroniser_nouvel_utilisateur()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.raw_user_meta_data->>'role' = 'pharmacie') THEN
    INSERT INTO public.pharmacies (nom, password, statut, etat, emplacement, latitude, longitude)
    VALUES (
      COALESCE(NEW.raw_user_meta_data->>'nom', 'Pharmacie sans nom'),
      NEW.id::text,
      'actif',
      COALESCE(NEW.raw_user_meta_data->>'etat', 'normal'),
      NEW.raw_user_meta_data->>'emplacement',
      (NEW.raw_user_meta_data->>'latitude')::double precision,
      (NEW.raw_user_meta_data->>'longitude')::double precision
    );
  ELSE
    -- Profil MediGo : BIGINT public.utilisateur.id ; auth_id = auth.users.id (UUID).
    -- Colonnes profil : auth_id, email, nom, prenom, photo, password.
    -- Ne pas réintroduire telephone / latitude / longitude sur utilisateur.
    INSERT INTO public.utilisateur (auth_id, email, nom, prenom, photo, password)
    VALUES (
      NEW.id,
      NEW.email,
      NEW.raw_user_meta_data->>'nom',
      NEW.raw_user_meta_data->>'prenom',
      NEW.raw_user_meta_data->>'photo',
      NEW.id::text
    );
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Erreur lors de la synchronisation automatique du profil: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Suppression si existe et re-création du trigger
DROP TRIGGER IF EXISTS trigger_creation_utilisateur ON auth.users;
CREATE TRIGGER trigger_creation_utilisateur
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.synchroniser_nouvel_utilisateur();

-- ----------------------------------------------------------------------------
-- 3. FONCTIONS RPC : GÉOLOCALISATION & RECHERCHE INSTANTANÉE
-- ----------------------------------------------------------------------------

-- A. Recherche de pharmacies avec tri GPS par formule de Haversine optimisée
CREATE OR REPLACE FUNCTION public.rechercher_pharmacies_proches(
  lat_client double precision DEFAULT NULL,
  lon_client double precision DEFAULT NULL,
  nom_filtre text DEFAULT NULL,
  statut_filtre text DEFAULT 'actif',
  etat_filtre text DEFAULT NULL
)
RETURNS TABLE (
  id bigint,
  created_at timestamp with time zone,
  nom character varying,
  longitude double precision,
  latitude double precision,
  photo character varying,
  emplacement character varying,
  statut character varying,
  etat character varying,
  distance_km double precision
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.created_at,
    p.nom,
    p.longitude,
    p.latitude,
    p.photo,
    p.emplacement,
    p.statut,
    p.etat,
    CASE 
      WHEN lat_client IS NOT NULL AND lon_client IS NOT NULL AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL
      THEN (6371 * acos(LEAST(1.0, GREATEST(-1.0, 
        cos(radians(lat_client)) * cos(radians(p.latitude)) *
        cos(radians(p.longitude) - radians(lon_client)) +
        sin(radians(lat_client)) * sin(radians(p.latitude))
      ))))
      ELSE NULL
    END AS distance_km
  FROM public.pharmacies p
  WHERE (statut_filtre IS NULL OR p.statut = statut_filtre)
    AND (etat_filtre IS NULL OR p.etat = etat_filtre)
    AND (nom_filtre IS NULL OR p.nom ILIKE '%' || nom_filtre || '%')
  ORDER BY distance_km ASC NULLS LAST, p.nom ASC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- B. Recherche complète d'offres de médicaments avec jointure et tri GPS
CREATE OR REPLACE FUNCTION public.rechercher_offres_medicament(
  recherche_nom text,
  lat_client double precision DEFAULT NULL,
  lon_client double precision DEFAULT NULL,
  id_pharmacie_filtre bigint DEFAULT NULL
)
RETURNS TABLE (
  id_offre bigint,
  prix bigint,
  image character varying,
  disponibilite character varying,
  id_medicament bigint,
  nom_medicament character varying,
  id_pharmacie bigint,
  nom_pharmacie character varying,
  lat_pharmacie double precision,
  lon_pharmacie double precision,
  photo_pharmacie character varying,
  emplacement_pharmacie character varying,
  distance_km double precision
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id AS id_offre,
    o.prix,
    o.image,
    o.disponibilite,
    m.id AS id_medicament,
    m.nom AS nom_medicament,
    p.id AS id_pharmacie,
    p.nom AS nom_pharmacie,
    p.latitude AS lat_pharmacie,
    p.longitude AS lon_pharmacie,
    p.photo AS photo_pharmacie,
    p.emplacement AS emplacement_pharmacie,
    CASE 
      WHEN lat_client IS NOT NULL AND lon_client IS NOT NULL AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL
      THEN (6371 * acos(LEAST(1.0, GREATEST(-1.0, 
        cos(radians(lat_client)) * cos(radians(p.latitude)) *
        cos(radians(p.longitude) - radians(lon_client)) +
        sin(radians(lat_client)) * sin(radians(p.latitude))
      ))))
      ELSE NULL
    END AS distance_km
  FROM public.offres o
  JOIN public.medicaments m ON o.id_medicament = m.id
  JOIN public.pharmacies p ON o.id_pharmacie = p.id
  WHERE p.statut = 'actif'
    AND (recherche_nom IS NULL OR m.nom ILIKE '%' || recherche_nom || '%')
    AND (id_pharmacie_filtre IS NULL OR o.id_pharmacie = id_pharmacie_filtre)
  ORDER BY distance_km ASC NULLS LAST, o.prix ASC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- C. Importation unique d'offre (crée le médicament si inexistant)
CREATE OR REPLACE FUNCTION public.importer_offre_unique(
  p_nom_medicament text,
  p_prix bigint,
  p_image_url text,
  p_disponibilite text DEFAULT 'disponible',
  p_id_medicament bigint DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_user_id uuid;
  v_pharmacie_id bigint;
  v_medicament_id bigint;
  v_offre_id bigint;
  v_res JSON;
BEGIN
  -- Récupérer l'utilisateur authentifié
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  -- Trouver l'id de la pharmacie correspondante
  SELECT id INTO v_pharmacie_id FROM public.pharmacies WHERE password = v_user_id::text LIMIT 1;
  IF v_pharmacie_id IS NULL THEN
    RAISE EXCEPTION 'Profil pharmacie introuvable pour cet utilisateur';
  END IF;

  -- Gérer l'identifiant du médicament
  IF p_id_medicament IS NOT NULL AND p_id_medicament > 0 THEN
    v_medicament_id := p_id_medicament;
  ELSE
    -- Chercher si le médicament existe déjà
    SELECT id INTO v_medicament_id FROM public.medicaments WHERE nom ILIKE trim(p_nom_medicament) LIMIT 1;
    IF v_medicament_id IS NULL THEN
      INSERT INTO public.medicaments (nom) VALUES (trim(p_nom_medicament)) RETURNING id INTO v_medicament_id;
    END IF;
  END IF;

  -- Insérer ou mettre à jour l'offre
  INSERT INTO public.offres (id_pharmacie, id_medicament, prix, image, disponibilite)
  VALUES (v_pharmacie_id, v_medicament_id, p_prix, p_image_url, COALESCE(p_disponibilite, 'disponible'))
  RETURNING id INTO v_offre_id;

  SELECT json_build_object(
    'succes', true,
    'id_offre', v_offre_id,
    'id_medicament', v_medicament_id,
    'id_pharmacie', v_pharmacie_id
  ) INTO v_res;

  RETURN v_res;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- D. Statistiques d'administration Superadmin
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS JSON AS $$
DECLARE
  v_total_pharmacies bigint;
  v_active_pharmacies bigint;
  v_total_offres bigint;
  v_total_utilisateurs bigint;
  v_total_medicaments bigint;
  v_res JSON;
BEGIN
  SELECT count(*) INTO v_total_pharmacies FROM public.pharmacies;
  SELECT count(*) INTO v_active_pharmacies FROM public.pharmacies WHERE statut = 'actif';
  SELECT count(*) INTO v_total_offres FROM public.offres;
  SELECT count(*) INTO v_total_utilisateurs FROM public.utilisateur;
  SELECT count(*) INTO v_total_medicaments FROM public.medicaments;

  SELECT json_build_object(
    'totalPharmacies', v_total_pharmacies,
    'pharmaciesActives', v_active_pharmacies,
    'totalOffres', v_total_offres,
    'totalUtilisateurs', v_total_utilisateurs,
    'totalMedicaments', v_total_medicaments
  ) INTO v_res;

  RETURN v_res;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 4. POLITIQUES DE SÉCURITÉ RLS (ROW LEVEL SECURITY)
-- ----------------------------------------------------------------------------

ALTER TABLE public.offres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utilisateur ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reaction ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historiqueRecharche_Na ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historiqueAnonyme ENABLE ROW LEVEL SECURITY;

-- Politiques pour 'medicaments'
DROP POLICY IF EXISTS "Lecture publique medicaments" ON public.medicaments;
CREATE POLICY "Lecture publique medicaments" ON public.medicaments FOR SELECT USING (true);
DROP POLICY IF EXISTS "Insertion authentifiée medicaments" ON public.medicaments;
CREATE POLICY "Insertion authentifiée medicaments" ON public.medicaments FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Politiques pour 'pharmacies'
DROP POLICY IF EXISTS "Lecture publique pharmacies" ON public.pharmacies;
CREATE POLICY "Lecture publique pharmacies" ON public.pharmacies FOR SELECT USING (true);
DROP POLICY IF EXISTS "Modification propre pharmacie" ON public.pharmacies;
CREATE POLICY "Modification propre pharmacie" ON public.pharmacies FOR UPDATE USING (password = auth.uid()::text);

-- Politiques pour 'offres'
DROP POLICY IF EXISTS "Lecture publique offres" ON public.offres;
CREATE POLICY "Lecture publique offres" ON public.offres FOR SELECT USING (true);
DROP POLICY IF EXISTS "Gestion offres par pharmacie" ON public.offres;
CREATE POLICY "Gestion offres par pharmacie" ON public.offres FOR ALL USING (
  id_pharmacie IN (SELECT id FROM public.pharmacies WHERE password = auth.uid()::text)
);

-- Politiques pour 'utilisateur'
DROP POLICY IF EXISTS "Lecture propre profil utilisateur" ON public.utilisateur;
CREATE POLICY "Lecture propre profil utilisateur" ON public.utilisateur FOR SELECT USING (password = auth.uid()::text);
DROP POLICY IF EXISTS "Modification propre profil utilisateur" ON public.utilisateur;
CREATE POLICY "Modification propre profil utilisateur" ON public.utilisateur FOR UPDATE USING (password = auth.uid()::text);

-- Politiques pour 'reaction'
DROP POLICY IF EXISTS "Lecture publique reaction" ON public.reaction;
CREATE POLICY "Lecture publique reaction" ON public.reaction FOR SELECT USING (true);
DROP POLICY IF EXISTS "Insertion reaction" ON public.reaction;
CREATE POLICY "Insertion reaction" ON public.reaction FOR INSERT WITH CHECK (true);

-- Politiques pour 'consultations'
DROP POLICY IF EXISTS "Insertion consultation" ON public.consultations;
CREATE POLICY "Insertion consultation" ON public.consultations FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Lecture consultations par pharmacie" ON public.consultations;
CREATE POLICY "Lecture consultations par pharmacie" ON public.consultations FOR SELECT USING (
  id_pharmacie IN (SELECT id FROM public.pharmacies WHERE password = auth.uid()::text)
);

-- Politiques pour 'historique'
DROP POLICY IF EXISTS "Insertion historique anonyme" ON public.historiqueAnonyme;
CREATE POLICY "Insertion historique anonyme" ON public.historiqueAnonyme FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Insertion historique utilisateur" ON public.historiqueRecharche_Na;
CREATE POLICY "Insertion historique utilisateur" ON public.historiqueRecharche_Na FOR INSERT WITH CHECK (true);
