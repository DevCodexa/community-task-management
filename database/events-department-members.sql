-- ------------------------------------------------------------
-- Department members relation table
-- ------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'departments_member_role_enum') THEN
    CREATE TYPE departments_member_role_enum AS ENUM ('LEADER', 'TEAM_MEMBER');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS org_department_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  department_id uuid NOT NULL REFERENCES org_departments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  role departments_member_role_enum NOT NULL DEFAULT 'TEAM_MEMBER',
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_org_department_members_department_user
  ON org_department_members(department_id, user_id);

CREATE INDEX IF NOT EXISTS idx_org_department_members_department_id
  ON org_department_members(department_id);

CREATE INDEX IF NOT EXISTS idx_org_department_members_user_id
  ON org_department_members(user_id);
