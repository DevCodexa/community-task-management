import type { BrevoSendPayload, EmailQueueItem, EmailSettings, EmailTemplate } from './types';
import { loadEmailSettings } from './settingsLoader';
import { getSupabaseClient } from './supabaseClient';
import { renderTemplate, renderSubject } from './templateEngine';
import { sendEmail } from './brevo';

function formatTimestamp(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function log(message: string): void {
  const ts = formatTimestamp(new Date());
  // Kural: [EmailWorker] [2024-01-15 14:30:00] mesaj
  // eslint-disable-next-line no-console
  console.log(`[EmailWorker] [${ts}] ${message}`);
}

function priorityRank(priority: EmailQueueItem['priority']): number {
  if (priority === 'high') return 0;
  if (priority === 'medium') return 1;
  return 2;
}

function getHttpStatusFromError(e: unknown): number | undefined {
  if (e && typeof e === 'object' && 'status' in e) {
    const val = (e as { status?: unknown }).status;
    if (typeof val === 'number') return val;
    const num = typeof val === 'string' ? Number(val) : undefined;
    if (num && Number.isFinite(num)) return num;
  }
  return undefined;
}

async function loadDailySentCount(supabase: ReturnType<typeof getSupabaseClient>): Promise<number> {
  const dateStr = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('email_queue')
    .select('id', { count: 'exact' })
    .eq('status', 'sent')
    .gte('sent_at', dateStr);

  if (error) throw new Error(error.message);

  if (Array.isArray(data)) return data.length;
  return 0;
}

async function fetchPendingBatch(
  supabase: ReturnType<typeof getSupabaseClient>,
  retryLimit: number,
  batchSize: number
): Promise<EmailQueueItem[]> {
  const { data, error } = await supabase
    .from('email_queue')
    .select('*')
    .eq('status', 'pending')
    .lt('attempt_count', retryLimit);

  if (error) throw new Error(error.message);
  if (!data) return [];

  const items = data as unknown as EmailQueueItem[];
  items.sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority));
  return items.slice(0, batchSize);
}

async function fetchTemplate(
  supabase: ReturnType<typeof getSupabaseClient>,
  templateCode: string
): Promise<EmailTemplate | null> {
  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .eq('template_code', templateCode)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as EmailTemplate | null) ?? null;
}

async function insertSendLog(params: {
  supabase: ReturnType<typeof getSupabaseClient>;
  queueId: number;
  recipientEmail: string;
  templateCode: string;
  eventType: 'sent' | 'failed';
  eventData: Record<string, unknown>;
}): Promise<void> {
  const { error } = await (params.supabase as unknown as {
    from: (table: string) => {
      insert: (values: Array<Record<string, unknown>>) => Promise<{ error: { message: string } | null }>;
    };
  }).from('email_send_logs').insert([
    {
      queue_id: params.queueId,
      recipient_email: params.recipientEmail,
      template_code: params.templateCode,
      event_type: params.eventType,
      event_data: params.eventData
    }
  ]);

  if (error) throw new Error(error.message);
}

async function markQueueRowSuccess(params: {
  supabase: ReturnType<typeof getSupabaseClient>;
  queueId: number;
  brevoMessageId: string;
}): Promise<void> {
  const nowIso = new Date().toISOString();

  const { error } = await (params.supabase as unknown as {
    from: (table: string) => {
      update: (values: Record<string, unknown>) => {
        eq: (col: string, value: number) => Promise<{ error: { message: string } | null }>;
      };
    };
  })
    .from('email_queue')
    .update({
      status: 'sent',
      sent_at: nowIso,
      brevo_message_id: params.brevoMessageId,
      error_message: null
    })
    .eq('id', params.queueId);

  if (error) throw new Error(error.message);
}

async function markQueueRowFailure(params: {
  supabase: ReturnType<typeof getSupabaseClient>;
  queueId: number;
  attemptCount: number;
  errorMessage: string;
  status: 'pending' | 'failed';
}): Promise<void> {
  const nowIso = new Date().toISOString();

  const { error } = await (params.supabase as unknown as {
    from: (table: string) => {
      update: (values: Record<string, unknown>) => {
        eq: (col: string, value: number) => Promise<{ error: { message: string } | null }>;
      };
    };
  })
    .from('email_queue')
    .update({
      status: params.status,
      attempt_count: params.attemptCount,
      last_attempt_at: nowIso,
      error_message: params.errorMessage
    })
    .eq('id', params.queueId);

  if (error) throw new Error(error.message);
}

async function markAttemptStart(params: {
  supabase: ReturnType<typeof getSupabaseClient>;
  queueId: number;
  nextAttemptCount: number;
}): Promise<void> {
  const nowIso = new Date().toISOString();

  const { error } = await (params.supabase as unknown as {
    from: (table: string) => {
      update: (values: Record<string, unknown>) => {
        eq: (col: string, value: number) => Promise<{ error: { message: string } | null }>;
      };
    };
  })
    .from('email_queue')
    .update({
      attempt_count: params.nextAttemptCount,
      last_attempt_at: nowIso
    })
    .eq('id', params.queueId);

  if (error) throw new Error(error.message);
}

