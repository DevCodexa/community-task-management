# Birthday email deduplication

`20261111210347_avoid_duplicate_birthday_team_mail.sql` replaces the birthday
enqueue function. For a birthday person and year, it does not enqueue a new
personal or team email when an earlier matching delivery is marked sent, is
recorded in the delivery ledger, or is claimed with an unknown provider
outcome. Team recipients are matched by the member ID stored in the queue's
idempotency key and, for older records, by email. This preserves suppression
when a recipient's email changes. Unclaimed jobs cancelled due to a birthday
correction can be enqueued for the corrected date.

A retained claim is deliberately conservative: an operator must reconcile the
provider outcome before deciding whether to retry. It does not guarantee
exactly-once delivery across external providers, discarded queue history, or
uncoordinated processors. The existing cancellation, retry and scheduling paths
still require separate verification.

## Deployment

This migration requires `20261104204533_email_delivery_claims.sql` and its
`delivery_claim_token` column. The Task Manager migration history previously
inspected did not include that change. Other processors sharing the queue must
also follow the claim protocol. Do not apply either migration without first
reviewing the current schema, coordinating every queue consumer, and testing
with synthetic data in an isolated compatible environment. A Git merge does
not apply a migration. No production changes or real emails are made by tests.

Run `node --test tests/birthday-team-dedupe.test.mjs` after `npm ci`. The test
uses synthetic records in PGlite, exercises repeated enqueue calls, delivery
and unknown-claim cases, changed recipient email and shared group deduplication.
It does not verify deployed worker behavior, the scheduler, provider delivery,
real Supabase Auth or concurrent requests.
