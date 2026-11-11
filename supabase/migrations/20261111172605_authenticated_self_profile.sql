-- Profile links no longer act as bearer credentials. The authenticated
-- identity resolves through the existing registered-member helper.
BEGIN;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.profiles FROM PUBLIC, anon, authenticated;
DO $columns$
DECLARE
  column_name text;
  policy_name text;
BEGIN
  FOR column_name IN
    SELECT a.attname FROM pg_attribute a
    WHERE a.attrelid = 'public.profiles'::regclass
      AND a.attnum > 0 AND NOT a.attisdropped
  LOOP
    EXECUTE format('REVOKE ALL (%I) ON TABLE public.profiles FROM PUBLIC, anon, authenticated', column_name);
  END LOOP;

  FOR policy_name IN
    SELECT p.policyname FROM pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename = 'profiles'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.profiles', policy_name);
  END LOOP;
END;
$columns$;

REVOKE EXECUTE ON FUNCTION public.current_profile_token() FROM PUBLIC, anon, authenticated;

-- No caller-supplied member ID or token: the server determines the member.
-- SECURITY INVOKER preserves the caller's existing table privileges and RLS.
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $function$
  SELECT jsonb_build_object(
    'member', jsonb_build_object(
      'id', m.id, 'name', m.name, 'email', m.email, 'phone', m.phone,
      'company', m.company, 'job_title', m.job_title,
      'comm_title', m.comm_title, 'avatar', m.avatar
    ),
    'tasks', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', t.id, 'title', t.title, 'description', t.description,
        'status', t.status, 'deadline', t.deadline, 'points', t.points
      ) ORDER BY t.created_at DESC)
      FROM public.tasks t
      WHERE t.assignee_id = m.id
    ), '[]'::jsonb),
    'org_department_members', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', dm.id, 'department', jsonb_build_object('id', d.id, 'name', d.name)
      ) ORDER BY d.name)
      FROM public.org_department_members dm
      JOIN public.org_departments d ON d.id = dm.department_id
      WHERE dm.user_id = m.id AND dm.deleted_at IS NULL AND d.deleted_at IS NULL
    ), '[]'::jsonb)
  )
  FROM public.members m
  WHERE m.id = (SELECT public.current_member_id());
$function$;

REVOKE ALL ON FUNCTION public.get_my_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;

COMMIT;
