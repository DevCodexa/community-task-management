-- Regression checks for Issue #1 (member/task/organization RLS).
--
-- Run as the Supabase database owner against a disposable database after all
-- files in supabase/migrations have been applied:
--   psql "$SUPABASE_DB_URL" --set ON_ERROR_STOP=1 --file supabase/tests/rls_member_task_org.sql
--
-- JWT claims are set on the database connection while switching to the same
-- Postgres roles used by Supabase (anon/authenticated). This exercises RLS and
-- trigger rules, but is not a substitute for a browser-level Auth E2E test.
-- All fixtures are inside one transaction and are rolled back at the end.

BEGIN;

SELECT set_config('request.jwt.claims', '{"role":"postgres"}', true);

DO $catalog_checks$
DECLARE
  v_table text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'members',
    'tasks',
    'org_departments',
    'org_areas',
    'org_area_members',
    'org_department_members',
    'org_projects',
    'org_project_members'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = v_table
        AND c.relrowsecurity
    ) THEN
      RAISE EXCEPTION 'RLS is not enabled for public.%', v_table;
    END IF;

    IF has_table_privilege('anon', format('public.%I', v_table), 'SELECT')
       OR has_table_privilege('anon', format('public.%I', v_table), 'INSERT')
       OR has_table_privilege('anon', format('public.%I', v_table), 'UPDATE')
       OR has_table_privilege('anon', format('public.%I', v_table), 'DELETE') THEN
      RAISE EXCEPTION 'anon still has a table grant on public.%', v_table;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM pg_policies p
      WHERE p.schemaname = 'public'
        AND p.tablename = v_table
        AND (
          p.roles && ARRAY['anon'::name]
          OR p.roles && ARRAY['public'::name]
        )
    ) THEN
      RAISE EXCEPTION 'A public/anon RLS policy remains on public.%', v_table;
    END IF;
  END LOOP;

  IF has_function_privilege('anon', 'public.current_member_id()', 'EXECUTE')
     OR has_function_privilege('anon', 'public.current_member_role()', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon can execute a SECURITY DEFINER identity helper';
  END IF;

  IF NOT has_function_privilege('authenticated', 'public.current_member_id()', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'public.current_member_role()', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated is missing EXECUTE on an RLS identity helper';
  END IF;

  FOREACH v_table IN ARRAY ARRAY[
    'org_departments',
    'org_areas',
    'org_area_members',
    'org_department_members',
    'org_projects',
    'org_project_members'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies p
      WHERE p.schemaname = 'public'
        AND p.tablename = v_table
        AND p.policyname = v_table || '_read_authenticated'
        AND p.roles && ARRAY['authenticated'::name]
        AND COALESCE(p.qual, '') ILIKE '%current_member_id%'
    ) THEN
      RAISE EXCEPTION 'Registered-member read policy missing or too broad on public.%', v_table;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies p
      WHERE p.schemaname = 'public'
        AND p.tablename = v_table
        AND p.policyname = v_table || '_admin_all'
        AND p.roles && ARRAY['authenticated'::name]
        AND COALESCE(p.qual, '') ILIKE '%current_member_role%'
        AND COALESCE(p.with_check, '') ILIKE '%current_member_role%'
    ) THEN
      RAISE EXCEPTION 'Admin-only write policy missing on public.%', v_table;
    END IF;
  END LOOP;
END;
$catalog_checks$;

INSERT INTO public.members (id, name, email, birth_day, birth_month, system_role)
VALUES
  ('d1000000-0000-4000-8000-000000000001', 'RLS Test Member', 'rls-member@example.invalid', 1, 1, 'User'),
  ('d1000000-0000-4000-8000-000000000002', 'RLS Test Admin', 'rls-admin@example.invalid', 2, 2, 'Admin')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks (id, title, assignee_id, status)
VALUES
  ('d2000000-0000-4000-8000-000000000001', 'Member-owned test task', 'd1000000-0000-4000-8000-000000000001', 'backlog'),
  ('d2000000-0000-4000-8000-000000000002', 'Admin-owned test task', 'd1000000-0000-4000-8000-000000000002', 'backlog')
ON CONFLICT (id) DO NOTHING;

-- Authenticated but not registered as a community member must see no private rows.
SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"role":"authenticated","email":"not-registered@example.invalid"}',
  true
);
DO $unregistered_session$
DECLARE
  v_count integer;
