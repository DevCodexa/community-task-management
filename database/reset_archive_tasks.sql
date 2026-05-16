-- ============================================================
-- reset_archive_tasks.sql
-- Cleans up archived_tasks ONLY.
-- Use this when a previous archive run produced wrong data
-- and you want to restore a clean archive view.
--
-- WARNING:
-- - This script deletes rows from archived_tasks.
-- - It does NOT move anything back to tasks.
-- - Run this only if you are ok with losing archived records.
-- ============================================================

begin;

delete from archived_tasks;

commit;

