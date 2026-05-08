-- ============================================================
-- Org Events / Ekipler ve Proje Üyeleri - ProjeMember tablosu
-- ============================================================
-- Run in your Supabase SQL Editor
--
-- Tasarım:
--   org_departments -> org_areas -> org_projects
--   Proje üyesi: org_project_members(project_id, user_id, role?)
--
-- Not:
--   Mevcut UI `ProjectModal` ekranında seçilen memberları projenin üyesi yapar.
-- ============================================================

-- ------------------------------------------------------------
-- 1) ENUM (opsiyonel rol)
-- ------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_member_role_enum') THEN
    CREATE TYPE project_member_role_enum AS ENUM ('LEADER', 'TEAM_MEMBER');
  END IF;
END $$;

-- ------------------------------------------------------------
-- 2) Tablo
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS org_project_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES org_projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  role project_member_role_enum NOT NULL DEFAULT 'TEAM_MEMBER',
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  deleted_at timestamptz,

  -- aynı user aynı projede birden fazla kez olamasın
  CONSTRAINT uq_org_project_members_project_user UNIQUE (project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_project_members_project_id
  ON org_project_members(project_id);

CREATE INDEX IF NOT EXISTS idx_org_project_members_user_id
  ON org_project_members(user_id);

-- ------------------------------------------------------------
-- 3) updated_at trigger (tüm şemada aynı helper fonksiyon var)
-- ------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tr_org_project_members_updated_at') THEN
    CREATE TRIGGER tr_org_project_members_updated_at
      BEFORE UPDATE ON org_project_members
      FOR EACH ROW
      EXECUTE FUNCTION public.trigger_set_updated_at();
  END IF;
END $$;

-- ------------------------------------------------------------
-- 4) RLS
-- Bu repo mevcut scriptlerde olduğu gibi basit policy ile ilerliyor.
-- ------------------------------------------------------------
ALTER TABLE org_project_members ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- SELECT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'org_project_members'
      AND policyname = 'Allow anon to read org_project_members'
  ) THEN
    CREATE POLICY "Allow anon to read org_project_members"
      ON org_project_members FOR SELECT TO anon USING (true);
  END IF;

  -- INSERT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'org_project_members'
      AND policyname = 'Allow anon to insert org_project_members'
  ) THEN
    CREATE POLICY "Allow anon to insert org_project_members"
      ON org_project_members FOR INSERT TO anon WITH CHECK (true);
  END IF;

  -- UPDATE
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'org_project_members'
      AND policyname = 'Allow anon to update org_project_members'
  ) THEN
    CREATE POLICY "Allow anon to update org_project_members"
      ON org_project_members FOR UPDATE TO anon USING (true) WITH CHECK (true);
  END IF;

  -- DELETE
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'org_project_members'
      AND policyname = 'Allow anon to delete org_project_members'
  ) THEN
    CREATE POLICY "Allow anon to delete org_project_members"
      ON org_project_members FOR DELETE TO anon USING (true);
  END IF;
END $$;

