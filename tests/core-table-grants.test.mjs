import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const tables = [
  'members', 'tasks', 'useful_links', 'org_departments', 'org_areas', 'org_projects',
  'org_department_members', 'org_area_members', 'org_project_members',
  'member_announcements', 'member_areas', 'member_attachments', 'profiles',
  'announcements', 'announcement_members', 'events', 'event_staff',
  'event_speakers', 'community_settings', 'menu_items', 'notifications',
];

test('core non-RLS privileges are revoked without altering row policies or trusted access', async (t) => {
  const db = new PGlite(); t.after(() => db.close());
  await db.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS');
  for (const table of tables) {
    await db.exec(`CREATE TABLE public.${table} (id integer PRIMARY KEY, value text);
      ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;
      CREATE POLICY keep_read ON public.${table} FOR SELECT TO authenticated USING (true);
      GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.${table} TO authenticated;
      GRANT TRUNCATE ON public.${table} TO PUBLIC;
      GRANT REFERENCES (value) ON public.${table} TO anon, authenticated;
      GRANT ALL ON public.${table} TO service_role;
      INSERT INTO public.${table} VALUES (1, 'safe');`);
  }
  const migration = await readFile(new URL('../supabase/migrations/20261112185658_restrict_core_non_rls_privileges.sql', import.meta.url), 'utf8');
  await db.exec(migration); await db.exec(migration);
  const result = await db.query(`SELECT c.relname, c.relrowsecurity,
    has_table_privilege('authenticated', c.oid, 'TRUNCATE') AS can_truncate,
    has_table_privilege('authenticated', c.oid, 'TRIGGER') AS can_trigger,
    has_table_privilege('authenticated', c.oid, 'REFERENCES') AS can_reference,
    has_column_privilege('authenticated', c.oid, 'value', 'REFERENCES') AS col_reference,
    has_column_privilege('anon', c.oid, 'value', 'REFERENCES') AS anon_reference,
    has_table_privilege('authenticated', c.oid, 'SELECT') AS can_read,
    has_table_privilege('authenticated', c.oid, 'UPDATE') AS can_update,
    has_table_privilege('service_role', c.oid, 'TRUNCATE') AS service_truncate
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname='public' AND c.relname = ANY($1::text[])`, [tables]);
  assert.equal(result.rows.length, tables.length);
  for (const row of result.rows) {
    assert.equal(row.relrowsecurity, true, row.relname);
    for (const name of ['can_truncate','can_trigger','can_reference','col_reference','anon_reference']) assert.equal(row[name], false, `${row.relname}: ${name}`);
    for (const name of ['can_read','can_update','service_truncate']) assert.equal(row[name], true, `${row.relname}: ${name}`);
  }
  await db.exec('SET ROLE authenticated');
  for (const table of tables) {
    assert.equal((await db.query(`SELECT * FROM public.${table}`)).rows.length, 1);
    await assert.rejects(db.query(`TRUNCATE public.${table}`), (error) => error.code === '42501');
    // The unchanged policy only permits SELECT; grants alone must not bypass RLS.
    assert.equal((await db.query(`UPDATE public.${table} SET value='changed' RETURNING id`)).rows.length, 0);
  }
  await db.exec('RESET ROLE; SET ROLE service_role');
  assert.equal((await db.query('SELECT * FROM public.members')).rows.length, 1);
});

test('migration tolerates historical tables absent from another environment', async (t) => {
  const db = new PGlite(); t.after(() => db.close());
  await db.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE TABLE public.members (id integer PRIMARY KEY); GRANT TRUNCATE ON public.members TO authenticated');
  await db.exec(await readFile(new URL('../supabase/migrations/20261112185658_restrict_core_non_rls_privileges.sql', import.meta.url), 'utf8'));
  assert.equal((await db.query("SELECT has_table_privilege('authenticated','public.members','TRUNCATE') AS allowed")).rows[0].allowed, false);
});
