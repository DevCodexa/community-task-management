import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

function setup(response) {
  const calls = [];
  const supabase = {
    from(table) {
      const call = { table, filters: [] };
      calls.push(call);
      const query = {
        insert(data) { call.operation = 'insert'; call.data = data; return query; },
        update(data) { call.operation = 'update'; call.data = data; return query; },
        delete() { call.operation = 'delete'; return query; },
        eq(column, value) { call.filters.push([column, value]); return query; },
        select(columns) { call.selected = columns; return query; },
        single() { return Promise.resolve(response); },
        maybeSingle() { return Promise.resolve(response); },
      };
      return query;
    },
  };
  const source = readFileSync(new URL('../src/lib/supabaseTasks.ts', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const exports = {};
  runInNewContext(compiled, {
    exports,
    require: (name) => {
      if (name === './supabase') return { supabase };
      if (name === './supabaseSpeakers') return {};
      throw new Error(`Unexpected import: ${name}`);
    },
    console: { error() {}, log() {} },
    Date,
  });
  return { service: exports, calls };
}

test('creating an assigned active task is a single database operation', async () => {
  const saved = { id: 'task-1', assignee_id: 'member-1', status: 'started' };
  const { service, calls } = setup({ data: saved, error: null });
  assert.deepEqual(await service.createTask({ title: 'Görev', assignee_id: 'member-1', status: 'started', points: 1 }), saved);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].table, 'tasks');
  assert.equal(calls[0].operation, 'insert');
});

test('status and assignee changes are applied in one update', async () => {
  const saved = { id: 'task-1', assignee_id: 'member-2', status: 'in_progress' };
  const { service, calls } = setup({ data: saved, error: null });
  assert.deepEqual(await service.updateTask('task-1', { assignee_id: 'member-2', status: 'in_progress' }), saved);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].operation, 'update');
  assert.equal(JSON.stringify(calls[0].filters), JSON.stringify([['id', 'task-1']]));
});

test('deleting a task checks that the database returned the deleted row', async () => {
  const { service, calls } = setup({ data: { id: 'task-1' }, error: null });
  await service.deleteTask('task-1');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].operation, 'delete');
  assert.equal(calls[0].selected, 'id');
  assert.equal(JSON.stringify(calls[0].filters), JSON.stringify([['id', 'task-1']]));
});

test('a missing or inaccessible task is not reported as deleted', async () => {
  const { service } = setup({ data: null, error: null });
  await assert.rejects(service.deleteTask('task-1'), /silinemedi veya bulunamadı/);
});

test('database errors are reported without any separate counter changes', async () => {
  for (const operation of ['create', 'update', 'delete']) {
    const { service, calls } = setup({ data: null, error: { message: 'Veritabanı hatası' } });
    const action = operation === 'create' ? service.createTask({ title: 'Görev', status: 'started', assignee_id: 'member-1' })
      : operation === 'update' ? service.updateTask('task-1', { status: 'done' })
      : service.deleteTask('task-1');
    await assert.rejects(action, /Veritabanı hatası/);
    assert.equal(calls.length, 1);
  }
});
