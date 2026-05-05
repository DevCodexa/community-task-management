-- ============================================================
-- Supabase Members Table - Otomatik Veri Yapılandırma Sistemi
-- ============================================================
-- Run this in your Supabase SQL Editor

-- -----------------------------------------------------------
-- 1. ENUM TYPES
-- -----------------------------------------------------------

-- Drop existing enum if needed (be careful in production!)
-- drop type if exists system_role_enum cascade;

create type system_role_enum as enum ('Super Admin', 'Admin', 'User');

-- -----------------------------------------------------------
-- 2. TABLE CREATION
-- -----------------------------------------------------------

-- Drop existing table if needed
-- drop table if exists members cascade;

create table if not exists members (
  id uuid default gen_random_uuid() primary key,
  
  -- Personal Info
  name text not null,
  email text not null unique,
  phone text default '',
  
  -- Professional Info
  company text default '',
  job_title text default '',
  
  -- Community Info
  comm_title text default '',           -- Topluluk ünvanı (manuel girilir)
  bio text default '',
  
  -- Birthday (yıl içermez - sadece gün ve ay)
  birth_day integer not null check (birth_day >= 1 and birth_day <= 31),
  birth_month integer not null check (birth_month >= 1 and birth_month <= 12),
  
  -- System Role (enum tip)
  system_role system_role_enum not null default 'User',
  
  -- Avatar
  avatar text default '',
  
  -- Task Limits (her kullanıcı max 3 görev)
  active_tasks integer not null default 0 check (active_tasks >= 0),
  total_tasks integer not null default 3 check (total_tasks >= 0 and total_tasks <= 3),
  
  -- Görev limiti kontrolü: active_tasks <= total_tasks
  constraint chk_task_limit check (active_tasks <= total_tasks),
  
  -- Timestamps
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- -----------------------------------------------------------
-- 3. INDEXES
-- -----------------------------------------------------------

create index if not exists idx_members_email on members(email);
create index if not exists idx_members_system_role on members(system_role);
create index if not exists idx_members_name on members(name);
create index if not exists idx_members_comm_title on members(comm_title);

-- -----------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS)
-- -----------------------------------------------------------
alter table members enable row level security;
-- Development mode: Allow anon role for all CRUD operations
create policy "Allow anon to read members"
  on members for select
  to anon
  using (true);
create policy "Allow anon to insert members"
  on members for insert
  to anon
  with check (true);
create policy "Allow anon to update members"
  on members for update
  to anon
  using (true)
  with check (true);
create policy "Allow anon to delete members"
  on members for delete
  to anon
  using (true);

-- -----------------------------------------------------------
-- 5. TRIGGERS
-- -----------------------------------------------------------

-- 5.1 Auto-update updated_at column
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_members_updated_at on members;

create trigger update_members_updated_at
  before update on members
  for each row
  execute function update_updated_at_column();

-- 5.2 Enforce max task limit (active_tasks cannot exceed total_tasks)
create or replace function enforce_task_limit()
returns trigger as $$
begin
  if new.active_tasks > new.total_tasks then
    raise exception 'Task limit exceeded: active_tasks (%) cannot exceed total_tasks (%)', 
      new.active_tasks, new.total_tasks;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_enforce_task_limit on members;

create trigger trg_enforce_task_limit
  before insert or update on members
  for each row
  execute function enforce_task_limit();

-- 5.3 Prevent total_tasks from exceeding 3
create or replace function enforce_max_total_tasks()
returns trigger as $$
begin
  if new.total_tasks > 3 then
    raise exception 'Total tasks cannot exceed 3. Received: %', new.total_tasks;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_enforce_max_total_tasks on members;

create trigger trg_enforce_max_total_tasks
  before insert or update on members
  for each row
  execute function enforce_max_total_tasks();

-- -----------------------------------------------------------
-- 6. SAMPLE DATA (Optional - Uncomment to use)
-- -----------------------------------------------------------

/*
insert into members (name, email, phone, company, job_title, comm_title, bio, birth_day, birth_month, system_role, active_tasks)
values
  ('Ali Yılmaz', 'ali@example.com', '+90 555 123 4567', 'Tech Corp', 'Yazılım Geliştirici', 'Core Team Member', 'Tutkulu bir geliştirici ve topluluk lideri.', 15, 3, 'Admin', 2),
  ('Zeynep Kaya', 'zeynep@example.com', '+90 555 987 6543', 'Design Studio', 'UX Designer', 'Sesli Topluluk Moderatörü', 'Kullanıcı deneyimi tasarımcısı ve podcast tutkunu.', 22, 7, 'User', 1),
  ('Mehmet Demir', 'mehmet@example.com', '+90 555 456 7890', 'StartupX', 'Proje Yöneticisi', 'Etkinlik Koordinatörü', 'Etkinlik organizasyonunda 5 yıllık deneyim.', 8, 11, 'Admin', 3),
  ('Elif Şahin', 'elif@example.com', '+90 555 789 0123', 'Digital Agency', 'İçerik Yazarı', 'Blog Yazarı', 'Teknoloji ve topluluk üzerine içerik üreticisi.', 3, 5, 'User', 0),
  ('Burak Özdemir', 'burak@example.com', '+90 555 321 6547', 'DevOps Ltd.', 'Sistem Mühendisi', 'Mentor', 'Yeni geliştiricilere mentorluk yapıyor.', 19, 9, 'User', 1);
*/

-- ============================================================
-- END OF SCRIPT
-- ============================================================
