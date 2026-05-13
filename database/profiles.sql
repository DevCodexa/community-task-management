-- ============================================================
-- Profiles + Magic Link + Member Visibility Tables
-- ============================================================
-- Run this in your Supabase SQL Editor
-- ============================================================

-- ------------------------------------------------------------
-- 1) profiles table
-- ------------------------------------------------------------
create table if not exists profiles (
  id uuid default gen_random_uuid() primary key,

  -- Connect 1:1 with existing members record
  member_id uuid not null unique references members(id) on delete cascade,

  -- Magic link token (unguessable, UUID)
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
-- 3) Fill access_token for existing rows (if any)
-- ------------------------------------------------------------
-- If access_token already exists (non-null), this is harmless.
update profiles
set access_token = gen_random_uuid()
where access_token is null;

-- If you inserted profiles manually without access_token, you can also run:
-- alter table profiles alter column access_token set default gen_random_uuid();

-- ------------------------------------------------------------
-- 4) RLS setup (Magic Link Read-Only)
-- ------------------------------------------------------------
-- URL token DB’ye otomatik taşınmaz; bu yüzden RLS’i sadece `profiles` üzerinde tutuyoruz.
-- Bu dosya dışında zaten repo konvansiyonlarına göre diğer tabloların anon read policy’leri vardır.

-- Token okuma helper
create or replace function public.current_profile_token()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.profile_token', true), '')::uuid;
$$;

-- Enable RLS only on profiles
alter table profiles enable row level security;

-- Allow anon to read matching token

drop policy if exists "anon can read profile by token" on profiles;
create policy "anon can read profile by token"
  on profiles for select
  to anon
  using (access_token = public.current_profile_token());

-- ------------------------------------------------------------
-- Notlar
-- ------------------------------------------------------------
-- Profil sayfası aşağıdaki mevcut tabloları kullanır (ek member_* tablo gerekmez):
-- - Tasks: tasks.assignee_id
-- - Departments(Bölgeler): org_department_members -> org_departments
-- - Projects: org_project_members -> org_projects
-- - Events: event_staff -> events
-- - Duyurular/Eklentiler: repo’da member_* karşılığı yoksa bu alanlar '—' gösterilir.


