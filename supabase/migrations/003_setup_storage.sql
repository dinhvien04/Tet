-- Migration: Setup Storage Buckets
-- Task: 2.3 Thiết lập Storage Buckets
-- Requirements: 10.4, 12.6

-- Create photos bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'photos',
  'photos',
  true,
  10485760, -- 10MB in bytes
  ARRAY['image/jpeg', 'image/png', 'image/heic']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Create videos bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'videos',
  'videos',
  true,
  104857600, -- 100MB in bytes
  ARRAY['video/mp4', 'video/webm']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage policies for photos bucket
-- Allow authenticated users to upload photos to their family folder
CREATE POLICY "Users can upload photos to their family"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'photos' AND
  (storage.foldername(name))[1] IN (
    SELECT family_id::text 
    FROM family_members 
    WHERE user_id = auth.uid()
  )
);

-- Allow authenticated users to read photos from their family
CREATE POLICY "Users can view family photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'photos' AND
  (storage.foldername(name))[1] IN (
    SELECT family_id::text 
    FROM family_members 
    WHERE user_id = auth.uid()
  )
);

-- Allow users to delete their own photos
CREATE POLICY "Users can delete their own photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'photos' AND
  owner = auth.uid()
);

-- Storage policies for videos bucket
-- Allow authenticated users to upload videos to their family folder
CREATE POLICY "Users can upload videos to their family"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'videos' AND
  (storage.foldername(name))[1] IN (
    SELECT family_id::text 
    FROM family_members 
    WHERE user_id = auth.uid()
  )
);

-- Allow authenticated users to read videos from their family
CREATE POLICY "Users can view family videos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'videos' AND
  (storage.foldername(name))[1] IN (
    SELECT family_id::text 
    FROM family_members 
    WHERE user_id = auth.uid()
  )
);

-- Allow users to delete their own videos
CREATE POLICY "Users can delete their own videos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'videos' AND
  owner = auth.uid()
);
