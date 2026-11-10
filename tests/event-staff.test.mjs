import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

// Exercise the real service with a Supabase-shaped fake, without accessing a
// hosted database or requiring test credentials.
function setup(responses) {
  const calls = [];
  const supabase = {
    from(table) {
      const call = { table, filters: [], operation: 'select' };
      calls.push(call);
      const query = {
        select() { return query; },
        eq(column, value) { call.filters.push([column, value]); return query; },
        insert(values) { call.operation = 'insert'; call.values = values; return query; },
        single() { return Promise.resolve(responses.shift()); },
        maybeSingle() { return Promise.resolve(responses.shift()); },
      };
      return query;
    },
  };
  const source = readFileSync(new URL('../src/lib/supabaseEvents.ts', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const exports = {};
  runInNewContext(compiled, {
    exports,
    require: (name) => {
      if (name === './supabase') return { supabase };
      throw new Error(`Unexpected import: ${name}`);
    },
    console: { error() {}, warn() {} },
    Date,
  });
  return { service: exports, calls };
}

const success = (data) => ({ data, error: null });

test('a successful staff insert returns the saved assignment', async () => {
  const row = { id: 'staff-1', event_id: 'event-1', member_id: 'member-1' };
  const { service, calls } = setup([success({ id: 'event-1' }), success({ id: 'member-1' }), success(null), success(row)]);
  const result = await service.addStaffToEvent('event-1', 'member-1');
  assert.deepEqual(result, row);
  assert.equal(calls.length, 4);
  assert.equal(calls[3].table, 'event_staff');
  assert.equal(calls[3].operation, 'insert');
  assert.equal(JSON.stringify(calls[3].values), JSON.stringify([{ event_id: 'event-1', member_id: 'member-1' }]));
});

test('an existing assignment does not insert a duplicate', async () => {
  const { service, calls } = setup([success({ id: 'event-1' }), success({ id: 'member-1' }), success({ id: 'existing' })]);
  await assert.rejects(service.addStaffToEvent('event-1', 'member-1'), /zaten etkinlikte görevli/);
  assert.equal(calls.length, 3);
});

test('a failed duplicate check does not attempt an insert', async () => {
  const { service, calls } = setup([success({ id: 'event-1' }), success({ id: 'member-1' }), { data: null, error: { message: 'Erişim reddedildi' } }]);
  await assert.rejects(service.addStaffToEvent('event-1', 'member-1'), /Erişim reddedildi/);
  assert.equal(calls.length, 3);
});

test('a failed insert is reported to the caller', async () => {
  const { service } = setup([success({ id: 'event-1' }), success({ id: 'member-1' }), success(null), { data: null, error: { message: 'Kayıt başarısız' } }]);
  await assert.rejects(service.addStaffToEvent('event-1', 'member-1'), /Kayıt başarısız/);
});
