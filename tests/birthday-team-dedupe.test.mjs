import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const person = 'a1000000-0000-4000-8000-000000000001';
const b = 'a1000000-0000-4000-8000-000000000002';
const c = 'a1000000-0000-4000-8000-000000000003';
const d = 'a1000000-0000-4000-8000-000000000004';
const e = 'a1000000-0000-4000-8000-000000000005';
const group = 'b1000000-0000-4000-8000-000000000001';
const migration = new URL('../supabase/migrations/20261111210347_avoid_duplicate_birthday_team_mail.sql', import.meta.url);

async function fixture(t) {
  const db = new PGlite(); t.after(() => db.close());
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE TABLE public.members (id uuid PRIMARY KEY, name text, email text, birth_day int, birth_month int, is_active bool);
    CREATE TABLE public.notifications (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, title text, message text, type text,
      related_id uuid, related_type text, user_id uuid, actor_id uuid, actor_name text, dedupe_key text UNIQUE);
    CREATE TABLE public.birthday_notifications (birthday_person_id uuid, notification_year int,
      personal_mail_sent bool, team_mails_sent_count int, sent_at timestamptz, UNIQUE(birthday_person_id, notification_year));
    CREATE TABLE public.email_queue (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      recipient_email text, recipient_name text, template_code text, template_params jsonb, priority text, status text,
      idempotency_key text UNIQUE, delivery_claim_token uuid);
    CREATE TABLE public.birthday_email_deliveries (queue_id bigint REFERENCES public.email_queue(id),
      birthday_person_id uuid, notification_year int, channel text);
    CREATE TABLE public.org_area_members (user_id uuid, area_id uuid, deleted_at timestamptz);
    CREATE TABLE public.org_department_members (user_id uuid, department_id uuid, deleted_at timestamptz);
    CREATE TABLE public.org_project_members (user_id uuid, project_id uuid, deleted_at timestamptz);
    INSERT INTO public.members VALUES
      ('${person}', 'Ada', 'ada@example.invalid', extract(day FROM now() AT TIME ZONE 'Europe/Istanbul'), extract(month FROM now() AT TIME ZONE 'Europe/Istanbul'), true),
      ('${b}', 'B', 'new-b@example.invalid', null, null, true),
      ('${c}', 'C', 'c@example.invalid', null, null, true),
      ('${d}', 'D', 'd@example.invalid', null, null, true),
      ('${e}', 'E', 'e@example.invalid', null, null, true);
  `);
  await db.exec(await readFile(migration, 'utf8'));
  await db.exec(await readFile(migration, 'utf8'));
  return db;
}

test('birthday correction does not resend delivered or claimed mail to the same recipients', async (t) => {
  const db = await fixture(t);
  const year = (await db.query("SELECT extract(year FROM now() AT TIME ZONE 'Europe/Istanbul')::int AS n")).rows[0].n;
  await db.exec(`
    INSERT INTO public.org_area_members(user_id,area_id) VALUES ('${person}','${group}'), ('${b}','${group}'), ('${c}','${group}'), ('${d}','${group}'), ('${e}','${group}');
    INSERT INTO public.org_department_members(user_id,department_id) VALUES ('${person}','${group}'), ('${d}','${group}');
  `);
  const params = JSON.stringify({ birthday_person_id: person, birthday_year: year, birthday_day: 1, birthday_month: 1 });
  async function historical(email, code, status, key, claim = null) {
    return (await db.query(`INSERT INTO public.email_queue(recipient_email,template_code,template_params,status,idempotency_key,delivery_claim_token)
      VALUES ($1,$2,$3::jsonb,$4,$5,$6) RETURNING id`, [email, code, params, status, key, claim])).rows[0].id;
  }
  await historical('ada@example.invalid', 'birthday_personal', 'sent', `birthday:${year}:${person}:1-1:personal:ada@example.invalid`);
  // Email changed: member identity in the old idempotency key still prevents a duplicate.
  await historical('old-b@example.invalid', 'birthday_team', 'sent', `birthday:${year}:${person}:1-1:team:${b}`);
  await historical('c@example.invalid', 'birthday_team', 'pending', `birthday:${year}:${person}:1-1:team:${c}`, 'c1000000-0000-4000-8000-000000000001');
  await historical('d@example.invalid', 'birthday_team', 'failed', `birthday:${year}:${person}:1-1:team:${d}`);
  const delivered = await historical('e@example.invalid', 'birthday_team', 'failed', `birthday:${year}:${person}:1-1:team:${e}`);
  await db.query('INSERT INTO public.birthday_email_deliveries VALUES ($1,$2,$3,$4)', [delivered, person, year, 'team']);
  await db.exec('SELECT public.enqueue_birthday_emails(); SELECT public.enqueue_birthday_emails();');
  const jobs = (await db.query("SELECT recipient_email, template_code FROM public.email_queue WHERE status='pending' AND delivery_claim_token IS NULL")).rows;
  assert.deepEqual(jobs, [{ recipient_email: 'd@example.invalid', template_code: 'birthday_team' }]);
  assert.equal((await db.query("SELECT count(*)::int AS n FROM public.notifications WHERE type='birthday'")).rows[0].n, 5);
});

test('a new birthday queues one personal mail even when the daily job repeats', async (t) => {
  const db = await fixture(t);
  await db.exec('SELECT public.enqueue_birthday_emails(); SELECT public.enqueue_birthday_emails();');
  const rows = (await db.query('SELECT recipient_email, template_code FROM public.email_queue')).rows;
  assert.deepEqual(rows, [{ recipient_email: 'ada@example.invalid', template_code: 'birthday_personal' }]);
});
