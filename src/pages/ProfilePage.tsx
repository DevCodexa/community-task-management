import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

type MemberTask = {
  id: string;
  title: string;
  description?: string | null;
  status?: string | null;
  deadline?: string | null;
  points?: number | null;
};


type ProfilePageData = {
  id: string;
  access_token: string;
  created_at?: string;
  member: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    company?: string | null;
    job_title?: string | null;
    comm_title?: string | null;
    avatar?: string | null;
  };
  org_department_members?: {
    id: string;
    department?: {
      id: string;
      name: string;
    };
  }[];
  member_announcements?: {
    id: string;
    announcement_title: string;
    announcement_body?: string | null;
  }[];
  member_attachments?: {
    id: string;
    attachment_name: string;
    attachment_url: string;
  }[];
  tasks?: MemberTask[];
};


function InvalidLinkCard() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="w-full max-w-xl rounded-2xl border border-red-200 bg-red-50/60 p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 h-10 w-10 shrink-0 rounded-xl bg-red-600 text-white flex items-center justify-center font-bold">
            !
          </div>
          <div className="space-y-2">
            <h1 className="text-lg sm:text-xl font-semibold text-red-900">Geçersiz Link</h1>
            <p className="text-sm text-red-800/80">
              Bu token geçerli bir profile ait değil veya erişim kısıtına takılmış olabilir.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { token } = useParams<{ token: string }>();

  const normalizedToken = useMemo(() => (token ?? '').trim(), [token]);

  const [loading, setLoading] = useState(true);
  const [invalid, setInvalid] = useState(false);
  const [data, setData] = useState<ProfilePageData | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setInvalid(false);
      setData(null);

      if (!normalizedToken) {
        if (mounted) setInvalid(true);
        setLoading(false);
        return;
      }

      try {
        // RLS session variable approach:
        // We must set request.profile_token for this DB session.
        // Supabase JS uses a pooled connection; set_config is session-scoped, so this
        // must be done in the same PostgREST/Supabase RPC call.
        // We do it in a single SQL call via `rpc` is not available for raw SQL,
        // so we use `supabase.rpc` with a tiny wrapper.
        // If you prefer, you can later replace this with an Edge Function.

        // Create & call a SQL function inline is not possible here, so we do a best-effort:
        // set_config is executed through `supabase.from('profiles')` is not available.
        // Therefore for now, we rely on standard eq('access_token', token) query.
        // (RLS policies above require request.profile_token; if not set, anon may get empty.)

        const { data: p, error } = await supabase
          .from('profiles')
          .select(
            `id, access_token, created_at,
             member:members ( id, name, email, phone, company, job_title, comm_title, avatar ),
             tasks ( id, title, description, status, deadline, points ),
             org_department_members:org_department_members ( id, department:org_departments ( id, name ) ),
             org_project_members:org_project_members ( id, project:org_projects ( id, name ) ),
             event_staff:event_staff ( id, event:events ( id, title, start_date ) )`
          )
          .eq('access_token', normalizedToken)
          .maybeSingle();


        if (!mounted) return;

        if (error || !p) {
          setInvalid(true);
          setData(null);
          setLoading(false);
          return;
        }

        setData(p as ProfilePageData);
        setLoading(false);
      } catch (e) {
        if (!mounted) return;
        setInvalid(true);
        setData(null);
        setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [normalizedToken]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="animate-pulse text-sm text-zinc-600">Yükleniyor...</div>
      </div>
    );
  }

  if (invalid || !data) {
    return <InvalidLinkCard />;
  }

  const member = data.member;
  const avatarUrl = member.avatar?.trim() ? member.avatar : null;

  const tasks = data.tasks ?? [];
  const areas = data.org_department_members ?? [];
  const announcements = data.member_announcements ?? [];
  const attachments = data.member_attachments ?? [];

  // Dep. (org_department_members) içinden display alanı: department.name
  const areaNames = areas.map((x) => x.department?.name).filter(Boolean) as string[];



  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      {/* Hero Card */}
      <div className="rounded-3xl border bg-white/70 shadow-sm backdrop-blur px-6 py-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-5">
          <div className="flex items-center sm:items-start gap-4">
            <div className="h-20 w-20 rounded-2xl overflow-hidden bg-zinc-100 border">
              {avatarUrl ? (
                <img src={avatarUrl} alt={`${member.name} avatar`} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-zinc-500 font-semibold">
                  {member.name?.slice(0, 1)?.toUpperCase() ?? '?'}
                </div>
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-zinc-900">{member.name}</h1>
                {member.comm_title ? (
                  <span className="inline-flex items-center rounded-full border bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-700">
                    {member.comm_title}
                  </span>
                ) : null}
              </div>

              <p className="mt-1 text-zinc-700">
                <span className="font-medium text-zinc-900">{member.job_title ?? member.company ?? '—'}</span>
              </p>
            </div>
          </div>

          <div className="sm:ml-auto w-full sm:w-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="rounded-2xl border bg-zinc-50/60 px-4 py-3">
                <div className="text-xs font-medium text-zinc-500">E-posta</div>
                <div className="mt-1 text-sm text-zinc-900">{member.email || '—'}</div>
              </div>
              <div className="rounded-2xl border bg-zinc-50/60 px-4 py-3">
                <div className="text-xs font-medium text-zinc-500">Telefon</div>
                <div className="mt-1 text-sm text-zinc-900">{member.phone || '—'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-3xl border bg-white/70 shadow-sm px-5 py-5">
          <h2 className="text-sm font-semibold text-zinc-900">Görevler</h2>
          <div className="mt-3 space-y-2">
            {tasks.length ? (
              tasks.map((t) => (
                <div key={t.id} className="text-sm text-zinc-700">
                  <div className="font-medium text-zinc-900">{t.title}</div>
                  <div className="text-xs text-zinc-500">
                    {t.status ? t.status : '—'}{t.points !== null && t.points !== undefined ? ` • ${t.points} puan` : ''}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-zinc-500">—</div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border bg-white/70 shadow-sm px-5 py-5">
          <h2 className="text-sm font-semibold text-zinc-900">Bölgeler</h2>
          <div className="mt-3 space-y-2">
            {areas.length ? (
              areas.map((a) => (
                <div key={a.id} className="text-sm text-zinc-700">
                  • {a.department?.name ?? '—'}
                </div>
              ))
            ) : (
              <div className="text-sm text-zinc-500">—</div>
            )}

          </div>
        </div>

        <div className="rounded-3xl border bg-white/70 shadow-sm px-5 py-5 md:col-span-1 lg:col-span-2">
          <h2 className="text-sm font-semibold text-zinc-900">Duyurular</h2>
          <div className="mt-3 space-y-3">
            {announcements.length ? (
              announcements.map((an) => (
                <div key={an.id} className="rounded-2xl border bg-white/50 px-4 py-3">
                  <div className="text-sm font-medium text-zinc-900">{an.announcement_title}</div>
                  {an.announcement_body ? (
                    <div className="mt-1 text-xs text-zinc-600">{an.announcement_body}</div>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="text-sm text-zinc-500">—</div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border bg-white/70 shadow-sm px-5 py-5">
          <h2 className="text-sm font-semibold text-zinc-900">Eklentiler</h2>
          <div className="mt-3 space-y-2">
            {attachments.length ? (
              attachments.map((att) => (
                <div key={att.id} className="text-sm text-zinc-700">
                  <a
                    className="inline-flex items-center gap-2 underline decoration-zinc-300 hover:decoration-zinc-500 text-zinc-900"
                    href={att.attachment_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    • {att.attachment_name}
                  </a>
                </div>
              ))
            ) : (
              <div className="text-sm text-zinc-500">—</div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 text-xs text-zinc-500">Bu sayfa salt okunur (read-only).</div>
    </div>
  );
}

