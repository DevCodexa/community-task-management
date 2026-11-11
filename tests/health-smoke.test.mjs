import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createHealthHandler } from '../api/health.js';
import { runHealthSmoke } from './health-smoke.mjs';

const healthy = { status: 'available', checks: { server: 'reachable', supabase_auth: 'reachable', supabase_data_api: 'not_checked', database: 'not_checked', email_worker: 'not_checked' } };
function response(type, json, ok = true) {
  return { ok, body: null, headers: { get: () => type }, json: async () => json };
}
const html = () => response('text/html; charset=utf-8');
const api = (value = healthy) => response('application/json; charset=utf-8', value);

test('smoke checks the homepage and actual JSON health route without redirects', async () => {
  const calls = [];
  await runHealthSmoke('https://example.invalid/', async (url, options) => {
    calls.push([url.toString(), options.redirect]);
    return url.pathname === '/' ? html() : api();
  });
  assert.deepEqual(calls, [['https://example.invalid/', 'manual'], ['https://example.invalid/api/health', 'manual']]);
});

test('SPA fallback masquerading as a health endpoint is rejected', async () => {
  await assert.rejects(runHealthSmoke('https://example.invalid', async () => html()), /health_endpoint_failed/);
});

test('degraded, malformed, or misleading health responses fail', async () => {
  for (const result of [response('application/json', {}, false), api({ status: 'degraded' }), api({ ...healthy, checks: { ...healthy.checks, database: 'healthy' } })]) {
    await assert.rejects(runHealthSmoke('https://example.invalid', async (url) => url.pathname === '/' ? html() : result), /health_/);
  }
});

test('credentials, paths and non-local insecure origins are rejected before any request', async () => {
  for (const target of ['https://user:pass@example.invalid', 'https://example.invalid/path', 'https://example.invalid/?secret=x', 'http://example.invalid', 'not a url']) {
    await assert.rejects(runHealthSmoke(target, async () => { throw new Error('unexpected request'); }), /invalid_target/);
  }
});

test('local HTTP may be used for isolated development checks', async () => {
  await runHealthSmoke('http://127.0.0.1:3000', async (url) => url.pathname === '/' ? html() : api());
});

test('network failure details are not propagated', async () => {
  await assert.rejects(runHealthSmoke('https://example.invalid', async () => { throw new Error('secret from provider'); }), { message: 'request_failed' });
});

test('smoke exercises the handler over HTTP with an isolated upstream', async () => {
  const handler = createHealthHandler({
    env: { VITE_SUPABASE_URL: 'https://test.invalid', VITE_SUPABASE_ANON_KEY: 'sb_publishable_test' },
    logger: { error() {} }, fetchImpl: async () => ({ ok: true, body: null }),
  });
  const server = createServer((req, res) => {
    if (req.url === '/api/health') return void handler(req, res);
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end('<html></html>');
  });
  await new Promise((resolve, reject) => server.listen(0, '127.0.0.1', resolve).on('error', reject));
  try {
    await runHealthSmoke(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
