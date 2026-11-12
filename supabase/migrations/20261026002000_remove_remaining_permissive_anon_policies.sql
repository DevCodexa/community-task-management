-- Remove remaining permissive anonymous policies from archived work and email records.

DROP POLICY IF EXISTS "Allow anon to delete archived_tasks" ON public.archived_tasks;
DROP POLICY IF EXISTS "Allow anon to insert archived_tasks" ON public.archived_tasks;
DROP POLICY IF EXISTS "Allow anon to read archived_tasks" ON public.archived_tasks;
DROP POLICY IF EXISTS "Allow anon to update archived_tasks" ON public.archived_tasks;
DROP POLICY IF EXISTS "Allow authenticated to delete archived_tasks" ON public.archived_tasks;
DROP POLICY IF EXISTS "Allow authenticated to insert archived_tasks" ON public.archived_tasks;
DROP POLICY IF EXISTS "Allow authenticated to read archived_tasks" ON public.archived_tasks;
DROP POLICY IF EXISTS "Allow authenticated to update archived_tasks" ON public.archived_tasks;

CREATE POLICY archived_tasks_read_registered_member
  ON public.archived_tasks FOR SELECT TO authenticated
  USING (public.current_member_id() IS NOT NULL);
CREATE POLICY archived_tasks_insert_admin_or_assignee
  ON public.archived_tasks FOR INSERT TO authenticated
  WITH CHECK (
    public.current_member_id() IS NOT NULL
    AND (
      public.current_member_role() IN ('Super Admin', 'Admin')
      OR assignee_id = public.current_member_id()
    )
  );
CREATE POLICY archived_tasks_update_admin_or_assignee
  ON public.archived_tasks FOR UPDATE TO authenticated
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
CREATE POLICY archived_tasks_delete_admin_or_assignee
  ON public.archived_tasks FOR DELETE TO authenticated
  USING (
    public.current_member_id() IS NOT NULL
    AND (
      public.current_member_role() IN ('Super Admin', 'Admin')
      OR assignee_id = public.current_member_id()
    )
  );

-- Manual email history and payloads are private; only registered administrators may access them.
DROP POLICY IF EXISTS "Allow anon to insert manual_emails" ON public.manual_emails;
DROP POLICY IF EXISTS "Allow anon to read manual_emails" ON public.manual_emails;
DROP POLICY IF EXISTS "Allow anon to update manual_emails" ON public.manual_emails;
DROP POLICY IF EXISTS manual_emails_admin_only ON public.manual_emails;
CREATE POLICY manual_emails_admin_only
  ON public.manual_emails FOR ALL TO authenticated
  USING (public.current_member_role() IN ('Super Admin', 'Admin'))
  WITH CHECK (public.current_member_role() IN ('Super Admin', 'Admin'));

-- Speaker contact details must not be readable or writable by anonymous visitors.
DROP POLICY IF EXISTS "Allow anyone to insert speakers" ON public.speakers;
DROP POLICY IF EXISTS "Allow anyone to read speakers" ON public.speakers;
DROP POLICY IF EXISTS "Authenticated users can delete speakers" ON public.speakers;
DROP POLICY IF EXISTS "Authenticated users can insert speakers" ON public.speakers;
DROP POLICY IF EXISTS "Authenticated users can read speakers" ON public.speakers;
DROP POLICY IF EXISTS "Authenticated users can update speakers" ON public.speakers;
DROP POLICY IF EXISTS speakers_read_registered_member ON public.speakers;
DROP POLICY IF EXISTS speakers_admin_manage ON public.speakers;
CREATE POLICY speakers_read_registered_member
  ON public.speakers FOR SELECT TO authenticated
  USING (public.current_member_id() IS NOT NULL);
CREATE POLICY speakers_admin_manage
  ON public.speakers FOR ALL TO authenticated
  USING (public.current_member_role() IN ('Super Admin', 'Admin'))
  WITH CHECK (public.current_member_role() IN ('Super Admin', 'Admin'));
