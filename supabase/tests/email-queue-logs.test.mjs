import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { PGlite } from '@electric-sql/pglite';

const require = createRequire(import.meta.url);
const clientModule = require('../../email-worker/dist/supabaseClient.js');
const settingsModule = require('../../email-worker/dist/settingsLoader.js');
const brevoModule = require('../../email-worker/dist/brevo.js');
const { processEmailQueue } = require('../../email-worker/dist/worker.js');
const { processGeneralEmailQueue } = require('../../email-worker/dist/generalQueueWorker.js');
const migration = await readFile(new URL('../migrations/20261026005000_support_general_and_speaker_email_queue_logs.sql', import.meta.url), 'utf8');
const speakerId = '11111111-1111-4111-8111-111111111111';
const unknownId = '22222222-2222-4222-8222-222222222222';

async function database() {
  const db = new PGlite();
  // This is the pre-migration shape relevant to queue references, not a full Supabase schema.
  await db.exec(`
    CREATE TABLE public.email_queue (id bigint PRIMARY KEY, status text DEFAULT 'pending', priority integer DEFAULT 0, created_at timestamptz DEFAULT now());
    CREATE TABLE public.speaker_email_queue (id uuid PRIMARY KEY);
    CREATE TABLE public.email_send_logs (
      id bigserial PRIMARY KEY,
      queue_id bigint NOT NULL REFERENCES public.email_queue(id) ON DELETE CASCADE,
      recipient_email text NOT NULL,
      template_code text NOT NULL,
      event_type text NOT NULL,
      event_data jsonb NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    INSERT INTO public.email_queue(id) VALUES (123);
    INSERT INTO public.speaker_email_queue(id) VALUES ('${speakerId}');
  `);
  await db.exec(migration);
  await db.exec(migration);
  return db;
}

function fixture(db, kind) {
  const table = kind === 'general' ? 'email_queue' : 'speaker_email_queue';
  const row = kind === 'general'
    ? { id: 123, recipient_email: 'recipient@example.invalid', recipient_name: 'Ada', template_code: 'example', template_params: {}, attempt_count: 0, status: 'pending', delivery_claim_token: null }
    : { id: speakerId, speaker_id: 'speaker', email_type: 'example', retry_count: 0, status: 'pending', delivery_claim_token: null, speakers: { email: 'recipient@example.invalid', full_name: 'Ada' } };
  const template = { template_code: 'example', subject: 'Hello', html_content: '<p>Hello</p>', brevo_template_id: null, is_active: true };
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
    insert(values) { this.action = 'insert'; this.values = values; return this; }
    async execute(single = false) {
      if (this.name === 'email_templates') return { data: template, error: null };
      if (this.name === 'email_send_logs') {
        if (this.action !== 'insert') return { data: [], count: 0, error: null };
        const values = Array.isArray(this.values) ? this.values : [this.values];
        try {
          for (const v of values) await db.query(
            'INSERT INTO public.email_send_logs(queue_id, speaker_queue_id, recipient_email, template_code, event_type, event_data) VALUES ($1, $2, $3, $4, $5, $6::jsonb)',
            [v.queue_id, v.speaker_queue_id, v.recipient_email, v.template_code, v.event_type, JSON.stringify(v.event_data)]
          );
          return { data: null, error: null };
        } catch (error) { return { data: null, error: { message: error.message } }; }
      }
      if (this.name !== table) return { data: [], error: null };
      const matches = this.filters.every(([k, v]) => row[k] === v);
      if (this.action === 'update' && matches) Object.assign(row, this.values);
      return { data: single ? (matches ? { id: row.id } : null) : (matches ? [row] : []), error: null };
    }
    maybeSingle() { return this.execute(true); }
    then(resolve, reject) { return this.execute().then(resolve, reject); }
  }
  return { row, client: { from: (name) => new Query(name), rpc: async () => ({ error: null }) } };
}

test('both worker delivery paths write correctly typed logs under actual migration constraints', async (t) => {
  const db = await database();
  t.after(() => db.close());
  let current;
  let sends = 0;
  t.mock.method(clientModule, 'getSupabaseClient', () => current.client);
  t.mock.method(settingsModule, 'loadEmailSettings', async () => ({
    enabled: true, daily_limit: 10, retry_limit: 3, sender_name: 'Test',
    sender_email: 'sender@example.invalid', brevo_api_key: 'synthetic'
  }));
  t.mock.method(brevoModule, 'sendEmail', async (payload) => {
    assert.match(payload.headers.idempotencyKey, /^[0-9a-f-]{36}$/);
    sends++;
    return { messageId: `test-message-${sends}` };
  });

  current = fixture(db, 'general');
  await processGeneralEmailQueue();
  assert.equal(current.row.status, 'sent');
  current = fixture(db, 'speaker');
  await processEmailQueue();
  assert.equal(current.row.status, 'sent');
  assert.equal(sends, 2);

  const { rows } = await db.query('SELECT queue_id, speaker_queue_id, event_type, event_data FROM public.email_send_logs ORDER BY id');
  assert.equal(rows.length, 2);
  assert.equal(String(rows[0].queue_id), '123');
  assert.equal(rows[0].speaker_queue_id, null);
  assert.equal(rows[0].event_type, 'sent');
  assert.equal(rows[0].event_data.messageId, 'test-message-1');
  assert.equal(rows[1].queue_id, null);
  assert.equal(rows[1].speaker_queue_id, speakerId);
  assert.equal(rows[1].event_type, 'sent');
  assert.equal(rows[1].event_data.messageId, 'test-message-2');
});

test('foreign keys and exactly-one reference check reject incorrect queue links', async (t) => {
  const db = await database();
  t.after(() => db.close());
  const insert = (queue, speaker) => db.query(
    `INSERT INTO public.email_send_logs (queue_id, speaker_queue_id, recipient_email, template_code, event_type, event_data)
     VALUES ($1, $2, 'recipient@example.invalid', 'example', 'sent', '{}'::jsonb)`, [queue, speaker]
  );
  await assert.rejects(insert(null, null), (error) => error.code === '23514');
  await assert.rejects(insert(123, speakerId), (error) => error.code === '23514');
  await assert.rejects(insert(999, null), (error) => error.code === '23503');
  await assert.rejects(insert(null, unknownId), (error) => error.code === '23503');
  await insert(123, null);
  await insert(null, speakerId);
});
