-- Issue #3: these tables contain private community data, not public content.
-- Registered members may read shared records; announcement recipient rows are
-- visible to their member or an admin. Only admins may write any of them.
-- The application currently has one community and no tenant/organization key.
--
-- Replace existing policies instead of layering on top of permissive ones:
-- PostgreSQL ORs permissive policies, so a stale policy can bypass a new one.
BEGIN;

DO $policies$
DECLARE
  table_name text;
  policy_name text;
  column_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'announcements', 'announcement_members', 'events', 'event_staff',
    'event_speakers', 'community_settings', 'menu_items'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    -- RLS does not apply to TRUNCATE. Remove other unnecessary table grants too.
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated', table_name);
    -- Table-level REVOKE does not remove independent column-level grants.
    FOR column_name IN
      SELECT a.attname FROM pg_attribute a
      WHERE a.attrelid = format('public.%I', table_name)::regclass
        AND a.attnum > 0 AND NOT a.attisdropped
    LOOP
      EXECUTE format(
        'REVOKE ALL (%I) ON TABLE public.%I FROM PUBLIC, anon, authenticated',
        column_name, table_name
      );
    END LOOP;
    EXECUTE format(
      'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO authenticated',
      table_name
    );

    FOR policy_name IN
      SELECT p.policyname FROM pg_policies p
      WHERE p.schemaname = 'public' AND p.tablename = table_name
    LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', policy_name, table_name);
    END LOOP;

    IF table_name = 'announcement_members' THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated
         USING ((SELECT public.current_member_id()) IS NOT NULL AND
           (member_id = (SELECT public.current_member_id()) OR
            (SELECT public.current_member_role()) IN (''Super Admin'', ''Admin'')))',
        table_name || '_read_own_or_admin', table_name
      );
    ELSE
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated
         USING ((SELECT public.current_member_id()) IS NOT NULL)',
        table_name || '_read_registered_member', table_name
      );
    END IF;

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated
       USING ((SELECT public.current_member_id()) IS NOT NULL AND
              (SELECT public.current_member_role()) IN (''Super Admin'', ''Admin''))
       WITH CHECK ((SELECT public.current_member_id()) IS NOT NULL AND
                   (SELECT public.current_member_role()) IN (''Super Admin'', ''Admin''))',
      table_name || '_admin_manage', table_name
    );
  END LOOP;
END;
$policies$;

COMMIT;
