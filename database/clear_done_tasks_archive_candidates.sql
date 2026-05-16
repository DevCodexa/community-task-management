-- ============================================================
-- clear_done_tasks_archive_candidates.sql
-- Safety helper for reruns:
-- - Optionally removes only archived candidates by age/reason.
-- - Intended to avoid errors during iteration.
--
-- WARNING:
-- This deletes from archived_tasks only.
-- It does NOT touch tasks.
-- ============================================================

-- Delete archived rows for the same rule (done_7_days)
-- so you can rerun the archive function cleanly.

begin;

delete from archived_tasks
where archived_reason = 'done_7_days';

commit;

