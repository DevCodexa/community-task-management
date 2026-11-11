import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const migration = await readFile(new URL('../migrations/20261111200122_align_speaker_email_template.sql', import.meta.url), 'utf8');

test('speaker queue inserts normalize legacy welcome while existing jobs and custom codes are untouched', async () => {
  const db = new PGlite();
  try {
    await db.exec(`CREATE TABLE public.speaker_email_queue (id integer primary key, email_type text not null default 'welcome');
      INSERT INTO public.speaker_email_queue (id) VALUES (1);`);
    await db.exec(migration);
    await db.exec(migration);
    await db.exec(`INSERT INTO public.speaker_email_queue (id) VALUES (2);
      INSERT INTO public.speaker_email_queue (id, email_type) VALUES (3, 'welcome'), (4, 'speaker_invite'), (5, 'custom_code');`);
    await db.exec(`CREATE ROLE enqueue_actor;
      GRANT INSERT ON public.speaker_email_queue TO enqueue_actor;
      SET ROLE enqueue_actor;
      INSERT INTO public.speaker_email_queue (id, email_type) VALUES (6, 'welcome');
      RESET ROLE;`);
    const result = await db.query('SELECT id, email_type FROM public.speaker_email_queue ORDER BY id');
    assert.deepEqual(result.rows, [
      { id: 1, email_type: 'welcome' }, { id: 2, email_type: 'speaker_invite' },
      { id: 3, email_type: 'speaker_invite' }, { id: 4, email_type: 'speaker_invite' }, { id: 5, email_type: 'custom_code' },
      { id: 6, email_type: 'speaker_invite' },
    ]);
  } finally { await db.close(); }
});
