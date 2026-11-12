const test = require('node:test');
const assert = require('node:assert/strict');
const clientModule = require('../dist/supabaseClient.js');
const settingsModule = require('../dist/settingsLoader.js');
const brevoModule = require('../dist/brevo.js');
const { processEmailQueue } = require('../dist/worker.js');
const { missingTemplateParams } = require('../dist/templateEngine.js');

function fixture({ type = 'welcome', subject = 'Hello {{speaker_name}}', html = '<p>{{speaker_name}} - {{speaker_title}} - {{speaker_company}}</p>', speaker = { email: 'test@example.invalid', full_name: 'Ada <Admin>', title: 'Engineer', company: 'Team' }, providerTemplateId = null, active = true } = {}) {
  const row = { id: '11111111-1111-4111-8111-111111111111', speaker_id: 'speaker', email_type: type, retry_count: 0, status: 'pending', delivery_claim_token: null, speakers: speaker };
  const logs = []; const lookups = []; const sends = [];
  class Query {
    constructor(table) { this.table = table; this.filters = []; this.action = 'select'; }
    select() { return this; } eq(k, v) { this.filters.push([k, v]); return this; } is(k, v) { this.filters.push([k, v]); return this; }
    lt() { return this; } lte() { return this; } gte() { return this; } order() { return this; } limit() { return this; }
    update(values) { this.action = 'update'; this.values = values; return this; }
    insert(values) { logs.push(...values); return Promise.resolve({ error: null }); }
    execute(single = false) {
      if (this.table === 'email_templates') {
        const code = this.filters.find(([key]) => key === 'template_code')?.[1]; lookups.push(code);
        return { data: code === 'speaker_invite' && active ? { template_code: code, subject, html_content: html, brevo_template_id: providerTemplateId, is_active: true } : null, error: null };
      }
      if (this.table === 'email_send_logs') return { data: null, count: 0, error: null };
      if (this.table !== 'speaker_email_queue') throw new Error('Unexpected table');
      const matches = this.filters.every(([key, value]) => row[key] === value);
      if (matches && this.action === 'update') Object.assign(row, this.values);
      return { data: single ? (matches ? { id: row.id } : null) : (matches ? [row] : []), error: null };
    }
    maybeSingle() { return Promise.resolve(this.execute(true)); }
    then(resolve, reject) { return Promise.resolve(this.execute()).then(resolve, reject); }
  }
  return { row, logs, lookups, sends, client: { from: (table) => new Query(table) }, settings: { enabled: true, daily_limit: 10, retry_limit: 3, sender_name: 'Test', sender_email: 'test@example.invalid', brevo_api_key: 'fake' } };
}
async function run(t, f) {
  t.mock.method(clientModule, 'getSupabaseClient', () => f.client);
  t.mock.method(settingsModule, 'loadEmailSettings', async () => f.settings);
  t.mock.method(brevoModule, 'sendEmail', async (payload) => { f.sends.push(payload); return { messageId: 'message-1' }; });
  await processEmailQueue();
}

test('legacy welcome jobs use speaker_invite and populate template fields', async (t) => {
  const f = fixture(); await run(t, f);
  assert.deepEqual(f.lookups, ['speaker_invite']); assert.equal(f.sends.length, 1);
  assert.equal(f.sends[0].subject, 'Hello Ada <Admin>'); assert.match(f.sends[0].htmlContent, /Ada &lt;Admin&gt; - Engineer - Team/);
  assert.equal(f.row.status, 'sent'); assert.equal(f.logs[0].template_code, 'speaker_invite');
});

test('canonical speaker invite handles absent optional title and company', async (t) => {
  const f = fixture({ type: 'speaker_invite', speaker: { email: 'test@example.invalid', full_name: 'Ada', title: null, company: null } }); await run(t, f);
  assert.match(f.sends[0].htmlContent, /Ada - Belirtilmemiş - Belirtilmemiş/);
});

test('missing speaker name prevents delivery', async (t) => {
  const f = fixture({ speaker: { email: 'test@example.invalid', full_name: null } }); await run(t, f);
  assert.equal(f.sends.length, 0); assert.match(f.row.error_message, /Missing required template parameters: speaker_name/);
});

test('missing speaker name is rejected even if a local template does not reference it', async (t) => {
  const f = fixture({ subject: 'Hello', html: '<p>Welcome</p>', speaker: { email: 'test@example.invalid', full_name: null } });
  await run(t, f);
  assert.equal(f.sends.length, 0);
  assert.match(f.row.error_message, /Missing required template parameters: speaker_name/);
});

for (const options of [{ type: 'unknown' }, { active: false }]) {
  test(`unknown or inactive template ${JSON.stringify(options)} never sends`, async (t) => {
    const f = fixture(options); await run(t, f);
    assert.equal(f.sends.length, 0); assert.match(f.row.error_message, /Template not found/);
  });
}

test('missing template parameters prevent claim and delivery', async (t) => {
  const f = fixture({ type: 'speaker_invite', html: '<p>{{unknown_parameter}}</p>' }); await run(t, f);
  assert.equal(f.sends.length, 0); assert.match(f.row.error_message, /Missing required template parameters: unknown_parameter/);
  assert.equal(f.row.delivery_claim_token, null);
});

test('provider template receives canonical parameter names', async (t) => {
  const f = fixture({ type: 'speaker_invite', providerTemplateId: 123 }); await run(t, f);
  assert.equal(f.sends[0].templateId, 123); assert.equal(f.sends[0].params.speaker_name, 'Ada <Admin>');
  assert.equal(f.sends[0].params.speaker_title, 'Engineer'); assert.equal(f.sends[0].params.speaker_company, 'Team');
});

test('required placeholders are checked once each', () => {
  assert.deepEqual(missingTemplateParams('{{a}} {{ a }} {{b}} {{c}}', { a: 'valid', b: '', c: '  ' }), ['b', 'c']);
});
