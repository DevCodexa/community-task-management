-- ============================================================
-- Archive Tasks - Done -> 7 Days -> archived_tasks
-- ============================================================
-- Run this in your Supabase SQL Editor.
-- Notes:
-- - "Tamamlandı" (done_completed_at) için tasks.updated_at baz alınır.
-- - "Kim tamamladı" (done_completed_by) için auth.uid() baz alınır.
-- - Arşivlenen kayıtlar tasks tablosundan silinir ki Kanban/Tabloda görünmesin.

begin;

-- 1) Archived table
create table if not exists archived_tasks (
  id uuid primary key,

  -- Original task fields
  title text not null,
  description text default '',
  deadline timestamp with time zone,
  image_url text default '',
  points integer default 1,
  assignee_id uuid references members(id) on delete set null,
  status task_status_enum not null,

  -- Who/When info (done metadata)
  done_completed_at timestamp with time zone not null,
  done_completed_by uuid references members(id) on delete set null,

  -- Archive metadata
  archived_at timestamp with time zone default timezone('utc'::text, now()) not null,
  archived_reason text not null default 'done_7_days',

  -- Timestamps copied
  created_at timestamp with time zone not null,
  updated_at timestamp with time zone not null
);

-- Helpful indexes
create index if not exists idx_archived_tasks_assignee_id on archived_tasks(assignee_id);
create index if not exists idx_archived_tasks_done_completed_by on archived_tasks(done_completed_by);
create index if not exists idx_archived_tasks_done_completed_at on archived_tasks(done_completed_at);

-- 2) RLS
alter table archived_tasks enable row level security;

-- anon: (UI arşiv okuması için)
create policy "Allow anon to read archived_tasks" on archived_tasks for select to anon using (true);

-- authenticated: manuel arşivleme (insert/update/delete) için
create policy "Allow authenticated to insert archived_tasks" on archived_tasks for insert to authenticated with check (true);
create policy "Allow authenticated to update archived_tasks" on archived_tasks for update to authenticated using (true) with check (true);
create policy "Allow authenticated to delete archived_tasks" on archived_tasks for delete to authenticated using (true);


-- 3) Function that moves eligible tasks
create or replace function archive_done_tasks_older_than_7_days()
returns integer
language plpgsql
security definer
as $$
declare
  v_moved integer := 0;
begin
  -- Insert eligible tasks into archived_tasks
  insert into archived_tasks (
    id,
    title,
    description,
    deadline,
    image_url,
    points,
    assignee_id,
    status,
    done_completed_at,
    done_completed_by,
    archived_at,
    archived_reason,
    created_at,
    updated_at
  )
  select
    t.id,
    t.title,
    t.description,
    t.deadline,
    t.image_url,
    t.points,
    t.assignee_id,
    t.status,
    t.updated_at as done_completed_at,
    auth.uid() as done_completed_by,
    timezone('utc'::text, now()) as archived_at,
    'done_7_days' as archived_reason,
    t.created_at,
    t.updated_at
  from tasks t
  where t.status = 'done'
    and t.updated_at < (now() - interval '7 days')
  on conflict (id) do nothing;

  -- Delete moved tasks so they disappear from Kanban/Table
  delete from tasks t
  where t.status = 'done'
    and t.updated_at < (now() - interval '7 days');

  -- count moved by number of deleted rows
  GET DIAGNOSTICS v_moved = ROW_COUNT;

  return v_moved;
end;
$$;

commit;

