-- ============================================================
-- Profiles + Magic Link + Member Visibility Tables
-- ============================================================
-- Historical schema reference. See reviewed migrations for current access rules.
-- ============================================================

-- ------------------------------------------------------------
-- 1) profiles table
-- ------------------------------------------------------------
create table if not exists profiles (
  id uuid default gen_random_uuid() primary key,

  -- Connect 1:1 with existing members record
  member_id uuid not null unique references members(id) on delete cascade,

  -- Historical token column; no longer grants profile access.
  access_token uuid not null unique,

  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ------------------------------------------------------------
-- 2) Trigger for updated_at
-- ------------------------------------------------------------
create or replace function set_updated_at_utc()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_profiles_updated_at on profiles;
create trigger trg_profiles_updated_at
before update on profiles
for each row
execute function set_updated_at_utc();

-- ------------------------------------------------------------
-- 3) Historical token access is retired.
-- Keep the existing column for historical compatibility; do not generate,
-- expose, or use its values for authorization. The authenticated self-profile
-- migration controls access and revokes browser privileges on this table.
-- ------------------------------------------------------------
alter table public.profiles enable row level security;
drop policy if exists "anon can read profile by token" on public.profiles;
revoke all on table public.profiles from public, anon, authenticated;

-- ------------------------------------------------------------
-- Notlar
-- ------------------------------------------------------------
-- Profil sayfası aşağıdaki mevcut tabloları kullanır (ek member_* tablo gerekmez):
-- - Tasks: tasks.assignee_id
-- - Departments(Bölgeler): org_department_members -> org_departments
-- - Projects: org_project_members -> org_projects
-- - Events: event_staff -> events
-- - Duyurular/Eklentiler: repo’da member_* karşılığı yoksa bu alanlar '—' gösterilir.


