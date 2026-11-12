import { createClient } from '@supabase/supabase-js';
import { getRequiredSupabaseConfig } from './supabaseConfig.js';

const { url: supabaseUrl, anonKey: supabaseAnonKey } = getRequiredSupabaseConfig(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
