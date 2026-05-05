-- ============================================================
-- EMERGENCY RLS Fix for Events Table
-- Run this in Supabase SQL Editor NOW
-- ============================================================

-- 1. Enable RLS first (required)
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_staff ENABLE ROW LEVEL SECURITY;

-- 2. Create permissive policies (ALLOW all operations for authenticated users)
-- INSERT: Anyone authenticated can insert
CREATE POLICY "Authenticated users can insert events" ON events
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- UPDATE: Authenticated users can update any event  
CREATE POLICY "Authenticated users can update events" ON events
  FOR UPDATE TO authenticated
  USING (true);

-- SELECT: Authenticated users can read all events
CREATE POLICY "Authenticated users can read events" ON events
  FOR SELECT TO authenticated
  USING (true);

-- DELETE: Authenticated users can delete any event
CREATE POLICY "Authenticated users can delete events" ON events
  FOR DELETE TO authenticated
  USING (true);

-- Same for junction table
CREATE POLICY "Authenticated users can insert event_staff" ON event_staff
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage event_staff" ON event_staff
  FOR ALL TO authenticated
  USING (true);

-- 3. Verify policies created
SELECT schemaname, tablename, policyname, cmd, roles, qual 
FROM pg_policies 
WHERE tablename IN ('events', 'event_staff');

-- Run this script COMPLETELY in Supabase SQL Editor.
-- This enables RLS + creates permissive policies for authenticated users.
-- Event creation will work immediately after.

