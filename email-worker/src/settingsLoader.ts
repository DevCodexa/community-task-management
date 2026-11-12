import type { EmailSettings } from './types';
import { getSupabaseClient } from './supabaseClient';

type SettingKey =
  | 'brevo_api_key'
  | 'sender_email'
  | 'sender_name'
  | 'daily_limit'
  | 'retry_limit'
  | 'enabled';

const NON_SECRET_KEYS: SettingKey[] = [
  'sender_email',
  'sender_name',
  'daily_limit',
  'retry_limit',
  'enabled'
];

function parseBoolean(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  throw new Error(`Invalid boolean value: ${value}`);
}

export async function loadEmailSettings(): Promise<EmailSettings> {
  const envKey = process.env.BREVO_API_KEY?.trim() || '';
  const requireEnv = (process.env.BREVO_REQUIRE_ENV_KEY || 'false').trim().toLowerCase();
  if (requireEnv !== 'true' && requireEnv !== 'false') {
    throw new Error('Invalid BREVO_REQUIRE_ENV_KEY: use true or false');
  }
  if (requireEnv === 'true' && !envKey) {
    throw new Error('BREVO_API_KEY is required by BREVO_REQUIRE_ENV_KEY');
  }
  const supabase = getSupabaseClient();
  // If a secret is available in the environment, never request its database
  // row. The temporary legacy fallback supports other deployments during rollout.
  const selectedKeys: SettingKey[] = envKey ? NON_SECRET_KEYS : [...NON_SECRET_KEYS, 'brevo_api_key'];
  const { data, error } = await supabase
    .from('email_settings')
    .select('setting_key, setting_value')
    .in('setting_key', selectedKeys);

  if (error) throw new Error(error.message);
  if (!data) throw new Error('email_settings data is null');

  const map = new Map<string, string>();
  for (const row of data as unknown as Array<{ setting_key?: unknown; setting_value?: unknown }>) {
    const settingValue = row.setting_value;
    const settingKey = row.setting_key;
    if (settingValue == null || settingKey == null) continue;
    if (envKey && settingKey === 'brevo_api_key') continue;
    map.set(String(settingKey), String(settingValue));
  }

  for (const key of NON_SECRET_KEYS) {
    if (!map.has(key)) throw new Error(`Missing required email setting: ${key}`);
  }
  const providerKey = envKey || map.get('brevo_api_key')?.trim() || '';
  if (!providerKey) throw new Error('Missing required Brevo API key');

  const dailyLimit = Number(map.get('daily_limit'));
  const retryLimit = Number(map.get('retry_limit'));
  if (!Number.isFinite(dailyLimit)) throw new Error('Invalid daily_limit');
  if (!Number.isFinite(retryLimit)) throw new Error('Invalid retry_limit');

  const enabled = parseBoolean(map.get('enabled') as string);

  return {
    brevo_api_key: providerKey,
    sender_email: map.get('sender_email') as string,
    sender_name: map.get('sender_name') as string,
    daily_limit: dailyLimit,
    retry_limit: retryLimit,
    enabled
  };
}

