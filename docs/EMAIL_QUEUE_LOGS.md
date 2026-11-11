# Email queue send logs

The general queue uses a `bigint` identifier. The speaker queue uses a UUID.
`email_send_logs.queue_id` references the general queue, while
`email_send_logs.speaker_queue_id` references the speaker queue. Exactly one
of these fields must be populated. The UUID must be passed as a string and
must never be converted to a number.

The migration `20261026005000_support_general_and_speaker_email_queue_logs.sql`
adds this split, the speaker foreign key, and the exactly-one-reference check.
Confirm the equivalent schema and migration history in each environment before
running a worker; merging a pull request does not apply a migration. Existing
invalid rows can prevent validation of the constraint. Do not silently delete
them; investigate and repair the source data using an approved migration plan.

Successful delivery is followed by a queue update and best-effort log insert.
A log-write failure must not cause a confirmed delivery to be retried. A failed
insert still requires operator investigation; the tests below do not guarantee
logging during outages or exactly-once delivery.

## Isolated integration test

Run with Node.js 24 after installing the lockfile dependencies:

```sh
npm ci
cd email-worker
npm ci
npm run build
cd ..
node --test supabase/tests/email-queue-logs.test.mjs
```

The test builds the pre-migration reference tables in PGlite, applies the real
migration twice, exercises both compiled worker processors with a fake mail
provider and queue client, and sends their log inserts through the database's
actual foreign-key and check constraints. It verifies both successful sends,
unaltered speaker UUIDs, missing/duplicate references, and nonexistent IDs.
The queue client and provider are test doubles, and no real email is sent. This
is not a live Supabase Auth, PostgREST, deployment or Brevo delivery test.
