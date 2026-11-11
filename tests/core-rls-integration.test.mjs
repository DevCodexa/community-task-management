import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

// These are synthetic fixtures using the actual checked-in policies and
// triggers. They are not the complete production schema or a live JWT/API test.
test('core member, task and organization policies enforce registered roles', async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  const a = 'a1000000-0000-4000-8000-000000000001';
  const b = 'a1000000-0000-4000-8000-000000000002';
  const admin = 'a1000000-0000-4000-8000-000000000003';
  const t1 = 'b1000000-0000-4000-8000-000000000001';
  const t2 = 'b1000000-0000-4000-8000-000000000002';
  const t3 = 'b1000000-0000-4000-8000-000000000003';
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS
      $$ SELECT coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
    CREATE TYPE public.email_priority_enum AS ENUM ('low', 'medium', 'high');
    CREATE FUNCTION public.archive_done_tasks_older_than_7_days() RETURNS void LANGUAGE sql AS $$ SELECT $$;
    CREATE FUNCTION public.archive_single_task(uuid) RETURNS void LANGUAGE sql AS $$ SELECT $$;
    CREATE FUNCTION public.enqueue_birthday_emails(boolean) RETURNS void LANGUAGE sql AS $$ SELECT $$;
    CREATE FUNCTION public.enqueue_email(character varying, character varying, character varying, jsonb, public.email_priority_enum)
      RETURNS void LANGUAGE sql AS $$ SELECT $$;
    CREATE FUNCTION public.process_speaker_email_queue() RETURNS void LANGUAGE sql AS $$ SELECT $$;
    CREATE TABLE public.members (id uuid PRIMARY KEY, email text UNIQUE, system_role text,
      active_tasks integer DEFAULT 0, total_tasks integer DEFAULT 3);
    CREATE TABLE public.tasks (id uuid PRIMARY KEY, assignee_id uuid REFERENCES public.members(id),
      status text NOT NULL, title text NOT NULL, updated_at timestamptz DEFAULT now());
    INSERT INTO public.members (id,email,system_role) VALUES
      ('${a}','member-a@example.invalid','Member'), ('${b}','member-b@example.invalid','Member'),
      ('${admin}','admin@example.invalid','Admin');
    INSERT INTO public.tasks (id,assignee_id,status,title) VALUES
      ('${t1}','${a}','pending','A'), ('${t2}','${b}','pending','B');
    CREATE TABLE public.announcement_members (id integer PRIMARY KEY, member_id uuid);
    CREATE TABLE public.notifications (id integer PRIMARY KEY, user_id uuid, actor_id uuid);
  `);
  const otherTables = [
    'useful_links', 'org_departments', 'org_areas', 'org_area_members', 'org_projects',
    'org_project_members', 'org_department_members', 'announcements', 'events', 'event_staff',
    'event_speakers', 'community_settings', 'menu_items', 'speaker_email_queue',
    'email_settings', 'email_queue', 'email_send_logs', 'email_templates', 'birthday_notifications',
  ];
  for (const table of otherTables) await db.exec(`CREATE TABLE public.${table} (id integer PRIMARY KEY)`);
  for (const name of [
    '20261026000100_harden_core_rls_and_task_counters.sql',
    '20261026004000_lock_down_member_task_org_rls.sql',
    '20261103000000_restrict_member_helper_execution.sql',
  ]) {
    await db.exec(await readFile(new URL(`../supabase/migrations/${name}`, import.meta.url), 'utf8'));
  }
  await db.exec(`INSERT INTO public.org_departments VALUES (1)`);
  await db.exec('SET ROLE anon');
  await assert.rejects(db.query('SELECT * FROM public.members'), (error) => error.code === '42501');
  await assert.rejects(db.query('SELECT * FROM public.email_queue'), (error) => error.code === '42501');
  await assert.rejects(db.query('SELECT public.current_member_id()'), (error) => error.code === '42501');
  await db.exec(`RESET ROLE; SET ROLE authenticated; SELECT set_config('request.jwt.claims', '{"email":"unknown@example.invalid"}', false)`);
  assert.equal((await db.query('SELECT * FROM public.members')).rows.length, 0);
  assert.equal((await db.query('SELECT * FROM public.tasks')).rows.length, 0);
  assert.equal((await db.query('SELECT * FROM public.org_departments')).rows.length, 0);
  await assert.rejects(db.query(`INSERT INTO public.tasks(id,assignee_id,status,title) VALUES ('${t3}','${a}','pending','x')`), (error) => error.code === '42501');
  await assert.rejects(db.query('SELECT * FROM public.email_queue'), (error) => error.code === '42501');
  await db.exec(`SELECT set_config('request.jwt.claims', '{"email":"member-a@example.invalid"}', false)`);
  assert.equal((await db.query('SELECT * FROM public.members')).rows.length, 3);
  assert.equal((await db.query('SELECT * FROM public.tasks')).rows.length, 2);
  assert.equal((await db.query('SELECT * FROM public.org_departments')).rows.length, 1);
  assert.equal((await db.query(`UPDATE public.tasks SET status='started' WHERE id='${t1}' RETURNING id`)).rows.length, 1);
  assert.equal((await db.query(`UPDATE public.tasks SET status='started' WHERE id='${t2}' RETURNING id`)).rows.length, 0);
  await assert.rejects(db.query(`UPDATE public.tasks SET title='forged' WHERE id='${t1}'`), /only change task status/);
  await assert.rejects(db.query(`UPDATE public.tasks SET assignee_id='${b}' WHERE id='${t1}'`), /Only an administrator can reassign/);
  await assert.rejects(db.query('INSERT INTO public.org_departments VALUES (2)'), (error) => error.code === '42501');
  await assert.rejects(db.query(`INSERT INTO public.tasks(id,assignee_id,status,title) VALUES ('${t3}','${b}','pending','x')`), (error) => error.code === '42501');
  assert.equal((await db.query(`INSERT INTO public.tasks(id,assignee_id,status,title) VALUES ('${t3}','${a}','pending','mine') RETURNING id`)).rows.length, 1);
  assert.equal((await db.query(`DELETE FROM public.tasks WHERE id='${t2}' RETURNING id`)).rows.length, 0);
  assert.equal((await db.query(`DELETE FROM public.tasks WHERE id='${t3}' RETURNING id`)).rows.length, 1);
  assert.equal((await db.query(`UPDATE public.members SET system_role='Admin' WHERE id='${a}' RETURNING id`)).rows.length, 0);
  await db.exec(`SELECT set_config('request.jwt.claims', '{"email":"admin@example.invalid"}', false)`);
  assert.equal((await db.query('INSERT INTO public.org_departments VALUES (2) RETURNING id')).rows.length, 1);
  assert.equal((await db.query(`UPDATE public.tasks SET title='admin edit' WHERE id='${t2}' RETURNING id`)).rows.length, 1);
  await assert.rejects(db.query(`UPDATE public.members SET system_role='Super Admin' WHERE id='${a}'`), /Only a Super Admin can change system roles/);
  assert.equal((await db.query(`DELETE FROM public.tasks WHERE id='${t2}' RETURNING id`)).rows.length, 1);
  await assert.rejects(db.query('SELECT * FROM public.email_queue'), (error) => error.code === '42501');
  await db.exec('RESET ROLE; SET ROLE service_role');
  assert.equal((await db.query('INSERT INTO public.email_queue VALUES (1) RETURNING id')).rows.length, 1);
  assert.equal((await db.query('SELECT * FROM public.email_queue')).rows.length, 1);
});
