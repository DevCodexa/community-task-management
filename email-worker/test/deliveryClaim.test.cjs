const test = require('node:test');
const assert = require('node:assert/strict');
const clientModule = require('../dist/supabaseClient.js');
const settingsModule = require('../dist/settingsLoader.js');
const brevoModule = require('../dist/brevo.js');
const { processEmailQueue } = require('../dist/worker.js');
const { processGeneralEmailQueue } = require('../dist/generalQueueWorker.js');

function fixture(kind, { failSentUpdate = false, failLog = false, throwLog = false, providerError = false, missingTemplate = false } = {}) {
  const table = kind === 'general' ? 'email_queue' : 'speaker_email_queue';
  const row = kind === 'general'
    ? { id: 1, recipient_email: 'recipient@example.invalid', recipient_name: 'Ada', template_code: 'test', template_params: { name: 'Ada' }, attempt_count: 0, status: 'pending', delivery_claim_token: null }
    : { id: '11111111-1111-4111-8111-111111111111', speaker_id: 'speaker', email_type: 'test', retry_count: 0, status: 'pending', delivery_claim_token: null, speakers: { email: 'recipient@example.invalid', full_name: 'Ada' } };
  let sends = 0;
  const logs = [];
  const template = { template_code: 'test', subject: 'Hello', html_content: '<p>Hello</p>', brevo_template_id: null, is_active: true };
  class Query {
    constructor(name) { this.name = name; this.filters = []; this.action = 'select'; }
    select() { return this; }
    eq(k, v) { this.filters.push([k, v]); return this; }
    is(k, v) { this.filters.push([k, v]); return this; }
    in() { return this; }
    lt() { return this; }
    lte() { return this; }
    gte() { return this; }
    order() { return this; }
    limit() { return this; }
    update(values) { this.action = 'update'; this.values = values; return this; }
    insert(values) {
      if (throwLog) throw new Error('log connection lost');
      this.action = 'insert'; this.values = values; return this;
    }
    matches() { return this.filters.every(([k, v]) => row[k] === v); }
    execute(single = false) {
      if (this.name === 'email_templates') return { data: template, error: null };
      if (this.name === 'email_send_logs') {
        if (this.action === 'insert') {
          if (failLog) return { data: null, error: { message: 'log unavailable' } };
          logs.push(this.values);
          return { data: null, error: null };
        }
        return { data: [], count: 0, error: null };
      }
      if (this.name !== table) return { data: [], error: null };
      const matches = this.matches();
      if (this.action === 'update' && matches) {
        if (failSentUpdate && this.values.status === 'sent') return { data: null, error: { message: 'update unavailable' } };
        Object.assign(row, this.values);
      }
      return { data: single ? (matches ? { id: row.id } : null) : (matches ? [row] : []), error: null };
    }
    maybeSingle() {
      if (this.name === 'email_templates') return Promise.resolve({ data: missingTemplate ? null : template, error: null });
      return Promise.resolve(this.execute(true));
    }
    then(resolve, reject) { return Promise.resolve(this.execute()).then(resolve, reject); }
  }
  const client = { from: (name) => new Query(name), rpc: async () => ({ error: null }) };
  const settings = { enabled: true, daily_limit: 10, retry_limit: 3, sender_name: 'Test', sender_email: 'test@example.invalid', brevo_api_key: 'test' };
  return { row, logs, client, settings, get sends() { return sends; }, send: async (payload) => {
    sends++;
    assert.match(payload.headers.idempotencyKey, /^[0-9a-f-]{36}$/);
    await new Promise((resolve) => setTimeout(resolve, 10));
    if (providerError) throw new Error('connection lost');
    return { messageId: 'provider-1' };
  } };
}

for (const kind of ['general', 'speaker']) {
  const run = kind === 'general' ? processGeneralEmailQueue : processEmailQueue;
  for (const failure of ['none', 'log', 'log-throws', 'queue', 'provider']) {
    test(`${kind}: ${failure} outcome cannot trigger another automatic send`, async (t) => {
      const f = fixture(kind, { failLog: failure === 'log', throwLog: failure === 'log-throws', failSentUpdate: failure === 'queue', providerError: failure === 'provider' });
      t.mock.method(clientModule, 'getSupabaseClient', () => f.client);
      t.mock.method(settingsModule, 'loadEmailSettings', async () => f.settings);
      t.mock.method(brevoModule, 'sendEmail', f.send);
      await Promise.all([run(), run()]);
      await run();
      assert.equal(f.sends, 1);
      assert.ok(f.row.delivery_claim_token);
      assert.equal(f.row.status, ['queue', 'provider'].includes(failure) ? 'pending' : 'sent');
      if (failure === 'log') assert.equal(f.logs.length, 0);
    });
  }
  test(`${kind}: missing template follows bounded retries without sending`, async (t) => {
    const f = fixture(kind, { missingTemplate: true });
    t.mock.method(clientModule, 'getSupabaseClient', () => f.client);
    t.mock.method(settingsModule, 'loadEmailSettings', async () => f.settings);
    t.mock.method(brevoModule, 'sendEmail', f.send);
    for (let attempt = 0; attempt < 3; attempt++) await run();
    assert.equal(f.sends, 0);
    assert.equal(f.row.status, 'failed');
    assert.equal(kind === 'general' ? f.row.attempt_count : f.row.retry_count, 3);
    assert.equal(f.row.delivery_claim_token, null);
  });
}
