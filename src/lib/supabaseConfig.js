const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

function decodeJwtRole(key) {
  const parts = key.split('.');
  if (parts.length !== 3) return null;

  try {
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payload.padEnd(Math.ceil(payload.length / 4) * 4, '=');
    return JSON.parse(atob(padded)).role ?? null;
  } catch {
    return null;
  }
}

export function getRequiredSupabaseConfig(urlInput, anonKeyInput) {
  const url = isNonEmptyString(urlInput) ? urlInput.trim() : '';
  const anonKey = isNonEmptyString(anonKeyInput) ? anonKeyInput.trim() : '';

  if (!url) {
    throw new Error('[Supabase] VITE_SUPABASE_URL is required. Configure it in .env.local or the deployment environment.');
  }

  if (!anonKey) {
    throw new Error('[Supabase] VITE_SUPABASE_ANON_KEY is required. Configure it in .env.local or the deployment environment.');
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error('[Supabase] VITE_SUPABASE_URL must be a valid absolute URL.');
  }

  const isLoopback =
    parsedUrl.hostname === 'localhost' ||
    parsedUrl.hostname === '127.0.0.1' ||
    parsedUrl.hostname === '[::1]';
  if (parsedUrl.protocol !== 'https:' && !(parsedUrl.protocol === 'http:' && isLoopback)) {
    throw new Error('[Supabase] Use HTTPS for remote projects. HTTP is allowed only for local development.');
  }

  if (anonKey.startsWith('sb_secret_') || decodeJwtRole(anonKey) === 'service_role') {
    throw new Error('[Supabase] A secret/service-role key cannot be used in browser code. Use a publishable/anon key only.');
  }

  return {
    url: parsedUrl.toString().replace(/\/+$/, ''),
    anonKey,
  };
}
