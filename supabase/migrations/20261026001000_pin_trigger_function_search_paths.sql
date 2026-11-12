-- Fix mutable search_path on trigger/constraint functions flagged by Supabase Security Advisor.
-- Pinning the path avoids unexpected object resolution if schemas or objects change.

ALTER FUNCTION public.trigger_set_updated_at() SET search_path = pg_catalog, public;
ALTER FUNCTION public.email_settings_set_updated_at() SET search_path = pg_catalog, public;
ALTER FUNCTION public.enforce_task_limit() SET search_path = pg_catalog, public;
ALTER FUNCTION public.enforce_max_total_tasks() SET search_path = pg_catalog, public;
ALTER FUNCTION public.update_events_updated_at() SET search_path = pg_catalog, public;
ALTER FUNCTION public.set_updated_at_utc() SET search_path = pg_catalog, public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = pg_catalog, public;
ALTER FUNCTION public.email_queue_set_updated_at() SET search_path = pg_catalog, public;
