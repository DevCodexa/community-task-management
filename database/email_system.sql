-- ============================================================
-- Email System (Brevo-friendly) + Birthday Cron Idempotency
-- ============================================================
-- Supabase (Postgres) migration.
--
-- This script creates:
-- 1) email_templates: template definitions
-- 2) email_queue: enqueue mail jobs for provider
-- 3) email_send_logs: provider send idempotency + audit
-- 4) email_settings: provider configuration
-- 5) birthday_notifications: birthday cron idempotency table
--
-- Integration:
-- - Triggers (enqueue):
--   * members insert => welcome_member
--   * tasks insert => task_assigned (uses tasks.assignee_id)
--   * org_project_members insert => project_member
--   * org_department_members insert => department_member
--   * org_area_members insert => area_member
-- - Birthday mails:
--   * triggerless; cron job should call enqueue_birthday_emails()
--   * idempotency via birthday_notifications unique per year/person
--
-- Birthday source:
--   members.birth_day, members.birth_month (integers).
-- ============================================================

-- ------------------------------------------------------------
-- Helpers
-- ------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'email_queue_status_enum') THEN
    CREATE TYPE email_queue_status_enum AS ENUM ('pending', 'sent', 'failed');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'email_priority_enum') THEN
    CREATE TYPE email_priority_enum AS ENUM ('low', 'medium', 'high');
  END IF;
END $$;

-- ------------------------------------------------------------
-- 1) email_templates
-- ------------------------------------------------------------
create table if not exists email_templates (
  id bigserial primary key,

  template_name varchar(100) not null,
  template_code varchar(50) unique not null,

  -- Optional: Brevo template id (if provider uses template id)
  brevo_template_id int null,

  subject varchar(200) not null,

  html_content text not null,

  is_active boolean not null default true,

  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ------------------------------------------------------------
-- 2) email_queue
-- ------------------------------------------------------------
create table if not exists email_queue (
  id bigserial primary key,

  recipient_email varchar(255) not null,
  recipient_name varchar(255) null,

  template_code varchar(50) not null references email_templates(template_code) on delete restrict,

  -- Dynamic template params, e.g. {"member_name":"Ali"}
  template_params jsonb not null default '{}'::jsonb,

  priority email_priority_enum not null default 'medium',

  status email_queue_status_enum not null default 'pending',

  attempt_count int not null default 0,
  last_attempt_at timestamp with time zone null,

  sent_at timestamp with time zone null,
  error_message text null,

  -- Provider message id (Brevo)
  brevo_message_id varchar(255) null,

  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Keep updated_at in sync
create or replace function email_queue_set_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_email_queue_updated_at on email_queue;
create trigger trg_email_queue_updated_at
before update on email_queue
for each row
execute function email_queue_set_updated_at();

create index if not exists idx_email_queue_status on email_queue(status);
create index if not exists idx_email_queue_created_at on email_queue(created_at);

-- ------------------------------------------------------------
-- 3) email_send_logs
-- ------------------------------------------------------------
create table if not exists email_send_logs (
  id bigserial primary key,

  queue_id bigint not null references email_queue(id) on delete cascade,
  recipient_email varchar(255) not null,

  template_code varchar(50) not null,

  event_type varchar(50) not null default 'sent',
  -- webhooks payload / extra debug info
  event_data jsonb not null default '{}'::jsonb,

  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_email_send_logs_event_type on email_send_logs(event_type);
create index if not exists idx_email_send_logs_recipient_email on email_send_logs(recipient_email);

-- ------------------------------------------------------------
-- 4) email_settings
-- ------------------------------------------------------------
create table if not exists email_settings (
  id bigserial primary key,

  setting_key varchar(100) unique not null,
  setting_value text null,

  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create or replace function email_settings_set_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_email_settings_updated_at on email_settings;
create trigger trg_email_settings_updated_at
before update on email_settings
for each row
execute function email_settings_set_updated_at();

-- Seed settings (idempotent)
insert into email_settings (setting_key, setting_value)
select 'brevo_api_key', ${SENDINBLUE_API_KEY}

where not exists (select 1 from email_settings where setting_key = 'brevo_api_key');

insert into email_settings (setting_key, setting_value)
select 'sender_email', 'shiftdeveloperglobalhub@proton.me'
where not exists (select 1 from email_settings where setting_key = 'sender_email');

insert into email_settings (setting_key, setting_value)
select 'sender_name', 'Uygulama Adı'
where not exists (select 1 from email_settings where setting_key = 'sender_name');

insert into email_settings (setting_key, setting_value)
select 'daily_limit', '300'
where not exists (select 1 from email_settings where setting_key = 'daily_limit');

insert into email_settings (setting_key, setting_value)
select 'retry_limit', '3'
where not exists (select 1 from email_settings where setting_key = 'retry_limit');

insert into email_settings (setting_key, setting_value)
select 'enabled', 'true'
where not exists (select 1 from email_settings where setting_key = 'enabled');

-- ------------------------------------------------------------
-- 5) birthday_notifications (cron idempotency)
-- ------------------------------------------------------------
-- For yearly suppression:
-- unique (birthday_person_id, notification_year)
create table if not exists birthday_notifications (
  id bigserial primary key,

  birthday_person_id uuid not null references members(id) on delete cascade,
  notification_year int not null,

  -- Personal mail: sent or not
  personal_mail_sent boolean not null default false,

  -- Team mails: count of team messages already enqueued/sent for that year
  team_mails_sent_count int not null default 0,

  sent_at timestamp with time zone default timezone('utc'::text, now()) not null,

  unique (birthday_person_id, notification_year)
);

