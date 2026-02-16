-- Verification script to check if all tables were created successfully

-- 1. List all tables in public schema
SELECT 
  'Tables Created:' as check_type,
  table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 2. Check foreign key constraints
SELECT
  'Foreign Keys:' as check_type,
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- 3. Check indexes
SELECT
  'Indexes:' as check_type,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 4. Check constraints (CHECK constraints)
SELECT
  'Check Constraints:' as check_type,
  tc.table_name,
  tc.constraint_name,
  cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc
  ON tc.constraint_name = cc.constraint_name
WHERE tc.constraint_type = 'CHECK'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_name;

-- 5. Count rows in each table (should be 0 for new installation)
SELECT 'users' as table_name, COUNT(*) as row_count FROM users
UNION ALL
SELECT 'families', COUNT(*) FROM families
UNION ALL
SELECT 'family_members', COUNT(*) FROM family_members
UNION ALL
SELECT 'posts', COUNT(*) FROM posts
UNION ALL
SELECT 'reactions', COUNT(*) FROM reactions
UNION ALL
SELECT 'events', COUNT(*) FROM events
UNION ALL
SELECT 'event_tasks', COUNT(*) FROM event_tasks
UNION ALL
SELECT 'photos', COUNT(*) FROM photos
UNION ALL
SELECT 'notifications', COUNT(*) FROM notifications;
