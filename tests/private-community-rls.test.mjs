import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const tables = [
  'announcements', 'announcement_members', 'events', 'event_staff',
  'event_speakers', 'community_settings', 'menu_items',
];
const memberA = 'a1000000-0000-4000-8000-000000000001';
const memberB = 'a1000000-0000-4000-8000-000000000002';
const admin = 'a1000000-0000-4000-8000-000000000003';

// The migration is executed by a real, isolated PostgreSQL engine. These
// synthetic tables and claim helpers test the policy contract, not the live
// Supabase schema, JWT verification, API exposure or deployed migrations.
test('private-community policies enforce role and recipient boundaries', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE ROLE anon;
      CREATE ROLE authenticated;
      CREATE FUNCTION public.current_member_id() RETURNS uuid LANGUAGE sql STABLE AS
        $$ SELECT nullif(current_setting('test.member_id', true), '')::uuid $$;
      CREATE FUNCTION public.current_member_role() RETURNS text LANGUAGE sql STABLE AS
        $$ SELECT nullif(current_setting('test.member_role', true), '') $$;
    `);
    for (const table of tables) {
      await db.exec(`
        CREATE TABLE public.${table} (id integer PRIMARY KEY, member_id uuid, value text);
        INSERT INTO public.${table} VALUES (1, '${memberA}', 'first'), (2, '${memberB}', 'second');
        ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;
        GRANT ALL ON public.${table} TO anon, authenticated;
        GRANT SELECT (value) ON public.${table} TO anon;
        CREATE POLICY unsafe_legacy ON public.${table} FOR ALL TO authenticated USING (true) WITH CHECK (true);
      `);
    }

    const migration = await readFile(new URL('../supabase/migrations/20261111150204_restrict_private_community_reads.sql', import.meta.url), 'utf8');
    await db.exec(migration);
    await db.exec(migration); // migrations must be safe to reapply

    const catalog = await db.query(`
      SELECT c.relname, c.relrowsecurity,
        has_table_privilege('anon', c.oid, 'SELECT') AS anon_select,
        has_column_privilege('anon', c.oid, 'value', 'SELECT') AS anon_column_select,
        has_table_privilege('authenticated', c.oid, 'TRUNCATE') AS auth_truncate,
        has_table_privilege('authenticated', c.oid, 'REFERENCES') AS auth_references,
        has_table_privilege('authenticated', c.oid, 'TRIGGER') AS auth_trigger
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = ANY($1::text[]) ORDER BY c.relname`,
      [tables]);
    assert.equal(catalog.rows.length, tables.length);
    for (const row of catalog.rows) {
      assert.equal(row.relrowsecurity, true, row.relname);
      assert.equal(row.anon_select, false, row.relname);
      assert.equal(row.anon_column_select, false, row.relname);
      assert.equal(row.auth_truncate, false, row.relname);
      assert.equal(row.auth_references, false, row.relname);
      assert.equal(row.auth_trigger, false, row.relname);
    }

    await db.exec('SET ROLE anon');
    for (const table of tables) {
      await assert.rejects(db.query(`SELECT * FROM public.${table}`), (error) => error.code === '42501');
      await assert.rejects(db.query(`INSERT INTO public.${table} (id) VALUES (99)`), (error) => error.code === '42501');
      await assert.rejects(db.query(`TRUNCATE public.${table}`), (error) => error.code === '42501');
    }

    await db.exec(`RESET ROLE; SET ROLE authenticated;
      SELECT set_config('test.member_id', '', false);
      SELECT set_config('test.member_role', '', false);`);
    for (const table of tables) {
      assert.equal((await db.query(`SELECT * FROM public.${table}`)).rows.length, 0, table);
      await assert.rejects(db.query(`INSERT INTO public.${table} (id) VALUES (99)`), (error) => error.code === '42501');
      assert.equal((await db.query(`UPDATE public.${table} SET value='x' RETURNING id`)).rows.length, 0);
      assert.equal((await db.query(`DELETE FROM public.${table} RETURNING id`)).rows.length, 0);
      await assert.rejects(db.query(`TRUNCATE public.${table}`), (error) => error.code === '42501');
    }

    // A role name without a registered identity must not grant admin access.
    await db.exec("SELECT set_config('test.member_role', 'Admin', false)");
    assert.equal((await db.query('SELECT * FROM public.events')).rows.length, 0);
    await assert.rejects(db.query('INSERT INTO public.events (id) VALUES (99)'), (error) => error.code === '42501');

    await db.exec(`SELECT set_config('test.member_id', '${memberA}', false);
      SELECT set_config('test.member_role', 'User', false);`);
    for (const table of tables) {
      const rows = (await db.query(`SELECT id FROM public.${table} ORDER BY id`)).rows.map((row) => row.id);
      assert.deepEqual(rows, table === 'announcement_members' ? [1] : [1, 2], table);
      await assert.rejects(db.query(`INSERT INTO public.${table} (id) VALUES (99)`), (error) => error.code === '42501');
      assert.equal((await db.query(`UPDATE public.${table} SET value='x' RETURNING id`)).rows.length, 0);
      assert.equal((await db.query(`DELETE FROM public.${table} RETURNING id`)).rows.length, 0);
    }

    await db.exec(`SELECT set_config('test.member_id', '${admin}', false)`);
    for (const role of ['Admin', 'Super Admin']) {
      await db.query("SELECT set_config('test.member_role', $1, false)", [role]);
      for (const table of tables) {
        assert.equal((await db.query(`SELECT id FROM public.${table}`)).rows.length, 2);
        assert.equal((await db.query(`INSERT INTO public.${table} (id, member_id, value) VALUES (99, '${memberA}', 'admin') RETURNING id`)).rows.length, 1);
        assert.equal((await db.query(`UPDATE public.${table} SET value='changed' WHERE id=99 RETURNING id`)).rows.length, 1);
        assert.equal((await db.query(`DELETE FROM public.${table} WHERE id=99 RETURNING id`)).rows.length, 1);
        await assert.rejects(db.query(`TRUNCATE public.${table}`), (error) => error.code === '42501');
      }
    }
  } finally {
    await db.close();
  }
});

test('historical scripts cannot disable RLS or recreate known permissive policies', async () => {
  const files = [
    'announcements.sql', '30-community-settings.sql', 'events.sql', 'events-fixed.sql',
    'events-simple-final.sql', 'events-full-reset.sql', 'events-security-fix.sql',
  ];
  for (const file of files) {
    const source = await readFile(new URL(`../database/${file}`, import.meta.url), 'utf8');
    const sql = source.split(/\r?\n/).filter((line) => !line.trimStart().startsWith('--')).join('\n');
    assert.doesNotMatch(sql, /\bdisable\s+row\s+level\s+security\b/i, file);
    assert.doesNotMatch(sql, /create\s+policy[\s\S]*?\b(?:using|with\s+check)\s*\(\s*true\s*\)/i, file);
  }
});
