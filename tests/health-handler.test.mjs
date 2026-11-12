import test from 'node:test';
import assert from 'node:assert/strict';
import { createHealthHandler } from '../api/health.js';

function response() {
  return {
    headers: {},
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
    end(body) { this.body = body; },
  };
}

const validEnv = { VITE_SUPABASE_URL: 'https://test.invalid', VITE_SUPABASE_ANON_KEY: 'sb_publishable_test' };
const silent = { error() {} };
const ok = () => ({ ok: true, body: null });

test('reports only probe reachability and marks unchecked services explicitly', async () => {
  const calls = [];
  const handler = createHealthHandler({ env: validEnv, logger: silent, fetchImpl: async (url, options) => {
    calls.push({ url: url.toString(), options });
    return ok();
  } });
  const res = response();
  await handler({ method: 'GET', headers: { authorization: 'untrusted-client-token' } }, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(JSON.parse(res.body), {
    status: 'available',
    checks: {
      server: 'reachable', supabase_auth: 'reachable', supabase_data_api: 'not_checked',
      database: 'not_checked', email_worker: 'not_checked',
    },
  });
  assert.deepEqual(calls.map((call) => call.url), [
    'https://test.invalid/auth/v1/health',
  ]);
  for (const { options } of calls) {
    assert.deepEqual(options.headers, { apikey: 'sb_publishable_test' });
    assert.equal(options.redirect, 'manual');
  }
  assert.equal(res.headers['cache-control'], 'no-store');
  assert.doesNotMatch(res.body, /test\.invalid|sb_publishable|untrusted-client-token/);
});

test('an absent or privileged key is rejected without exposing config or calling upstream', async () => {
  const serviceJwt = `x.${Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url')}.x`;
  const adminJwt = `x.${Buffer.from(JSON.stringify({ role: 'supabase_admin' })).toString('base64url')}.x`;
  for (const key of ['', 'sb_secret_sensitive', serviceJwt, adminJwt, 'unknown_key']) {
    let called = false;
    const logs = [];
    const handler = createHealthHandler({
      env: { VITE_SUPABASE_URL: 'https://test.invalid', VITE_SUPABASE_ANON_KEY: key },
      logger: { error: (...args) => logs.push(args) },
      fetchImpl: async () => { called = true; return ok(); },
    });
    const res = response();
    await handler({ method: 'GET' }, res);
    assert.equal(res.statusCode, 503);
    assert.equal(called, false);
    assert.equal(JSON.parse(res.body).checks.database, 'not_checked');
    assert.doesNotMatch(JSON.stringify({ body: res.body, logs }), /sb_secret_sensitive|service_role|test\.invalid/);
  }
});

test('accepts a legacy anon JWT', async () => {
  const anonJwt = `x.${Buffer.from(JSON.stringify({ role: 'anon' })).toString('base64url')}.x`;
  const handler = createHealthHandler({ env: { ...validEnv, VITE_SUPABASE_ANON_KEY: anonJwt }, logger: silent, fetchImpl: async () => ok() });
  const res = response();
  await handler({ method: 'GET' }, res);
  assert.equal(res.statusCode, 200);
});

test('upstream timeouts return sanitized degraded results', async () => {
  const logs = [];
  const handler = createHealthHandler({
    env: validEnv, timeoutMs: 10, logger: { error: (...args) => logs.push(args) },
    fetchImpl: async (url, options) => {
      return new Promise((_, reject) => options.signal.addEventListener('abort', () => reject(new Error('SECRET timeout')), { once: true }));
    },
  });
  const res = response();
  await handler({ method: 'GET' }, res);
  assert.equal(res.statusCode, 503);
  assert.deepEqual(JSON.parse(res.body).checks, {
    server: 'reachable', supabase_auth: 'unavailable', supabase_data_api: 'not_checked',
    database: 'not_checked', email_worker: 'not_checked',
  });
  assert.doesNotMatch(JSON.stringify({ body: res.body, logs }), /SECRET|credential|test\.invalid/);
});

test('provider exception details never reach the response or log', async () => {
  const logs = [];
  const handler = createHealthHandler({ env: validEnv, logger: { error: (...args) => logs.push(args) }, fetchImpl: async () => { throw new Error('SECRET provider response'); } });
  const res = response();
  await handler({ method: 'GET' }, res);
  assert.equal(res.statusCode, 503);
  assert.doesNotMatch(JSON.stringify({ logs, body: res.body }), /SECRET|provider response|test\.invalid/);
});

test('non-GET methods do not probe; HEAD does not emit a body', async () => {
  let called = 0;
  const handler = createHealthHandler({ env: validEnv, logger: silent, fetchImpl: async () => { called++; return ok(); } });
  const post = response();
  await handler({ method: 'POST' }, post);
  assert.equal(post.statusCode, 405);
  assert.equal(post.headers.allow, 'GET, HEAD');
  assert.equal(called, 0);
  const head = response();
  await handler({ method: 'HEAD' }, head);
  assert.equal(head.statusCode, 200);
  assert.equal(head.body, undefined);
  assert.equal(called, 1);
});

test('configured project URLs cannot include embedded credentials or redirect targets', async () => {
  for (const url of ['https://user:pass@test.invalid', 'https://test.invalid/?next=other', 'https://test.invalid/path']) {
    let called = false;
    const handler = createHealthHandler({ env: { ...validEnv, VITE_SUPABASE_URL: url }, logger: silent, fetchImpl: async () => { called = true; return ok(); } });
    const res = response();
    await handler({ method: 'GET' }, res);
    assert.equal(res.statusCode, 503);
    assert.equal(called, false);
  }
});
