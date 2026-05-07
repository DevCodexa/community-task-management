-- ============================================================
-- Org Events / Ekipler ve Proje Yönetimi - Bölüm/Alan/Proje Şeması
-- ============================================================
-- Run in your Supabase SQL Editor
--
-- Tasarım:
--   org_departments (Bölüm) -> org_areas (Alan) -> org_projects (Proje)
--
-- Enum yapısı sadece rol için:
--   LEADER, TEAM_MEMBER
-- ============================================================

-- ------------------------------------------------------------
-- 1) ENUM: rol
-- ------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'area_member_role_enum') THEN
    CREATE TYPE area_member_role_enum AS ENUM ('LEADER', 'TEAM_MEMBER');
  END IF;
END $$;

-- ------------------------------------------------------------
-- 2) updated_at trigger helper
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------
-- 3) Bölümler (Ana Kategoriler)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS org_departments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  responsible_person_id uuid NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_org_departments_responsible_person_id
  ON org_departments(responsible_person_id);

-- ------------------------------------------------------------
-- 4) Alanlar (Alt Kategoriler)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS org_areas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  department_id uuid NOT NULL REFERENCES org_departments(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  area_leader_id uuid NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_org_areas_department_id
  ON org_areas(department_id);

CREATE INDEX IF NOT EXISTS idx_org_areas_area_leader_id
  ON org_areas(area_leader_id);

-- ------------------------------------------------------------
-- 5) Alan Ekip Üyeleri (many-to-many + rol)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS org_area_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  area_id uuid NOT NULL REFERENCES org_areas(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  role area_member_role_enum NOT NULL DEFAULT 'TEAM_MEMBER',
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_org_area_members_area_user
  ON org_area_members(area_id, user_id);

CREATE INDEX IF NOT EXISTS idx_org_area_members_area_id
  ON org_area_members(area_id);

CREATE INDEX IF NOT EXISTS idx_org_area_members_user_id
  ON org_area_members(user_id);

-- ------------------------------------------------------------
-- 6) Projeler
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS org_projects (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  area_id uuid NOT NULL REFERENCES org_areas(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  file_url text,
  external_url text,
  start_date date,
  end_date date,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  deleted_at timestamptz,
  CONSTRAINT chk_org_projects_dates
    CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_org_projects_area_id
  ON org_projects(area_id);

-- ------------------------------------------------------------
-- 7) updated_at triggers (tablolardan sonra)
-- ------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tr_org_departments_updated_at') THEN
    CREATE TRIGGER tr_org_departments_updated_at
      BEFORE UPDATE ON org_departments
      FOR EACH ROW
      EXECUTE FUNCTION public.trigger_set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tr_org_areas_updated_at') THEN
    CREATE TRIGGER tr_org_areas_updated_at
      BEFORE UPDATE ON org_areas
      FOR EACH ROW
      EXECUTE FUNCTION public.trigger_set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tr_org_area_members_updated_at') THEN
    CREATE TRIGGER tr_org_area_members_updated_at
      BEFORE UPDATE ON org_area_members
      FOR EACH ROW
      EXECUTE FUNCTION public.trigger_set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tr_org_projects_updated_at') THEN
    CREATE TRIGGER tr_org_projects_updated_at
      BEFORE UPDATE ON org_projects
      FOR EACH ROW
      EXECUTE FUNCTION public.trigger_set_updated_at();
  END IF;
END $$;

-- ------------------------------------------------------------
-- 8) RLS + Policies
-- ------------------------------------------------------------
-- Postgres'te CREATE POLICY için IF NOT EXISTS yok.
-- Bu yüzden pg_policies üzerinden var mı kontrol edip ekliyoruz.

-- org_departments
ALTER TABLE org_departments ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'org_departments'
      AND policyname = 'Allow anon to read org_departments'
  ) THEN
    CREATE POLICY "Allow anon to read org_departments"
      ON org_departments FOR SELECT TO anon USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'org_departments'
      AND policyname = 'Allow anon to insert org_departments'
  ) THEN
    CREATE POLICY "Allow anon to insert org_departments"
      ON org_departments FOR INSERT TO anon WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'org_departments'
      AND policyname = 'Allow anon to update org_departments'
  ) THEN
    CREATE POLICY "Allow anon to update org_departments"
      ON org_departments FOR UPDATE TO anon USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'org_departments'
      AND policyname = 'Allow anon to delete org_departments'
  ) THEN
    CREATE POLICY "Allow anon to delete org_departments"
      ON org_departments FOR DELETE TO anon USING (true);
  END IF;
END $$;

-- org_areas
ALTER TABLE org_areas ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'org_areas'
      AND policyname = 'Allow anon to read org_areas'
  ) THEN
    CREATE POLICY "Allow anon to read org_areas"
      ON org_areas FOR SELECT TO anon USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'org_areas'
      AND policyname = 'Allow anon to insert org_areas'
  ) THEN
    CREATE POLICY "Allow anon to insert org_areas"
      ON org_areas FOR INSERT TO anon WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'org_areas'
      AND policyname = 'Allow anon to update org_areas'
  ) THEN
    CREATE POLICY "Allow anon to update org_areas"
      ON org_areas FOR UPDATE TO anon USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'org_areas'
      AND policyname = 'Allow anon to delete org_areas'
  ) THEN
    CREATE POLICY "Allow anon to delete org_areas"
      ON org_areas FOR DELETE TO anon USING (true);
  END IF;
END $$;

-- org_area_members
ALTER TABLE org_area_members ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'org_area_members'
      AND policyname = 'Allow anon to read org_area_members'
  ) THEN
    CREATE POLICY "Allow anon to read org_area_members"
      ON org_area_members FOR SELECT TO anon USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'org_area_members'
      AND policyname = 'Allow anon to insert org_area_members'
  ) THEN
    CREATE POLICY "Allow anon to insert org_area_members"
      ON org_area_members FOR INSERT TO anon WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'org_area_members'
      AND policyname = 'Allow anon to update org_area_members'
  ) THEN
    CREATE POLICY "Allow anon to update org_area_members"
      ON org_area_members FOR UPDATE TO anon USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'org_area_members'
      AND policyname = 'Allow anon to delete org_area_members'
  ) THEN
    CREATE POLICY "Allow anon to delete org_area_members"
      ON org_area_members FOR DELETE TO anon USING (true);
  END IF;
END $$;

-- org_projects
ALTER TABLE org_projects ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'org_projects'
      AND policyname = 'Allow anon to read org_projects'
  ) THEN
    CREATE POLICY "Allow anon to read org_projects"
      ON org_projects FOR SELECT TO anon USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'org_projects'
      AND policyname = 'Allow anon to insert org_projects'
  ) THEN
    CREATE POLICY "Allow anon to insert org_projects"
      ON org_projects FOR INSERT TO anon WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'org_projects'
      AND policyname = 'Allow anon to update org_projects'
  ) THEN
    CREATE POLICY "Allow anon to update org_projects"
      ON org_projects FOR UPDATE TO anon USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'org_projects'
      AND policyname = 'Allow anon to delete org_projects'
  ) THEN
    CREATE POLICY "Allow anon to delete org_projects"
      ON org_projects FOR DELETE TO anon USING (true);
  END IF;
END $$;

-- ============================================================
-- END
-- ============================================================

