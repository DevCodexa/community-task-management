-- Historical emergency script: remove its broad policies, then use the
-- reviewed migration in supabase/migrations for the current policy contract.
-- Do not substitute this file for the migration or run reset scripts in production.
BEGIN;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_staff ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can insert events" ON public.events;
DROP POLICY IF EXISTS "Authenticated users can update events" ON public.events;
DROP POLICY IF EXISTS "Authenticated users can read events" ON public.events;
DROP POLICY IF EXISTS "Authenticated users can delete events" ON public.events;
DROP POLICY IF EXISTS "Authenticated users can insert event_staff" ON public.event_staff;
DROP POLICY IF EXISTS "Authenticated users can manage event_staff" ON public.event_staff;
COMMIT;
