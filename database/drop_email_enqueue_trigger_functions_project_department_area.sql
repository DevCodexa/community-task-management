-- ============================================================
-- Drop Email Enqueue Trigger FUNCTIONS (defensive)
-- ============================================================
-- This script drops the plpgsql trigger functions that may still
-- reference non-existing columns like d.title / p.title.
--
-- Run in Supabase SQL editor BEFORE re-creating triggers.

-- CASCADE gerekli çünkü aynı isimli trigger’lar fonksiyona bağımlı.
DROP FUNCTION IF EXISTS trg_enqueue_project_member() CASCADE;
DROP FUNCTION IF EXISTS trg_enqueue_department_member() CASCADE;
DROP FUNCTION IF EXISTS trg_enqueue_area_member() CASCADE;


