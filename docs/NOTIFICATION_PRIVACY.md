# Notification privacy and historical SQL

`database/notifications.sql` is an obsolete setup script. It recreated
anonymous policies and old functions which insert notifications without a
recipient, so executing the whole file now aborts. It is preserved for history;
individual fragments are not a supported setup or repair method. Use the
versioned migrations on a known-compatible schema instead.

`20261111195910_restrict_notification_table_privileges.sql` enables RLS and
replaces **all** existing policies on `public.notifications`: `authenticated`
users (including admins) may read, update and delete only their own rows. Admins
may still insert a notification for another member, but must supply an explicit
recipient. Ordinary users may only create self-addressed notifications with
their own actor. Trusted service-role grants and existing notification trigger
functions are unchanged. PUBLIC, anon and authenticated table and column-level
grants are cleared; only authenticated SELECT/INSERT/UPDATE/DELETE are
regranted. TRUNCATE is deliberately excluded because RLS does not protect it.

**Deployment requires a separate database migration.** Merging this PR does not
apply it. The migration drops all notification policies, including any custom
policies not in the repository. Review the target environment's policies,
custom client integrations, role grants and dependent services before applying;
verify allowed and denied Auth sessions on a compatible isolated database first.
It is rerunnable, does not delete rows and preserves service-role grants. If an
integration requires the removed cross-member admin access, it must be reviewed
and redesigned before rollout rather than silently restoring the old policy.

Run `node --test tests/notification-privacy.test.mjs` after `npm ci`. The test
uses synthetic tables, roles and member identities in an isolated PostgreSQL
engine. It exercises the checked-in notification and birthday SQL, fan-out to
active members, duplicate suppression, birthday copy, member/admin access,
service-role and trigger behavior, and migration grants. It is not an end-to-end
Auth, Realtime, production schema or migration-deployment test.

The birthday function must also be scheduled by an authorized operator. The
absence of a matching `cron.job` entry does not rule out another scheduler, but
no recurring execution should be assumed until its actual source is identified
and verified. Issue #25 remains open pending verification of real Auth/RLS and
birthday scheduling and deployment of the relevant migrations.
