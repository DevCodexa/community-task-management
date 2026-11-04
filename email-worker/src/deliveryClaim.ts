import { randomUUID } from 'node:crypto';
import { getSupabaseClient } from './supabaseClient';

type QueueTable = 'email_queue' | 'speaker_email_queue';

// No expiry: a crash or a lost response can mean the provider accepted the
// message. Releasing that claim automatically would risk sending it twice.
export async function claimDelivery(table: QueueTable, id: number | string): Promise<string | null> {
  const token = randomUUID();
  const { data, error } = await getSupabaseClient().from(table)
    .update({ delivery_claim_token: token, delivery_claimed_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'pending')
    .is('delivery_claim_token', null)
    .select('id')
    .maybeSingle();
  if (error) throw new Error(`Unable to claim ${table} item ${id}: ${error.message}`);
  return data ? token : null;
}
