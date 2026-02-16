-- Verification script for Storage Buckets setup
-- Task: 2.3 Thiết lập Storage Buckets

-- Check if buckets exist and have correct configuration
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at
FROM storage.buckets
WHERE id IN ('photos', 'videos')
ORDER BY id;

-- Expected results:
-- photos bucket: public=true, file_size_limit=10485760 (10MB), allowed_mime_types=['image/jpeg', 'image/png', 'image/heic']
-- videos bucket: public=true, file_size_limit=104857600 (100MB), allowed_mime_types=['video/mp4', 'video/webm']

-- Check storage policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'objects'
  AND policyname LIKE '%photo%' OR policyname LIKE '%video%'
ORDER BY policyname;

-- Expected policies:
-- 1. Users can upload photos to their family (INSERT)
-- 2. Users can view family photos (SELECT)
-- 3. Users can delete their own photos (DELETE)
-- 4. Users can upload videos to their family (INSERT)
-- 5. Users can view family videos (SELECT)
-- 6. Users can delete their own videos (DELETE)
