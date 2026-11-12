-- Support both the general BIGINT email queue and UUID speaker queue without coercing IDs.
ALTER TABLE public.email_send_logs
  ALTER COLUMN queue_id DROP NOT NULL;

ALTER TABLE public.email_send_logs
  ADD COLUMN IF NOT EXISTS speaker_queue_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.email_send_logs'::regclass
      AND conname = 'email_send_logs_speaker_queue_id_fkey'
  ) THEN
    ALTER TABLE public.email_send_logs
      ADD CONSTRAINT email_send_logs_speaker_queue_id_fkey
      FOREIGN KEY (speaker_queue_id)
      REFERENCES public.speaker_email_queue(id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.email_send_logs'::regclass
      AND conname = 'email_send_logs_exactly_one_queue_ref'
  ) THEN
    ALTER TABLE public.email_send_logs
      ADD CONSTRAINT email_send_logs_exactly_one_queue_ref
      CHECK (num_nonnulls(queue_id, speaker_queue_id) = 1) NOT VALID;
  END IF;
END $$;

ALTER TABLE public.email_send_logs
  VALIDATE CONSTRAINT email_send_logs_exactly_one_queue_ref;

CREATE INDEX IF NOT EXISTS idx_email_send_logs_speaker_queue_id
  ON public.email_send_logs(speaker_queue_id);

-- The general queue needs retry backoff as well as a bounded attempt count.
ALTER TABLE public.email_queue
  ADD COLUMN IF NOT EXISTS next_attempt_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now());

CREATE INDEX IF NOT EXISTS idx_email_queue_due_pending
  ON public.email_queue(status, next_attempt_at, priority, created_at);
