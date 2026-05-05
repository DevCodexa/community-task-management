-- ============================================================
-- Supabase Speakers Table - Zincir Atarlı Task Management
-- ============================================================
-- Run this in your Supabase SQL Editor after members.sql

-- -----------------------------------------------------------
-- 1. ENUM TYPES
-- -----------------------------------------------------------

create type speaker_status as enum ('green', 'red', 'neutral');

-- -----------------------------------------------------------
-- 2. TABLE CREATION
-- -----------------------------------------------------------

create table if not exists speakers (
  id uuid default gen_random_uuid() primary key,
  
  -- Personal Info
  full_name text not null check (length(full_name) >= 2 and length(full_name) <= 200),
  company text default '',
  email text,
  phone text,
  
  -- Media
  image_url text default '',
  
-- Details
  title text default '',
  description text default '',
  
  -- Status (enum)
  status speaker_status not null default 'neutral',
  
  -- Reference to member who added this speaker
  added_by uuid references members(id) on delete set null,
  
  -- Timestamps
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- -----------------------------------------------------------
-- 3. INDEXES
-- -----------------------------------------------------------

create index if not exists idx_speakers_added_by on speakers(added_by);
create index if not exists idx_speakers_status on speakers(status);
create index if not exists idx_speakers_company on speakers(company);
create index if not exists idx_speakers_full_name on speakers(full_name);

-- -----------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS)
-- -----------------------------------------------------------

alter table speakers enable row level security;

-- Allow all users to read speakers
create policy "Allow all users to read speakers"
  on speakers for select
  to authenticated
  using (true);

-- Allow authenticated users to insert speakers
create policy "Allow authenticated users to insert speakers"
  on speakers for insert
  to authenticated
  with check (true);

-- Allow authenticated users to update speakers
create policy "Allow authenticated users to update speakers"
  on speakers for update
  to authenticated
  using (true)
  with check (true);

-- Allow authenticated users to delete speakers
create policy "Allow authenticated users to delete speakers"
  on speakers for delete
  to authenticated
  using (true);

-- -----------------------------------------------------------
-- 5. TRIGGERS
-- -----------------------------------------------------------

-- Auto-update updated_at column
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_speakers_updated_at on speakers;

create trigger update_speakers_updated_at
  before update on speakers
  for each row
  execute function update_updated_at_column();

-- -----------------------------------------------------------
-- 6. SAMPLE DATA (Optional)
-- -----------------------------------------------------------

/*
insert into speakers (full_name, company, email, phone, description, status, added_by)
values 
  ('Ahmet Yılmaz', 'Tech Corp', 'ahmet@techcorp.com', '+90 555 123 4567', 'Konuşmacı ve eğitmen', 'green', (select id from members limit 1)),
  ('Zeynep Kaya', 'Design Studio', 'zeynep@design.com', '+90 555 987 6543', 'UX Tasarım uzmanı', 'green', (select id from members limit 1)),
  ('Mehmet Demir', 'StartupX', 'mehmet@startupx.com', '+90 555 456 7890', 'Girişimci', 'red', (select id from members limit 1)),
  ('Elif Şahin', 'Digital Agency', 'elif@digital.com', '+90 555 789 0123', 'Yeni konuşmacı adayı', 'neutral', (select id from members limit 1));
*/

-- ============================================================
-- END OF SPEAKERS SCRIPT
-- ============================================================
