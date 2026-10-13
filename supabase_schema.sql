-- Schéma SQL pour Kamsoft Mobile sur Supabase
-- Contient les tables, fonctions RPC Haversine, vues et données d'exemple.

-- 1. Table pharmacies
CREATE TABLE IF NOT EXISTS public.pharmacies (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  nom character varying UNIQUE,
  longitude double precision,
  latitude double precision,
  photo character varying,
  password character varying,
  emplacement character varying,
  statut character varying DEFAULT 'actif'::character varying,
  etat character varying,
  CONSTRAINT pharmacies_pkey PRIMARY KEY (id)
);

-- 2. Table medicaments
CREATE TABLE IF NOT EXISTS public.medicaments (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  nom character varying NOT NULL,
  CONSTRAINT medicaments_pkey PRIMARY KEY (id)
);

-- 3. Table offres
CREATE TABLE IF NOT EXISTS public.offres (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  id_pharmacie bigint NOT NULL,
  id_medicament bigint NOT NULL,
  prix bigint NOT NULL,
  image character varying NOT NULL,
  disponibilite character varying DEFAULT 'disponible'::character varying,
  CONSTRAINT offres_pkey PRIMARY KEY (id),
  CONSTRAINT offres_id_boutique_fkey FOREIGN KEY (id_pharmacie) REFERENCES public.pharmacies(id) ON DELETE CASCADE,
  CONSTRAINT offres_id_produit_fkey FOREIGN KEY (id_medicament) REFERENCES public.medicaments(id) ON DELETE CASCADE
);

-- 4. Table utilisateur
CREATE TABLE IF NOT EXISTS public.utilisateur (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  nom character varying,
  prenom character varying,
  telephone text,
  latitude double precision,
  password character varying,
  CONSTRAINT utilisateur_pkey PRIMARY KEY (id)
);

-- 5. Table reaction
CREATE TABLE IF NOT EXISTS public.reaction (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  id_offre bigint NOT NULL,
  id_utilisateur bigint,
  avis character varying,
  CONSTRAINT reaction_pkey PRIMARY KEY (id),
  CONSTRAINT reaction_id_offre_fkey FOREIGN KEY (id_offre) REFERENCES public.offres(id) ON DELETE CASCADE,
  CONSTRAINT reaction_id_utilisateur_fkey FOREIGN KEY (id_utilisateur) REFERENCES public.utilisateur(id) ON DELETE SET NULL
);

-- 6. Table superadmin
CREATE SEQUENCE IF NOT EXISTS superadmin_id_seq;
CREATE TABLE IF NOT EXISTS public.superadmin (
  id bigint NOT NULL DEFAULT nextval('superadmin_id_seq'::regclass),
  nom text NOT NULL UNIQUE,
  password text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT superadmin_pkey PRIMARY KEY (id)
);

-- 7. Table historiquerecherche
CREATE TABLE IF NOT EXISTS public.historiquerecherche (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  recherche character varying,
  id_utilisateur bigint,
  CONSTRAINT historiquerecherche_pkey PRIMARY KEY (id),
  CONSTRAINT historiqueRecharche_Na_id_utilisateur_fkey FOREIGN KEY (id_utilisateur) REFERENCES public.utilisateur(id) ON DELETE CASCADE
);

-- 8. Table historiqueanonyme
CREATE TABLE IF NOT EXISTS public.historiqueanonyme (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  longitude double precision,
  latitude double precision,
  recherche character varying,
  date date DEFAULT CURRENT_DATE,
  CONSTRAINT historiqueanonyme_pkey PRIMARY KEY (id)
);

-- 9. Table consultations
CREATE SEQUENCE IF NOT EXISTS consultations_id_seq;
CREATE TABLE IF NOT EXISTS public.consultations (
  id bigint NOT NULL DEFAULT nextval('consultations_id_seq'::regclass),
  id_utilisateur bigint,
  id_medicament bigint,
  id_pharmacie bigint,
  latitude double precision,
  longitude double precision,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT consultations_pkey PRIMARY KEY (id),
  CONSTRAINT consultations_id_medicament_fkey FOREIGN KEY (id_medicament) REFERENCES public.medicaments(id) ON DELETE CASCADE,
  CONSTRAINT consultations_id_pharmacie_fkey FOREIGN KEY (id_pharmacie) REFERENCES public.pharmacies(id) ON DELETE CASCADE,
  CONSTRAINT consultations_id_utilisateur_fkey FOREIGN KEY (id_utilisateur) REFERENCES public.utilisateur(id) ON DELETE CASCADE
);

