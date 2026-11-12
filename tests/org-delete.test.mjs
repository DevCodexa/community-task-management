import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

function loadService(supabase) {
  const source = readFileSync(new URL('../src/lib/supabaseOrgHierarchy.ts', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  runInNewContext(compiled, { exports, Error, Map, console: { error() {}, warn() {} }, require(name) {
    if (name === './supabase') return { supabase };
    throw new Error(`Unexpected import: ${name}`);
  } });
  return exports;
}

for (const [fn, table, label] of [
  ['deleteDepartment', 'org_departments', 'Bölüm'],
  ['deleteArea', 'org_areas', 'Alan'],
  ['deleteProject', 'org_projects', 'Proje'],
]) {
  test(`${fn} deletes exactly one parent and confirms the affected row`, async () => {
    const calls = [];
    let result = { data: { id: 'parent-1' }, error: null };
    const supabase = { from(name) {
      const call = { table: name }; calls.push(call);
      const q = { delete() { call.action = 'delete'; return q; }, eq(k, v) { call.filter = [k, v]; return q; },
        select(field) { call.select = field; return q; }, maybeSingle() { return Promise.resolve(result); } };
      return q;
    } };
    const service = loadService(supabase);
    await service[fn]('parent-1');
    assert.equal(calls.length, 1, 'no child rows are deleted in a separate request');
    assert.deepEqual(calls[0], { table, action: 'delete', filter: ['id', 'parent-1'], select: 'id' });
    result = { data: null, error: null };
    await assert.rejects(service[fn]('parent-1'), new RegExp(`${label} silinemedi veya bulunamadı`));
    result = { data: null, error: { message: 'permission denied' } };
    await assert.rejects(service[fn]('parent-1'), /permission denied/);
    result = { data: null, error: { message: 'connection failed' } };
    await assert.rejects(service[fn]('parent-1'), /connection failed/);
  });
}

test('a failed parent deletion retains child records; a successful deletion cascades atomically', async (t) => {
  const { PGlite } = await import('@electric-sql/pglite');
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`
    CREATE TABLE org_areas (id integer PRIMARY KEY);
    CREATE TABLE org_area_members (area_id integer REFERENCES org_areas(id) ON DELETE CASCADE);
    CREATE TABLE org_projects (id integer PRIMARY KEY, area_id integer REFERENCES org_areas(id) ON DELETE CASCADE);
    CREATE TABLE org_project_members (project_id integer REFERENCES org_projects(id) ON DELETE CASCADE);
    INSERT INTO org_areas VALUES (1);
    INSERT INTO org_area_members VALUES (1);
    INSERT INTO org_projects VALUES (2, 1);
    INSERT INTO org_project_members VALUES (2);
    CREATE FUNCTION block_area_delete() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'blocked'; END $$;
    CREATE TRIGGER block_area BEFORE DELETE ON org_areas FOR EACH ROW EXECUTE FUNCTION block_area_delete();
  `);
  await assert.rejects(db.query('DELETE FROM org_areas WHERE id = 1'), /blocked/);
  for (const table of ['org_areas', 'org_area_members', 'org_projects', 'org_project_members']) {
    assert.equal((await db.query(`SELECT count(*)::integer AS n FROM ${table}`)).rows[0].n, 1, table);
  }
  await db.exec('DROP TRIGGER block_area ON org_areas');
  await db.query('DELETE FROM org_areas WHERE id = 1');
  for (const table of ['org_areas', 'org_area_members', 'org_projects', 'org_project_members']) {
    assert.equal((await db.query(`SELECT count(*)::integer AS n FROM ${table}`)).rows[0].n, 0, table);
  }
});
