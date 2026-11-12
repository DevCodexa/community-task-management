
-- Idempotent queue and notification keys.
ALTER TABLE public.email_queue ADD COLUMN IF NOT EXISTS idempotency_key text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_queue_idempotency_key
  ON public.email_queue(idempotency_key) WHERE idempotency_key IS NOT NULL;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS dedupe_key text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_dedupe_key
  ON public.notifications(dedupe_key) WHERE dedupe_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.birthday_email_deliveries (
  queue_id bigint PRIMARY KEY REFERENCES public.email_queue(id) ON DELETE CASCADE,
  birthday_person_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  notification_year integer NOT NULL,
  channel text NOT NULL CHECK (channel IN ('personal', 'team')),
  delivered_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.birthday_email_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.birthday_email_deliveries FROM PUBLIC, anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE public.birthday_email_deliveries TO service_role;

CREATE OR REPLACE FUNCTION public.record_birthday_email_delivery(
  p_queue_id bigint, p_birthday_person_id uuid, p_notification_year integer, p_channel text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $function$
DECLARE v_inserted bigint;
BEGIN
  IF p_channel NOT IN ('personal', 'team') THEN RAISE EXCEPTION 'Invalid birthday email channel'; END IF;
  INSERT INTO public.birthday_email_deliveries(queue_id, birthday_person_id, notification_year, channel)
  VALUES (p_queue_id, p_birthday_person_id, p_notification_year, p_channel)
  ON CONFLICT (queue_id) DO NOTHING RETURNING queue_id INTO v_inserted;
  IF v_inserted IS NULL THEN RETURN; END IF;
  IF p_channel = 'personal' THEN
    UPDATE public.birthday_notifications SET personal_mail_sent = true, sent_at = now()
     WHERE birthday_person_id = p_birthday_person_id AND notification_year = p_notification_year;
  ELSE
    UPDATE public.birthday_notifications SET team_mails_sent_count = team_mails_sent_count + 1, sent_at = now()
     WHERE birthday_person_id = p_birthday_person_id AND notification_year = p_notification_year;
  END IF;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.record_birthday_email_delivery(bigint, uuid, integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_birthday_email_delivery(bigint, uuid, integer, text) TO service_role;

CREATE OR REPLACE FUNCTION public.enqueue_birthday_emails(p_personal_only boolean DEFAULT false)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $function$
DECLARE
  v_year integer := extract(year FROM (now() AT TIME ZONE 'Europe/Istanbul'))::integer;
  v_member record;
  v_recipient record;
BEGIN
  FOR v_member IN
    SELECT id, name, email, birth_day, birth_month FROM public.members
     WHERE birth_day = extract(day FROM (now() AT TIME ZONE 'Europe/Istanbul'))::integer
       AND birth_month = extract(month FROM (now() AT TIME ZONE 'Europe/Istanbul'))::integer
       AND email IS NOT NULL AND is_active = true
  LOOP
    INSERT INTO public.birthday_notifications
      (birthday_person_id, notification_year, personal_mail_sent, team_mails_sent_count, sent_at)
    VALUES (v_member.id, v_year, false, 0, now())
    ON CONFLICT (birthday_person_id, notification_year) DO NOTHING;

    INSERT INTO public.notifications
      (title, message, type, related_id, related_type, user_id, actor_id, actor_name, dedupe_key)
    SELECT 'Doğum Günü', format('Bugün %s doğum gününü kutluyor.', v_member.name),
      'birthday', v_member.id, 'member', m.id, v_member.id, v_member.name,
      'birthday:' || v_year || ':' || v_member.id::text || ':' || m.id::text
    FROM public.members m WHERE m.is_active = true
    ON CONFLICT DO NOTHING;

    IF NOT EXISTS (
      SELECT 1 FROM public.birthday_email_deliveries d
       WHERE d.birthday_person_id = v_member.id AND d.notification_year = v_year AND d.channel = 'personal'
    ) AND NOT EXISTS (
      SELECT 1 FROM public.birthday_notifications b
       WHERE b.birthday_person_id = v_member.id AND b.notification_year = v_year AND b.personal_mail_sent = true
    ) THEN
      INSERT INTO public.email_queue
        (recipient_email, recipient_name, template_code, template_params, priority, status, idempotency_key)
      VALUES (
        v_member.email, v_member.name, 'birthday_personal',
        jsonb_build_object('member_name', coalesce(v_member.name, 'Üye'),
          'birthday_person_id', v_member.id::text, 'birthday_year', v_year,
          'birthday_day', v_member.birth_day, 'birthday_month', v_member.birth_month),
        'high', 'pending',
        'birthday:' || v_year || ':' || v_member.id::text || ':' ||
          v_member.birth_month || '-' || v_member.birth_day || ':personal:' || lower(v_member.email)
      ) ON CONFLICT DO NOTHING;
    END IF;

    IF p_personal_only THEN CONTINUE; END IF;

    FOR v_recipient IN
      SELECT DISTINCT team_member.id, team_member.email, team_member.name
      FROM public.members team_member
      JOIN (
        SELECT oam.user_id AS member_id
          FROM public.org_area_members oam
          JOIN public.org_area_members birthday_oam ON birthday_oam.area_id = oam.area_id
         WHERE birthday_oam.user_id = v_member.id AND oam.deleted_at IS NULL AND birthday_oam.deleted_at IS NULL
        UNION
        SELECT odm.user_id
          FROM public.org_department_members odm
          JOIN public.org_department_members birthday_odm ON birthday_odm.department_id = odm.department_id
         WHERE birthday_odm.user_id = v_member.id AND odm.deleted_at IS NULL AND birthday_odm.deleted_at IS NULL
        UNION
        SELECT opm.user_id
          FROM public.org_project_members opm
          JOIN public.org_project_members birthday_opm ON birthday_opm.project_id = opm.project_id
         WHERE birthday_opm.user_id = v_member.id AND opm.deleted_at IS NULL AND birthday_opm.deleted_at IS NULL
      ) shared ON shared.member_id = team_member.id
      WHERE team_member.id <> v_member.id AND team_member.is_active = true AND team_member.email IS NOT NULL
    LOOP
      INSERT INTO public.email_queue
        (recipient_email, recipient_name, template_code, template_params, priority, status, idempotency_key)
      VALUES (
        v_recipient.email, v_recipient.name, 'birthday_team',
        jsonb_build_object('birthday_person', coalesce(v_member.name, 'Bir ekip üyesi'),
          'birthday_person_id', v_member.id::text, 'birthday_year', v_year,
          'birthday_day', v_member.birth_day, 'birthday_month', v_member.birth_month),
        'medium', 'pending',
        'birthday:' || v_year || ':' || v_member.id::text || ':' ||
          v_member.birth_month || '-' || v_member.birth_day || ':team:' || v_recipient.id::text
      ) ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.enqueue_birthday_emails(boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_birthday_emails(boolean) TO service_role;

CREATE OR REPLACE FUNCTION public.cancel_stale_birthday_jobs_on_date_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $function$
BEGIN
  IF NEW.birth_day IS DISTINCT FROM OLD.birth_day OR NEW.birth_month IS DISTINCT FROM OLD.birth_month THEN
    UPDATE public.email_queue
       SET status = 'failed', error_message = 'Cancelled because the member birthday date changed', updated_at = now()
     WHERE status = 'pending'
       AND template_code IN ('birthday_personal', 'birthday_team')
       AND template_params ->> 'birthday_person_id' = OLD.id::text
       AND (
         (template_params ->> 'birthday_day') IS DISTINCT FROM NEW.birth_day::text
         OR (template_params ->> 'birthday_month') IS DISTINCT FROM NEW.birth_month::text
       );
  END IF;
  RETURN NEW;
END;
$function$;
DROP TRIGGER IF EXISTS trg_cancel_stale_birthday_jobs ON public.members;
CREATE TRIGGER trg_cancel_stale_birthday_jobs AFTER UPDATE OF birth_day, birth_month ON public.members
FOR EACH ROW EXECUTE FUNCTION public.cancel_stale_birthday_jobs_on_date_change();

CREATE OR REPLACE FUNCTION public.notify_task_added()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $function$
BEGIN
  INSERT INTO public.notifications (title, message, type, related_id, related_type, user_id, actor_id, actor_name, dedupe_key)
  SELECT 'Yeni Görev', format('Yeni görev eklendi: %s', NEW.title), 'task_added', NEW.id, 'task',
         m.id, NEW.assignee_id, NULL, 'task_added:' || NEW.id::text || ':' || m.id::text
    FROM public.members m WHERE m.is_active = true
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_task_deleted()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $function$
BEGIN
  INSERT INTO public.notifications (title, message, type, related_id, related_type, user_id, actor_id, actor_name, dedupe_key)
  SELECT 'Görev Silindi', format('Görev silindi: %s', OLD.title), 'task_deleted', OLD.id, 'task',
         m.id, OLD.assignee_id, NULL, 'task_deleted:' || OLD.id::text || ':' || m.id::text
    FROM public.members m WHERE m.is_active = true
  ON CONFLICT DO NOTHING;
  RETURN OLD;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_task_completed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $function$
BEGIN
  IF NEW.status::text IN ('completed', 'done') AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.notifications (title, message, type, related_id, related_type, user_id, actor_id, actor_name, dedupe_key)
    SELECT 'Görev Tamamlandı', format('Görev tamamlandı: %s', NEW.title), 'task_completed', NEW.id, 'task',
           m.id, NEW.assignee_id, NULL, 'task_completed:' || NEW.id::text || ':' || m.id::text || ':' || NEW.status::text
      FROM public.members m WHERE m.is_active = true
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_member_added()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $function$
BEGIN
  INSERT INTO public.notifications (title, message, type, related_id, related_type, user_id, actor_id, actor_name, dedupe_key)
  SELECT 'Yeni Üye', format('%s topluluğa katıldı.', NEW.name), 'member_added', NEW.id, 'member',
         m.id, NEW.id, NEW.name, 'member_added:' || NEW.id::text || ':' || m.id::text
    FROM public.members m WHERE m.is_active = true
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_member_removed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $function$
BEGIN
  INSERT INTO public.notifications (title, message, type, related_id, related_type, user_id, actor_id, actor_name, dedupe_key)
  SELECT 'Üye Ayrıldı', format('%s topluluktan ayrıldı.', OLD.name), 'member_removed', OLD.id, 'member',
         m.id, OLD.id, OLD.name, 'member_removed:' || OLD.id::text || ':' || m.id::text
    FROM public.members m WHERE m.is_active = true
  ON CONFLICT DO NOTHING;
  RETURN OLD;
END;
$function$;

DROP TRIGGER IF EXISTS trg_notify_task_added ON public.tasks;
CREATE TRIGGER trg_notify_task_added AFTER INSERT ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.notify_task_added();
DROP TRIGGER IF EXISTS trg_notify_task_deleted ON public.tasks;
CREATE TRIGGER trg_notify_task_deleted AFTER DELETE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.notify_task_deleted();
DROP TRIGGER IF EXISTS trg_notify_task_completed ON public.tasks;
CREATE TRIGGER trg_notify_task_completed AFTER UPDATE OF status ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.notify_task_completed();
DROP TRIGGER IF EXISTS trg_notify_member_added ON public.members;
CREATE TRIGGER trg_notify_member_added AFTER INSERT ON public.members FOR EACH ROW EXECUTE FUNCTION public.notify_member_added();
DROP TRIGGER IF EXISTS trg_notify_member_removed ON public.members;
CREATE TRIGGER trg_notify_member_removed AFTER DELETE ON public.members FOR EACH ROW EXECUTE FUNCTION public.notify_member_removed();

REVOKE EXECUTE ON FUNCTION public.notify_task_added() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_task_deleted() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_task_completed() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_member_added() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_member_removed() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cancel_stale_birthday_jobs_on_date_change() FROM PUBLIC, anon, authenticated;
