const test = require('node:test');
const assert = require('node:assert/strict');
const clientModule = require('../dist/supabaseClient.js');
const settingsModule = require('../dist/settingsLoader.js');
const brevoModule = require('../dist/brevo.js');
const { processGeneralEmailQueue } = require('../dist/generalQueueWorker.js');

function fixture(params, code = 'welcome_member') {
  const row = { id: 1, recipient_email: 'test@example.invalid', recipient_name: 'Ada', template_code: code, template_params: params, attempt_count: 0, status: 'pending', delivery_claim_token: null };
  const template = { template_code: 'welcome_member', subject: 'Welcome {{member_name}}', html_content: '<p>{{member_name}} joined {{join_date}}</p>', brevo_template_id: null, is_active: true };
  const sends = [];
  class Query {
    constructor(table) { this.table = table; this.filters = []; this.action = 'select'; }
    select() { return this; } eq(k, v) { this.filters.push([k, v]); return this; } is(k, v) { this.filters.push([k, v]); return this; }
    in() { return this; } lt() { return this; } lte() { return this; } gte() { return this; } order() { return this; } limit() { return this; }
    update(values) { this.action = 'update'; this.values = values; return this; }
    insert() { return Promise.resolve({ error: null }); }
    execute(single = false) {
      if (this.table === 'email_templates') return { data: code === 'welcome_member' ? template : null, error: null };
      if (this.table === 'email_send_logs') return { count: 0, data: [], error: null };
      if (this.table !== 'email_queue') throw new Error('Unexpected table');
      const matches = this.filters.every(([key, value]) => row[key] === value);
      if (matches && this.action === 'update') Object.assign(row, this.values);
      return { data: single ? (matches ? { id: row.id } : null) : (matches ? [row] : []), error: null };
    }
    maybeSingle() { return Promise.resolve(this.execute(true)); }
    then(resolve, reject) { return Promise.resolve(this.execute()).then(resolve, reject); }
  }
  return { row, sends, client: { from: (table) => new Query(table), rpc: async () => ({ error: null }) } };
}
async function run(t, f) {
  t.mock.method(clientModule, 'getSupabaseClient', () => f.client);
  t.mock.method(settingsModule, 'loadEmailSettings', async () => ({ enabled: true, daily_limit: 10, retry_limit: 3, sender_name: 'Test', sender_email: 'test@example.invalid', brevo_api_key: 'fake' }));
  t.mock.method(brevoModule, 'sendEmail', async (payload) => { f.sends.push(payload); return { messageId: 'message-1' }; });
  await processGeneralEmailQueue();
}

test('welcome_member template receives the general enqueue fields before delivery', async (t) => {
  const f = fixture({ member_name: 'Ada <Admin>', join_date: '2026-11-11' }); await run(t, f);
  assert.equal(f.sends.length, 1); assert.match(f.sends[0].htmlContent, /Ada &lt;Admin&gt; joined 2026-11-11/);
  assert.equal(f.row.status, 'sent');
});

test('general queue refuses missing template fields before delivery or claim', async (t) => {
  const f = fixture({ member_name: 'Ada' }); await run(t, f);
  assert.equal(f.sends.length, 0); assert.equal(f.row.delivery_claim_token, null);
  assert.match(f.row.error_message, /Missing required template parameters: join_date/);
});

test('unknown general template code is reported without sending', async (t) => {
  const f = fixture({}, 'unknown'); await run(t, f);
  assert.equal(f.sends.length, 0); assert.match(f.row.error_message, /Active template not found: unknown/);
});
