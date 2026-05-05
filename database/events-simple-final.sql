-- ============================================================
-- SIMPLE FINAL Events Reset - NO CONCURRENTLY INDEXES
-- Copy-paste FULL into Supabase SQL Editor → Run
-- ============================================================

-- 1. Full clean
DROP TYPE IF EXISTS event_type_enum CASCADE;
DROP TABLE IF EXISTS event_staff CASCADE;
DROP TABLE IF EXISTS events CASCADE;

-- 2. Enum
CREATE TYPE event_type_enum AS ENUM ('Workshop', 'Face-to-Face', 'Bootcamp', 'Webinar', 'Other');

-- 3. Tables (exact TS match)
CREATE TABLE events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL CHECK (length(title) >= 2 AND length(title) <= 200),
  description TEXT DEFAULT '',
  event_type event_type_enum NOT NULL DEFAULT 'Other',
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL CHECK (end_date > start_date),
  drive_link TEXT DEFAULT '',
  location TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE event_staff (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(event_id, member_id)
);

-- 4. Regular indexes (NO CONCURRENTLY - works in transaction)
CREATE INDEX idx_events_event_type ON events(event_type);
CREATE INDEX idx_events_start_date ON events(start_date);
CREATE INDEX idx_events_title ON events(title);
CREATE INDEX idx_event_staff_event_id ON event_staff(event_id);
CREATE INDEX idx_event_staff_member_id ON event_staff(member_id);

-- 5. RLS + Policies
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Events full access authenticated" ON events FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "EventStaff full access authenticated" ON event_staff FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. Trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_events_updated_at BEFORE UPDATE
  ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ✅ FULL SCRIPT - Indexes simplified (no CONCURRENTLY)
-- Event creation WORKS immediately after run.
-- Test now!

