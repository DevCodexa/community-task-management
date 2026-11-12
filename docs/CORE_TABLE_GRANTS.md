# Core table privileges

The migration `20261112185658_restrict_core_non_rls_privileges.sql` removes
`TRUNCATE`, `REFERENCES` and `TRIGGER` from `PUBLIC`, `anon` and
`authenticated` on the listed application tables. It also revokes independent
column-level `REFERENCES` grants. PostgreSQL row-level security does not protect
`TRUNCATE`, so an ordinary table grant can otherwise allow a signed-in client to
empty a whole table. Existing CRUD privileges, RLS policies, rows and
`service_role` grants are not modified.

A read-only inspection of the Task Manager project found `authenticated` had
`TRUNCATE` on the listed core, organization, notification, announcement,
event, profile and historical member tables. The same inspection found no
inherited roles for `anon` or `authenticated`; other environments can differ.
Missing historical tables are skipped, so the migration does not establish that
an absent table is secure if created later. Previously reviewed migrations for
private community tables and notifications are still needed for their full row
policy contracts.

Merging the PR does not apply this migration: the live grants remain until a
separately reviewed rollout. Before applying, review target-specific roles,
column grants and dependencies; test with a disposable compatible Supabase
project and authorized role sessions. This migration will deliberately remove
these privileges from browser roles, so any integration relying on them must be
identified first. Production was inspected read-only; no schema change was made.

Run `node --test tests/core-table-grants.test.mjs` after `npm ci`. Synthetic
PGlite fixtures verify the grants, column grants, policy preservation and
idempotency; they do not verify live Auth, RLS policies, inherited custom roles,
or actual deployment.
