import type { BrevoSendPayload, EmailSettings, EmailTemplate, SpeakerEmailQueueItem } from './types';
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
  // eslint-disable-next-line no-console
  console.log(`[EmailWorker] [${ts}] ${message}`);
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

type RenderParams = Record<string, string>;

function buildTemplateParams(item: SpeakerEmailQueueItem): RenderParams {
  return {
    full_name: item.full_name ?? '',
    company: item.company ?? '',
    title: item.title ?? ''
  };
}

async function loadDailySentCount(supabase: ReturnType<typeof getSupabaseClient>): Promise<number> {
  const dateStr = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('email_send_logs')
    .select('id', { count: 'exact' })
    .eq('event_type', 'sent')
    .gte('created_at', dateStr);

  if (error) throw new Error(error.message);
  if (Array.isArray(data)) return data.length;
  return 0;
}

async function fetchPendingBatch(
  supabase: ReturnType<typeof getSupabaseClient>,
  retryLimit: number,
  batchSize: number
): Promise<SpeakerEmailQueueItem[]> {
  const { data, error } = await supabase
    .from('speaker_email_queue')
    .select(
      [
        'id',
        'speaker_id',
        'email_type',
        'status',
        'retry_count',
        'scheduled_at',
        'sent_at',
        'created_at',
        'error_message',
        'speakers(email, full_name, title, company)'
      ].join(',')
    )
    .eq('status', 'pending')
    .lte('scheduled_at', new Date().toISOString())
    .lt('retry_count', retryLimit)
    .order('created_at', { ascending: true })
    .limit(batchSize);

  if (error) throw new Error(error.message);
  if (!data) return [];

  return (data as any[]).map((row) => {
    const speaker = Array.isArray(row.speakers) ? row.speakers[0] : row.speakers;
    return {
      id: row.id,
      speaker_id: row.speaker_id,
      email_type: row.email_type,
      status: row.status,
      retry_count: row.retry_count,
      scheduled_at: row.scheduled_at,
      sent_at: row.sent_at,
      created_at: row.created_at,
      error_message: row.error_message,
      email: speaker?.email ?? '',
      full_name: speaker?.full_name ?? null,
      title: speaker?.title ?? null,
      company: speaker?.company ?? null
    } as SpeakerEmailQueueItem;
  });
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
  queueId: string;
  recipientEmail: string;
  templateCode: string;
  eventType: 'sent' | 'failed';
  eventData: Record<string, unknown>;
}): Promise<void> {
  const { error } = await (params.supabase as unknown as {
    from: (_table: string) => {
      insert: (values: Array<Record<string, unknown>>) => Promise<{ error: { message: string } | null }>;
    };
  }).from('email_send_logs').insert([
    {
      // NOTE: email_send_logs.queue_id is bigint in SQL. If your actual schema differs,
      // adjust this mapping.
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
  queueId: string;
  brevoMessageId: string;
}): Promise<void> {
  const nowIso = new Date().toISOString();

  const { error } = await (params.supabase as unknown as {
    from: (_table: string) => {
      update: (_values: Record<string, unknown>) => {
        eq: (_col: string, _value: string) => Promise<{ error: { message: string } | null }>;
      };
    };
  })
    .from('speaker_email_queue')
    .update({
      status: 'sent',
      sent_at: nowIso,
      error_message: null
    })
    .eq('id', params.queueId);

  if (error) throw new Error(error.message);
}

async function markQueueRowFailure(params: {
  supabase: ReturnType<typeof getSupabaseClient>;
  queueId: string;
  attemptCount: number;
  errorMessage: string;
  status: 'pending' | 'failed';
}): Promise<void> {
  const nowIso = new Date().toISOString();
  const scheduledAt =
    params.status === 'pending'
      ? new Date(Date.now() + 5 * 60 * 1000).toISOString()
      : undefined;

  const { error } = await (params.supabase as unknown as {
    from: (_table: string) => {
      update: (_values: Record<string, unknown>) => {
        eq: (_col: string, _value: string) => Promise<{ error: { message: string } | null }>;
      };
    };
  })
    .from('speaker_email_queue')
    .update({
      status: params.status,
      retry_count: params.attemptCount,
      error_message: params.errorMessage,
      // speaker_email_queue schema has scheduled_at
      scheduled_at: scheduledAt,
      sent_at: params.status === 'failed' ? null : undefined,
      last_attempt_at: undefined
    } as Record<string, unknown>)
    .eq('id', params.queueId);

  if (error) throw new Error(error.message);
}

function toBrevoPayload(params: {
  settings: EmailSettings;
  recipientEmail: string;
  recipientName: string | null;
  renderedSubject: string;
  renderedHtml: string;
  template: EmailTemplate;
  templateParams: RenderParams;
}): BrevoSendPayload {
  const { settings, recipientEmail, recipientName, renderedSubject, renderedHtml, template, templateParams } = params;

  const base: BrevoSendPayload = {
    sender: { name: settings.sender_name, email: settings.sender_email },
    to: [{ email: recipientEmail, name: recipientName ?? undefined }],
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
      params: templateParams
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
    const recipientEmail = item.email;
    if (!recipientEmail) {
      skippedCount += 1;
      continue;
    }

    const templateCode = item.email_type;
    const nextAttemptCount = item.retry_count + 1;

    const template = await fetchTemplate(supabase, templateCode);
    if (!template) {
      const status: 'pending' | 'failed' = nextAttemptCount >= settings.retry_limit ? 'failed' : 'pending';
      const errorMessage = `Template not found for email_type=${templateCode}`;

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
        recipientEmail,
        templateCode,
        eventType: 'failed',
        eventData: { attempt: nextAttemptCount, error: errorMessage }
      });

      if (status === 'failed') failedCount += 1;
      else skippedCount += 1;
      continue;
    }

    const templateParams = buildTemplateParams(item);
    const renderedSubject = renderSubject(template.subject, templateParams);
    const renderedHtml = renderTemplate(template.html_content, templateParams);

    try {
      const payload = toBrevoPayload({
        settings,
        recipientEmail,
        recipientName: item.full_name,
        renderedSubject,
        renderedHtml,
        template,
        templateParams
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
        recipientEmail,
        templateCode,
        eventType: 'sent',
        eventData: { attempt: nextAttemptCount, messageId: response.messageId }
      });

      sentCount += 1;
    } catch (e: unknown) {
      const httpStatus = getHttpStatusFromError(e);
      const errorMessage = e instanceof Error ? e.message : String(e);

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
        recipientEmail,
        templateCode,
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

  log(`Batch tamamlandı: ✅ Gönderilen: ${sentCount} ❌ Başarısız: ${failedCount} ⏭️ Atlandı: ${skippedCount}`);
}

