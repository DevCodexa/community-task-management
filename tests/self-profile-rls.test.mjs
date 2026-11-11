import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const a = 'a0000000-0000-4000-8000-000000000001';
const b = 'a0000000-0000-4000-8000-000000000002';

test('the self-profile RPC uses the session identity and never exposes stored tokens', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE ROLE anon;
      CREATE ROLE authenticated;
      CREATE FUNCTION public.current_member_id() RETURNS uuid LANGUAGE sql STABLE AS
        $$ SELECT nullif(current_setting('test.member_id', true), '')::uuid $$;
      CREATE FUNCTION public.current_profile_token() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULL::uuid $$;
      CREATE TABLE public.profiles (id uuid, member_id uuid, access_token uuid);
      CREATE TABLE public.members (
        id uuid, name text, email text, phone text, company text, job_title text, comm_title text, avatar text
      );
      CREATE TABLE public.tasks (
        id uuid, title text, description text, status text, deadline timestamptz,
        points integer, created_at timestamptz, assignee_id uuid
      );
      CREATE TABLE public.org_departments (id uuid, name text, deleted_at timestamptz);
      CREATE TABLE public.org_department_members (id uuid, user_id uuid, department_id uuid, deleted_at timestamptz);
      INSERT INTO public.members (id, name, email) VALUES ('${a}', 'Member A', 'a@example.invalid'), ('${b}', 'Member B', 'b@example.invalid');
      INSERT INTO public.profiles VALUES ('${a}', '${a}', '${b}');
      INSERT INTO public.tasks (id, title, assignee_id, created_at) VALUES ('${a}', 'A task', '${a}', now()), ('${b}', 'B task', '${b}', now());
      INSERT INTO public.org_departments (id, name) VALUES ('${a}', 'A department'), ('${b}', 'B department');
      INSERT INTO public.org_department_members (id, user_id, department_id) VALUES ('${a}', '${a}', '${a}'), ('${b}', '${b}', '${b}');
      ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
      CREATE POLICY unsafe_old_policy ON public.profiles FOR SELECT TO anon USING (true);
      GRANT ALL ON public.profiles TO anon, authenticated;
      GRANT SELECT (access_token) ON public.profiles TO anon, authenticated;
      GRANT SELECT ON public.members, public.tasks, public.org_departments, public.org_department_members TO authenticated;
    `);

    const sql = await readFile(new URL('../supabase/migrations/20261111172605_authenticated_self_profile.sql', import.meta.url), 'utf8');
    await db.exec(sql);
    await db.exec(sql);

    await db.exec('SET ROLE anon');
    await assert.rejects(db.query('SELECT public.get_my_profile()'), (error) => error.code === '42501');
    await assert.rejects(db.query('SELECT access_token FROM public.profiles'), (error) => error.code === '42501');

    await db.exec("RESET ROLE; SET ROLE authenticated; SELECT set_config('test.member_id', '', false)");
    assert.equal((await db.query('SELECT public.get_my_profile() AS profile')).rows[0].profile, null);
    await assert.rejects(db.query('SELECT access_token FROM public.profiles'), (error) => error.code === '42501');
    await assert.rejects(db.query('SELECT public.current_profile_token()'), (error) => error.code === '42501');

    for (const [memberId, name, task, department] of [[a, 'Member A', 'A task', 'A department'], [b, 'Member B', 'B task', 'B department']]) {
      await db.query("SELECT set_config('test.member_id', $1, false)", [memberId]);
      const profile = (await db.query('SELECT public.get_my_profile() AS profile')).rows[0].profile;
      assert.equal(profile.member.id, memberId);
      assert.equal(profile.member.name, name);
      assert.deepEqual(profile.tasks.map((item) => item.title), [task]);
      assert.deepEqual(profile.org_department_members.map((item) => item.department.name), [department]);
      assert.doesNotMatch(JSON.stringify(profile), /access_token|profile_token/);
    }
    await assert.rejects(db.query('SELECT public.get_my_profile($1::uuid)', [a]), (error) => error.code === '42883');

    await db.exec('RESET ROLE');
    assert.equal((await db.query('SELECT count(*)::int AS count FROM public.profiles')).rows[0].count, 1);
  } finally {
    await db.close();
  }
});
