# Setup and operations

This guide covers the Vite frontend, its Supabase project, and the optional
long-running email worker. Follow it with an isolated test project first. It
does not deploy anything or change an existing database.

## Before starting: database prerequisite

The frontend needs a Supabase project containing the application's tables,
functions, triggers, grants and RLS policies, plus an authorized test user and
member profile. A newly created empty Supabase project is not sufficient.

The files in `supabase/migrations/` are versioned changes to an existing
schema, not a complete clean-database baseline. Several files in `database/`
are alternative, historical, or destructive reset scripts. Do not run all of
them in sequence or point `db reset` at an existing project. Establishing a
reproducible empty-database baseline is tracked in
[#14](https://github.com/codelovingcat/community-task-management/issues/14).
Until that is complete, an operator must provision a disposable, sanitized
test database from a known-compatible schema and verify its migration history.
Do not copy production users, personal data, tokens, provider keys or active
email jobs into test environments.

## 1. Configure and run the frontend

Prerequisites: Node.js 20 or newer, npm, Git, and access to the prepared test
Supabase project. Frontend CI currently uses Node.js 20; the worker uses 24.

```sh
git clone https://github.com/codelovingcat/community-task-management.git
cd community-task-management
npm ci
cp .env.example .env.local
```

On PowerShell, use `Copy-Item .env.example .env.local` instead of `cp`.
Set the following in `.env.local`, using the **test** project's dashboard:

| Name | Scope | Purpose |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Browser, required | URL of the intended Supabase project. |
| `VITE_SUPABASE_ANON_KEY` | Browser, required | That project's publishable or legacy anon key. |
| `VITE_APP_URL` | Browser, reserved | Present in the example, but not currently read by the frontend. |

`VITE_` values are bundled into client code. Never place a service-role key,
secret key, provider credential, or database password in them. The app validates
the URL and browser key at startup. Do not commit local environment files.

```sh
npm run dev
``

Open the local URL printed by Vite (usually `http://localhost:5173`).
Sign in with the designated test user. Auth users and application member
profiles are separate: verify that the test identity has the intended member
record and permissions. A public key is not an admin credential and does not
bypass RLS.

For local verification:

```sh
npm run test:notifications
node --test tests/supabase-config.test.mjs tests/event-staff.test.mjs tests/event-delete-ui.test.mjs tests/task-mutations.test.mjs tests/task-delete-ui.test.mjs
npm run build
```

`npm run preview` serves the local build. The tests above use fakes for
database mutations: a passing result does not prove live RLS or email delivery.
The build produces `dist/`; the current GitHub workflow also tests and builds
the separate worker.

## 2. Vercel environments

Connect the intended repository and use the repository root as the Vercel
project root. The existing Vite build command is `npm run build`, the output
directory is `dist`, and `vercel.json` rewrites application routes to the
SPA. Configure the two required `VITE_SUPABASE_...` variables independently
for Development, Preview and Production in the project's environment settings.

- **Development:** use the developer's isolated project.
- **Preview:** use a staging project and test accounts; a PR preview can
  otherwise read or change real data if pointed at production.
- **Production:** use the approved production project and its browser-safe key.

Verify that the URL and key belong to the same intended project without
printing the values. Vite embeds them at build time: after a configuration
change, create a new deployment and validate that deployment. A READY
deployment only proves that Vercel served the build; it does not prove that
authentication, RLS or database mutations work.

## 3. Database changes and recovery

Before any migration, identify the target project and environment, review the
exact SQL and migration history, prepare a recovery plan and test against an
isolated compatible database. Back up the target according to its plan and
verify that the backup or restore path is usable. Compare applied and pending
migrations with the repository; never mark an unverified schema as migrated.

Migration files in `supabase/migrations/` are named with timestamps; ordering
by name does not by itself supply missing base tables or establish that a
remote database matches the repository. Some changes have additional deployment
dependencies, including the email delivery-claims migration. Review each
change and the worker coordination notes before applying it. Use the current
Supabase CLI help and migration documentation for the installed CLI version;
do not run a blind production reset or push.

If the Supabase project is paused or unavailable, check the intended project and
its status in the dashboard, use the platform's available resume/restore path,
and wait for the API and authentication to recover. If restoration is required,
check backup age, plan limits and recovery instructions before taking action.
Once it is available, verify the frontend project URL, a test login and a
read-only query. Do not replay historical reset scripts as a recovery shortcut.

## 4. Email worker

The frontend does not need a worker to start. This repository's worker is an
optional persistent process in `email-worker/`; it runs both queue processors
at startup and every five minutes. Use Node.js 24 and configure its server-only
variables separately from Vercel's frontend variables:

| Name | Scope | Purpose |
| --- | --- | --- |
| `SUPABASE_URL` | Worker | URL of the worker's intended Supabase project. |
| `SUPABASE_SERVICE_ROLE_KEY` | Worker secret | Privileged server-only credential; never expose it to a browser. |

The worker reads provider configuration, including `brevo_api_key`, sender
identity, limits and `enabled`, from the backend-only `email_settings` table.
The worker README documents queue types, claim handling and the exact required
setting names. Do not log values or expose operational tables to browser clients.

Validate the code without sending email:

```sh
cd email-worker
npm ci
npm test
```

An always-on background service can run the compiled `npm start` process; its
build must first install dependencies and run `npm run build`. A suspended
serverless process will not reliably run the in-process schedule. Review the
platform configuration before deploying: the checked-in `render.yaml` is an
unverified starting point, not a ready-to-apply production blueprint.

**Do not enable this worker on a shared production queue until its required
claim migration is applied and every other consumer and manual-send route
obeys the same claim protocol or is stopped.** The worker README describes
this unresolved cross-service dependency and recovery of ambiguous claims.
Use only a dedicated test project and controlled recipient for delivery tests.

## 5. Smoke test and troubleshooting

Use a staging project, dedicated test account and disposable test records:

1. Open the application and a direct route such as `/bildirimler`; verify the
   SPA loads without a configuration error.
2. Sign in as the test user and confirm the expected member profile and
   notifications load. Sign out afterward.
3. For the role being tested, create, edit and delete a disposable task or
   event, refresh and confirm the result. Verify a non-authorized test account
   is denied. Do not use production member data for destructive checks.
4. If mail is in scope, use the isolated worker, approved test recipient and
   a controlled queue fixture. Check queue state and provider logs without
   exposing personal information or credentials.

| Symptom | What to check |
| --- | --- |
| Missing or invalid frontend configuration | Check variable **names**, environment scope and whether the URL and browser key belong to the same project; restart Vite or rebuild the deployment after changing them. |
| App loads but login or data calls fail | Check project availability, browser network status, Auth redirect configuration and the sanitized error. Confirm the target project before changing settings. |
| Empty result or permission denied | Confirm the session, linked member profile, grants and RLS policies for that role. Do not disable RLS or substitute a service key in the browser. |
| Project paused | Check project status and the available resume/restore path; after recovery, recheck login and a read-only query. |
| Worker does not process mail | Check process health, worker-only variable names, connectivity, backend settings, queue/claim migration compatibility and sanitized logs. An `enabled` value of false intentionally disables sending. |
| Pending claimed message or uncertain provider result | Follow the worker README's claim reconciliation process; check provider delivery before any retry. Do not blindly reset a claim. |

Useful platform references: [Supabase local development](https://supabase.com/docs/guides/local-development),
[Supabase database backups](https://supabase.com/docs/guides/platform/backups),
[Vercel environment variables](https://vercel.com/docs/environment-variables),
and [Render background workers](https://render.com/docs/background-workers).
