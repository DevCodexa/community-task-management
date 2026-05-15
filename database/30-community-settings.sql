-- ============================================================
-- Community Settings + Menu Items
-- ============================================================
-- IMPORTANT
-- - Uses existing project convention: RLS disabled (like other SQL files)
-- - This script creates:
--     1) community_settings table (singleton-ish row)
--     2) menu_items table
-- - Supabase client code can treat these as a single config row by id=1,
--   but we do not enforce singleton via DB constraint to keep it flexible.
-- ============================================================

-- ------------------------------------------------------------
-- 1) community_settings table
-- ------------------------------------------------------------
create table if not exists community_settings (
  id uuid primary key default gen_random_uuid(),

  -- Sidebar header
  logo_url text default '' ,

  -- App / dashboard titles
  app_name text default 'Topluluk',
  app_subtitle text default 'Görev Yönetimi',

  dashboard_title text default 'Dashboard',
  dashboard_subtitle text default 'Topluluk görev yönetimine genel bakış',

  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- External URL validation: allow empty string, otherwise must be http(s)
alter table community_settings
  add constraint chk_community_settings_logo_url_valid
  check (
    logo_url = ''
    or logo_url is null
    or logo_url ~* '^https?://.+'
  );

-- ------------------------------------------------------------
-- updated_at trigger
-- ------------------------------------------------------------
create or replace function set_updated_at_utc()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_community_settings_updated_at on community_settings;
create trigger trg_community_settings_updated_at
before update on community_settings
for each row
execute function set_updated_at_utc();

-- ------------------------------------------------------------
-- 2) menu_items table
-- ------------------------------------------------------------
create table if not exists menu_items (
  id uuid primary key default gen_random_uuid(),

  label text not null check (length(label) >= 1 and length(label) <= 80),
  path text not null check (length(path) >= 1 and length(path) <= 200),

  -- Controls whether the sidebar should show this item
  is_active boolean not null default true,

  -- Icon key for lucide-react mapping in app
  -- Example keys: layout_dashboard, users, megaphone, settings, etc.
  icon_key text not null default 'layout_dashboard' check (length(icon_key) <= 80),

  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- unique per path+label to reduce duplicates
create unique index if not exists uq_menu_items_path_label
  on menu_items (path, label);

-- updated_at trigger for menu_items
drop trigger if exists trg_menu_items_updated_at on menu_items;
create trigger trg_menu_items_updated_at
before update on menu_items
for each row
execute function set_updated_at_utc();

-- indexes
create index if not exists idx_menu_items_is_active on menu_items(is_active);
create index if not exists idx_menu_items_path on menu_items(path);

-- ------------------------------------------------------------
-- 3) RLS disabled (project convention)
-- ------------------------------------------------------------
alter table community_settings disable row level security;
alter table menu_items disable row level security;

-- ------------------------------------------------------------
-- 4) Seed default data (optional but helpful)
-- ------------------------------------------------------------
-- Create a default settings row if none exists.
insert into community_settings (id, logo_url, app_name, app_subtitle, dashboard_title, dashboard_subtitle)
select
  '00000000-0000-0000-0000-000000000001'::uuid,
  '',
  'Topluluk',
  'Görev Yönetimi',
  'Dashboard',
  'Topluluk görev yönetimine genel bakış'
where not exists (
  select 1 from community_settings where id = '00000000-0000-0000-0000-000000000001'::uuid
);

-- Ensure at least the currently hardcoded dashboard/menu items exist.
-- We only insert rows if they don't already exist for the given path.
insert into menu_items (label, path, is_active, icon_key)
select * from (
  values
    ('Dashboard', '/dashboard', true, 'layout_dashboard'),
    ('Üye Yönetimi', '/uyeler', true, 'users'),
    ('Görev Zinciri', '/gorev-zinciri', true, 'link2'),
    ('Linkler', '/linkler', true, 'external_link'),
    ('Konuşmacılar', '/konusmacilar', true, 'mic'),
    ('Etkinlikler', '/etkinlikler', true, 'calendar'),
    ('Doğum Günleri', '/dogum-gunleri', true, 'cake'),
    ('Bölümler', '/organizasyon/bolumler', true, 'puzzle'),
    ('Duyurular', '/duyurular', true, 'megaphone'),
    ('Topluluk Ayarları', '/topluluk-ayarlar', true, 'settings')
) as v(label, path, is_active, icon_key)
where not exists (
  select 1 from menu_items m where m.path = v.path
);