-- ------------------------------------------------------------
-- RLS (follow repository style: allow anon true)
-- ------------------------------------------------------------
-- email_templates
alter table email_templates enable row level security;
create policy "Allow anon to read email_templates"
  on email_templates for select
  to anon using (true);

-- email_queue (provider worker will need access; keep anon open if that's your dev pattern)
alter table email_queue enable row level security;
create policy "Allow anon to read email_queue"
  on email_queue for select
  to anon using (true);
create policy "Allow anon to insert email_queue"
  on email_queue for insert
  to anon with check (true);
create policy "Allow anon to update email_queue"
  on email_queue for update
  to anon using (true) with check (true);

-- email_send_logs
alter table email_send_logs enable row level security;
create policy "Allow anon to read email_send_logs"
  on email_send_logs for select
  to anon using (true);
create policy "Allow anon to insert email_send_logs"
  on email_send_logs for insert
  to anon with check (true);

-- email_settings
alter table email_settings enable row level security;
create policy "Allow anon to read email_settings"
  on email_settings for select
  to anon using (true);
create policy "Allow anon to insert email_settings"
  on email_settings for insert
  to anon with check (true);
create policy "Allow anon to update email_settings"
  on email_settings for update
  to anon using (true) with check (true);

-- birthday_notifications
alter table birthday_notifications enable row level security;
create policy "Allow anon to read birthday_notifications"
  on birthday_notifications for select
  to anon using (true);
create policy "Allow anon to insert birthday_notifications"
  on birthday_notifications for insert
  to anon with check (true);
create policy "Allow anon to update birthday_notifications"
  on birthday_notifications for update
  to anon using (true) with check (true);

-- ------------------------------------------------------------
-- 6) Seed templates (idempotent)
-- ------------------------------------------------------------
-- NOTE: html_content includes {{param}} placeholders.
-- The provider/worker should replace them.
insert into email_templates (template_name, template_code, brevo_template_id, subject, html_content, is_active)
values
  ('Hoş Geldin Maili', 'welcome_member', null, 'Aramıza Hoş Geldin!', '<h1>Aramıza hoş geldin {{member_name}}! 🎉</h1><p>Zincirimize katıldığın için teşekkürler.</p><p>Katılım tarihi: {{join_date}}</p>', true),

  ('Göreve Atama', 'task_assigned', null, 'Yeni Bir Göreve Atandınız', '<h2>Yeni görev ataması! ✅</h2><p>{{member_name}}, sana şu görev atandı: <strong>{{task_name}}</strong></p>', true),

  ('Duyuru Bildirimi', 'announcement_member', null, 'Yeni Duyuru', '<h2>Yeni Duyuru</h2><p>Merhaba {{member_name}}, yeni bir duyuru var.</p>', true),

  ('Proje Üyeliği', 'project_member', null, 'Projeye Eklendiniz', '<h2>Proje Üyeliği</h2><p>{{member_name}}, şu projeye eklendiniz: <strong>{{project_name}}</strong></p>', true),

  ('Bölüm Üyeliği', 'department_member', null, 'Bölüme Eklendiniz', '<h2>Bölüm Üyeliği</h2><p>{{member_name}}, şu bölüme eklendiniz: <strong>{{department_name}}</strong></p>', true),

  ('Alan Üyeliği', 'area_member', null, 'Alana Eklendiniz', '<h2>Alan Üyeliği</h2><p>{{member_name}}, şu alana eklendiniz: <strong>{{area_name}}</strong></p>', true),

  ('Konuşmacı Daveti', 'speaker_invite', null, 'Konuşmacı Davetiyesi', '<h2>Konuşmacı Davetiyesi</h2><p>{{member_name}}, etkinliğimize konuşmacı olarak davetlisiniz.</p>', true),

  ('Etkinlik Konuşmacısı', 'event_speaker', null, 'Etkinlikte Konuşmacı Olarak Eklendiniz', '<h2>Etkinlik Konuşmacısı</h2><p>{{member_name}}, etkinlikte konuşmacı olarak eklendiniz.</p>', true),

  ('Doğum Günü Kişisel', 'birthday_personal', null, 'Doğum Günün Kutlu Olsun! 🎉',
   '<h1>İyi ki doğdun {{member_name}}! 🎂</h1><p>Nice mutlu senelere...</p>', true),

  ('Doğum Günü Bildirimi', 'birthday_team', null, 'Bugün Doğum Günü! 🎈',
   '<h1>Ekibimizin Bir Üyesinin Doğum Günü!</h1><p>Bugün <strong>{{birthday_person}}</strong>''in doğum günü. Hep birlikte kutlayalım!</p>', true)
