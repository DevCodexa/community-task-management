-- Requires 20261104204533_email_delivery_claims.sql and its durable claim fields.
-- Preserve existing function ownership and restrict execution to the worker role.

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
    ) AND NOT EXISTS (
      -- A sent or claimed older-date job must not produce another personal mail.
      -- Claimed jobs have an unknown provider outcome until reconciled.
      SELECT 1 FROM public.email_queue q
       WHERE q.template_code = 'birthday_personal'
         AND q.template_params ->> 'birthday_person_id' = v_member.id::text
         AND q.template_params ->> 'birthday_year' = v_year::text
         AND (q.status = 'sent' OR q.delivery_claim_token IS NOT NULL)
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
      -- Never send a second team mail to the same member in the same year,
      -- including when an earlier claimed job has an unknown provider outcome.
      IF EXISTS (
        SELECT 1 FROM public.email_queue q
         WHERE q.template_code = 'birthday_team'
           AND q.template_params ->> 'birthday_person_id' = v_member.id::text
           AND q.template_params ->> 'birthday_year' = v_year::text
           AND (
             q.idempotency_key LIKE 'birthday:' || v_year || ':' || v_member.id::text || ':%:team:' || v_recipient.id::text
             OR lower(q.recipient_email) = lower(v_recipient.email)
           )
           AND (
             q.status = 'sent' OR q.delivery_claim_token IS NOT NULL
             OR EXISTS (SELECT 1 FROM public.birthday_email_deliveries d WHERE d.queue_id = q.id)
           )
      ) THEN
        CONTINUE;
      END IF;
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
