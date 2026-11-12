import assert from 'node:assert/strict';
import test from 'node:test';
import { getRequiredSupabaseConfig } from '../src/lib/supabaseConfig.js';

test('requires an explicit Supabase URL and never supplies a production fallback', () => {
  assert.throws(
    () => getRequiredSupabaseConfig(undefined, 'public-anon-key'),
    /VITE_SUPABASE_URL is required/
  );
  assert.throws(
    () => getRequiredSupabaseConfig('https://example.supabase.co', ''),
    /VITE_SUPABASE_ANON_KEY is required/
  );
});

test('rejects malformed URLs and insecure remote URLs', () => {
  assert.throws(
    () => getRequiredSupabaseConfig('not-a-url', 'public-anon-key'),
    /valid absolute URL/
  );
  assert.throws(
    () => getRequiredSupabaseConfig('http://example.supabase.co', 'public-anon-key'),
    /Use HTTPS for remote projects/
  );
});

test('allows HTTPS projects and local HTTP Supabase development', () => {
  assert.deepEqual(
    getRequiredSupabaseConfig(' https://example.supabase.co/ ', ' public-anon-key '),
    { url: 'https://example.supabase.co', anonKey: 'public-anon-key' }
  );
  assert.deepEqual(
    getRequiredSupabaseConfig('http://127.0.0.1:54321', 'local-anon-key'),
    { url: 'http://127.0.0.1:54321', anonKey: 'local-anon-key' }
  );
});

test('rejects secret/powerful service-role keys before they can be bundled', () => {
  const legacyServiceRoleJwt = 'eyJhbGciOiJub25lIn0.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.signature';
  assert.throws(
    () => getRequiredSupabaseConfig('https://example.supabase.co', 'sb_secret_example'),
    /secret\/service-role key/
  );
  assert.throws(
    () => getRequiredSupabaseConfig('https://example.supabase.co', legacyServiceRoleJwt),
    /secret\/service-role key/
  );
});

test('rejects unsupported input types', () => {
  assert.throws(
    () => getRequiredSupabaseConfig({ url: 'https://example.supabase.co' }, 'key'),
    /VITE_SUPABASE_URL is required/
  );
});