on conflict (template_code) do update
set template_name = excluded.template_name,
    brevo_template_id = excluded.brevo_template_id,
    subject = excluded.subject,
    html_content = excluded.html_content,
    is_active = excluded.is_active;

-- ------------------------------------------------------------
-- 7) enqueue helper
-- ------------------------------------------------------------
create or replace function enqueue_email(
  p_recipient_email varchar,
  p_recipient_name varchar,
  p_template_code varchar,
  p_template_params jsonb,
  p_priority email_priority_enum default 'medium'
)
returns void as $$
begin
  insert into email_queue (recipient_email, recipient_name, template_code, template_params, priority, status)
  values (p_recipient_email, p_recipient_name, p_template_code, coalesce(p_template_params, '{}'::jsonb), p_priority, 'pending');
end;
$$ language plpgsql security definer;

-- ------------------------------------------------------------
-- 8) Triggers: enqueue on inserts
-- ------------------------------------------------------------
-- 8.1 members => welcome_member
create or replace function trg_enqueue_welcome_member()
returns trigger as $$
begin
  perform enqueue_email(
    new.email,
    new.name,
    'welcome_member',
    jsonb_build_object(
      'member_name', new.name,
      'join_date', to_char(new.created_at, 'YYYY-MM-DD')
    ),
    'medium'
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists tr_enqueue_welcome_member on members;
create trigger tr_enqueue_welcome_member
after insert on members
for each row
execute function trg_enqueue_welcome_member();

-- 8.2 tasks => task_assigned (uses tasks.assignee_id)
create or replace function trg_enqueue_task_assigned()
returns trigger as $$
declare
  v_member_email varchar;
  v_member_name varchar;
  v_task_name text;
begin
  v_task_name := new.title;

  if new.assignee_id is not null then
    select m.email, m.name
      into v_member_email, v_member_name
      from members m
     where m.id = new.assignee_id
     limit 1;

    if v_member_email is not null then
      perform enqueue_email(
        v_member_email,
        v_member_name,
        'task_assigned',
        jsonb_build_object(
          'member_name', v_member_name,
          'task_name', v_task_name
        ),
        'high'
      );
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists tr_enqueue_task_assigned on tasks;
create trigger tr_enqueue_task_assigned
after insert on tasks
for each row
execute function trg_enqueue_task_assigned();

-- 8.3 org_project_members => project_member
create or replace function trg_enqueue_project_member()
returns trigger as $$
declare
  v_user_email varchar;
  v_user_name varchar;
  v_project_name varchar;
begin
  select m.email, m.name into v_user_email, v_user_name
    from members m
   where m.id = new.user_id;

  select p.title into v_project_name
    from org_projects p
   where p.id = new.project_id;

  if v_user_email is not null and v_project_name is not null then
    perform enqueue_email(
      v_user_email,
      v_user_name,
      'project_member',
      jsonb_build_object(
        'member_name', v_user_name,
        'project_name', v_project_name
      ),
      'medium'
    );
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists tr_enqueue_project_member on org_project_members;
create trigger tr_enqueue_project_member
after insert on org_project_members
for each row
execute function trg_enqueue_project_member();

-- 8.4 org_department_members => department_member
create or replace function trg_enqueue_department_member()
returns trigger as $$
declare
  v_user_email varchar;
  v_user_name varchar;
  v_department_name varchar;
begin
  select m.email, m.name into v_user_email, v_user_name
    from members m
   where m.id = new.user_id;

  select d.title into v_department_name
    from org_departments d
   where d.id = new.department_id;

  if v_user_email is not null and v_department_name is not null then
    perform enqueue_email(
      v_user_email,
      v_user_name,
      'department_member',
      jsonb_build_object(
        'member_name', v_user_name,
        'department_name', v_department_name
      ),
      'medium'
    );
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists tr_enqueue_department_member on org_department_members;
create trigger tr_enqueue_department_member
after insert on org_department_members
for each row
execute function trg_enqueue_department_member();

-- 8.5 org_area_members => area_member
create or replace function trg_enqueue_area_member()
returns trigger as $$
declare
  v_user_email varchar;
  v_user_name varchar;
  v_area_name varchar;
begin
  select m.email, m.name into v_user_email, v_user_name
    from members m
   where m.id = new.user_id;

  select a.title into v_area_name
    from org_areas a
   where a.id = new.area_id;

  if v_user_email is not null and v_area_name is not null then
    perform enqueue_email(
      v_user_email,
      v_user_name,
      'area_member',
      jsonb_build_object(
        'member_name', v_user_name,
        'area_name', v_area_name
      ),
      'medium'
    );
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists tr_enqueue_area_member on org_area_members;
create trigger tr_enqueue_area_member
after insert on org_area_members
for each row
execute function trg_enqueue_area_member();

-- ------------------------------------------------------------
-- 9) Birthday cron: triggerless enqueue function
-- ------------------------------------------------------------
-- Cron/worker should call:
--   select enqueue_birthday_emails(false);
-- or in case you want only personal:
--   select enqueue_birthday_emails(true);
create or replace function enqueue_birthday_emails(p_personal_only boolean default false)
returns void as $$
declare
  v_today_day int;
  v_today_month int;
  v_year int;
  v_member record;
  v_personal_already boolean;
  v_notification_id bigint;
  v_team_count int;
  v_team_recipient uuid;
  v_team_email varchar;
  v_team_name varchar;
