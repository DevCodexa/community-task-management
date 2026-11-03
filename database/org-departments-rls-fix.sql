-- Secure re-application of organization-table RLS policies.
--
-- Requires the versioned security migrations to have been applied first:
-- current_member_id() and current_member_role() must exist.
--
-- This intentionally replaces every existing policy on the listed organization
-- tables. Older versions of this file granted all authenticated users write
-- access, which is too permissive. Registered members may read the single
-- community directory; only Admin and Super Admin may change its structure.

BEGIN;

DO $drop_legacy_policies$
DECLARE
  p record;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = ANY (ARRAY[
        'org_departments',
        'org_areas',
        'org_area_members',
        'org_department_members',
        'org_projects',
        'org_project_members'
      ])
  LOOP
    EXECUTE format(
      'DROP POLICY %I ON %I.%I',
      p.policyname,
      p.schemaname,
      p.tablename
    );
  END LOOP;
END;
$drop_legacy_policies$;

ALTER TABLE public.org_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_area_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_department_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_project_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY org_departments_read_authenticated
  ON public.org_departments FOR SELECT TO authenticated
  USING (public.current_member_id() IS NOT NULL);
CREATE POLICY org_departments_admin_all
  ON public.org_departments FOR ALL TO authenticated
  USING (public.current_member_role() IN ('Super Admin', 'Admin'))
  WITH CHECK (public.current_member_role() IN ('Super Admin', 'Admin'));

CREATE POLICY org_areas_read_authenticated
  ON public.org_areas FOR SELECT TO authenticated
  USING (public.current_member_id() IS NOT NULL);
CREATE POLICY org_areas_admin_all
  ON public.org_areas FOR ALL TO authenticated
  USING (public.current_member_role() IN ('Super Admin', 'Admin'))
  WITH CHECK (public.current_member_role() IN ('Super Admin', 'Admin'));

CREATE POLICY org_area_members_read_authenticated
  ON public.org_area_members FOR SELECT TO authenticated
  USING (public.current_member_id() IS NOT NULL);
CREATE POLICY org_area_members_admin_all
  ON public.org_area_members FOR ALL TO authenticated
  USING (public.current_member_role() IN ('Super Admin', 'Admin'))
  WITH CHECK (public.current_member_role() IN ('Super Admin', 'Admin'));

CREATE POLICY org_department_members_read_authenticated
  ON public.org_department_members FOR SELECT TO authenticated
  USING (public.current_member_id() IS NOT NULL);
CREATE POLICY org_department_members_admin_all
  ON public.org_department_members FOR ALL TO authenticated
  USING (public.current_member_role() IN ('Super Admin', 'Admin'))
  WITH CHECK (public.current_member_role() IN ('Super Admin', 'Admin'));

CREATE POLICY org_projects_read_authenticated
  ON public.org_projects FOR SELECT TO authenticated
  USING (public.current_member_id() IS NOT NULL);
CREATE POLICY org_projects_admin_all
  ON public.org_projects FOR ALL TO authenticated
  USING (public.current_member_role() IN ('Super Admin', 'Admin'))
  WITH CHECK (public.current_member_role() IN ('Super Admin', 'Admin'));

CREATE POLICY org_project_members_read_authenticated
  ON public.org_project_members FOR SELECT TO authenticated
  USING (public.current_member_id() IS NOT NULL);
CREATE POLICY org_project_members_admin_all
  ON public.org_project_members FOR ALL TO authenticated
  USING (public.current_member_role() IN ('Super Admin', 'Admin'))
  WITH CHECK (public.current_member_role() IN ('Super Admin', 'Admin'));

COMMIT;
