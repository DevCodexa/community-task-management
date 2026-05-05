-- Speakers RLS Policy Fix for UPDATE operations
-- Run these in Supabase SQL Editor

-- 1. Enable RLS if not already enabled
ALTER TABLE speakers ENABLE ROW LEVEL SECURITY;

-- 2. Policy for SELECT (read) - authenticated users can read all
CREATE POLICY "Authenticated users can read speakers" ON speakers
FOR SELECT USING (auth.role() = 'authenticated');

-- 3. Policy for INSERT (create) - authenticated users can create
CREATE POLICY "Authenticated users can insert speakers" ON speakers
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 4. Policy for UPDATE (edit) - authenticated users OR owner can update
CREATE POLICY "Authenticated users can update speakers" ON speakers
FOR UPDATE USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- 5. Policy for DELETE - authenticated users can delete
CREATE POLICY "Authenticated users can delete speakers" ON speakers
FOR DELETE USING (auth.role() = 'authenticated');

-- 6. For event_speakers junction table (if exists)
ALTER TABLE event_speakers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage event_speakers" ON event_speakers
FOR ALL USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Verify policies
SELECT schemaname, tablename, policyname, cmd, roles, qual 
FROM pg_policies 
WHERE tablename IN ('speakers', 'event_speakers');

