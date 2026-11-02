# Email Worker

A long-running Node.js worker for both email queues in the Task Manager database.

## Runtime

Use Node.js 24 LTS for local development and production. Both Docker build stages
and the worker CI job use Node.js 24. Node.js 24 receives updates through April
2028; review the [Node.js release schedule](https://nodejs.org/en/about/previous-releases)
before its end of life. Rebuild and redeploy the worker image after changing the
runtime; updating this file does not change an already running deployment.

## Queues

- email_queue: welcome, task assignment, membership, and birthday messages. Uses BIGINT queue IDs and template_params.
- speaker_email_queue: speaker-related messages. Uses UUID queue IDs and speaker-specific template fields.
- email_send_logs stores the general queue reference in queue_id and the speaker queue reference in speaker_queue_id. Do not coerce UUIDs into the BIGINT field.

The worker runs both processors immediately on startup and then every five minutes. The general processor invokes the idempotent birthday enqueue function using the Europe/Istanbul calendar date and reconciles delivery markers for sent birthday messages.

## Configuration

Set these environment variables in the worker's secret manager:

- SUPABASE_URL: the Supabase project URL.
- SUPABASE_SERVICE_ROLE_KEY: server-only service-role key. Never expose this key to the browser or commit it to Git.

Provider settings (brevo_api_key, sender_email, sender_name, daily_limit, retry_limit, and enabled) are read from the backend-only email_settings table.

The service must run as a persistent Node.js process because it uses node-cron. A serverless deployment that suspends the process will not run this in-process schedule reliably; use an always-on worker or a protected scheduled endpoint that invokes the processors.

## Template safety

For locally rendered HTML, template markup must come from a trusted template author. `{{name}}` values are plain text and are HTML-escaped; the subject remains plain text. Dynamic attributes, including links and image URLs, as well as placeholders in scripts, styles, comments, SVG and template elements are rejected. There is no trusted-HTML placeholder. Use fixed, trusted links in the template until context-aware URL support is added.

Brevo-hosted templates (`brevo_template_id`) are rendered by Brevo, not this local renderer. Their parameter escaping and URL handling must be reviewed separately in Brevo before using untrusted values; the local checks do not establish their safety.

## Local checks

From this directory:

\`\`\`sh
npm ci
npm test
\`\`\`

The automated tests cover template rendering, parameter normalization, and worker startup against a disabled local mock backend. The worker CI job also builds the Docker image. Provider delivery and queue retry behavior still require integration tests. Do not test by sending real email to community members; use a sandbox/test recipient and a controlled queue fixture.

The worker's `src/types_db.ts` contains the relevant definitions generated from
the Task Manager Supabase schema. Regenerate the types and update those
definitions when the database schema changes.
