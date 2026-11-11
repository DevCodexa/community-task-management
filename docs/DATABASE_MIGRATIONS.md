# Database migrations and historical SQL

## Current limitation

**An empty Supabase database cannot currently be built from this repository.**
The versioned migrations start with changes to existing tables, including
`birthday_notifications`, `email_queue` and `email_settings`; there is no
complete, reviewed base schema, and this repository has no `supabase/config.toml`.
A sorted list of migration files is not a fresh-install recipe. The migrations
have not been verified as a complete chain against a clean Supabase project.
Issue [#14](https://github.com/codelovingcat/community-task-management/issues/14)
remains open until that baseline and its clean-install test exist.

The legacy files in `database/` are not a substitute for the missing baseline.
They contain overlapping definitions, conflicting security policies and resets;
there is no supported order in which to run them all. Some recreate old email
functions or triggers. The rest of this document inventories them to prevent
accidental use, not to authorize their execution.

## Versioned change order

For an **already compatible** schema, `supabase/migrations/*.sql` contains the
versioned changes below, in filename order. Inclusion in this list does not
prove that a file is applied to a particular project or can safely be replayed.
Several changes replace policies or functions and some depend on coordinated
worker or frontend releases. Review the whole SQL file and target state first.

| Version | Change |
| --- | --- |
| 20261026000000 | Email backend-only access |
| 20261026000100 | Core RLS and task counters |
| 20261026001000 | Trigger function search paths |
| 20261026002000 | Remaining permissive anonymous policies |
| 20261026003000 | Public grants on sensitive tables |
| 20261026004000 | Member, task and organization RLS |
| 20261026005000 | General and speaker email queue logs |
| 20261026006000 | Birthday and recipient notification idempotency |
| 20261026007000 | Delivered birthday email handling |
| 20261026008000 | Legacy birthday notification backfill |
| 20261026009000 | Stale birthday notification cancellation |
| 20261026100000 | Deleted member notification actor foreign key |
| 20261027200856 | Unassigned organization leaders |
| 20261103000000 | Member helper execution privileges |
| 20261104204533 | Email delivery claims |
| 20261111150204 | Private community reads |
| 20261111172605 | Authenticated self-profile |

A safe workflow for a future change is:

1. Start with a disposable, sanitized Supabase environment whose existing schema
   and migration history are known. Do not copy production users, personal
   records, tokens, email jobs or provider keys. The missing clean baseline
   means an empty environment is not yet sufficient.
2. Compare the target's migration history and schema with the files, identify
   the first genuinely pending version, and review prerequisites, policies,
   grants, data changes and other services affected. Do not repair migration
   history or mark a migration applied without verifying the actual schema.
3. With an initialized, isolated Supabase CLI project, generate a new migration
   using `supabase migration new <descriptive_name>`. Keep the timestamped file
   under `supabase/migrations/`; never edit a migration already applied in a
   shared environment. Confirm current CLI syntax with its help/documentation.
4. Apply and test the pending changes in the disposable environment, including
   upgrade from the known schema, rerun behavior where intended, role/RLS
   checks, and relevant frontend and worker behavior. A migration that has
   already been recorded is ordinarily skipped by the migration runner; this
   does not imply its SQL can be executed twice directly.
5. Before any shared-environment deployment, identify the exact target, review
   schema differences and any environment-specific policies, verify a usable
   backup/recovery path, and coordinate dependent services. Use the operations
   guide for service-specific deployment constraints. A Git merge alone does not
   apply a migration.

## Historical `database/` inventory

| Files | Status and caution |
| --- | --- |
| `email_system.sql` | Obsolete historical email setup, intentionally aborts within a transaction. Do not remove the guard or run individual fragments: the old functions and triggers can overwrite later fixes. |
| `enqueue_birthday_emails_and_birthday_personal + birthday_team.sql`, `setup_email_queue.sql` | Conflicting historical email/queue implementations. The latter includes a placeholder processor which can mark messages sent without delivery. Do not apply. |
| `drop_email_enqueue_trigger_functions_project_department_area.sql`, `drop_triggers_project_department_area_member_emails.sql`, `recreate_enqueue_triggers_project_department_area_member_emails.sql` | Historical trigger manipulation; can remove or restore outdated behavior. Do not apply as a migration sequence. |
| `events-fixed.sql`, `events-full-reset.sql`, `events-simple-final.sql` | Destructive alternative resets, including table drops. Never run on an existing environment. |
| `events.sql`, `events-teams-areas-v1.sql`, `events-project-members.sql`, `events-department-members.sql`, `events-security-fix.sql` | Historical event and organization alternatives/fixes; not a verified baseline. The reviewed versioned policies govern current access. |
| `archive_tasks.sql`, `clear_done_tasks_archive_candidates.sql`, `reset_archive_tasks.sql` | Historical archive setup or cleanup/reset operations. Review effects and data loss independently; not part of automatic setup. |
| `org-departments-rls-fix.sql`, `speakers-rls-fix.sql` | Historical/manual policy fixes. May conflict with later versioned policies; do not blindly reapply. |
| `30-community-settings.sql`, `announcements.sql`, `members.sql`, `notifications.sql`, `profiles.sql`, `speakers.sql`, `tasks.sql`, `useful_links.sql` | Historical feature setup. May overlap the current schema and policies; not a tested ordered baseline. |

## Email settings and secrets

The historical email setup no longer embeds an unexpanded shell expression or
creates the old anonymous policies. Its guarded reference seed would leave the
provider key null, sender details empty and email disabled for newly inserted
settings, while preserving existing settings on repeat. This does **not**
configure a database: the file intentionally fails before making changes.

The current worker reads provider configuration from the backend-only
`email_settings` table; see `email-worker/README.md` and `docs/OPERATIONS.md`.
Provision credentials through the environment's approved secret-handling process
and a privileged server-side operator; never commit a key, interpolate it into
SQL, put it in browser variables, paste it into shared SQL history, or print it
in logs. Keep sending disabled until the key, sender, access grants and worker
coordination have been reviewed. Do not assume these reference changes repair
permissions in an already running database.

## Local regression checks

After `npm ci`, run:

```sh
node --test supabase/tests/legacy-email-setup.test.mjs
```

These tests use an in-memory PostgreSQL-compatible PGlite instance and synthetic
settings and roles. They verify the historical script aborts, reference settings
preserve existing values, and the reference access block removes its known
anonymous policies and grants on rerun. They do not test a complete Supabase
schema, deployed RLS, Auth, migration order, or actual email delivery.

Completing #14 still requires a reviewed schema baseline (including extensions,
roles, tables, functions, triggers, grants and RLS), reconciliation with real
migration histories, and automated clean-install plus upgrade tests against a
disposable Supabase/PostgreSQL environment. Until then, do not advertise a
fresh database reset as supported.
