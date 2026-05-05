-- ============================================================
-- FIXED Events Table - Run this in Supabase SQL Editor
-- Fixes enum syntax error causing 'Kaydetme başarısız'
-- ============================================================

-- 1. DROP and recreate enum with correct syntax (removed invalid 'İlk Konuşmam(Future)')
DROP TYPE IF EXISTS event_type_enum CASCADE;
CREATE TYPE event_type_enum AS ENUM ('Workshop', 'Face-to-Face', 'Bootcamp', 'Webinar', 'Other');

-- 2. Recreate tables (safe: if not exists + cascade handled)
DROP TABLE IF EXISTS event_staff CASCADE;
DROP TABLE IF EXISTS events CASCADE;

-- Events table
CREATE TABLE events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL CHECK (length(title) >= 2 AND length(title) <= 200),
  description TEXT DEFAULT '',
  event_type event_type_enum NOT NULL DEFAULT 'Other',
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  drive_link TEXT DEFAULT '',
  location TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, NOW()) NOT NULL,
  CONSTRAINT chk_dates CHECK (end_date > start_date)
);

-- Junction table
CREATE TABLE event_staff (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, NOW()) NOT NULL,
  CONSTRAINT uq_event_member UNIQUE (event_id, member_id)
);

-- 3. INDEXES
CREATE INDEX idx_events_event_type ON events(event_type);
CREATE INDEX idx_events_start_date ON events(start_date);
CREATE INDEX idx_events_title ON events(title);
CREATE INDEX idx_event_staff_event_id ON event_staff(event_id);
CREATE INDEX idx_event_staff_member_id ON event_staff(member_id);

-- 4. RLS (disabled as original)
ALTER TABLE events DISABLE ROW LEVEL SECURITY;
ALTER TABLE event_staff DISABLE ROW LEVEL SECURITY;

-- 5. TRIGGER for updated_at
CREATE OR REPLACE FUNCTION update_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_events_updated_at ON events;
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_events_updated_at();

-- Run this FULL script in Supabase SQL Editor!
-- Then test event creation.

