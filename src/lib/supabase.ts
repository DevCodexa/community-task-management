import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://vbokappwelyrvoxnkigp.supabase.co'
const supabaseAnonKeyFromEnv = import.meta.env.VITE_SUPABASE_ANON_KEY

// Fail fast if env var missing/empty in runtime; otherwise Supabase requests will fail with:
// "No API key found in request".
if (!supabaseAnonKeyFromEnv || typeof supabaseAnonKeyFromEnv !== 'string' || supabaseAnonKeyFromEnv.trim().length === 0) {
  // Keep fallback to not break local dev immediately, but still warn loudly.
  console.warn('[Supabase] VITE_SUPABASE_ANON_KEY missing/empty. Falling back to default anon key. Set env correctly to avoid "No API key found in request".');
  
}
console.log(supabaseUrl, supabaseAnonKeyFromEnv);
const supabaseAnonKey = supabaseAnonKeyFromEnv || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZib2thcHB3ZWx5cnZveG5raWdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczMDk4NzYsImV4cCI6MjA5Mjg4NTg3Nn0.H1Rhc_d6aYqBVjrGg6Ze0PTDemL70KlvKvMzQdPqzYA'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
})

