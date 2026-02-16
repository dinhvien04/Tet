-- Tết Connect Row Level Security (RLS) Policies
-- Migration: Enable RLS and create security policies for all tables

-- ============================================================================
-- USERS TABLE
-- ============================================================================

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read own data
CREATE POLICY "Users can read own data" ON users
  FOR SELECT USING (auth.uid() = id);

-- Policy: Users can update own data
CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);

-- ============================================================================
-- FAMILIES TABLE
-- ============================================================================

-- Enable RLS on families table
ALTER TABLE families ENABLE ROW LEVEL SECURITY;

-- Policy: Members can read family
CREATE POLICY "Members can read family" ON families
  FOR SELECT USING (
    id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid())
  );

-- Policy: Authenticated users can create families
CREATE POLICY "Authenticated users can create families" ON families
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Policy: Admins can update family
CREATE POLICY "Admins can update family" ON families
  FOR UPDATE USING (
    id IN (
      SELECT family_id FROM family_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Admins can delete family
CREATE POLICY "Admins can delete family" ON families
  FOR DELETE USING (
    id IN (
      SELECT family_id FROM family_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- FAMILY_MEMBERS TABLE
-- ============================================================================

-- Enable RLS on family_members table
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

-- Policy: Members can read family members
CREATE POLICY "Members can read family members" ON family_members
  FOR SELECT USING (
    family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid())
  );

-- Policy: Users can join families (insert themselves)
CREATE POLICY "Users can join families" ON family_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Admins can manage family members
CREATE POLICY "Admins can manage family members" ON family_members
  FOR DELETE USING (
    family_id IN (
      SELECT family_id FROM family_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- POSTS TABLE
-- ============================================================================

-- Enable RLS on posts table
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Policy: Members can read family posts
CREATE POLICY "Members can read family posts" ON posts
  FOR SELECT USING (
    family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid())
  );

-- Policy: Members can create posts
CREATE POLICY "Members can create posts" ON posts
  FOR INSERT WITH CHECK (
    family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid())
    AND auth.uid() = user_id
  );

-- Policy: Users can update own posts
CREATE POLICY "Users can update own posts" ON posts
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can delete own posts
CREATE POLICY "Users can delete own posts" ON posts
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- REACTIONS TABLE
-- ============================================================================

-- Enable RLS on reactions table
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;

-- Policy: Members can read reactions on family posts
CREATE POLICY "Members can read reactions" ON reactions
  FOR SELECT USING (
    post_id IN (
      SELECT id FROM posts 
      WHERE family_id IN (
        SELECT family_id FROM family_members WHERE user_id = auth.uid()
      )
    )
  );

-- Policy: Members can create reactions
CREATE POLICY "Members can create reactions" ON reactions
  FOR INSERT WITH CHECK (
    post_id IN (
      SELECT id FROM posts 
      WHERE family_id IN (
        SELECT family_id FROM family_members WHERE user_id = auth.uid()
      )
    )
    AND auth.uid() = user_id
  );

-- Policy: Users can delete own reactions
CREATE POLICY "Users can delete own reactions" ON reactions
  FOR DELETE USING (auth.uid() = user_id);

-- Policy: Users can update own reactions
CREATE POLICY "Users can update own reactions" ON reactions
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================================
-- EVENTS TABLE
-- ============================================================================

-- Enable RLS on events table
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Policy: Members can read family events
CREATE POLICY "Members can read family events" ON events
  FOR SELECT USING (
    family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid())
  );

-- Policy: Members can create events
CREATE POLICY "Members can create events" ON events
  FOR INSERT WITH CHECK (
    family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid())
    AND auth.uid() = created_by
  );

-- Policy: Event creators can update events
CREATE POLICY "Event creators can update events" ON events
  FOR UPDATE USING (auth.uid() = created_by);

-- Policy: Event creators can delete events
CREATE POLICY "Event creators can delete events" ON events
  FOR DELETE USING (auth.uid() = created_by);

-- ============================================================================
-- EVENT_TASKS TABLE
-- ============================================================================

-- Enable RLS on event_tasks table
ALTER TABLE event_tasks ENABLE ROW LEVEL SECURITY;

-- Policy: Members can read tasks in family events
CREATE POLICY "Members can read event tasks" ON event_tasks
  FOR SELECT USING (
    event_id IN (
      SELECT id FROM events 
      WHERE family_id IN (
        SELECT family_id FROM family_members WHERE user_id = auth.uid()
      )
    )
  );

-- Policy: Members can create tasks
CREATE POLICY "Members can create event tasks" ON event_tasks
  FOR INSERT WITH CHECK (
    event_id IN (
      SELECT id FROM events 
      WHERE family_id IN (
        SELECT family_id FROM family_members WHERE user_id = auth.uid()
      )
    )
  );

-- Policy: Assigned users can update their tasks
CREATE POLICY "Assigned users can update tasks" ON event_tasks
  FOR UPDATE USING (auth.uid() = assigned_to);

-- Policy: Event creators can delete tasks
CREATE POLICY "Event creators can delete tasks" ON event_tasks
  FOR DELETE USING (
    event_id IN (SELECT id FROM events WHERE created_by = auth.uid())
  );

-- ============================================================================
-- PHOTOS TABLE
-- ============================================================================

-- Enable RLS on photos table
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- Policy: Members can read family photos
CREATE POLICY "Members can read family photos" ON photos
  FOR SELECT USING (
    family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid())
  );

-- Policy: Members can upload photos
CREATE POLICY "Members can upload photos" ON photos
  FOR INSERT WITH CHECK (
    family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid())
    AND auth.uid() = user_id
  );

-- Policy: Users can delete own photos
CREATE POLICY "Users can delete own photos" ON photos
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================

-- Enable RLS on notifications table
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read own notifications
CREATE POLICY "Users can read own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can update own notifications (mark as read)
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: System can create notifications (no user_id check for INSERT)
-- This allows server-side functions to create notifications
CREATE POLICY "System can create notifications" ON notifications
  FOR INSERT WITH CHECK (true);

-- Policy: Users can delete own notifications
CREATE POLICY "Users can delete own notifications" ON notifications
  FOR DELETE USING (auth.uid() = user_id);
