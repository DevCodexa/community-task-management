# Worker operational log privacy

Provider, database and transport errors can include credentials, URLs, recipient
addresses or request bodies. The worker's own console messages now report a
fixed event and, when relevant, the queue item ID instead of printing raw
exception text or provider message IDs. The sender still distinguishes an
unknown delivery outcome, a queue-update failure after delivery and a
best-effort send-log failure; these events require operator investigation and
must not automatically cause a resend.

Queue IDs are operational identifiers, not anonymous data: access to the
corresponding queue and delivery records must remain restricted. This change
only covers the repository worker's console messages. It does not sanitize
historical logs, third-party services, existing queue `error_message` fields or
database send-log records. Review retention and access separately; never copy
raw provider responses or credentials into shared logs.

Run `npm --prefix email-worker test` on Node 24. Tests inject synthetic secrets
and addresses into provider and database failures and assert that expected
operation labels and queue IDs remain while those details do not reach console
logs. They use fake services and do not test a deployed worker, provider,
centralized logging system or live environment.
