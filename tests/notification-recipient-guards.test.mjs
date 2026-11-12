import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

function loadService(supabase) {
  const source = readFileSync(new URL('../src/lib/supabaseNotifications.ts', import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  runInNewContext(code, { exports, Date, Error, console: { error() {} }, require(name) {
    if (name === './supabase') return { supabase };
    if (name === '../types/notification') return { NOTIFICATION_DEFAULTS: {} };
    throw new Error(`Unexpected import: ${name}`);
  } });
  return exports;
}

for (const [method, args, expectedType] of [
  ['markAllAsRead', [], 'update'], ['markNotificationsAsReadByType', ['birthday'], 'update'],
  ['clearReadNotifications', [], 'delete'], ['clearAllNotifications', [], 'delete'],
]) {
  test(`${method} refuses missing recipients and scopes every request`, async () => {
    const calls = []; let response = { error: null, count: 3 };
    const supabase = { from(table) {
      const call = { table, filters: [] }; calls.push(call);
      const q = { update(values, options) { call.action = 'update'; call.options = options; return q; },
        delete(options) { call.action = 'delete'; call.options = options; return q; },
        eq(key, value) { call.filters.push([key, value]); return q; },
        then(resolve, reject) { return Promise.resolve(response).then(resolve, reject); } };
      return q;
    } };
    const service = loadService(supabase);
    for (const value of [undefined, '', '   ']) {
      await assert.rejects(service[method](...args, value), /kullanıcı kimliği gerekli/);
    }
    assert.equal(calls.length, 0, 'no request is constructed without an explicit recipient');
    assert.equal(await service[method](...args, ' user-1 '), 3);
    assert.equal(calls[0].table, 'notifications');
    assert.equal(calls[0].action, expectedType);
    assert.equal(calls[0].options.count, 'exact');
    assert.ok(calls[0].filters.some(([key, value]) => key === 'user_id' && value === 'user-1'));
    response = { error: { message: 'permission denied' }, count: null };
    await assert.rejects(service[method](...args, 'user-1'), /permission denied/);
  });
}
