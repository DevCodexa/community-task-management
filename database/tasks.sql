-- ============================================================
-- Supabase Tasks Table - Zincir Atarlı Task Management
-- ============================================================
-- Run this in your Supabase SQL Editor

-- -----------------------------------------------------------
-- 1. ENUM TYPES
-- -----------------------------------------------------------

create type task_status_enum as enum ('backlog', 'started', 'in_progress', 'completed', 'done');

-- -----------------------------------------------------------
-- 2. TABLE CREATION
-- -----------------------------------------------------------

create table if not exists tasks (
  id uuid default gen_random_uuid() primary key,
  
  -- Task Content
  title text not null check (length(title) >= 2 and length(title) <= 200),
  description text default '',
  
  -- Metadata
  deadline timestamp with time zone,
  image_url text default '',
  points integer default 1 check (points >= 0 and points <= 100),
  
  -- Assignment & Status
  assignee_id uuid references members(id) on delete set null,
  status task_status_enum not null default 'backlog',
  
  -- Timestamps
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- -----------------------------------------------------------
-- 3. INDEXES
-- -----------------------------------------------------------

create index if not exists idx_tasks_assignee_id on tasks(assignee_id);
create index if not exists idx_tasks_status on tasks(status);
create index if not exists idx_tasks_deadline on tasks(deadline);
create index if not exists idx_tasks_title on tasks(title);

-- -----------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS)
-- -----------------------------------------------------------

alter table tasks enable row level security;

-- Development mode: Allow anon role for all CRUD operations
create policy "Allow anon to read tasks" on tasks for select to anon using (true);
create policy "Allow anon to insert tasks" on tasks for insert to anon with check (true);
create policy "Allow anon to update tasks" on tasks for update to anon using (true) with check (true);
create policy "Allow anon to delete tasks" on tasks for delete to anon using (true);

-- -----------------------------------------------------------
-- 5. TRIGGERS
-- -----------------------------------------------------------

create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_tasks_updated_at on tasks;
create trigger update_tasks_updated_at
  before update on tasks
  for each row
  execute function update_updated_at_column();

-- -----------------------------------------------------------
-- 6. SAMPLE DATA (Optional)
-- -----------------------------------------------------------

/*
insert into tasks (title, description, deadline, points, assignee_id, status)
values 
  ('UI Tasarımını Tamamla', 'Ana sayfa ve dashboard için responsive tasarım. Figma link: https://figma.com/xxx', '2024-12-15 17:00:00+00', 8, (select id from members where email='ali@example.com' limit 1), 'backlog'),
  ('API Endpoint Test Et', 'Tüm CRUD işlemleri için Postman collection oluştur.', '2024-12-10 12:00:00+00', 5, (select id from members where email='mehmet@example.com' limit 1), 'started'),
  ('Dokümantasyon Yaz', 'README ve API docs güncelle.', '2024-12-20 09:00:00+00', 3, null, 'backlog');
*/

-- ============================================================
-- END OF TASKS SCRIPT - Execute after members.sql
-- ============================================================