function toBrevoPayload(params: {
  settings: EmailSettings;
  queueItem: EmailQueueItem;
  template: EmailTemplate;
  renderedSubject: string;
  renderedHtml: string;
}): BrevoSendPayload {
  const { settings, queueItem, template, renderedSubject, renderedHtml } = params;

  const base: BrevoSendPayload = {
    sender: { name: settings.sender_name, email: settings.sender_email },
    to: [{ email: queueItem.recipient_email, name: queueItem.recipient_name ?? undefined }],
    subject: renderedSubject,
    htmlContent: renderedHtml
  };

  if (template.brevo_template_id != null) {
    return {
      sender: base.sender,
      to: base.to,
      subject: '',
      htmlContent: '',
      templateId: template.brevo_template_id,
      params: queueItem.template_params
    };
  }

  return base;
}

export async function processEmailQueue(): Promise<void> {
  const supabase = getSupabaseClient();

  let settings: EmailSettings;
  try {
    settings = await loadEmailSettings();
  } catch (e: unknown) {
    log(`Settings load failed: ${(e as Error).message}`);
    return;
  }

  if (!settings.enabled) {
    log('Email worker disabled (enabled=false).');
    return;
  }

  const sentToday = await loadDailySentCount(supabase);
  if (sentToday >= settings.daily_limit) {
    log(`Daily limit reached (${sentToday}/${settings.daily_limit}). Batch skipped.`);
    return;
  }

  const remaining = settings.daily_limit - sentToday;
  const batchSize = Math.min(50, remaining);
  if (batchSize <= 0) return;

  const pending = await fetchPendingBatch(supabase, settings.retry_limit, batchSize);

  let sentCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  for (const item of pending) {
    if (sentCount + failedCount >= batchSize) {
      skippedCount += 1;
      continue;
    }

    const nextAttemptCount = item.attempt_count + 1;

    await markAttemptStart({ supabase, queueId: item.id, nextAttemptCount });

    const template = await fetchTemplate(supabase, item.template_code);
    if (!template) {
      const status: 'pending' | 'failed' = nextAttemptCount >= settings.retry_limit ? 'failed' : 'pending';
      const errorMessage = 'Template bulunamadı';

      await markQueueRowFailure({
        supabase,
        queueId: item.id,
        attemptCount: nextAttemptCount,
        errorMessage,
        status
      });

      await insertSendLog({
        supabase,
        queueId: item.id,
        recipientEmail: item.recipient_email,
        templateCode: item.template_code,
        eventType: 'failed',
        eventData: { attempt: nextAttemptCount, error: errorMessage }
      });

      if (status === 'failed') failedCount += 1;
      else skippedCount += 1;
      continue;
    }

    const renderedSubject = renderSubject(template.subject, item.template_params);
    const renderedHtml = renderTemplate(template.html_content, item.template_params);

    try {
      const payload = toBrevoPayload({
        settings,
        queueItem: item,
        template,
        renderedSubject,
        renderedHtml
      });

      const response = await sendEmail(payload, settings.brevo_api_key);

      await markQueueRowSuccess({
        supabase,
        queueId: item.id,
        brevoMessageId: response.messageId
      });

      await insertSendLog({
        supabase,
        queueId: item.id,
        recipientEmail: item.recipient_email,
        templateCode: item.template_code,
        eventType: 'sent',
        eventData: { attempt: nextAttemptCount, messageId: response.messageId }
      });

      sentCount += 1;
    } catch (e: unknown) {
      const httpStatus = getHttpStatusFromError(e);
      const errorMessage = (e as Error).message;

      const shouldFailNoRetry = httpStatus != null && httpStatus >= 400 && httpStatus < 500;
      const status: 'pending' | 'failed' = shouldFailNoRetry
        ? 'failed'
        : nextAttemptCount >= settings.retry_limit
          ? 'failed'
          : 'pending';

      await markQueueRowFailure({
        supabase,
        queueId: item.id,
        attemptCount: nextAttemptCount,
        errorMessage,
        status
      });

      await insertSendLog({
        supabase,
        queueId: item.id,
        recipientEmail: item.recipient_email,
        templateCode: item.template_code,
        eventType: 'failed',
        eventData: {
          attempt: nextAttemptCount,
          error: errorMessage,
          ...(httpStatus ? { httpStatus } : {})
        }
      });

      if (status === 'failed') failedCount += 1;
      else skippedCount += 1;
    }
  }

  log(
    `Batch tamamlandı: ✅ Gönderilen: ${sentCount} ❌ Başarısız: ${failedCount} ⏭️ Atlandı: ${skippedCount}`
  );
}