begin
  v_today_day := extract(day from current_date)::int;
  v_today_month := extract(month from current_date)::int;
  v_year := extract(year from current_date)::int;

  for v_member in
    select id, name, email
      from members
     where birth_day = v_today_day
       and birth_month = v_today_month
       and email is not null
  loop
    -- Personal idempotency row (upsert)
    insert into birthday_notifications (birthday_person_id, notification_year, personal_mail_sent, team_mails_sent_count, sent_at)
    values (v_member.id, v_year, false, 0, timezone('utc'::text, now()))
    on conflict (birthday_person_id, notification_year) do nothing;

    select personal_mail_sent
      into v_personal_already
      from birthday_notifications
     where birthday_person_id = v_member.id
       and notification_year = v_year;

    if v_personal_already is distinct from true then
      perform enqueue_email(
        v_member.email,
        v_member.name,
        'birthday_personal',
        jsonb_build_object(
          'member_name', v_member.name
        ),
        'high'
      );

      update birthday_notifications
         set personal_mail_sent = true,
             sent_at = timezone('utc'::text, now())
       where birthday_person_id = v_member.id
         and notification_year = v_year;
    end if;

    if p_personal_only then
      continue;
    end if;

    -- Team recipients:
    -- Collect distinct recipients from:
    -- - org_area_members for areas where birthday member is a member
    -- - org_department_members for departments where birthday member is a member
    -- - org_project_members for projects where birthday member is a member
    --
    -- This approximates "team mail" scope; adjust if you have a different definition.
    with team_users as (
      select distinct user_id as recipient_user_id
        from (
          select oam.user_id
            from org_area_members oam
            join org_area_members birthday_oam
              on birthday_oam.area_id = oam.area_id
             where birthday_oam.user_id = v_member.id

          union

          select odm.user_id
            from org_department_members odm
            join org_department_members birthday_odm
              on birthday_odm.department_id = odm.department_id
             where birthday_odm.user_id = v_member.id

          union

          select opm.user_id
            from org_project_members opm
            join org_project_members birthday_opm
              on birthday_opm.project_id = opm.project_id
             where birthday_opm.user_id = v_member.id
        ) t
       where t.user_id is not null
    )
    select count(*)::int
      into v_team_count
      from team_users tu
     where tu.recipient_user_id <> v_member.id;

    -- If team mails already sent (count stored), we still avoid duplicates by only sending
    -- when current stored count == 0
    select team_mails_sent_count
      into v_team_count
      from birthday_notifications
     where birthday_person_id = v_member.id
       and notification_year = v_year;

    if v_team_count = 0 then
      -- Enqueue team emails
      for v_team_recipient in
        select recipient_user_id
          from (
            select distinct user_id as recipient_user_id
              from (
                select oam.user_id
                  from org_area_members oam
                  join org_area_members birthday_oam
                    on birthday_oam.area_id = oam.area_id
                 where birthday_oam.user_id = v_member.id

                union

                select odm.user_id
                  from org_department_members odm
                  join org_department_members birthday_odm
                    on birthday_odm.department_id = odm.department_id
                 where birthday_odm.user_id = v_member.id

                union

                select opm.user_id
                  from org_project_members opm
                  join org_project_members birthday_opm
                    on birthday_opm.project_id = opm.project_id
                 where birthday_opm.user_id = v_member.id
              ) t
             where t.user_id is not null
          ) tu
         where tu.recipient_user_id <> v_member.id
      loop
        select m.email, m.name
          into v_team_email, v_team_name
          from members m
         where m.id = v_team_recipient
         limit 1;

        if v_team_email is not null then
          perform enqueue_email(
            v_team_email,
            v_team_name,
            'birthday_team',
            jsonb_build_object(
              'birthday_person', v_member.name
            ),
            'medium'
          );
        end if;
      end loop;

      -- Mark team mails as sent (set to 1 or approximate recipients count)
      update birthday_notifications
         set team_mails_sent_count = coalesce((
           select count(*)::int
             from (
               select distinct user_id
                 from (
                   select oam.user_id
                     from org_area_members oam
                     join org_area_members birthday_oam
                       on birthday_oam.area_id = oam.area_id
                    where birthday_oam.user_id = v_member.id
                   union
                   select odm.user_id
                     from org_department_members odm
                     join org_department_members birthday_odm
                       on birthday_odm.department_id = odm.department_id
                    where birthday_odm.user_id = v_member.id
                   union
                   select opm.user_id
                     from org_project_members opm
                     join org_project_members birthday_opm
                       on birthday_opm.project_id = opm.project_id
                    where birthday_opm.user_id = v_member.id
                 ) t
              ) s
            where user_id <> v_member.id
         ), 0),
             sent_at = timezone('utc'::text, now())
       where birthday_person_id = v_member.id
         and notification_year = v_year;
    end if;

  end loop;
end;
$$ language plpgsql security definer;

-- ============================================================
-- END OF EMAIL SYSTEM SCRIPT
-- ============================================================
