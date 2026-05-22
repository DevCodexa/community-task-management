-- ============================================================
-- Recreate/Update Email Triggers for project/department/area members
-- ============================================================
-- This file re-applies only the trigger functions + triggers
-- related to:
-- - org_project_members -> project_member
-- - org_department_members -> department_member
-- - org_area_members -> area_member
--
-- IMPORTANT:
-- This must be run after the corresponding DROP script
-- (database/drop_triggers_project_department_area_member_emails.sql)
-- and after ensuring your schema has the expected columns
-- (org_projects.name vs title, org_departments.name vs title, etc.).

-- ------------------------------------------------------------
-- 8.4 org_project_members INSERT -> project_member
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_enqueue_project_member()
RETURNS trigger AS $$
DECLARE
  v_email        varchar;
  v_name         varchar;
  v_project_name varchar;
BEGIN
  SELECT m.email, m.name
    INTO v_email, v_name
    FROM members m
   WHERE m.id = NEW.user_id
     AND m.is_active = true;

  -- org_projects tablosunda proje ad alanı farklı isimde olabilir (name/title)
  SELECT COALESCE(p.name, p.title)
    INTO v_project_name
    FROM org_projects p
   WHERE p.id = NEW.project_id;

  IF v_email IS NOT NULL AND v_project_name IS NOT NULL THEN
    PERFORM enqueue_email(
      v_email, v_name,
      'project_member',
      jsonb_build_object(
        'member_name',  COALESCE(v_name, 'Üye'),
        'project_name', v_project_name
      ),
      'medium'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- trigger (after drop)
CREATE TRIGGER tr_enqueue_project_member
AFTER INSERT ON org_project_members
FOR EACH ROW EXECUTE FUNCTION trg_enqueue_project_member();

-- ------------------------------------------------------------
-- 8.5 org_department_members INSERT -> department_member
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_enqueue_department_member()
RETURNS trigger AS $$
DECLARE
  v_email           varchar;
  v_name            varchar;
  v_department_name varchar;
BEGIN
  SELECT m.email, m.name
    INTO v_email, v_name
    FROM members m
   WHERE m.id = NEW.user_id
     AND m.is_active = true;

  SELECT COALESCE(d.name, d.title)
    INTO v_department_name
    FROM org_departments d
   WHERE d.id = NEW.department_id;

  IF v_email IS NOT NULL AND v_department_name IS NOT NULL THEN
    PERFORM enqueue_email(
      v_email, v_name,
      'department_member',
      jsonb_build_object(
        'member_name',       COALESCE(v_name, 'Üye'),
        'department_name',   v_department_name
      ),
      'medium'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_enqueue_department_member
AFTER INSERT ON org_department_members
FOR EACH ROW EXECUTE FUNCTION trg_enqueue_department_member();

-- ------------------------------------------------------------
-- 8.6 org_area_members INSERT -> area_member
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_enqueue_area_member()
RETURNS trigger AS $$
DECLARE
  v_email     varchar;
  v_name      varchar;
  v_area_name varchar;
BEGIN
  SELECT m.email, m.name
    INTO v_email, v_name
    FROM members m
   WHERE m.id = NEW.user_id
     AND m.is_active = true;

  SELECT COALESCE(a.name, a.title)
    INTO v_area_name
    FROM org_areas a
   WHERE a.id = NEW.area_id;

  IF v_email IS NOT NULL AND v_area_name IS NOT NULL THEN
    PERFORM enqueue_email(
      v_email, v_name,
      'area_member',
      jsonb_build_object(
        'member_name', COALESCE(v_name, 'Üye'),
        'area_name',   v_area_name
      ),
      'medium'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_enqueue_area_member
AFTER INSERT ON org_area_members
FOR EACH ROW EXECUTE FUNCTION trg_enqueue_area_member();

