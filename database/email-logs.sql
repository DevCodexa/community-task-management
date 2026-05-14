-- ============================================================
-- Email Logs (Idempotency)
-- ============================================================
-- Run this in your Supabase SQL Editor.
-- Purpose: avoid sending the same onboarding email more than once.

create table if not exists email_logs (
  id uuid default gen_random_uuid() primary key,
  
  -- idempotency key fields
  email_type text not null, -- e.g. 'member_welcome'
  email_to text not null,

  -- optional linkage
  member_id uuid references members(id) on delete cascade,

  -- status & metadata
  status text not null default 'sent', -- 'sent' | 'failed'
  provider_response jsonb default '{}'::jsonb,

  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- Ensure one log per (type,to)
create unique index if not exists uq_email_logs_type_to
  on email_logs (email_type, email_to);

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
alter table email_logs enable row level security;

-- Dev mode: allow anon insert/select.
-- If you lock it down later, switch to authenticated and/or service role.
create policy "Allow anon to read email_logs"
  on email_logs for select
  to anon
  using (true);

create policy "Allow anon to insert email_logs"
  on email_logs for insert
  to anon
  with check (true);

create policy "Allow anon to update email_logs"
  on email_logs for update
  to anon
  using (true)
  with check (true);

create policy "Allow anon to delete email_logs"
  on email_logs for delete
  to anon
  using (true);

