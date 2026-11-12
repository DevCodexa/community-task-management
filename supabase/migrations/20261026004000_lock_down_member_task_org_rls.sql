-- Restrict member/task/organization reads to authenticated sessions linked to a registered member.
-- This schema is single-community (no organization_id tenant key); organization-scoped isolation
-- cannot be added until that data model exists. Admin write policies remain in place.

DROP POLICY IF EXISTS members_read_authenticated ON public.members;
CREATE POLICY members_read_authenticated
  ON public.members FOR SELECT TO authenticated
  USING (public.current_member_id() IS NOT NULL);

DROP POLICY IF EXISTS tasks_read_authenticated ON public.tasks;
CREATE POLICY tasks_read_authenticated
  ON public.tasks FOR SELECT TO authenticated
  USING (public.current_member_id() IS NOT NULL);

DROP POLICY IF EXISTS tasks_insert_admin_or_self ON public.tasks;
CREATE POLICY tasks_insert_admin_or_self
  ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (
    public.current_member_id() IS NOT NULL
    AND (
      public.current_member_role() IN ('Super Admin', 'Admin')
      OR assignee_id = public.current_member_id()
    )
  );

DROP POLICY IF EXISTS tasks_update_admin_or_assignee ON public.tasks;
CREATE POLICY tasks_update_admin_or_assignee
  ON public.tasks FOR UPDATE TO authenticated
  USING (
    public.current_member_id() IS NOT NULL
    AND (
      public.current_member_role() IN ('Super Admin', 'Admin')
      OR assignee_id = public.current_member_id()
    )
  )
  WITH CHECK (
    public.current_member_id() IS NOT NULL
    AND (
      public.current_member_role() IN ('Super Admin', 'Admin')
      OR assignee_id = public.current_member_id()
    )
  );

DROP POLICY IF EXISTS tasks_delete_admin_or_assignee ON public.tasks;
CREATE POLICY tasks_delete_admin_or_assignee
  ON public.tasks FOR DELETE TO authenticated
  USING (
    public.current_member_id() IS NOT NULL
    AND (
      public.current_member_role() IN ('Super Admin', 'Admin')
      OR assignee_id = public.current_member_id()
    )
  );

DROP POLICY IF EXISTS org_departments_read_authenticated ON public.org_departments;
CREATE POLICY org_departments_read_authenticated
  ON public.org_departments FOR SELECT TO authenticated
  USING (public.current_member_id() IS NOT NULL);

DROP POLICY IF EXISTS org_areas_read_authenticated ON public.org_areas;
CREATE POLICY org_areas_read_authenticated
  ON public.org_areas FOR SELECT TO authenticated
  USING (public.current_member_id() IS NOT NULL);

DROP POLICY IF EXISTS org_area_members_read_authenticated ON public.org_area_members;
CREATE POLICY org_area_members_read_authenticated
  ON public.org_area_members FOR SELECT TO authenticated
  USING (public.current_member_id() IS NOT NULL);

DROP POLICY IF EXISTS org_department_members_read_authenticated ON public.org_department_members;
CREATE POLICY org_department_members_read_authenticated
  ON public.org_department_members FOR SELECT TO authenticated
  USING (public.current_member_id() IS NOT NULL);

DROP POLICY IF EXISTS org_projects_read_authenticated ON public.org_projects;
CREATE POLICY org_projects_read_authenticated
  ON public.org_projects FOR SELECT TO authenticated
  USING (public.current_member_id() IS NOT NULL);

DROP POLICY IF EXISTS org_project_members_read_authenticated ON public.org_project_members;
CREATE POLICY org_project_members_read_authenticated
  ON public.org_project_members FOR SELECT TO authenticated
  USING (public.current_member_id() IS NOT NULL);
