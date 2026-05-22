-- ------------------------------------------------------------
-- 8.4 org_project_members → project_member (title → name)
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

  SELECT p.name                  -- ✅ title → name
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

-- ------------------------------------------------------------
-- 8.5 org_department_members → department_member (title → name)
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

  SELECT d.name                  -- ✅ title → name
    INTO v_department_name
    FROM org_departments d
   WHERE d.id = NEW.department_id;

  IF v_email IS NOT NULL AND v_department_name IS NOT NULL THEN
    PERFORM enqueue_email(
      v_email, v_name,
      'department_member',
      jsonb_build_object(
        'member_name',     COALESCE(v_name, 'Üye'),
        'department_name', v_department_name
      ),
      'medium'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------
-- 8.6 org_area_members → area_member (title → name)
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

  SELECT a.name                  -- ✅ title → name
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

-- ------------------------------------------------------------
-- Trigger'ları tekrar aktif et
-- ------------------------------------------------------------
ALTER TABLE org_department_members ENABLE TRIGGER tr_enqueue_department_member;
ALTER TABLE org_project_members    ENABLE TRIGGER tr_enqueue_project_member;
ALTER TABLE org_area_members       ENABLE TRIGGER tr_enqueue_area_member;