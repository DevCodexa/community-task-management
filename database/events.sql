-- ============================================================
-- Supabase Events Table - Etkinlik Yönetim Sistemi
-- ============================================================
-- Run this in your Supabase SQL Editor

-- -----------------------------------------------------------
-- 1. ENUM TYPES
-- -----------------------------------------------------------

-- Etkinlik türleri enum tipi
create type event_type_enum as enum ('Workshop','Quiz Night','Mülakat Yayını','Coffee Talk','İlk Konuşmam(Future)' 'Face-to-Face', 'Bootcamp', 'Webinar', 'Other');

-- -----------------------------------------------------------
-- 2. TABLE CREATION
-- -----------------------------------------------------------

-- Events tablosu
create table if not exists events (
  id uuid default gen_random_uuid() primary key,
  
  -- Event Content
  title text not null check (length(title) >= 2 and length(title) <= 200),
  description text default '',
  
  -- Event Type (enum)
  event_type event_type_enum not null default 'Other',
  
  -- Date & Time
  start_date timestamp with time zone not null,
  end_date timestamp with time zone not null,
  
  -- Additional Info
  drive_link text default '',           -- Çalışma dosyaları linki (Google Drive vb.)
  location text default '',             -- Lokasyon (fiziksel veya online)
  
  -- Timestamps
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Date validation: end_date must be after start_date
  constraint chk_dates check (end_date > start_date)
);

-- Event Staff Junction Table
-- Bir etkinliğe birden fazla üye görevli olarak atanabilir
create table if not exists event_staff (
  id uuid default gen_random_uuid() primary key,
  
  -- Foreign Keys
  event_id uuid references events(id) on delete cascade not null,
  member_id uuid references members(id) on delete cascade not null,
  
  -- Timestamps
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Unique constraint: a member can only be staff once per event
  constraint uq_event_member unique (event_id, member_id)
);

-- Event Speakers Junction Table (NEW)
-- Bir etkinliğe birden fazla konuşmacı atanabilir
create table if not exists event_speakers (
  id uuid default gen_random_uuid() primary key,
  
  -- Foreign Keys
  event_id uuid references events(id) on delete cascade not null,
  speaker_id uuid references speakers(id) on delete cascade not null,
  
  -- Timestamps
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Unique constraint: a speaker can only be assigned once per event
  constraint uq_event_speaker unique (event_id, speaker_id)
);


-- -----------------------------------------------------------
-- 3. INDEXES
-- -----------------------------------------------------------

-- Events indexes
create index if not exists idx_events_event_type on events(event_type);
create index if not exists idx_events_start_date on events(start_date);
create index if not exists idx_events_title on events(title);

-- Event Staff indexes
create index if not exists idx_event_staff_event_id on event_staff(event_id);
create index if not exists idx_event_staff_member_id on event_staff(member_id);

-- Event Speakers indexes (NEW)
create index if not exists idx_event_speakers_event_id on event_speakers(event_id);
create index if not exists idx_event_speakers_speaker_id on event_speakers(speaker_id);


-- -----------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS)
-- -----------------------------------------------------------

-- Üç tablo için RLS'i devre dışı bırak
alter table events disable row level security;
alter table event_staff disable row level security;
alter table event_speakers disable row level security;


-- -----------------------------------------------------------
-- 5. TRIGGERS
-- -----------------------------------------------------------

-- Auto-update updated_at column for events
create or replace function update_events_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_events_updated_at on events;

create trigger update_events_updated_at
  before update on events
  for each row
  execute function update_events_updated_at();

-- -----------------------------------------------------------
-- 6. SAMPLE DATA (Optional - Uncomment to use)
-- -----------------------------------------------------------

/*
-- Örnek etkinlikler
insert into events (title, description, event_type, start_date, end_date, drive_link, location)
values 
  ('React Workshop', 'React.js temel ve ileri konuları için workshop', 'Workshop', '2024-12-15 10:00:00+00', '2024-12-15 17:00:00+00', 'https://drive.google.com/drive/folders/react-workshop', 'İstanbul Tech Hub'),
  ('Career Bootcamp', 'Kariyer gelişimi için 3 günlük bootcamp', 'Bootcamp', '2024-12-20 09:00:00+00', '2024-12-22 18:00:00+00', 'https://drive.google.com/drive/folders/career-bootcamp', 'Ankara Innovation Center'),
  ('Tech Webinar', 'Docker ve Kubernetes konulu online webinar', 'Webinar', '2024-12-18 19:00:00+00', '2024-12-18 21:00:00+00', 'https://drive.google.com/drive/folders/docker-webinar', 'Online - Zoom'),
  ('Networking Event', 'Topluluk üyeleri için tanışma etkinliği', 'Face-to-Face', '2024-12-25 18:00:00+00', '2024-12-25 23:00:00+00', '', 'İstanbul Caddebostan');

-- Örnek görevli atamaları (members ve event_staff tabloları dolu olmalı)
insert into event_staff (event_id, member_id)
select e.id, m.id
from events e, members m
where e.title = 'React Workshop' and m.email in ('ali@example.com', 'zeynep@example.com');

insert into event_staff (event_id, member_id)
select e.id, m.id
from events e, members m
where e.title = 'Tech Webinar' and m.email = 'mehmet@example.com';
*/

-- ============================================================
-- END OF EVENTS SCRIPT - Execute after members.sql
-- ============================================================
