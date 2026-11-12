import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const memberA = 'a1000000-0000-4000-8000-000000000001';
const memberB = 'a1000000-0000-4000-8000-000000000002';
const inactive = 'a1000000-0000-4000-8000-000000000003';
const taskId = 'b1000000-0000-4000-8000-000000000001';

const readRepo = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
function fragment(source, start, end) {
  const a = source.indexOf(start);
  const b = source.indexOf(end, a);
  assert.ok(a !== -1 && b !== -1, `Could not find ${start}`);
  return source.slice(a, b);
}

// These tests execute actual checked-in SQL in isolated PostgreSQL with synthetic
// fixtures and identity helpers. They do not establish the live migration state,
// Supabase Auth JWT behavior, API grants, schedules, or production records.
test('legacy notifications script aborts before creating unsafe policies or triggers', async () => {
  const db = new PGlite();
  try {
    const sql = await readRepo('database/notifications.sql');
    await assert.rejects(db.exec(sql), /Historical notifications\.sql is disabled/);
    await db.exec('ROLLBACK');
    const result = await db.query("SELECT to_regclass('public.notifications') AS name");
    assert.equal(result.rows[0].name, null);
  } finally { await db.close(); }
});

test('versioned birthday and task notifications fan out once per active recipient', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE ROLE anon;
      CREATE ROLE authenticated;
      CREATE ROLE service_role BYPASSRLS;
      CREATE TABLE public.members (id uuid PRIMARY KEY, name text, email text, birth_day int, birth_month int, is_active boolean);
      CREATE TABLE public.tasks (id uuid PRIMARY KEY, title text, status text, assignee_id uuid);
      CREATE TABLE public.notifications (
        id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, title text, message text, type text,
        related_id uuid, related_type text, user_id uuid, actor_id uuid, actor_name text,
        dedupe_key text UNIQUE, is_read boolean DEFAULT false
      );
      CREATE TABLE public.birthday_notifications (birthday_person_id uuid, notification_year int, personal_mail_sent bool, team_mails_sent_count int, sent_at timestamptz,
        UNIQUE (birthday_person_id, notification_year));
      CREATE TABLE public.birthday_email_deliveries (birthday_person_id uuid, notification_year int, channel text);
      CREATE TABLE public.email_queue (recipient_email text, recipient_name text, template_code text, template_params jsonb, priority text, status text, idempotency_key text UNIQUE);
      CREATE TABLE public.org_area_members (user_id uuid, area_id uuid, deleted_at timestamptz);
      CREATE TABLE public.org_department_members (user_id uuid, department_id uuid, deleted_at timestamptz);
      CREATE TABLE public.org_project_members (user_id uuid, project_id uuid, deleted_at timestamptz);
      INSERT INTO public.members VALUES
        ('${memberA}', 'Deniz', 'a@example.test', extract(day FROM (now() AT TIME ZONE 'Europe/Istanbul')), extract(month FROM (now() AT TIME ZONE 'Europe/Istanbul')), true),
        ('${memberB}', 'Ece', 'b@example.test', null, null, true),
        ('${inactive}', 'Inactive', 'c@example.test', null, null, false);
    `);
    const birthdaySql = await readRepo('supabase/migrations/20261026007000_avoid_resending_delivered_birthday_mail.sql');
    await db.exec(birthdaySql);
    const triggerSql = await readRepo('supabase/migrations/20261026006000_idempotent_birthday_and_recipient_notifications.sql');
    await db.exec(fragment(triggerSql, 'CREATE OR REPLACE FUNCTION public.notify_task_added()', 'CREATE OR REPLACE FUNCTION public.notify_task_deleted()'));
    await db.exec('CREATE TRIGGER notify_task_added AFTER INSERT ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.notify_task_added()');
    await db.exec(`SELECT public.enqueue_birthday_emails(); SELECT public.enqueue_birthday_emails();
      INSERT INTO public.tasks VALUES ('${taskId}', 'Örnek görev', 'open', '${memberA}');`);
    const birthday = (await db.query("SELECT user_id, message, dedupe_key FROM public.notifications WHERE type='birthday' ORDER BY user_id")).rows;
    assert.deepEqual(birthday.map((row) => row.user_id), [memberA, memberB]);
    assert.ok(birthday.every((row) => row.message === 'Bugün Deniz doğum gününü kutluyor.'));
    assert.ok(birthday.every((row) => row.dedupe_key.endsWith(`:${row.user_id}`)));
    const tasks = (await db.query("SELECT user_id, dedupe_key FROM public.notifications WHERE type='task_added' ORDER BY user_id")).rows;
    assert.deepEqual(tasks.map((row) => row.user_id), [memberA, memberB]);
    assert.ok(tasks.every((row) => row.dedupe_key.endsWith(`:${row.user_id}`)));
    assert.equal(Number((await db.query('SELECT count(*) AS n FROM public.email_queue')).rows[0].n), 1);

    // Test the checked-in RLS policy against actual per-recipient birthday and task rows.
    await db.exec(`
      CREATE FUNCTION public.current_member_id() RETURNS uuid LANGUAGE sql STABLE AS
        $$ SELECT nullif(current_setting('test.member_id', true), '')::uuid $$;
      CREATE FUNCTION public.current_member_role() RETURNS text LANGUAGE sql STABLE AS
        $$ SELECT nullif(current_setting('test.member_role', true), '') $$;
      ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
      GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.notifications TO authenticated;
      GRANT ALL ON public.notifications TO service_role;
      GRANT USAGE, SELECT ON SEQUENCE public.notifications_id_seq TO authenticated, service_role;
      GRANT INSERT ON public.tasks TO authenticated;
      GRANT REFERENCES (user_id) ON public.notifications TO authenticated;
      GRANT SELECT (message) ON public.notifications TO anon;
      GRANT TRUNCATE ON public.notifications TO PUBLIC;
    `);
    const policy = await readRepo('supabase/migrations/20261026000100_harden_core_rls_and_task_counters.sql');
    await db.exec(fragment(policy, '-- Notifications are private', '-- Email-provider settings'));
    const migration = await readRepo('supabase/migrations/20261111195910_restrict_notification_table_privileges.sql');
    await db.exec(migration);
    await db.exec(migration);
    const grants = (await db.query(`SELECT
      has_table_privilege('authenticated', 'public.notifications', 'TRUNCATE') AS truncate,
      has_table_privilege('authenticated', 'public.notifications', 'TRIGGER') AS trigger,
      has_column_privilege('authenticated', 'public.notifications', 'user_id', 'REFERENCES') AS col_reference,
      has_table_privilege('authenticated', 'public.notifications', 'SELECT') AS can_read,
      has_column_privilege('anon', 'public.notifications', 'message', 'SELECT') AS anon_column_read`)).rows[0];
    assert.deepEqual(grants, { truncate: false, trigger: false, col_reference: false, can_read: true, anon_column_read: false });
    await db.exec('SET ROLE anon');
    await assert.rejects(db.query('SELECT * FROM public.notifications'), (e) => e.code === '42501');
    await db.exec(`RESET ROLE; SET ROLE authenticated; SELECT set_config('test.member_id', '${memberA}', false); SELECT set_config('test.member_role', 'User', false);`);
    await assert.rejects(db.query('TRUNCATE public.notifications'), (e) => e.code === '42501');
    let visible = (await db.query('SELECT user_id, type FROM public.notifications ORDER BY type')).rows;
    assert.deepEqual(visible, [{ user_id: memberA, type: 'birthday' }, { user_id: memberA, type: 'task_added' }]);
    assert.equal((await db.query(`UPDATE public.notifications SET is_read=true WHERE user_id='${memberA}' RETURNING id`)).rows.length, 2);
    await assert.rejects(db.query(`UPDATE public.notifications SET user_id='${memberB}' WHERE user_id='${memberA}'`), (e) => e.code === '42501');
    assert.equal((await db.query(`UPDATE public.notifications SET is_read=true WHERE user_id='${memberB}' RETURNING id`)).rows.length, 0);
    assert.equal((await db.query(`DELETE FROM public.notifications WHERE user_id='${memberB}' RETURNING id`)).rows.length, 0);
    await assert.rejects(db.query(`INSERT INTO public.notifications (title, message, type, user_id, actor_id) VALUES ('bad', 'bad', 'task_added', '${memberB}', '${memberA}')`), (e) => e.code === '42501');
    await db.exec(`SELECT set_config('test.member_id', '${memberB}', false)`);
    visible = (await db.query('SELECT user_id, type FROM public.notifications ORDER BY type')).rows;
    assert.deepEqual(visible, [{ user_id: memberB, type: 'birthday' }, { user_id: memberB, type: 'task_added' }]);
    await db.exec("SELECT set_config('test.member_id', '', false)");
    assert.equal((await db.query('SELECT * FROM public.notifications')).rows.length, 0);
    await db.exec("SELECT set_config('test.member_role', 'Admin', false)");
    await assert.rejects(db.query(`INSERT INTO public.notifications (title, message, type, user_id) VALUES ('no member', 'message', 'task_added', '${memberB}')`), (e) => e.code === '42501');
    // Admins can create addressed notifications, but cannot read or change another inbox.
    await db.exec(`SELECT set_config('test.member_id', '${memberA}', false); SELECT set_config('test.member_role', 'Admin', false)`);
    assert.deepEqual((await db.query('SELECT DISTINCT user_id FROM public.notifications')).rows, [{ user_id: memberA }]);
    assert.equal((await db.query(`UPDATE public.notifications SET is_read=true WHERE user_id='${memberB}' RETURNING id`)).rows.length, 0);
    assert.equal((await db.query(`DELETE FROM public.notifications WHERE user_id='${memberB}' RETURNING id`)).rows.length, 0);
    await assert.rejects(db.query(`UPDATE public.notifications SET user_id='${memberB}' WHERE user_id='${memberA}'`), (e) => e.code === '42501');
    await db.query(`INSERT INTO public.notifications (title, message, type, user_id) VALUES ('admin', 'message', 'task_added', '${memberB}')`);
    await assert.rejects(db.query(`INSERT INTO public.notifications (title, message, type) VALUES ('admin', 'message', 'task_added')`), (e) => e.code === '42501');
    await db.exec("SELECT set_config('test.member_role', 'Super Admin', false)");
    assert.deepEqual((await db.query('SELECT DISTINCT user_id FROM public.notifications')).rows, [{ user_id: memberA }]);
    // A task trigger still executes as its function owner and writes separate
    // recipient rows even though the caller cannot insert into others' inboxes.
    await db.exec(`SELECT set_config('test.member_role', 'User', false); INSERT INTO public.tasks VALUES ('b1000000-0000-4000-8000-000000000002', 'Another task', 'open', '${memberA}')`);
    await db.exec('RESET ROLE; SET ROLE service_role');
    assert.equal((await db.query("SELECT * FROM public.notifications WHERE message='Another task'")).rows.length, 0);
    assert.equal((await db.query("SELECT * FROM public.notifications WHERE message LIKE '%Another task%'")).rows.length, 2);
    await db.query(`INSERT INTO public.notifications (title, message, type, user_id) VALUES ('service', 'message', 'task_added', '${memberB}')`);
    await db.exec('RESET ROLE');
  } finally { await db.close(); }
});
