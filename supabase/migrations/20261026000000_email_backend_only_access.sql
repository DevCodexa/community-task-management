-- Email subsystem is backend-only.
-- The browser uses the Supabase anon key; the Node email worker uses service_role.
-- Do not create anon/authenticated policies for these internal tables.
-- Apply after verifying the worker is configured with SUPABASE_SERVICE_ROLE_KEY.

ALTER TABLE public.birthday_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_send_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.speaker_email_queue ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE
  public.birthday_notifications,
  public.email_queue,
  public.email_send_logs,
  public.email_settings,
  public.email_templates,
  public.speaker_email_queue
FROM PUBLIC, anon, authenticated;

GRANT ALL PRIVILEGES ON TABLE
  public.birthday_notifications,
  public.email_queue,
  public.email_send_logs,
  public.email_settings,
  public.email_templates,
  public.speaker_email_queue
TO service_role;

REVOKE ALL PRIVILEGES ON SEQUENCE
  public.birthday_notifications_id_seq,
  public.email_queue_id_seq,
  public.email_send_logs_id_seq,
  public.email_settings_id_seq,
  public.email_templates_id_seq
FROM PUBLIC, anon, authenticated;

GRANT ALL PRIVILEGES ON SEQUENCE
  public.birthday_notifications_id_seq,
  public.email_queue_id_seq,
  public.email_send_logs_id_seq,
  public.email_settings_id_seq,
  public.email_templates_id_seq
TO service_role;

REVOKE EXECUTE ON FUNCTION public.enqueue_birthday_emails(boolean)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_birthday_emails(boolean)
  TO service_role;

REVOKE EXECUTE ON FUNCTION public.enqueue_email(
  character varying, character varying, character varying, jsonb, public.email_priority_enum
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_email(
  character varying, character varying, character varying, jsonb, public.email_priority_enum
) TO service_role;

REVOKE EXECUTE ON FUNCTION public.process_speaker_email_queue()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_speaker_email_queue()
  TO service_role;

-- Trigger functions are invoked by PostgreSQL triggers, not as public RPCs.
REVOKE EXECUTE ON FUNCTION public.email_queue_set_updated_at()
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.email_settings_set_updated_at()
  FROM PUBLIC, anon, authenticated;
