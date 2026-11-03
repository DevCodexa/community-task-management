-- Issue #1: keep the RLS identity helpers callable only by authenticated
-- application sessions and the trusted server role.
--
-- These SECURITY DEFINER helpers are used by RLS policies and database triggers.
-- PUBLIC is revoked because PostgreSQL grants function EXECUTE to PUBLIC by default.

ALTER FUNCTION public.current_member_id()
  SET search_path = pg_catalog, public;
ALTER FUNCTION public.current_member_role()
  SET search_path = pg_catalog, public;

REVOKE EXECUTE ON FUNCTION public.current_member_id()
  FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.current_member_role()
  FROM PUBLIC, anon;

-- RLS expressions and authenticated-session triggers still need these helpers.
-- The service_role grant is for trusted backend operations; never expose this key
-- to browser or other untrusted clients.
GRANT EXECUTE ON FUNCTION public.current_member_id()
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_member_role()
  TO authenticated, service_role;
