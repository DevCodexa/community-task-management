-- ============================================================
-- Drop Email Triggers (project/department/area member enqueues)
-- ============================================================
-- This file is intended to be executed before re-applying
-- the updated enqueue trigger functions.

-- 1) org_project_members -> project_member
DROP TRIGGER IF EXISTS tr_enqueue_project_member ON org_project_members;

-- 2) org_department_members -> department_member
DROP TRIGGER IF EXISTS tr_enqueue_department_member ON org_department_members;

-- 3) org_area_members -> area_member
DROP TRIGGER IF EXISTS tr_enqueue_area_member ON org_area_members;

