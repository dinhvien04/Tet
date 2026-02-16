-- Tết Connect RLS Verification Script
-- This script verifies that Row Level Security is properly enabled on all tables

-- Check if RLS is enabled on all tables
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'users', 
    'families', 
    'family_members', 
    'posts', 
    'reactions', 
    'events', 
    'event_tasks', 
    'photos', 
    'notifications'
  )
ORDER BY tablename;

-- List all RLS policies
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
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Count policies per table
SELECT 
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- Expected policy counts:
-- users: 2 policies (read own, update own)
-- families: 4 policies (read, create, update, delete)
-- family_members: 3 policies (read, join, delete)
-- posts: 4 policies (read, create, update, delete)
-- reactions: 4 policies (read, create, update, delete)
-- events: 4 policies (read, create, update, delete)
-- event_tasks: 4 policies (read, create, update, delete)
-- photos: 3 policies (read, upload, delete)
-- notifications: 4 policies (read, update, create, delete)
