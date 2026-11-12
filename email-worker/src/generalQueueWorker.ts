import type { EmailSettings, EmailTemplate, BrevoSendPayload } from './types';
import { loadEmailSettings } from './settingsLoader';
import { getSupabaseClient } from './supabaseClient';
import { missingTemplateParams, normalizeTemplateParams, renderSubject, renderTemplate } from './templateEngine';
import { sendEmail } from './brevo';
import { claimDelivery } from './deliveryClaim';

type GeneralQueueItem = {
  id: number;
  recipient_email: string;
  recipient_name: string | null;
  template_code: string;
  template_params: Record<string, unknown> | null;
  attempt_count: number;
};

function log(message: string): void {
  console.log('[EmailWorker][general] ' + message);
}

async function getTemplate(code: string): Promise<EmailTemplate | null> {
  const { data, error } = await getSupabaseClient()
    .from('email_templates')
    .select('*')
    .eq('template_code', code)
    .eq('is_active', true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as EmailTemplate | null) ?? null;
}

async function insertLog(item: GeneralQueueItem, eventType: 'sent' | 'failed', eventData: Record<string, unknown>): Promise<void> {
  const { error } = await getSupabaseClient().from('email_send_logs').insert({
    queue_id: item.id,
    speaker_queue_id: null,
    recipient_email: item.recipient_email,
    template_code: item.template_code,
    event_type: eventType,
    event_data: eventData
  } as never);
  if (error) throw new Error(error.message);
}

async function updateQueue(id: number, values: Record<string, unknown>, claimToken?: string): Promise<void> {
  let query = getSupabaseClient().from('email_queue').update(values as never).eq('id', id).eq('status', 'pending');
  query = claimToken ? query.eq('delivery_claim_token', claimToken) : query.is('delivery_claim_token', null);
  const { data, error } = await query.select('id').maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error(`Queue item ${id} is no longer owned by this worker`);
}

function buildPayload(settings: EmailSettings, item: GeneralQueueItem, template: EmailTemplate, params: Record<string, string>): BrevoSendPayload {
  const subject = renderSubject(template.subject, params);
  const html = renderTemplate(template.html_content, params);
  const base: BrevoSendPayload = {
    sender: { name: settings.sender_name, email: settings.sender_email },
    to: [{ email: item.recipient_email, name: item.recipient_name ?? undefined }],
    subject,
    htmlContent: html
  };
  if (template.brevo_template_id != null) {
    return {
      sender: base.sender,
      to: base.to,
      subject: '',
      htmlContent: '',
      templateId: template.brevo_template_id,
      params
    };
  }
  return base;
}


async function reconcileBirthdayDeliveryMarkers(): Promise<void> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('email_queue')
    .select('id, template_code, template_params')
    .eq('status', 'sent')
    .in('template_code', ['birthday_personal', 'birthday_team'])
    .order('sent_at', { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);

  for (const row of (data ?? []) as unknown as Array<{id: number; template_code: string; template_params: Record<string, unknown> | null}>) {
    const params = row.template_params ?? {};
    const personId = typeof params.birthday_person_id === 'string' ? params.birthday_person_id : '';
    const year = Number(params.birthday_year);
    const channel = row.template_code === 'birthday_personal' ? 'personal' : 'team';
    if (!personId || !Number.isInteger(year)) continue;
    const { error: recordError } = await supabase.rpc('record_birthday_email_delivery', {
      p_queue_id: row.id,
      p_birthday_person_id: personId,
      p_notification_year: year,
      p_channel: channel
    });
    if (recordError) log('Could not reconcile birthday delivery marker for queue #' + row.id + '.');
  }
}

async function fetchPending(settings: EmailSettings, limit: number): Promise<GeneralQueueItem[]> {
  const { data, error } = await getSupabaseClient()
    .from('email_queue')
    .select('id, recipient_email, recipient_name, template_code, template_params, attempt_count')
    .eq('status', 'pending')
    .is('delivery_claim_token', null)
    .lte('next_attempt_at', new Date().toISOString())
    .lt('attempt_count', settings.retry_limit)
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as GeneralQueueItem[];
}

