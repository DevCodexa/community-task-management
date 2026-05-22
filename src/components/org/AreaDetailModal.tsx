import React from 'react';
import { X } from 'lucide-react';
import { OrgArea } from '../../lib/supabaseOrgHierarchy';

interface AreaDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  area: OrgArea | null;
}

export const AreaDetailModal: React.FC<AreaDetailModalProps> = ({
  isOpen,
  onClose,
  area,
}) => {
  if (!isOpen || !area) return null;

  const leader = area.area_leader;
  const initials = leader?.name ? leader.name.charAt(0).toUpperCase() : '—';
  const members = (area.members || []).filter((member) => member.role === 'TEAM_MEMBER');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-xl" onClick={onClose} />

      <div className="relative w-full max-w-xl rounded-3xl border border-white/10 bg-coal-800/95 shadow-2xl overflow-hidden max-h-[calc(100vh-4rem)]">
        <div className="p-6 border-b border-white/10 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-silver-500">Alan Detayı</p>
            <h2 className="mt-2 text-2xl font-bold text-silver-100">{area.name}</h2>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl border border-white/10 text-silver-400 hover:text-silver-200 hover:bg-white/[0.05] transition-colors"
            aria-label="Kapat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-20rem)]">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <p className="text-sm uppercase tracking-[0.18em] text-silver-500">Açıklama</p>
            <p className="mt-3 text-sm leading-7 text-silver-200">
              {area.description || 'Alan henüz açıklama eklemedi.'}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-white/[0.05] border border-white/10 overflow-hidden">
                  {leader?.avatar ? (
                    <img
                      src={leader.avatar}
                      alt={leader.name}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <span className="text-3xl font-bold text-silver-100">{initials}</span>
                  )}
                </div>
                <div>
                  <p className="text-sm text-silver-500">Sözcü</p>

                  <p className="text-xl font-semibold text-silver-100">{leader?.name || 'Atanmadı'}</p>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-silver-500">Bilgiler</p>
                <div className="mt-3 space-y-2">
                  <div>
                    <p className="text-xs text-silver-500">E-posta</p>
                    <p className="text-sm text-silver-100">{leader?.email || 'Belirtilmemiş'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-silver-500">Alan</p>
                    <p className="text-sm text-silver-100">{area.name}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.18em] text-silver-500">Ekip Üyeleri</p>
                <p className="mt-1 text-xs text-silver-600">Sözcü dahil olmayan atanan üyeler</p>

              </div>
            </div>

            {members.length > 0 ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center gap-3 rounded-3xl border border-white/10 bg-coal-900/70 p-4">
                    <div className="h-12 w-12 rounded-full bg-white/[0.05] border border-white/10 overflow-hidden flex items-center justify-center text-xs font-semibold text-silver-100">
                      {member.user?.avatar ? (
                        <img
                          src={member.user.avatar}
                          alt={member.user.name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <span>{member.user?.name?.charAt(0).toUpperCase() || '—'}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-silver-100 truncate">{member.user?.name || 'Bilinmiyor'}</p>
                      <p className="text-xs text-silver-500">{member.user?.email || 'E-posta yok'}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-3xl border border-white/10 bg-coal-900/70 p-4 text-sm text-silver-500">
                Bu alanda henüz ekip üyesi atanmamış.
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.18em] text-silver-500">Projeler</p>
                <p className="mt-1 text-xs text-silver-600">Sadece proje isimleri gösterilir.</p>
              </div>
              <span className="text-xs text-silver-500">{area.projects?.length ?? 0} adet</span>
            </div>

            {area.projects && area.projects.length > 0 ? (
              <ul className="mt-4 space-y-2">
                {area.projects.map((project) => (
                  <li key={project.id} className="rounded-2xl border border-white/10 bg-coal-900/70 px-4 py-3 text-sm text-silver-100">
                    {project.name}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-4 rounded-3xl border border-white/10 bg-coal-900/70 p-4 text-sm text-silver-500">
                Bu alana ait proje bulunmuyor.
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-silver-400 hover:text-silver-200 hover:bg-white/[0.05] transition-colors"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
