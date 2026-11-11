import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const sql = await readFile(new URL('../../database/email_system.sql', import.meta.url), 'utf8');
const section = (start, end) => {
  const first = sql.indexOf(start);
  const last = sql.indexOf(end, first + start.length);
  assert.ok(first >= 0 && last > first, `missing section: ${start}`);
  return sql.slice(first, last);
};

test('historical script refuses execution before creating any tables', async () => {
  const db = new PGlite();
  try {
    assert.doesNotMatch(sql, /\$\{SENDINBLUE_API_KEY\}/);
    await assert.rejects(db.exec(sql), /Historical email_system\.sql is disabled/);
    await db.exec('ROLLBACK');
    const result = await db.query("select to_regclass('public.email_templates') as name");
    assert.equal(result.rows[0].name, null);
  } finally {
    await db.close();
  }
});

test('settings seeds are disabled and repeat without replacing configured values', async () => {
  const db = new PGlite();
  try {
    await db.exec('create table email_settings (setting_key text primary key, setting_value text)');
    const seeds = section('-- Seed settings (idempotent)', '-- 5) birthday_notifications');
    await db.exec(seeds);
    const get = async () => Object.fromEntries((await db.query('select setting_key, setting_value from email_settings')).rows.map(({ setting_key, setting_value }) => [setting_key, setting_value]));
    let settings = await get();
    assert.equal(settings.brevo_api_key, null);
    assert.equal(settings.enabled, 'false');
    assert.equal(settings.sender_email, '');
    await db.exec("update email_settings set setting_value = 'fixture' where setting_key = 'brevo_api_key'; update email_settings set setting_value = 'true' where setting_key = 'enabled'");
    await db.exec(seeds);
    settings = await get();
    assert.equal(settings.brevo_api_key, 'fixture');
    assert.equal(settings.enabled, 'true');
  } finally {
    await db.close();
  }
});

test('legacy policies and grants stay removed on rerun', async () => {
  const db = new PGlite();
  try {
    await db.exec('create role anon; create role authenticated; create role service_role');
    for (const table of ['email_templates', 'email_queue', 'email_send_logs', 'email_settings', 'birthday_notifications']) {
      await db.exec(`create table public.${table} (id bigserial primary key); grant all on public.${table} to public, anon, authenticated; grant all on sequence public.${table}_id_seq to public, anon, authenticated; create policy "Allow anon to read ${table}" on public.${table} for select to anon using (true)`);
    }
    const access = section('-- Backend-only access', '-- 6) Seed templates');
    await db.exec(access);
    await db.exec(access);
    for (const table of ['email_templates', 'email_queue', 'email_send_logs', 'email_settings', 'birthday_notifications']) {
      const { rows: [row] } = await db.query(`select has_table_privilege('anon', 'public.${table}', 'select') as anon_read, has_table_privilege('authenticated', 'public.${table}', 'select') as user_read, has_table_privilege('service_role', 'public.${table}', 'select') as service_read, has_sequence_privilege('anon', 'public.${table}_id_seq', 'usage') as anon_sequence, (select count(*)::int from pg_policies where schemaname = 'public' and tablename = '${table}') as policy_count`);
      assert.deepEqual(row, { anon_read: false, user_read: false, service_read: true, anon_sequence: false, policy_count: 0 });
    }
  } finally {
    await db.close();
  }
});
