-- Table grants are separate from RLS policies. Revoke them explicitly.
REVOKE ALL PRIVILEGES ON TABLE public.archived_tasks, public.manual_emails, public.speakers
FROM PUBLIC, anon, authenticated;

-- Authenticated clients can reach these tables, but RLS policies decide allowed rows/actions.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.archived_tasks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.manual_emails TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.speakers TO authenticated;

GRANT ALL PRIVILEGES ON TABLE public.archived_tasks, public.manual_emails, public.speakers
TO service_role;

-- Manual email IDs use a sequence. RLS still restricts row operations to administrators.
REVOKE ALL PRIVILEGES ON SEQUENCE public.manual_emails_id_seq FROM PUBLIC, anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.manual_emails_id_seq TO authenticated;
GRANT ALL PRIVILEGES ON SEQUENCE public.manual_emails_id_seq TO service_role;
