import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useUserProfile } from '../context/UserProfileContext';

type MemberTask = {
  id: string;
  title: string;
  description?: string | null;
  status?: string | null;
  deadline?: string | null;
  points?: number | null;
};

type ProfilePageData = {
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
  org_department_members?: { id: string; department?: { id: string; name: string } }[];
  member_announcements?: { id: string; announcement_title: string; announcement_body?: string | null }[];
  member_attachments?: { id: string; attachment_name: string; attachment_url: string }[];
  tasks?: MemberTask[];
};

export function LegacyProfileLink() {
  return <div className="p-8 text-sm text-[var(--text-secondary)]">
    Bu eski profil bağlantısı artık kullanılamıyor. Profilinizi görmek için giriş yapıp Profilim sayfasını açın.
  </div>;
}

export default function ProfilePage() {
  const { user, profile, isLoading: authLoading } = useUserProfile();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [data, setData] = useState<ProfilePageData | null>(null);

  useEffect(() => {
    let active = true;
    setData(null);
    setError(false);
    if (authLoading) return () => { active = false; };
    if (!user || !profile?.id) {
      setLoading(false);
      return () => { active = false; };
    }

    setLoading(true);
    const expectedMemberId = profile.id;
    void (async () => {
      try {
        // The database resolves the member from the authenticated session.
        const { data: result, error: requestError } = await supabase.rpc('get_my_profile');
        if (!active) return;
        if (requestError || !result || result.member?.id !== expectedMemberId) {
          setError(true);
          return;
        }
        setData(result as ProfilePageData);
      } catch {
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [authLoading, user?.id, profile?.id]);

  if (authLoading || loading || (data && data.member.id !== profile?.id)) {
    return <div className="p-8 text-sm text-[var(--text-secondary)]">Profil yükleniyor…</div>;
  }
  if (!user || !profile?.id) {
    return <div className="p-8 text-sm text-[var(--text-secondary)]">Profilinizi görmek için giriş yapmalısınız.</div>;
  }
  if (error || !data) {
    return <div role="alert" className="p-8 text-sm text-red-500">Profil yüklenemedi. Lütfen tekrar deneyin.</div>;
  }

  const member = data.member;
  const avatarUrl = member.avatar?.trim() ? member.avatar : null;

  const tasks = data.tasks ?? [];
  const areas = data.org_department_members ?? [];
  const announcements = data.member_announcements ?? [];
  const attachments = data.member_attachments ?? [];

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

