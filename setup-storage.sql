-- Créer le bucket pour les avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true);

-- Politiques d'accès pour le bucket avatars
-- Permettre aux utilisateurs de télécharger leur propre avatar
CREATE POLICY "Users can upload their own avatar" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Permettre aux utilisateurs de voir tous les avatars (public)
CREATE POLICY "Avatars are publicly accessible" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

-- Permettre aux utilisateurs de mettre à jour leur propre avatar
CREATE POLICY "Users can update their own avatar" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Permettre aux utilisateurs de supprimer leur propre avatar
CREATE POLICY "Users can delete their own avatar" ON storage.objects
FOR DELETE USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Ajouter les colonnes manquantes à la table users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500),
ADD COLUMN IF NOT EXISTS specialty VARCHAR(100),
ADD COLUMN IF NOT EXISTS experience VARCHAR(20),
ADD COLUMN IF NOT EXISTS agency_name VARCHAR(200),
ADD COLUMN IF NOT EXISTS agency_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS founded_year INTEGER;
