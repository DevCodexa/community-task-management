-- ============================================================
-- Announcements CRUD DB - Zincir Atarlı Task Management
-- ============================================================

-- ============================================================
-- IMPORTANT
-- - Uses existing event_type_enum (created in database/events.sql)
-- - RLS DISABLED (per project convention)
-- ============================================================

-- ------------------------------------------------------------
-- 1) announcements table
-- ------------------------------------------------------------

create table if not exists announcements (
  id uuid default gen_random_uuid() primary key,

  title text not null check (length(title) >= 2 and length(title) <= 200),
  description text not null default '' check (length(description) <= 5000),

  -- external link (optional). Empty string means "not set".
  link text default '',

  -- Announcement type: reuse existing enum from events
  type event_type_enum not null default 'Other',

  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- External link validation: allow empty string, otherwise must be http(s)
alter table announcements
  add constraint chk_announcements_link_valid
  check (
    link = ''
    or link is null
    or link ~* '^https?://.+'
  );

-- ------------------------------------------------------------
-- 2) announcement_members junction table
-- ------------------------------------------------------------
create table if not exists announcement_members (
  id uuid default gen_random_uuid() primary key,

  announcement_id uuid not null references announcements(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,

  created_at timestamp with time zone default timezone('utc'::text, now()) not null,

  -- a member can be linked to same announcement only once
  constraint uq_announcement_member unique (announcement_id, member_id)
);

-- ------------------------------------------------------------
-- 3) indexes (performance)
-- ------------------------------------------------------------
-- announcements
create index if not exists idx_announcements_type on announcements(type);
create index if not exists idx_announcements_created_at on announcements(created_at desc);
create index if not exists idx_announcements_updated_at on announcements(updated_at desc);

-- Search-friendly title index (requires pg_trgm)
create extension if not exists pg_trgm;
create index if not exists idx_announcements_title_trgm
  on announcements using gin (title gin_trgm_ops);

-- announcement_members
create index if not exists idx_announcement_members_announcement_id on announcement_members(announcement_id);
create index if not exists idx_announcement_members_member_id on announcement_members(member_id);

-- Optional: speed up duplicate checks
create index if not exists idx_announcement_members_unique_check
  on announcement_members (announcement_id, member_id);

-- ------------------------------------------------------------
-- 4) updated_at trigger system
-- ------------------------------------------------------------
create or replace function set_updated_at_utc()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- announcements updated_at trigger
drop trigger if exists trg_announcements_updated_at on announcements;
create trigger trg_announcements_updated_at
before update on announcements
for each row
execute function set_updated_at_utc();

-- ------------------------------------------------------------
-- 5) RLS disabled (project convention)
-- ------------------------------------------------------------
alter table announcements disable row level security;
alter table announcement_members disable row level security;

