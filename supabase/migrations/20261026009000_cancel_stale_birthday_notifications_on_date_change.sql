
CREATE OR REPLACE FUNCTION public.cancel_stale_birthday_jobs_on_date_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $function$
DECLARE
  v_year integer := extract(year FROM (now() AT TIME ZONE 'Europe/Istanbul'))::integer;
  v_today date := (now() AT TIME ZONE 'Europe/Istanbul')::date;
BEGIN
  IF NEW.birth_day IS DISTINCT FROM OLD.birth_day OR NEW.birth_month IS DISTINCT FROM OLD.birth_month THEN
    UPDATE public.email_queue
       SET status = 'failed',
           error_message = 'Cancelled because the member birthday date changed',
           updated_at = now()
     WHERE status = 'pending'
       AND template_code IN ('birthday_personal', 'birthday_team')
       AND template_params ->> 'birthday_person_id' = OLD.id::text
       AND (
         (template_params ->> 'birthday_day') IS DISTINCT FROM NEW.birth_day::text
         OR (template_params ->> 'birthday_month') IS DISTINCT FROM NEW.birth_month::text
       );

    -- If no birthday email has been delivered this year, remove today's stale in-app notice too.
    IF NOT EXISTS (
      SELECT 1 FROM public.birthday_email_deliveries d
       WHERE d.birthday_person_id = OLD.id AND d.notification_year = v_year
    ) THEN
      DELETE FROM public.notifications
       WHERE type = 'birthday'
         AND related_id = OLD.id
         AND created_at AT TIME ZONE 'Europe/Istanbul' >= v_today::timestamp
         AND created_at AT TIME ZONE 'Europe/Istanbul' < (v_today + 1)::timestamp
         AND dedupe_key LIKE 'birthday:' || v_year || ':' || OLD.id::text || ':%';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
