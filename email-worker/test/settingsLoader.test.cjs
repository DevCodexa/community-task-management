const test = require('node:test');
const assert = require('node:assert/strict');
const clientModule = require('../dist/supabaseClient.js');
const { loadEmailSettings } = require('../dist/settingsLoader.js');

function setup(t, { envKey, strict, dbKey = 'synthetic-db-key' } = {}) {
  const oldKey = process.env.BREVO_API_KEY;
  const oldStrict = process.env.BREVO_REQUIRE_ENV_KEY;
  if (envKey === undefined) delete process.env.BREVO_API_KEY; else process.env.BREVO_API_KEY = envKey;
  if (strict === undefined) delete process.env.BREVO_REQUIRE_ENV_KEY; else process.env.BREVO_REQUIRE_ENV_KEY = strict;
  t.after(() => {
    if (oldKey === undefined) delete process.env.BREVO_API_KEY; else process.env.BREVO_API_KEY = oldKey;
    if (oldStrict === undefined) delete process.env.BREVO_REQUIRE_ENV_KEY; else process.env.BREVO_REQUIRE_ENV_KEY = oldStrict;
  });
  const rows = [
    { setting_key: 'brevo_api_key', setting_value: dbKey }, { setting_key: 'sender_email', setting_value: 'sender@example.invalid' },
    { setting_key: 'sender_name', setting_value: 'Test' }, { setting_key: 'daily_limit', setting_value: '10' },
    { setting_key: 'retry_limit', setting_value: '3' }, { setting_key: 'enabled', setting_value: 'false' },
  ];
  const calls = [];
  const query = { select(columns) { calls.push({ columns }); return query; }, in(column, keys) {
    calls.push({ column, keys }); return Promise.resolve({ data: rows.filter((r) => keys.includes(r.setting_key)), error: null });
  } };
  t.mock.method(clientModule, 'getSupabaseClient', () => ({ from(table) { calls.push({ table }); return query; } }));
  return calls;
}

test('environment key takes precedence and the database secret row is not requested', async (t) => {
  const calls = setup(t, { envKey: 'synthetic-env-key', strict: 'true' });
  const settings = await loadEmailSettings();
  assert.equal(settings.brevo_api_key, 'synthetic-env-key');
  assert.equal(settings.enabled, false);
  const filter = calls.find((call) => call.column === 'setting_key');
  assert.ok(filter); assert.equal(filter.keys.includes('brevo_api_key'), false);
  assert.ok(filter.keys.includes('sender_email'));
});

test('legacy fallback remains available when strict mode is disabled', async (t) => {
  const calls = setup(t);
  const settings = await loadEmailSettings();
  assert.equal(settings.brevo_api_key, 'synthetic-db-key');
  assert.ok(calls.find((call) => call.column === 'setting_key').keys.includes('brevo_api_key'));
});

test('strict mode rejects missing or whitespace environment keys before any database request', async (t) => {
  const calls = setup(t, { envKey: '  ', strict: 'true' });
  await assert.rejects(loadEmailSettings(), /BREVO_API_KEY is required/);
  assert.equal(calls.length, 0);
});

test('missing legacy key and invalid strict configuration fail without revealing values', async (t) => {
  setup(t, { dbKey: ' ' });
  await assert.rejects(loadEmailSettings(), /Missing required Brevo API key/);
  process.env.BREVO_REQUIRE_ENV_KEY = 'synthetic-secret';
  await assert.rejects(loadEmailSettings(), (error) => /Invalid BREVO_REQUIRE_ENV_KEY/.test(error.message) && !error.message.includes('synthetic-secret'));
});
