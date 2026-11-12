-- Issue #1: harden core RLS, limit write access by member role, and centralize task counters.
-- Applied to the Task Manager Supabase project. This file keeps the live change reproducible.

REVOKE CREATE ON SCHEMA public FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.current_member_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
  SELECT m.system_role::text
  FROM public.members AS m
  WHERE lower(m.email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
  LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.current_member_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
  SELECT m.id
  FROM public.members AS m
  WHERE lower(m.email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
  LIMIT 1;
$function$;

-- Prevent an Admin/standard user from promoting themselves or another account to Super Admin.
CREATE OR REPLACE FUNCTION public.guard_member_role_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.system_role::text = 'Super Admin'
       AND public.current_member_role() IS DISTINCT FROM 'Super Admin' THEN
      RAISE EXCEPTION 'Only a Super Admin can create a Super Admin account';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.system_role IS DISTINCT FROM OLD.system_role
     AND public.current_member_role() IS DISTINCT FROM 'Super Admin' THEN
    RAISE EXCEPTION 'Only a Super Admin can change system roles';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_guard_member_role_change ON public.members;
CREATE TRIGGER trg_guard_member_role_change
BEFORE INSERT OR UPDATE OF system_role ON public.members
FOR EACH ROW
EXECUTE FUNCTION public.guard_member_role_change();

-- A regular member may only change the status of a task assigned to them.
-- Admins can manage task fields and assignments.
CREATE OR REPLACE FUNCTION public.guard_task_updates()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $function$
BEGIN
  IF public.current_member_role() IN ('Super Admin', 'Admin') THEN
    RETURN NEW;
  END IF;

  IF OLD.assignee_id IS DISTINCT FROM public.current_member_id() THEN
    RAISE EXCEPTION 'Only an administrator or the assigned member can update this task';
  END IF;

  IF NEW.assignee_id IS DISTINCT FROM OLD.assignee_id THEN
    RAISE EXCEPTION 'Only an administrator can reassign a task';
  END IF;

  IF (to_jsonb(NEW) - 'status' - 'updated_at')
     IS DISTINCT FROM
     (to_jsonb(OLD) - 'status' - 'updated_at') THEN
    RAISE EXCEPTION 'Assigned members may only change task status';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_guard_task_updates ON public.tasks;
CREATE TRIGGER trg_guard_task_updates
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.guard_task_updates();

-- Keep active_tasks derived from tasks in one transaction. The former client code
-- incremented/decremented the counter too, causing duplicate/stale counts.
CREATE OR REPLACE FUNCTION public.handle_task_assignment_and_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_active_count integer := 0;
  v_task_limit integer := 3;
  v_should_check boolean := false;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.assignee_id IS NOT NULL THEN
      UPDATE public.members AS m
      SET active_tasks = (
        SELECT count(*)::integer
        FROM public.tasks AS t
        WHERE t.assignee_id = OLD.assignee_id
          AND t.status::text IN ('started', 'in_progress')
      )
      WHERE m.id = OLD.assignee_id;
    END IF;
    RETURN OLD;
  END IF;

  IF NEW.assignee_id IS NOT NULL
     AND NEW.status::text IN ('started', 'in_progress') THEN
    IF TG_OP = 'INSERT' THEN
      v_should_check := true;
    ELSE
      v_should_check :=
        OLD.assignee_id IS DISTINCT FROM NEW.assignee_id
        OR OLD.status::text NOT IN ('started', 'in_progress');
    END IF;
  END IF;

  IF v_should_check THEN
    SELECT count(*)::integer, COALESCE(max(m.total_tasks), 3)
      INTO v_active_count, v_task_limit
    FROM public.tasks AS t
    JOIN public.members AS m ON m.id = NEW.assignee_id
    WHERE t.assignee_id = NEW.assignee_id
      AND t.status::text IN ('started', 'in_progress')
      AND t.id <> NEW.id;

    IF v_active_count >= v_task_limit THEN
      RAISE EXCEPTION 'This member has reached their active task limit (%)', v_task_limit;
    END IF;
  END IF;

  IF NEW.assignee_id IS NOT NULL THEN
    UPDATE public.members AS m
    SET active_tasks = (
      SELECT count(*)::integer
      FROM public.tasks AS t
      WHERE t.assignee_id = NEW.assignee_id
        AND t.status::text IN ('started', 'in_progress')
    )
    WHERE m.id = NEW.assignee_id;
  END IF;

  IF TG_OP = 'UPDATE'
     AND OLD.assignee_id IS NOT NULL
     AND OLD.assignee_id IS DISTINCT FROM NEW.assignee_id THEN
    UPDATE public.members AS m
    SET active_tasks = (
      SELECT count(*)::integer
      FROM public.tasks AS t
      WHERE t.assignee_id = OLD.assignee_id
        AND t.status::text IN ('started', 'in_progress')
    )
    WHERE m.id = OLD.assignee_id;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_task_flow_control ON public.tasks;
CREATE TRIGGER trg_task_flow_control
AFTER INSERT OR UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.handle_task_assignment_and_limit();

DROP TRIGGER IF EXISTS trg_task_flow_control_delete ON public.tasks;
CREATE TRIGGER trg_task_flow_control_delete
AFTER DELETE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.handle_task_assignment_and_limit();

-- The profile token helper only reads request context and does not need SECURITY DEFINER.
-- Keep the existing profile-token policy contract while removing elevated execution.
CREATE OR REPLACE FUNCTION public.current_profile_token()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $function$
  SELECT NULLIF(current_setting('request.profile_token', true), '')::uuid;
$function$;

-- Drop existing policy sets on the tables being secured, then recreate explicit policies.
DO $drop_policies$
DECLARE
  p record;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = ANY (ARRAY[
        'members', 'tasks', 'useful_links',
        'org_departments', 'org_areas', 'org_area_members',
        'org_projects', 'org_project_members', 'org_department_members',
        'announcements', 'announcement_members', 'events', 'event_staff',
        'event_speakers', 'community_settings', 'menu_items',
        'speaker_email_queue', 'notifications',
        'email_settings', 'email_queue', 'email_send_logs',
        'email_templates', 'birthday_notifications'
      ])
  LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
  END LOOP;
END;
$drop_policies$;

ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.useful_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_area_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_department_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_speakers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.speaker_email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_send_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.birthday_notifications ENABLE ROW LEVEL SECURITY;

-- Remove broad API grants first. Only roles explicitly granted below can use these tables.
REVOKE ALL PRIVILEGES ON TABLE
  public.members, public.tasks, public.useful_links,
  public.org_departments, public.org_areas, public.org_area_members,
  public.org_projects, public.org_project_members, public.org_department_members,
  public.announcements, public.announcement_members, public.events, public.event_staff,
  public.event_speakers, public.community_settings, public.menu_items, public.notifications
FROM PUBLIC, anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.members, public.tasks, public.useful_links,
  public.org_departments, public.org_areas, public.org_area_members,
  public.org_projects, public.org_project_members, public.org_department_members,
  public.announcements, public.announcement_members, public.events, public.event_staff,
  public.event_speakers, public.community_settings, public.menu_items, public.notifications
TO authenticated, service_role;

REVOKE ALL PRIVILEGES ON TABLE
  public.email_settings, public.email_queue, public.email_send_logs,
  public.email_templates, public.birthday_notifications, public.speaker_email_queue
FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.email_settings, public.email_queue, public.email_send_logs,
  public.email_templates, public.birthday_notifications, public.speaker_email_queue
TO service_role;

-- MEMBER DIRECTORY: any signed-in member may read; only admins may manage records.
CREATE POLICY members_read_authenticated
ON public.members FOR SELECT TO authenticated USING (true);

CREATE POLICY members_insert_admin
ON public.members FOR INSERT TO authenticated
WITH CHECK (public.current_member_role() IN ('Super Admin', 'Admin'));

CREATE POLICY members_update_admin
ON public.members FOR UPDATE TO authenticated
USING (
  public.current_member_role() = 'Super Admin'
  OR (public.current_member_role() = 'Admin' AND system_role::text <> 'Super Admin')
)
WITH CHECK (
  public.current_member_role() = 'Super Admin'
  OR (public.current_member_role() = 'Admin' AND system_role::text <> 'Super Admin')
);

CREATE POLICY members_delete_admin
ON public.members FOR DELETE TO authenticated
USING (
  public.current_member_role() = 'Super Admin'
  OR (public.current_member_role() = 'Admin' AND system_role::text <> 'Super Admin')
);

-- TASKS: all signed-in users can read. Admins manage all tasks; members can create
-- a task assigned to themselves, change only their assigned task's status, and delete
-- their assigned task. Counter synchronization is handled by the database trigger.
CREATE POLICY tasks_read_authenticated
ON public.tasks FOR SELECT TO authenticated USING (true);

CREATE POLICY tasks_insert_admin_or_self
ON public.tasks FOR INSERT TO authenticated
WITH CHECK (
  public.current_member_role() IN ('Super Admin', 'Admin')
  OR assignee_id = public.current_member_id()
);

CREATE POLICY tasks_update_admin_or_assignee
ON public.tasks FOR UPDATE TO authenticated
USING (
  public.current_member_role() IN ('Super Admin', 'Admin')
  OR assignee_id = public.current_member_id()
)
WITH CHECK (
  public.current_member_role() IN ('Super Admin', 'Admin')
  OR assignee_id = public.current_member_id()
);

CREATE POLICY tasks_delete_admin_or_assignee
ON public.tasks FOR DELETE TO authenticated
USING (
  public.current_member_role() IN ('Super Admin', 'Admin')
  OR assignee_id = public.current_member_id()
);

-- Organization structure and links: authenticated read, admin-only writes.
CREATE POLICY useful_links_read_authenticated
ON public.useful_links FOR SELECT TO authenticated USING (true);
CREATE POLICY useful_links_insert_admin
ON public.useful_links FOR INSERT TO authenticated
WITH CHECK (public.current_member_role() IN ('Super Admin', 'Admin'));
CREATE POLICY useful_links_update_admin
ON public.useful_links FOR UPDATE TO authenticated
USING (public.current_member_role() IN ('Super Admin', 'Admin'))
WITH CHECK (public.current_member_role() IN ('Super Admin', 'Admin'));
CREATE POLICY useful_links_delete_admin
ON public.useful_links FOR DELETE TO authenticated
USING (public.current_member_role() IN ('Super Admin', 'Admin'));

CREATE POLICY org_departments_read_authenticated
ON public.org_departments FOR SELECT TO authenticated USING (true);
CREATE POLICY org_departments_admin_all
ON public.org_departments FOR ALL TO authenticated
USING (public.current_member_role() IN ('Super Admin', 'Admin'))
WITH CHECK (public.current_member_role() IN ('Super Admin', 'Admin'));

CREATE POLICY org_areas_read_authenticated
ON public.org_areas FOR SELECT TO authenticated USING (true);
CREATE POLICY org_areas_admin_all
ON public.org_areas FOR ALL TO authenticated
USING (public.current_member_role() IN ('Super Admin', 'Admin'))
WITH CHECK (public.current_member_role() IN ('Super Admin', 'Admin'));

CREATE POLICY org_area_members_read_authenticated
ON public.org_area_members FOR SELECT TO authenticated USING (true);
CREATE POLICY org_area_members_admin_all
ON public.org_area_members FOR ALL TO authenticated
USING (public.current_member_role() IN ('Super Admin', 'Admin'))
WITH CHECK (public.current_member_role() IN ('Super Admin', 'Admin'));

CREATE POLICY org_projects_read_authenticated
ON public.org_projects FOR SELECT TO authenticated USING (true);
CREATE POLICY org_projects_admin_all
ON public.org_projects FOR ALL TO authenticated
USING (public.current_member_role() IN ('Super Admin', 'Admin'))
WITH CHECK (public.current_member_role() IN ('Super Admin', 'Admin'));

CREATE POLICY org_project_members_read_authenticated
ON public.org_project_members FOR SELECT TO authenticated USING (true);
CREATE POLICY org_project_members_admin_all
ON public.org_project_members FOR ALL TO authenticated
USING (public.current_member_role() IN ('Super Admin', 'Admin'))
WITH CHECK (public.current_member_role() IN ('Super Admin', 'Admin'));

CREATE POLICY org_department_members_read_authenticated
ON public.org_department_members FOR SELECT TO authenticated USING (true);
CREATE POLICY org_department_members_admin_all
ON public.org_department_members FOR ALL TO authenticated
USING (public.current_member_role() IN ('Super Admin', 'Admin'))
WITH CHECK (public.current_member_role() IN ('Super Admin', 'Admin'));

-- Announcements: members can read all announcements and their own recipient rows.
CREATE POLICY announcements_read_authenticated
ON public.announcements FOR SELECT TO authenticated USING (true);
CREATE POLICY announcements_admin_insert
ON public.announcements FOR INSERT TO authenticated
WITH CHECK (public.current_member_role() IN ('Super Admin', 'Admin'));
CREATE POLICY announcements_admin_update
ON public.announcements FOR UPDATE TO authenticated
USING (public.current_member_role() IN ('Super Admin', 'Admin'))
WITH CHECK (public.current_member_role() IN ('Super Admin', 'Admin'));
CREATE POLICY announcements_admin_delete
ON public.announcements FOR DELETE TO authenticated
USING (public.current_member_role() IN ('Super Admin', 'Admin'));

CREATE POLICY announcement_members_read_own_or_admin
ON public.announcement_members FOR SELECT TO authenticated
USING (
  member_id = public.current_member_id()
  OR public.current_member_role() IN ('Super Admin', 'Admin')
);
CREATE POLICY announcement_members_admin_insert
ON public.announcement_members FOR INSERT TO authenticated
WITH CHECK (public.current_member_role() IN ('Super Admin', 'Admin'));
CREATE POLICY announcement_members_admin_update
ON public.announcement_members FOR UPDATE TO authenticated
USING (public.current_member_role() IN ('Super Admin', 'Admin'))
WITH CHECK (public.current_member_role() IN ('Super Admin', 'Admin'));
CREATE POLICY announcement_members_admin_delete
ON public.announcement_members FOR DELETE TO authenticated
USING (public.current_member_role() IN ('Super Admin', 'Admin'));

-- Events and related assignments.
CREATE POLICY events_read_authenticated
ON public.events FOR SELECT TO authenticated USING (true);
CREATE POLICY events_admin_insert
ON public.events FOR INSERT TO authenticated
WITH CHECK (public.current_member_role() IN ('Super Admin', 'Admin'));
CREATE POLICY events_admin_update
ON public.events FOR UPDATE TO authenticated
USING (public.current_member_role() IN ('Super Admin', 'Admin'))
WITH CHECK (public.current_member_role() IN ('Super Admin', 'Admin'));
CREATE POLICY events_admin_delete
ON public.events FOR DELETE TO authenticated
USING (public.current_member_role() IN ('Super Admin', 'Admin'));

CREATE POLICY event_staff_read_authenticated
ON public.event_staff FOR SELECT TO authenticated USING (true);
CREATE POLICY event_staff_admin_all
ON public.event_staff FOR ALL TO authenticated
USING (public.current_member_role() IN ('Super Admin', 'Admin'))
WITH CHECK (public.current_member_role() IN ('Super Admin', 'Admin'));

CREATE POLICY event_speakers_read_authenticated
ON public.event_speakers FOR SELECT TO authenticated USING (true);
CREATE POLICY event_speakers_admin_all
ON public.event_speakers FOR ALL TO authenticated
USING (public.current_member_role() IN ('Super Admin', 'Admin'))
WITH CHECK (public.current_member_role() IN ('Super Admin', 'Admin'));

-- Community settings and nav items are visible to signed-in users; only admins edit them.
CREATE POLICY community_settings_read_authenticated
ON public.community_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY community_settings_admin_insert
ON public.community_settings FOR INSERT TO authenticated
WITH CHECK (public.current_member_role() IN ('Super Admin', 'Admin'));
CREATE POLICY community_settings_admin_update
ON public.community_settings FOR UPDATE TO authenticated
USING (public.current_member_role() IN ('Super Admin', 'Admin'))
WITH CHECK (public.current_member_role() IN ('Super Admin', 'Admin'));
CREATE POLICY community_settings_admin_delete
ON public.community_settings FOR DELETE TO authenticated
USING (public.current_member_role() IN ('Super Admin', 'Admin'));

CREATE POLICY menu_items_read_authenticated
ON public.menu_items FOR SELECT TO authenticated USING (true);
CREATE POLICY menu_items_admin_all
ON public.menu_items FOR ALL TO authenticated
USING (public.current_member_role() IN ('Super Admin', 'Admin'))
WITH CHECK (public.current_member_role() IN ('Super Admin', 'Admin'));

-- Notifications are private to their recipient; a member may only mutate their own.
CREATE POLICY notifications_read_own_or_admin
ON public.notifications FOR SELECT TO authenticated
USING (
  user_id = public.current_member_id()
  OR public.current_member_role() IN ('Super Admin', 'Admin')
);
CREATE POLICY notifications_insert_self_or_admin
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (
  public.current_member_role() IN ('Super Admin', 'Admin')
  OR (user_id = public.current_member_id() AND actor_id = public.current_member_id())
);
CREATE POLICY notifications_update_own_or_admin
ON public.notifications FOR UPDATE TO authenticated
USING (
  user_id = public.current_member_id()
  OR public.current_member_role() IN ('Super Admin', 'Admin')
)
WITH CHECK (
  user_id = public.current_member_id()
  OR public.current_member_role() IN ('Super Admin', 'Admin')
);
CREATE POLICY notifications_delete_own_or_admin
ON public.notifications FOR DELETE TO authenticated
USING (
  user_id = public.current_member_id()
  OR public.current_member_role() IN ('Super Admin', 'Admin')
);

-- Email-provider settings, queue internals, logs, templates, and birthday state are server-only.
-- SECURITY DEFINER RPCs are not a public API; revoke direct execution from client roles.
DO $revoke_definer_exec$
DECLARE
  f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_proc AS p
    JOIN pg_namespace AS n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
      AND p.proname NOT IN ('current_member_role', 'current_member_id')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.signature);
  END LOOP;
END;
$revoke_definer_exec$;

-- Restore only the helper/backend functions that require explicit execution grants.
GRANT EXECUTE ON FUNCTION public.current_member_role() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_member_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_profile_token() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.archive_done_tasks_older_than_7_days() TO service_role;
GRANT EXECUTE ON FUNCTION public.archive_single_task(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.enqueue_birthday_emails(boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.enqueue_email(character varying, character varying, character varying, jsonb, public.email_priority_enum) TO service_role;
GRANT EXECUTE ON FUNCTION public.process_speaker_email_queue() TO service_role;

-- Fix mutable search_path on SECURITY DEFINER functions. Public schema CREATE was revoked above.
DO $fixed_search_path$
DECLARE
  f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_proc AS p
    JOIN pg_namespace AS n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = pg_catalog, public', f.signature);
  END LOOP;
END;
$fixed_search_path$;
