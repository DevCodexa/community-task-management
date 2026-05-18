import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { Database } from './types_db';

let client: SupabaseClient<Database> | null = null;


function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

export function getSupabaseClient(): SupabaseClient<Database> {
  if (client) return client;

  const url = requireEnv('SUPABASE_URL');
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');

  client = createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false },
    global: { headers: { 'X-Client-Info': 'email-worker' } }
  });

  return client;
}

