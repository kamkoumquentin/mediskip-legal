-- ============================================================================
-- PATCH : branche public.utilisateur du trigger synchroniser_nouvel_utilisateur
-- À appliquer manuellement sur le projet Supabase (CREATE OR REPLACE FUNCTION).
-- Ne recrée aucune table. Ne touche pas à user_providers. Ne change pas RLS.
-- La branche pharmacie est copiée à l'identique (inchangée).
-- ============================================================================

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
