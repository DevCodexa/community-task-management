import { pathToFileURL } from 'node:url';

// Explicitly operator-supplied origin only; never print it or server response bodies.
export async function runHealthSmoke(target, fetchImpl = fetch) {
  let origin;
  try {
    const url = new URL(target);
    if ((url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) ||
        url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error();
    origin = url.origin;
  } catch {
    throw new Error('invalid_target');
  }
  async function get(path) {
    try {
      return await fetchImpl(new URL(path, origin), { method: 'GET', redirect: 'manual', signal: AbortSignal.timeout(5000) });
    } catch {
      throw new Error('request_failed');
    }
  }
  const home = await get('/');
  if (!home.ok || !/^text\/html(?:\s*;|$)/i.test(home.headers.get('content-type') || '')) {
    throw new Error('homepage_failed');
  }
  if (home.body) void home.body.cancel().catch(() => {});
  const health = await get('/api/health');
  if (!health.ok || !/^application\/json(?:\s*;|$)/i.test(health.headers.get('content-type') || '')) {
    throw new Error('health_endpoint_failed');
  }
  let result;
  try { result = await health.json(); } catch { throw new Error('health_response_invalid'); }
  if (result?.status !== 'available' || result?.checks?.server !== 'reachable' ||
      result?.checks?.supabase_auth !== 'reachable' || result?.checks?.supabase_data_api !== 'not_checked' ||
      result?.checks?.database !== 'not_checked' || result?.checks?.email_worker !== 'not_checked') {
    throw new Error('health_response_invalid');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await runHealthSmoke(process.env.HEALTH_SMOKE_URL);
    console.log('Homepage and health endpoint reachable; Data API, database, and email worker were not checked.');
  } catch (error) {
    // Only errors created above are emitted; provider errors and URLs remain private.
    const messages = new Set(['invalid_target', 'request_failed', 'homepage_failed', 'health_endpoint_failed', 'health_response_invalid']);
    console.error(`Health smoke failed: ${messages.has(error?.message) ? error.message : 'unexpected_error'}`);
    process.exitCode = 1;
  }
}
