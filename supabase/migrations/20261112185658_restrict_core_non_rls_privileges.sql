-- RLS does not protect TRUNCATE, REFERENCES or TRIGGER. Remove those browser
-- privileges without changing existing CRUD grants, RLS policies or data.
-- Missing historical tables are skipped; review target-specific grants first.
BEGIN;
DO $core_table_grants$
DECLARE
  table_name text;
  column_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'members', 'tasks', 'useful_links',
    'org_departments', 'org_areas', 'org_projects',
    'org_department_members', 'org_area_members', 'org_project_members',
    'member_announcements', 'member_areas', 'member_attachments', 'profiles',
    'announcements', 'announcement_members', 'events', 'event_staff',
    'event_speakers', 'community_settings', 'menu_items', 'notifications'
  ]
  LOOP
    IF EXISTS (
      SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = table_name AND c.relkind IN ('r', 'p')
    ) THEN
      EXECUTE format('REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLE public.%I FROM PUBLIC, anon, authenticated', table_name);
      FOR column_name IN
        SELECT a.attname FROM pg_attribute a
        JOIN pg_class c ON c.oid = a.attrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = table_name
          AND a.attnum > 0 AND NOT a.attisdropped
      LOOP
        EXECUTE format('REVOKE REFERENCES (%I) ON TABLE public.%I FROM PUBLIC, anon, authenticated', column_name, table_name);
      END LOOP;
    END IF;
  END LOOP;
END;
$core_table_grants$;
COMMIT;
