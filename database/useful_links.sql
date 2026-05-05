-- ============================================================
-- Useful Links Table - Zincir Atarlı Task Management
-- ============================================================
-- Run this in your Supabase SQL Editor

-- -----------------------------------------------------------
-- 1. TABLE CREATION
-- -----------------------------------------------------------

create table if not exists useful_links (
  id uuid default gen_random_uuid() primary key,
  
  -- Link Content
  title text not null check (length(title) >= 2 and length(title) <= 200),
  url text not null check (length(url) >= 5),
  description text default '',
  category_name text not null check (length(category_name) >= 2 and length(category_name) <= 100),
  
  -- Timestamps
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- -----------------------------------------------------------
-- 2. INDEXES
-- -----------------------------------------------------------

create index if not exists idx_useful_links_category_name on useful_links(category_name);
create index if not exists idx_useful_links_created_at on useful_links(created_at);
create index if not exists idx_useful_links_title on useful_links(title);

-- -----------------------------------------------------------
-- 3. ROW LEVEL SECURITY (RLS)
-- -----------------------------------------------------------

alter table useful_links enable row level security;

create policy "Allow authenticated users to read useful_links" on useful_links for select to authenticated using (true);
create policy "Allow authenticated users to insert useful_links" on useful_links for insert to authenticated with check (true);
create policy "Allow authenticated users to update useful_links" on useful_links for update to authenticated using (true) with check (true);
create policy "Allow authenticated users to delete useful_links" on useful_links for delete to authenticated using (true);

-- -----------------------------------------------------------
-- 4. TRIGGERS
-- -----------------------------------------------------------

create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_useful_links_updated_at on useful_links;
create trigger update_useful_links_updated_at
  before update on useful_links
  for each row
  execute function update_updated_at_column();

-- -----------------------------------------------------------
-- 5. SAMPLE DATA (Optional)
-- -----------------------------------------------------------

/*
insert into useful_links (title, url, description, category_name) values 
  ('Figma Design System', 'https://figma.com/file/xxx', 'Ana tasarım dosyaları', 'Tasarım'),
  ('GitHub Repository', 'https://github.com/organization/project', 'Kaynak kod reposu', 'Geliştirme'),
  ('API Documentation', 'https://api.example.com/docs', 'API dokümantasyonu', 'Dokümantasyon'),
  ('Standup Meeting', 'https://meet.google.com/xxx', 'Günlük standup toplantısı', 'Toplantı Linkleri');
*/

-- ============================================================
-- END OF USEFUL_LINKS SCRIPT
-- ============================================================
