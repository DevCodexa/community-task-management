-- Older versions and enqueue triggers use "welcome" for a speaker. Normalize
-- new jobs to the canonical speaker_invite code without rewriting queued or
-- claimed rows. The worker separately accepts old queued "welcome" rows.
ALTER TABLE public.speaker_email_queue
  ALTER COLUMN email_type SET DEFAULT 'speaker_invite';

CREATE OR REPLACE FUNCTION public.normalize_speaker_email_type()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.email_type = 'welcome' THEN
    NEW.email_type := 'speaker_invite';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.normalize_speaker_email_type() FROM PUBLIC;
DROP TRIGGER IF EXISTS normalize_speaker_email_type ON public.speaker_email_queue;
CREATE TRIGGER normalize_speaker_email_type
BEFORE INSERT ON public.speaker_email_queue
FOR EACH ROW EXECUTE FUNCTION public.normalize_speaker_email_type();
