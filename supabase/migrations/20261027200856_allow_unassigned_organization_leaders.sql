-- Issue #22: preserve departments and areas when a member who leads them is deleted.
-- The UI already handles a missing responsible person/area leader as "Atanmadı".
-- Membership and task FK delete behavior is defined separately: membership rows cascade,
-- while task assignees are set NULL so tasks remain available for reassignment.

ALTER TABLE public.org_departments
  ALTER COLUMN responsible_person_id DROP NOT NULL;

ALTER TABLE public.org_departments
  DROP CONSTRAINT IF EXISTS org_departments_responsible_person_id_fkey;

ALTER TABLE public.org_departments
  ADD CONSTRAINT org_departments_responsible_person_id_fkey
  FOREIGN KEY (responsible_person_id)
  REFERENCES public.members(id)
  ON DELETE SET NULL;

ALTER TABLE public.org_areas
  ALTER COLUMN area_leader_id DROP NOT NULL;

ALTER TABLE public.org_areas
  DROP CONSTRAINT IF EXISTS org_areas_area_leader_id_fkey;

ALTER TABLE public.org_areas
  ADD CONSTRAINT org_areas_area_leader_id_fkey
  FOREIGN KEY (area_leader_id)
  REFERENCES public.members(id)
  ON DELETE SET NULL;