export async function processGeneralEmailQueue(): Promise<void> {
  const supabase = getSupabaseClient();

  // The worker is the daily scheduler for birthday enqueueing. The SQL function is idempotent.
  const { error: birthdayEnqueueError } = await supabase.rpc('enqueue_birthday_emails', { p_personal_only: false });
  if (birthdayEnqueueError) log('Birthday enqueue failed.');
  try {
    await reconcileBirthdayDeliveryMarkers();
  } catch {
    log('Birthday delivery reconciliation failed.');
  }

  const settings = await loadEmailSettings();
  if (!settings.enabled) return;

  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);
  const { count, error: countError } = await supabase
    .from('email_send_logs')
    .select('id', { count: 'exact', head: true })
    .eq('event_type', 'sent')
    .gte('created_at', dayStart.toISOString());
  if (countError) throw new Error(countError.message);

  const remaining = settings.daily_limit - (count ?? 0);
  if (remaining <= 0) {
    log('Daily send limit reached.');
    return;
  }

  const pending = await fetchPending(settings, Math.min(50, remaining));
  let sent = 0;
  let failed = 0;

  for (const item of pending) {
    const attempt = item.attempt_count + 1;
    let template: EmailTemplate | null;
    try {
      template = await getTemplate(item.template_code);
    } catch {
      log('Template lookup failed for queue #' + item.id + '.');
      continue;
    }

    if (!template) {
      const message = 'Active template not found: ' + item.template_code;
      const status = attempt >= settings.retry_limit ? 'failed' : 'pending';
      await updateQueue(item.id, {
        status,
        attempt_count: attempt,
        last_attempt_at: new Date().toISOString(),
        next_attempt_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        error_message: message
      });
      try { await insertLog(item, 'failed', { attempt, error: message }); }
      catch { log('Failure log insert failed for queue #' + item.id + '.'); }
      failed += status === 'failed' ? 1 : 0;
      continue;
    }

    const params = normalizeTemplateParams(item.template_params ?? {});
    const missing = Array.from(new Set([
      ...missingTemplateParams(template.subject, params),
      ...missingTemplateParams(template.html_content, params)
    ]));
    if (missing.length) {
      const message = 'Missing required template parameters: ' + missing.join(', ');
      const status = attempt >= settings.retry_limit ? 'failed' : 'pending';
      await updateQueue(item.id, {
        status,
        attempt_count: attempt,
        last_attempt_at: new Date().toISOString(),
        next_attempt_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        error_message: message
      });
      try { await insertLog(item, 'failed', { attempt, error: message }); }
      catch { log('Failure log insert failed for queue #' + item.id + '.'); }
      failed += status === 'failed' ? 1 : 0;
      continue;
    }

    let payload: BrevoSendPayload;
    try {
      payload = buildPayload(settings, item, template, params);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const statusCode = error && typeof error === 'object' && 'status' in error ? Number((error as {status?: unknown}).status) : undefined;
      const noRetry = statusCode !== undefined && statusCode >= 400 && statusCode < 500;
      const status = noRetry || attempt >= settings.retry_limit ? 'failed' : 'pending';
      await updateQueue(item.id, {
        status,
        attempt_count: attempt,
        last_attempt_at: new Date().toISOString(),
        next_attempt_at: new Date(Date.now() + Math.min(60, 5 * Math.pow(2, attempt - 1)) * 60 * 1000).toISOString(),
        error_message: message
      });
      try { await insertLog(item, 'failed', { attempt, error: message, ...(statusCode ? { statusCode } : {}) }); }
      catch { log('Failure log insert failed for queue #' + item.id + '.'); }
      failed += status === 'failed' ? 1 : 0;
      continue;
    }

    const claimToken = await claimDelivery('email_queue', item.id);
    if (!claimToken) continue;
    payload.headers = { ...payload.headers, idempotencyKey: claimToken };
    let messageId: string;
    try {
      messageId = (await sendEmail(payload, settings.brevo_api_key)).messageId;
    } catch {
      // A timeout or error response does not prove the provider did not accept
      // the message. Never release this claim automatically.
      log('DELIVERY OUTCOME UNKNOWN for queue #' + item.id + '; manual reconciliation required.');
      continue;
    }

    // Delivery succeeded. Mark the queue row sent before best-effort logging, so log failures
    // never enter the send-failure/retry branch and do not intentionally requeue this email.
    try {
      await updateQueue(item.id, {
        status: 'sent',
        attempt_count: attempt,
        last_attempt_at: new Date().toISOString(),
        sent_at: new Date().toISOString(),
        brevo_message_id: messageId,
        error_message: null
      }, claimToken);
    } catch {
      log('DELIVERY SUCCEEDED but queue update failed for queue #' + item.id + '; manual reconciliation required.');
      continue;
    }

    const birthdayPersonId = typeof params.birthday_person_id === 'string' ? params.birthday_person_id : '';
    const birthdayYear = Number(params.birthday_year);
    if (birthdayPersonId && Number.isInteger(birthdayYear) && (item.template_code === 'birthday_personal' || item.template_code === 'birthday_team')) {
      const { error: markerError } = await supabase.rpc('record_birthday_email_delivery', {
        p_queue_id: item.id,
        p_birthday_person_id: birthdayPersonId,
        p_notification_year: birthdayYear,
        p_channel: item.template_code === 'birthday_personal' ? 'personal' : 'team'
      });
      if (markerError) log('Delivery succeeded but birthday marker failed for queue #' + item.id + '.');
    }

    sent += 1;
    try {
      await insertLog(item, 'sent', { attempt, messageId });
    } catch {
      log('DELIVERY SUCCEEDED but send log insert failed for queue #' + item.id + '.');
    }
  }

  log('General queue complete: sent=' + sent + ', terminal failures=' + failed + ', processed=' + pending.length);
}