BEGIN
  IF public.current_member_id() IS NOT NULL THEN
    RAISE EXCEPTION 'An unregistered identity unexpectedly resolved to a member';
  END IF;

  SELECT count(*) INTO v_count FROM public.members;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'An unregistered identity can read members';
  END IF;

  SELECT count(*) INTO v_count FROM public.tasks;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'An unregistered identity can read tasks';
  END IF;
END;
$unregistered_session$;
RESET ROLE;

-- Ordinary member: registered identity can read the community board, but cannot
-- manage member records, assign work to someone else, or edit another person's task.
SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"role":"authenticated","email":"rls-member@example.invalid"}',
  true
);
DO $ordinary_member$
DECLARE
  v_rows integer;
BEGIN
  IF public.current_member_role() IS DISTINCT FROM 'User' THEN
    RAISE EXCEPTION 'Ordinary-member identity was not resolved correctly';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.members
    WHERE id = 'd1000000-0000-4000-8000-000000000001'
  ) THEN
    RAISE EXCEPTION 'Registered member cannot read the community directory';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.tasks
    WHERE id = 'd2000000-0000-4000-8000-000000000001'
  ) THEN
    RAISE EXCEPTION 'Registered member cannot read the task board';
  END IF;

  UPDATE public.members
  SET phone = 'must-not-update'
  WHERE id = 'd1000000-0000-4000-8000-000000000002';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 0 THEN
    RAISE EXCEPTION 'Ordinary member modified an administrator member record';
  END IF;

  INSERT INTO public.tasks (id, title, assignee_id, status)
  VALUES (
    'd2000000-0000-4000-8000-000000000003',
    'Member self-assigned task',
    'd1000000-0000-4000-8000-000000000001',
    'backlog'
  );

  BEGIN
    INSERT INTO public.tasks (id, title, assignee_id, status)
    VALUES (
      'd2000000-0000-4000-8000-000000000004',
      'Forbidden assignment',
      'd1000000-0000-4000-8000-000000000002',
      'backlog'
    );
    RAISE EXCEPTION 'RLS TEST FAILED: ordinary member assigned a task to another member';
  EXCEPTION
    WHEN insufficient_privilege THEN
      NULL;
  END;

  UPDATE public.tasks
  SET title = 'Forbidden task edit'
  WHERE id = 'd2000000-0000-4000-8000-000000000002';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 0 THEN
    RAISE EXCEPTION 'Ordinary member edited another member task';
  END IF;

  UPDATE public.tasks
  SET status = 'started'
  WHERE id = 'd2000000-0000-4000-8000-000000000003';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN
    RAISE EXCEPTION 'Ordinary member could not update status of their own task';
  END IF;

  BEGIN
    UPDATE public.tasks
    SET title = 'Forbidden content edit'
    WHERE id = 'd2000000-0000-4000-8000-000000000003';
    RAISE EXCEPTION 'RLS TEST FAILED: ordinary member edited task content';
  EXCEPTION
    WHEN raise_exception THEN
      IF SQLERRM <> 'Assigned members may only change task status' THEN
        RAISE;
      END IF;
  END;
END;
$ordinary_member$;
RESET ROLE;

-- Admin: can manage member records and create/update tasks for other members.
SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"role":"authenticated","email":"rls-admin@example.invalid"}',
  true
);
DO $administrator$
DECLARE
  v_rows integer;
BEGIN
  IF public.current_member_role() IS DISTINCT FROM 'Admin' THEN
    RAISE EXCEPTION 'Administrator identity was not resolved correctly';
  END IF;

  UPDATE public.members
  SET phone = 'admin-updated-test-value'
  WHERE id = 'd1000000-0000-4000-8000-000000000001';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN
    RAISE EXCEPTION 'Admin could not update a member record';
  END IF;

  INSERT INTO public.tasks (id, title, assignee_id, status)
  VALUES (
    'd2000000-0000-4000-8000-000000000005',
    'Admin-assigned test task',
    'd1000000-0000-4000-8000-000000000001',
    'backlog'
  );

  UPDATE public.tasks
  SET title = 'Admin updated test task'
  WHERE id = 'd2000000-0000-4000-8000-000000000001';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN
    RAISE EXCEPTION 'Admin could not update a task assigned to another member';
  END IF;
END;
$administrator$;
RESET ROLE;

ROLLBACK;
