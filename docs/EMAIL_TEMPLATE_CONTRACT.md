# Email template contract

The worker uses active records in `email_templates`. The general queue uses the
record's `template_code` and `template_params`; both the subject and local HTML
are checked for `{{parameter}}` placeholders before delivery. A missing or
blank required value and a missing or inactive template follow the existing
bounded failure/retry path and are not sent. Dynamic parameter values in local
HTML are escaped by the renderer. Unknown template records are never invented by
the worker.

The following names were present in the Task Manager database at inspection;
other environments and later edits can differ. The actual contract comes from
the active template's subject and HTML and must match its enqueue caller.

| Code | Template placeholders |
| --- | --- |
| `welcome_member` | `member_name`, `join_date` |
| `task_assigned` | `member_name`, `task_name`, `deadline` |
| `announcement_general` | `member_name`, `announcement_title`, `announcement_description` |
| `announcement_member` | `member_name`, `announcement_title`, `announcement_body` |
| `project_member` | `member_name`, `project_name` |
| `department_member` | `member_name`, `department_name` |
| `area_member`, `member_area_assigned` | `member_name`, `area_name` |
| `event_speaker` | `speaker_name`, `event_name`, `event_date`, `event_location` |
| `event_staff_member` | `member_name`, `event_name`, `event_date`, `event_location` |
| `birthday_personal` | `member_name` |
| `birthday_team` | `birthday_person` |
| `manual_compose` | `subject`, `html_content` |
| `other` | `subject`, `title`, `member_name`, `message` |

Different database environments can contain additional active template codes.
The worker reports missing names without printing their values. This check is
not an audit of every environment's callers or their templates.

On 2026-11-11, read-only inspection of the Task Manager database found that
active enqueue triggers for welcome, tasks, organization membership, events and
announcements provide the placeholder names listed above. The checked-in
versioned birthday enqueue functions provide `member_name` and
`birthday_person`; the historical organization enqueue SQL supplies its names
as well. These observations do not verify each trigger by executing it or
guarantee that values are nonempty. The general worker rejects empty values
referenced by an active template, including optional announcement content.
`manual_compose`'s `html_content` placeholder is treated as untrusted text by
the local renderer, not as trusted markup.

The speaker queue uses the canonical `speaker_invite` code. The worker supplies
`speaker_name`, `speaker_title`, and `speaker_company`; it also provides the
older `member_name`, `full_name`, `title`, and `company` names for compatibility
with historical templates. The speaker's name is required; an absent
optional title or company is represented as `Belirtilmemiş`. For compatibility
with deployed older triggers and already queued rows, a speaker `welcome` job is
looked up as `speaker_invite`; this alias does not apply to the general queue.
Unknown and inactive codes are not sent.

## Migration and deployment

Migration `20261111200122_align_speaker_email_template.sql` changes the speaker
queue default and normalizes newly inserted legacy `welcome` values to
`speaker_invite`. It does not rewrite existing queue rows or alter delivery
claims. Applying it is a separate database deployment; merging the code alone
does not apply it. Test on an isolated schema before rolling it out. The worker
accepts old rows independently of the migration, so deploy the compatible worker
before migrating a database used by an older worker. Coordinate any other
processor consuming these queues. Do not blindly run the historical
`database/setup_email_queue.sql` as a setup script; it contains obsolete queue
processing and trigger definitions.

When `brevo_template_id` is set, Brevo renders a separate provider-hosted
version, which the worker cannot inspect. Validation covers the subject and HTML
stored in `email_templates`, and the worker sends the parameters listed above;
it cannot discover additional placeholders or escaping rules configured in
Brevo. An operator must review the provider template against the local contract
and test it with a controlled recipient before enabling it. No live Brevo send
or hosted-template inspection is performed by the tests.

Run `npm --prefix email-worker test` and
`node --test supabase/tests/speaker-template-migration.test.mjs` after installing
both sets of dependencies. The latter uses isolated PGlite fixtures and does not
verify the target Supabase schema, its triggers, or an actual deployment.
