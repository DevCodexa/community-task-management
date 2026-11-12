
WITH legacy_birthday_events AS (
  SELECT DISTINCT ON (n.related_id, extract(year FROM n.created_at)::integer)
         n.related_id AS birthday_person_id,
         extract(year FROM n.created_at)::integer AS notification_year,
         n.created_at
    FROM public.notifications n
   WHERE n.type = 'birthday'
     AND n.user_id IS NULL
     AND n.related_id IS NOT NULL
   ORDER BY n.related_id, extract(year FROM n.created_at)::integer, n.created_at DESC
)
INSERT INTO public.notifications
  (title, message, type, related_id, related_type, user_id, actor_id, actor_name, dedupe_key, created_at)
SELECT
  'Doğum Günü',
  format('Bugün %s doğum gününü kutluyor.', birthday_member.name),
  'birthday',
  birthday_member.id,
  'member',
  recipient.id,
  birthday_member.id,
  birthday_member.name,
  'birthday:' || legacy.notification_year || ':' || birthday_member.id::text || ':' || recipient.id::text,
  legacy.created_at
FROM legacy_birthday_events legacy
JOIN public.members birthday_member ON birthday_member.id = legacy.birthday_person_id
JOIN public.members recipient ON recipient.is_active = true
ON CONFLICT DO NOTHING;

-- Remove the old broadcast rows only after the recipient-scoped replacements exist.
DELETE FROM public.notifications n
 WHERE n.type = 'birthday'
   AND n.user_id IS NULL
   AND n.related_id IS NOT NULL
   AND EXISTS (
     SELECT 1 FROM public.notifications replacement
      WHERE replacement.type = 'birthday'
        AND replacement.related_id = n.related_id
        AND replacement.user_id IS NOT NULL
        AND replacement.dedupe_key LIKE 'birthday:' || extract(year FROM n.created_at)::integer || ':' || n.related_id::text || ':%'
   );