-- =========================================================================
-- FONCTIONS RPC SUPABASE
-- =========================================================================

-- RPC 1 : Rechercher des pharmacies proches avec calcul Haversine
CREATE OR REPLACE FUNCTION public.rechercher_pharmacies_proches(
  lat_client double precision DEFAULT NULL,
  lon_client double precision DEFAULT NULL,
  nom_filtre text DEFAULT NULL,
  statut_filtre text DEFAULT 'actif',
  etat_filtre text DEFAULT NULL
)
RETURNS TABLE (
  id bigint,
  nom text,
  longitude double precision,
  latitude double precision,
  photo text,
  emplacement text,
  statut text,
  etat text,
  distance_km double precision
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.nom::text,
    p.longitude,
    p.latitude,
    p.photo::text,
    p.emplacement::text,
    p.statut::text,
    p.etat::text,
    CASE 
      WHEN lat_client IS NOT NULL AND lon_client IS NOT NULL AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL THEN
        6371 * acos(
          LEAST(1.0, GREATEST(-1.0, 
            cos(radians(lat_client)) * cos(radians(p.latitude)) *
            cos(radians(p.longitude) - radians(lon_client)) +
            sin(radians(lat_client)) * sin(radians(p.latitude))
          ))
        )
      ELSE 0
    END AS distance_km
  FROM public.pharmacies p
  WHERE (statut_filtre IS NULL OR p.statut = statut_filtre)
    AND (etat_filtre IS NULL OR p.etat = etat_filtre)
    AND (nom_filtre IS NULL OR nom_filtre = '' OR p.nom ILIKE '%' || nom_filtre || '%')
  ORDER BY distance_km ASC;
END;
$$;

-- RPC 2 : Rechercher des offres de médicaments avec jointure et calcul Haversine
CREATE OR REPLACE FUNCTION public.rechercher_offres_medicament(
  recherche_nom text DEFAULT NULL,
  lat_client double precision DEFAULT NULL,
  lon_client double precision DEFAULT NULL,
  id_pharmacie_filtre bigint DEFAULT NULL
)
RETURNS TABLE (
  id_offre bigint,
  prix bigint,
  image text,
  disponibilite text,
  medicament_nom text,
  pharmacie_id bigint,
  pharmacie_nom text,
  latitude double precision,
  longitude double precision,
  emplacement text,
  pharmacie_photo text,
  distance_km double precision
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id AS id_offre,
    o.prix,
    o.image::text,
    o.disponibilite::text,
    m.nom::text AS medicament_nom,
    p.id AS pharmacie_id,
    p.nom::text AS pharmacie_nom,
    p.latitude,
    p.longitude,
    p.emplacement::text,
    p.photo::text AS pharmacie_photo,
    CASE 
      WHEN lat_client IS NOT NULL AND lon_client IS NOT NULL AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL THEN
        6371 * acos(
          LEAST(1.0, GREATEST(-1.0,
            cos(radians(lat_client)) * cos(radians(p.latitude)) *
            cos(radians(p.longitude) - radians(lon_client)) +
            sin(radians(lat_client)) * sin(radians(p.latitude))
          ))
        )
      ELSE 0
    END AS distance_km
  FROM public.offres o
  JOIN public.medicaments m ON o.id_medicament = m.id
  JOIN public.pharmacies p ON o.id_pharmacie = p.id
  WHERE (id_pharmacie_filtre IS NULL OR o.id_pharmacie = id_pharmacie_filtre)
    AND (recherche_nom IS NULL OR recherche_nom = '' OR m.nom ILIKE '%' || recherche_nom || '%' OR p.nom ILIKE '%' || recherche_nom || '%')
  ORDER BY distance_km ASC, o.prix ASC;
END;
$$;

-- RPC 3 : Importer une offre unique
CREATE OR REPLACE FUNCTION public.importer_offre_unique(
  p_nom_medicament text,
  p_prix bigint,
  p_image_url text DEFAULT NULL,
  p_disponibilite text DEFAULT 'disponible',
  p_id_pharmacie bigint DEFAULT 1,
  p_id_medicament bigint DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
AS $$
DECLARE
  v_med_id bigint;
  v_offre_id bigint;
BEGIN
  IF p_id_medicament IS NOT NULL THEN
    v_med_id := p_id_medicament;
  ELSE
    SELECT id INTO v_med_id FROM public.medicaments WHERE nom ILIKE p_nom_medicament LIMIT 1;
    IF v_med_id IS NULL THEN
      INSERT INTO public.medicaments (nom) VALUES (p_nom_medicament) RETURNING id INTO v_med_id;
    END IF;
  END IF;

  INSERT INTO public.offres (id_pharmacie, id_medicament, prix, image, disponibilite)
  VALUES (p_id_pharmacie, v_med_id, p_prix, COALESCE(p_image_url, ''), p_disponibilite)
  RETURNING id INTO v_offre_id;

  RETURN v_offre_id;
END;
$$;

-- RPC 4 : Statistiques du tableau de bord Admin
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  v_pharmacies_count bigint;
  v_offres_count bigint;
  v_medicaments_count bigint;
  v_utilisateurs_count bigint;
BEGIN
  SELECT COUNT(*) INTO v_pharmacies_count FROM public.pharmacies;
  SELECT COUNT(*) INTO v_offres_count FROM public.offres;
  SELECT COUNT(*) INTO v_medicaments_count FROM public.medicaments;
  SELECT COUNT(*) INTO v_utilisateurs_count FROM public.utilisateur;

  RETURN json_build_object(
    'total_pharmacies', v_pharmacies_count,
    'total_offres', v_offres_count,
    'total_medicaments', v_medicaments_count,
    'total_utilisateurs', v_utilisateurs_count
  );
END;
$$;

-- =========================================================================
-- DONNÉES D'EXEMPLE INITIALES (SEED DATA)
-- =========================================================================
INSERT INTO public.pharmacies (nom, longitude, latitude, photo, emplacement, statut, etat)
VALUES 
  ('Pharmacie Centrale', 10.4144, 5.4830, 'https://images.unsplash.com/photo-1586015555751-63bb77f4322a?w=600', 'Avenue du Centre, Bafoussam', 'actif', 'Ouvert'),
  ('Pharmacie du Soleil', 10.4225, 5.4855, 'https://images.unsplash.com/photo-1576602976047-174e57a47881?w=600', 'Quartier Haoussa, Bafoussam', 'actif', 'Ouvert'),
  ('Pharmacie de la Paix', 10.4075, 5.4805, 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=600', 'Carrefour Shell, Bafoussam', 'actif', 'Ouvert'),
  ('Pharmacie du Centre', 10.4180, 5.4870, 'https://images.unsplash.com/photo-1585435557343-3b092031a831?w=600', 'Marché A, Bafoussam', 'actif', 'Ouvert')
ON CONFLICT (nom) DO NOTHING;

INSERT INTO public.medicaments (nom)
VALUES 
  ('Paracétamol 500 mg'),
  ('Quinine Sulfate 300 mg'),
  ('Amoxicilline 250 mg')
ON CONFLICT DO NOTHING;

-- Insérer les offres initiales (liaison pharmacies + medicaments)
INSERT INTO public.offres (id_pharmacie, id_medicament, prix, image, disponibilite)
SELECT p.id, m.id, 5000, 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600', 'en_stock'
FROM public.pharmacies p, public.medicaments m
WHERE p.nom = 'Pharmacie Centrale' AND m.nom = 'Paracétamol 500 mg'
ON CONFLICT DO NOTHING;

INSERT INTO public.offres (id_pharmacie, id_medicament, prix, image, disponibilite)
SELECT p.id, m.id, 4500, 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600', 'en_stock'
FROM public.pharmacies p, public.medicaments m
WHERE p.nom = 'Pharmacie du Soleil' AND m.nom = 'Quinine Sulfate 300 mg'
ON CONFLICT DO NOTHING;

INSERT INTO public.offres (id_pharmacie, id_medicament, prix, image, disponibilite)
SELECT p.id, m.id, 4000, 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600', 'en_stock'
FROM public.pharmacies p, public.medicaments m
WHERE p.nom = 'Pharmacie de la Paix' AND m.nom = 'Quinine Sulfate 300 mg'
ON CONFLICT DO NOTHING;

INSERT INTO public.offres (id_pharmacie, id_medicament, prix, image, disponibilite)
SELECT p.id, m.id, 6500, 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600', 'en_stock'
FROM public.pharmacies p, public.medicaments m
WHERE p.nom = 'Pharmacie du Centre' AND m.nom = 'Amoxicilline 250 mg'
ON CONFLICT DO NOTHING;
