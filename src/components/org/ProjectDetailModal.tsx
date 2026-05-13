import React, { useEffect, useState } from 'react';
import { Link2, Upload, X } from 'lucide-react';
import { getProjectMembersByProjectId, OrgProject, OrgProjectMember } from '../../lib/supabaseOrgHierarchy';

interface ProjectDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: OrgProject | null;
}

export const ProjectDetailModal: React.FC<ProjectDetailModalProps> = ({ isOpen, onClose, project }) => {
  const [teamMembers, setTeamMembers] = useState<OrgProjectMember[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [teamError, setTeamError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!project) return;

    (async () => {
      setLoadingTeam(true);
      setTeamError(null);
      try {
        const members = await getProjectMembersByProjectId(project.id);
        if (!active) return;
        setTeamMembers(members);
      } catch (error: any) {
        if (!active) return;
        console.warn('Projeye ait ekip yüklenemedi:', error);
        setTeamError('Ekip bilgisi yüklenemedi.');
      } finally {
        if (active) setLoadingTeam(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [project]);

  if (!isOpen || !project) return null;

  const statusLabel = (() => {
    const now = new Date();
    const start = project.start_date ? new Date(project.start_date) : null;
    const end = project.end_date ? new Date(project.end_date) : null;

    if (!start) return 'Başlamadı';
    if (start && end && end < now) return 'Tamamlandı';
    if (start && (!end || (now >= start && end >= now))) return 'Devam Ediyor';
    return 'Başlamadı';
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-xl" onClick={onClose} />

      <div className="relative w-full max-w-2xl rounded-3xl border border-white/10 bg-coal-800/95 shadow-2xl overflow-hidden max-h-[calc(100vh-4rem)]">
        <div className="p-6 border-b border-white/10 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-silver-500">Proje Detayı</p>
            <h2 className="mt-2 text-2xl font-bold text-silver-100">{project.name}</h2>
            <p className="mt-1 text-sm text-silver-500">{statusLabel}</p>
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
            <p className="mt-3 text-sm leading-7 text-silver-200">{project.description || 'Bu proje için açıklama bulunmuyor.'}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <p className="text-xs uppercase tracking-[0.18em] text-silver-500">Başlangıç Tarihi</p>
              <p className="mt-2 text-sm text-silver-100">{project.start_date || 'Belirtilmemiş'}</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <p className="text-xs uppercase tracking-[0.18em] text-silver-500">Bitiş Tarihi</p>
              <p className="mt-2 text-sm text-silver-100">{project.end_date || 'Belirtilmemiş'}</p>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <p className="text-sm uppercase tracking-[0.18em] text-silver-500">Linkler</p>
            <div className="mt-3 space-y-3">
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-coal-900/70 px-4 py-3">
                <Upload className="h-4 w-4 text-silver-400" />
                <div className="min-w-0">
                  <p className="text-sm text-silver-100">Dosya URL</p>
                  <p className="text-xs text-silver-500 truncate">{project.file_url || 'Yok'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-coal-900/70 px-4 py-3">
                <Link2 className="h-4 w-4 text-silver-400" />
                <div className="min-w-0">
                  <p className="text-sm text-silver-100">Harici Link</p>
                  <p className="text-xs text-silver-500 truncate">{project.external_url || 'Yok'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <p className="text-sm uppercase tracking-[0.18em] text-silver-500">Ekip</p>
            {loadingTeam ? (
              <p className="mt-3 text-sm text-silver-500">Ekip yükleniyor...</p>
            ) : teamError ? (
              <p className="mt-3 text-sm text-red-400">{teamError}</p>
            ) : teamMembers.length === 0 ? (
              <p className="mt-3 text-sm text-silver-400">Bu projeye henüz üye eklenmemiş.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {teamMembers.map((member) => (
                  <li key={member.id} className="rounded-2xl border border-white/10 bg-coal-900/70 px-4 py-3 text-sm text-silver-100">
                    {member.user?.name || 'Ad Soyad bulunamadı'}
                  </li>
                ))}
              </ul>
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
