# Core RLS integration checks

Run `node --test tests/core-rls-integration.test.mjs` after `npm ci` with Node 24.
The dedicated CI workflow runs this test on pull requests and main. It uses
PGlite and synthetic identities; no Supabase credentials or production data are
needed.

The test applies the checked-in core hardening, registered-member policies and
identity-helper privilege migrations to a minimal schema. It verifies that
anonymous or unregistered users cannot read core rows or email queue data;
registered members can read the single-community directory and task list but
cannot mutate another member's task, reassign their own task, or administer the
organization; and an administrator can manage tasks and departments but cannot
promote a member to Super Admin. The trusted service role can access the queue.
Task status updates and allowed self-assignment are also exercised.

These fixtures are not a complete Supabase schema, and the test does not verify
Supabase Auth/JWT signature validation, PostgREST exposure, the actual live
policies, frontend CRUD, every migration or production deployments. The
application does not have an organization tenant key; these policies enforce a
single-community role model, not cross-organization tenant isolation. A real
isolated Supabase environment remains necessary for end-to-end role and CRUD
checks, including profile and email-delivery paths.
