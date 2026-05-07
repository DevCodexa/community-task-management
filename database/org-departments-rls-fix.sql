-- RLS FIX for org_departments (and related tables) so authenticated users can create rows.
-- Run in Supabase SQL Editor

-- ----------------------------
-- org_departments
-- ----------------------------
ALTER TABLE org_departments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- INSERT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'org_departments'
      AND policyname = 'Authenticated users can insert org_departments'
  ) THEN
    CREATE POLICY "Authenticated users can insert org_departments"
      ON org_departments
      FOR INSERT TO authenticated
      WITH CHECK (true);
  END IF;

  -- SELECT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'org_departments'
      AND policyname = 'Authenticated users can read org_departments'
  ) THEN
    CREATE POLICY "Authenticated users can read org_departments"
      ON org_departments
      FOR SELECT TO authenticated
      USING (true);
  END IF;

  -- UPDATE
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'org_departments'
      AND policyname = 'Authenticated users can update org_departments'
  ) THEN
    CREATE POLICY "Authenticated users can update org_departments"
      ON org_departments
      FOR UPDATE TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;

  -- DELETE
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'org_departments'
      AND policyname = 'Authenticated users can delete org_departments'
  ) THEN
    CREATE POLICY "Authenticated users can delete org_departments"
      ON org_departments
      FOR DELETE TO authenticated
      USING (true);
  END IF;
END $$;

-- ----------------------------
-- org_areas
-- ----------------------------
ALTER TABLE org_areas ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'org_areas'
      AND policyname = 'Authenticated users can read org_areas'
  ) THEN
    CREATE POLICY "Authenticated users can read org_areas"
      ON org_areas FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'org_areas'
      AND policyname = 'Authenticated users can insert org_areas'
  ) THEN
    CREATE POLICY "Authenticated users can insert org_areas"
      ON org_areas FOR INSERT TO authenticated WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'org_areas'
      AND policyname = 'Authenticated users can update org_areas'
  ) THEN
    CREATE POLICY "Authenticated users can update org_areas"
      ON org_areas FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'org_areas'
      AND policyname = 'Authenticated users can delete org_areas'
  ) THEN
    CREATE POLICY "Authenticated users can delete org_areas"
      ON org_areas FOR DELETE TO authenticated USING (true);
  END IF;
END $$;

-- ----------------------------
-- org_area_members
-- ----------------------------
ALTER TABLE org_area_members ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'org_area_members'
      AND policyname = 'Authenticated users can read org_area_members'
  ) THEN
    CREATE POLICY "Authenticated users can read org_area_members"
      ON org_area_members FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'org_area_members'
      AND policyname = 'Authenticated users can insert org_area_members'
  ) THEN
    CREATE POLICY "Authenticated users can insert org_area_members"
      ON org_area_members FOR INSERT TO authenticated WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'org_area_members'
      AND policyname = 'Authenticated users can update org_area_members'
  ) THEN
    CREATE POLICY "Authenticated users can update org_area_members"
      ON org_area_members FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'org_area_members'
      AND policyname = 'Authenticated users can delete org_area_members'
  ) THEN
    CREATE POLICY "Authenticated users can delete org_area_members"
      ON org_area_members FOR DELETE TO authenticated USING (true);
  END IF;
END $$;

-- ----------------------------
-- org_projects
-- ----------------------------
ALTER TABLE org_projects ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'org_projects'
      AND policyname = 'Authenticated users can read org_projects'
  ) THEN
    CREATE POLICY "Authenticated users can read org_projects"
      ON org_projects FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'org_projects'
      AND policyname = 'Authenticated users can insert org_projects'
  ) THEN
    CREATE POLICY "Authenticated users can insert org_projects"
      ON org_projects FOR INSERT TO authenticated WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'org_projects'
      AND policyname = 'Authenticated users can update org_projects'
  ) THEN
    CREATE POLICY "Authenticated users can update org_projects"
      ON org_projects FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'org_projects'
      AND policyname = 'Authenticated users can delete org_projects'
  ) THEN
    CREATE POLICY "Authenticated users can delete org_projects"
      ON org_projects FOR DELETE TO authenticated USING (true);
  END IF;
END $$;

