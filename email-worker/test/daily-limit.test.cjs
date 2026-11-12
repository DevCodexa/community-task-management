const test = require('node:test');
const assert = require('node:assert/strict');
const clientModule = require('../dist/supabaseClient.js');
const settingsModule = require('../dist/settingsLoader.js');
const { processEmailQueue } = require('../dist/worker.js');

function fixture(count) {
  const calls = [];
  const client = { from(table) {
    calls.push(['from', table]);
    return {
      select(...args) { calls.push(['select', ...args]); return this; },
      eq(...args) { calls.push(['eq', ...args]); return this; },
      gte(...args) { calls.push(['gte', ...args]); return Promise.resolve({ count, data: [{ id: 1 }], error: null }); }
    };
  } };
  return { calls, client };
}

for (const [name, count, limit, shouldThrow] of [
  ['an exact count beyond the configured limit', 1001, 1000, false],
  ['an unavailable exact count', null, 1000, true],
]) {
  test(`speaker delivery fails closed for ${name}`, async (t) => {
    const f = fixture(count);
    t.mock.method(clientModule, 'getSupabaseClient', () => f.client);
    t.mock.method(settingsModule, 'loadEmailSettings', async () => ({ enabled: true, daily_limit: limit, retry_limit: 3 }));
    if (shouldThrow) await assert.rejects(processEmailQueue(), /Unable to determine daily sent count/);
    else await processEmailQueue();
    assert.deepEqual(f.calls.filter((call) => call[0] === 'from'), [['from', 'email_send_logs']]);
    assert.deepEqual(f.calls.find((call) => call[0] === 'select'), ['select', 'id', { count: 'exact', head: true }]);
  });
}
