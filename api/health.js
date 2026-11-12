import { getRequiredSupabaseConfig } from '../src/lib/supabaseConfig.js';

// Never forward a privileged key, even if one was mistakenly put in a public variable.
function isPublicKey(key) {
  if (key.startsWith('sb_publishable_')) return true;
  try {
    const parts = key.split('.');
    if (parts.length !== 3) return false;
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(payload)).role === 'anon';
  } catch {
    return false;
  }
}

// Only fixed endpoints are called. No input from the request is forwarded.
async function probe(fetchImpl, origin, key, path, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(new URL(path, origin), {
      method: 'GET',
      headers: { apikey: key },
      redirect: 'manual',
      signal: controller.signal,
    });
    // Only status is needed. Never log or return provider response bodies.
    if (response.body) void response.body.cancel().catch(() => {});
    return response.ok ? 'reachable' : 'unavailable';
  } catch {
    return 'unavailable';
  } finally {
    clearTimeout(timer);
  }
}

// Injection is used by the isolated tests; Vercel invokes the default handler.
export function createHealthHandler({ fetchImpl = globalThis.fetch, env = process.env, logger = console, timeoutMs = 3000 } = {}) {
  return async function health(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.setHeader('Allow', 'GET, HEAD');
      res.statusCode = 405;
      res.end(JSON.stringify({ status: 'method_not_allowed' }));
      return;
    }

    const checks = {
      server: 'reachable',
      supabase_auth: 'not_configured',
      supabase_data_api: 'not_checked',
      database: 'not_checked',
      email_worker: 'not_checked',
    };

    try {
      const { url, anonKey } = getRequiredSupabaseConfig(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
      if (!isPublicKey(anonKey)) throw new Error('Not a public key');
      const parsed = new URL(url);
      if (parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== '/') {
        throw new Error('Invalid project URL');
      }
      checks.supabase_auth = await probe(fetchImpl, parsed.origin, anonKey, '/auth/v1/health', timeoutMs);
    } catch {
      // Configuration errors can contain credentials or addresses; do not print them.
      logger.error('[health] configuration unavailable');
    }

    const available = checks.supabase_auth === 'reachable';
    if (!available) logger.error('[health] upstream check failed');
    res.statusCode = available ? 200 : 503;
    res.end(req.method === 'HEAD' ? undefined : JSON.stringify({
      status: available ? 'available' : 'degraded',
      checks,
    }));
  };
}

export default createHealthHandler();
