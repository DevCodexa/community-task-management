-- ============================================================
-- Supabase Notifications Table - Zincir Atarlı Task Management
-- ============================================================
-- Run this in your Supabase SQL Editor after tasks.sql and members.sql

-- -----------------------------------------------------------
-- 1. ENUM TYPES
-- -----------------------------------------------------------

create type notification_type_enum as enum (
  'task_added',
  'task_completed', 
  'task_deleted',
  'member_added',
  'member_removed',
  'member_updated',
  'birthday'
);

-- -----------------------------------------------------------
-- 2. TABLE CREATION
-- -----------------------------------------------------------

create table if not exists notifications (
  id uuid default gen_random_uuid() primary key,
  
  -- Notification Content
  title text not null,
  message text not null,
  type notification_type_enum not null default 'task_added',
  is_read boolean not null default false,
  
  -- Related Entity References
  related_id uuid,  -- UUID of related task/member
  related_type text, -- 'task' or 'member'
  
  -- User Reference (who receives the notification)
  user_id uuid references members(id) on delete set null,
  
  -- Actor (who caused the notification - for task_added, task_deleted etc.)
  actor_id uuid references members(id) on delete set null,
  actor_name text, -- Cache actor name for display
  
  -- Timestamps
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  read_at timestamp with time zone
);

-- -----------------------------------------------------------
-- 3. INDEXES
-- -----------------------------------------------------------

create index if not exists idx_notifications_user_id on notifications(user_id);
create index if not exists idx_notifications_type on notifications(type);
create index if not exists idx_notifications_is_read on notifications(is_read);
create index if not exists idx_notifications_created_at on notifications(created_at);
create index if not exists idx_notifications_related_id on notifications(related_id);

-- -----------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS)
-- -----------------------------------------------------------
alter table notifications enable row level security;

-- Development mode: Allow anon role for all CRUD operations
create policy "Allow anon to read notifications"
  on notifications for select
  to anon
  using (true);
create policy "Allow anon to insert notifications"
  on notifications for insert
  to anon
  with check (true);
create policy "Allow anon to update notifications"
  on notifications for update
  to anon
  using (true)
  with check (true);
create policy "Allow anon to delete notifications"
  on notifications for delete
  to anon
  using (true);

-- -----------------------------------------------------------
-- 5. HELPER FUNCTIONS
-- -----------------------------------------------------------

-- Get member name cache
create or replace function get_member_name(p_member_id uuid)
returns text as $$
declare
  v_name text;
begin
  select name into v_name from members where id = p_member_id;
  return v_name;
end;
$$ language plpgsql security definer;

-- -----------------------------------------------------------
-- 6. TRIGGERS FOR TASKS
-- -----------------------------------------------------------

-- 6.1 Trigger for task INSERT
create or replace function notify_task_added()
returns trigger as $$
declare
  v_actor_name text;
begin
  -- Get actor name if new.assignee_id exists
  if new.assignee_id is not null then
    v_actor_name := get_member_name(new.assignee_id);
  end if;
  
  -- Insert notification
  insert into notifications (title, message, type, related_id, related_type, actor_id, actor_name)
  values (
    'Yeni Görev Eklendi',
    'Görev zincirine "' || new.title || '" görevi eklendi.',
    'task_added',
    new.id,
    'task',
    new.assignee_id,
    v_actor_name
  );
  
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_notify_task_added on tasks;

create trigger trg_notify_task_added
  after insert on tasks
  for each row
  execute function notify_task_added();

-- 6.2 Trigger for task DELETE
create or replace function notify_task_deleted()
returns trigger as $$
declare
  v_actor_name text;
begin
  -- Get actor name from current task if assignee exists
  if old.assignee_id is not null then
    v_actor_name := get_member_name(old.assignee_id);
  end if;
  
  -- Insert notification
  insert into notifications (title, message, type, related_id, related_type, actor_id, actor_name)
  values (
    'Görev Silindi',
    '"' || old.title || '" görevi zincirden kaldırıldı.',
    'task_deleted',
    old.id,
    'task',
    old.assignee_id,
    v_actor_name
  );
  
  return old;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_notify_task_deleted on tasks;

create trigger trg_notify_task_deleted
  after delete on tasks
  for each row
  execute function notify_task_deleted();

-- -----------------------------------------------------------
-- 7. TRIGGERS FOR MEMBERS
-- -----------------------------------------------------------

-- 7.1 Trigger for member INSERT
create or replace function notify_member_added()
returns trigger as $$
begin
  -- Insert notification
  insert into notifications (title, message, type, related_id, related_type, actor_id, actor_name)
  values (
    'Yeni Üye Katıldı',
    new.name || ' topluluk zincirine katıldı!',
    'member_added',
    new.id,
    'member',
    new.id,
    new.name
  );
  
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_notify_member_added on members;

create trigger trg_notify_member_added
  after insert on members
  for each row
  execute function notify_member_added();

-- 7.2 Trigger for member DELETE
create or replace function notify_member_removed()
returns trigger as $$
begin
  -- Insert notification
  insert into notifications (title, message, type, related_id, related_type, actor_id, actor_name)
  values (
    'Üye Ayrıldı',
    old.name || ' topluluk zincirinden ayrıldı.',
    'member_removed',
    old.id,
    'member',
    old.id,
    old.name
  );
  
  return old;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_notify_member_removed on members;

create trigger trg_notify_member_removed
  after delete on members
  for each row
  execute function notify_member_removed();

-- -----------------------------------------------------------
-- 8. BIRTHDAY CHECK FUNCTION (for app initialization)
-- -----------------------------------------------------------

create or replace function check_birthdays_today()
returns setof notifications as $$
declare
  v_today_day integer;
  v_today_month integer;
  v_member record;
  v_notification notifications%rowtype;
begin
  -- Get today's day and month
  v_today_day := extract(day from current_date)::integer;
  v_today_month := extract(month from current_date)::integer;
  
  -- Find members with birthday today
  for v_member in
    select id, name from members 
    where birth_day = v_today_day 
    and birth_month = v_today_month
  loop
    -- Check if birthday notification already exists today
    if not exists (
      select 1 from notifications 
      where type = 'birthday' 
      and related_id = v_member.id
      and created_at::date = current_date
    ) then
      -- Insert birthday notification
      insert into notifications (title, message, type, related_id, related_type, actor_id, actor_name)
      values (
        '🎉 Doğum Günü!',
        v_member.name || ' bugün doğum günü! Mutlu yıllar dileriz!',
        'birthday',
        v_member.id,
        'member',
        v_member.id,
        v_member.name
      )
      returning * into v_notification;
      
      return next v_notification;
    end if;
  end loop;
  
  return;
end;
$$ language plpgsql security definer;

-- -----------------------------------------------------------
-- 9. MARK AS READ FUNCTION
-- -----------------------------------------------------------

create or replace function mark_notification_read(p_notification_id uuid)
returns void as $$
begin
  update notifications 
  set is_read = true, read_at = timezone('utc'::text, now())
  where id = p_notification_id;
end;
$$ language plpgsql security definer;

-- -----------------------------------------------------------
-- 10. SAMPLE DATA (Optional - Uncomment to use)
-- -----------------------------------------------------------

/*
-- Example: Create a test notification
insert into notifications (title, message, type)
values (
  'Hoş Geldiniz!',
  'Zincir Atarlı Task Management sistemine hoş geldiniz!',
  'task_added'
);
*/

-- ============================================================
-- END OF NOTIFICATIONS SCRIPT
-- ============================================================
