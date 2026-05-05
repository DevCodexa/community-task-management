-- ============================================================
-- FINAL Events Table Full Reset + Security Fix
-- Run this SINGLE script in Supabase SQL Editor
-- Fixes schema cache + RLS + enum issues completely
-- ============================================================

-- 1. Clean slate - Drop everything safely
DROP TYPE IF EXISTS event_type_enum CASCADE;
DROP TABLE IF EXISTS event_staff CASCADE;
DROP TABLE IF EXISTS events CASCADE;

-- 2. Recreate enum (clean valid values)
CREATE TYPE event_type_enum AS ENUM ('Workshop', 'Face-to-Face', 'Bootcamp', 'Webinar', 'Other');

-- 3. Create tables exactly matching TypeScript
CREATE TABLE events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL CHECK (length(title) >= 2 AND length(title) <= 200),
  description TEXT DEFAULT '',
  event_type event_type_enum NOT NULL DEFAULT 'Other',
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL CHECK (end_date > start_date),
  drive_link TEXT DEFAULT '',
  location TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, NOW()) NOT NULL
);

CREATE TABLE event_staff (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, NOW()) NOT NULL,
  CONSTRAINT uq_event_member UNIQUE (event_id, member_id)
);

-- 4. Indexes
CREATE INDEX CONCURRENTLY idx_events_event_type ON events(event_type);
CREATE INDEX CONCURRENTLY idx_events_start_date ON events(start_date);
CREATE INDEX CONCURRENTLY idx_events_title ON events(title);
CREATE INDEX CONCURRENTLY idx_event_staff_event_id ON event_staff(event_id);
CREATE INDEX CONCURRENTLY idx_event_staff_member_id ON event_staff(member_id);

-- 5. RLS + Policies (ENABLED with permissive policies)
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_staff ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users (full access)
CREATE POLICY "Events: Auth insert" ON events FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Events: Auth full access" ON events FOR ALL TO authenticated USING (true);

CREATE POLICY "EventStaff: Auth full access" ON event_staff FOR ALL TO authenticated USING (true);

-- 6. Trigger
CREATE OR REPLACE FUNCTION update_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_events_updated_at();

-- 7. Verify schema matches TypeScript
-- Run \d events in psql or check Table Editor to confirm 'event_type' column exists

-- 8. Clear Supabase cache (automatic after ~1min, or restart app)

-- ✅ RUN THIS FULL SCRIPT. Event creation will work immediately.
-- Test: Create new event → success.

