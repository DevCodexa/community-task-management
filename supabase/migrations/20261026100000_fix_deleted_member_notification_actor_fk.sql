
CREATE OR REPLACE FUNCTION public.notify_member_removed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $function$
BEGIN
  -- The deleted member no longer exists as an actor FK; keep their name as a snapshot.
  INSERT INTO public.notifications
    (title, message, type, related_id, related_type, user_id, actor_id, actor_name, dedupe_key)
  SELECT 'Üye Ayrıldı', format('%s topluluktan ayrıldı.', OLD.name), 'member_removed',
         OLD.id, 'member', m.id, NULL, OLD.name,
         'member_removed:' || OLD.id::text || ':' || m.id::text
    FROM public.members m WHERE m.is_active = true
  ON CONFLICT DO NOTHING;
  RETURN OLD;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.notify_member_removed() FROM PUBLIC, anon, authenticated;
