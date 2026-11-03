export interface RequiredSupabaseConfig {
  url: string;
  anonKey: string;
}

/**
 * Validates browser-safe Supabase configuration without applying a production fallback.
 * Rejects missing values, malformed/non-HTTPS remote URLs, and service-role secrets.
 */
export function getRequiredSupabaseConfig(
  urlInput: unknown,
  anonKeyInput: unknown
): RequiredSupabaseConfig;
