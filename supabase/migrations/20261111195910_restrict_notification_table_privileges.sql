-- Each user's inbox is private, including from other admins. Server-side
-- SECURITY DEFINER notification triggers and the service role remain unchanged.
-- PostgreSQL ORs permissive policies: remove all current policies rather than
-- leave an older broad policy able to bypass the intended recipient rule.
-- Before deploying, review environment-specific policies that will be removed.
BEGIN;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.notifications FROM PUBLIC, anon, authenticated;

-- Table-level REVOKE does not remove independent column-level grants.
DO $replace_policies$
DECLARE
  column_name text;
  policy_name text;
BEGIN
  FOR column_name IN
    SELECT a.attname FROM pg_attribute a
    WHERE a.attrelid = 'public.notifications'::regclass
      AND a.attnum > 0 AND NOT a.attisdropped
  LOOP
    EXECUTE format('REVOKE ALL (%I) ON TABLE public.notifications FROM PUBLIC, anon, authenticated', column_name);
  END LOOP;
  FOR policy_name IN
    SELECT p.policyname FROM pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename = 'notifications'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.notifications', policy_name);
  END LOOP;
END;
$replace_policies$;

-- RLS applies to CRUD, not TRUNCATE, REFERENCES or TRIGGER. These privileges
-- are deliberately not regranted to browser roles.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.notifications TO authenticated;

CREATE POLICY notifications_read_own ON public.notifications FOR SELECT TO authenticated
  USING (user_id = (SELECT public.current_member_id()));
CREATE POLICY notifications_update_own ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = (SELECT public.current_member_id()))
  WITH CHECK (user_id = (SELECT public.current_member_id()));
CREATE POLICY notifications_delete_own ON public.notifications FOR DELETE TO authenticated
  USING (user_id = (SELECT public.current_member_id()));

-- Keep the existing admin broadcast creation capability, but require an
-- explicit recipient for every new row. Self-inserts require the caller actor.
CREATE POLICY notifications_insert_self_or_admin ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (
    user_id IS NOT NULL AND (SELECT public.current_member_id()) IS NOT NULL AND (
      (SELECT public.current_member_role()) IN ('Super Admin', 'Admin')
      OR (user_id = (SELECT public.current_member_id()) AND actor_id = (SELECT public.current_member_id()))
    )
  );
COMMIT;
