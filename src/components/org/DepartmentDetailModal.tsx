import React from 'react';
import { X } from 'lucide-react';
import { OrgDepartment } from '../../lib/supabaseOrgHierarchy';

interface DepartmentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  department: OrgDepartment | null;
}

export const DepartmentDetailModal: React.FC<DepartmentDetailModalProps> = ({
  isOpen,
  onClose,
  department,
}) => {
  if (!isOpen || !department) return null;

  const responsible = department.responsible_person;
  const initials = responsible?.name ? responsible.name.charAt(0).toUpperCase() : '—';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-xl" onClick={onClose} />

      <div className="relative w-full max-w-xl rounded-3xl border border-white/10 bg-coal-800/95 shadow-2xl overflow-hidden max-h-[calc(100vh-4rem)]">
        <div className="p-6 border-b border-white/10 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-silver-500">Bölüm Detayı</p>
            <h2 className="mt-2 text-2xl font-bold text-silver-100">{department.name}</h2>
            {/*<p className="mt-2 text-sm text-silver-500">{department.description || 'Bu bölüm için bir açıklama bulunmuyor.'}</p>*/}
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
              {department.description || 'Bölüm henüz açıklama eklemedi.'}
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-white/[0.05] border border-white/10 overflow-hidden">
                  {responsible?.avatar ? (
                    <img
                      src={responsible.avatar}
                      alt={responsible.name}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <span className="text-3xl font-bold text-silver-100">{initials}</span>
                  )}
                </div>
                <div>
                  <p className="text-sm text-silver-500">Sorumlu Kişi</p>
                  <p className="text-xl font-semibold text-silver-100">{responsible?.name || 'Atanmadı'}</p>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-silver-500">Bilgiler</p>
                <div className="mt-3 space-y-2">
                  <div>
                    <p className="text-xs text-silver-500">E-posta</p>
                    <p className="text-sm text-silver-100">{responsible?.email || 'Belirtilmemiş'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-silver-500">Bölüm</p>
                    <p className="text-sm text-silver-100">{department.name}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

         {/*} <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <p className="text-sm uppercase tracking-[0.18em] text-silver-500">Departman Üyeleri</p>
            {department.members && department.members.length > 0 ? (
              <div className="mt-4 space-y-3">
                {department.members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full border border-white/10 bg-white/[0.03] overflow-hidden flex items-center justify-center">
                        {member.user?.avatar ? (
                          <img src={member.user.avatar} alt={member.user.name} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-xs font-bold text-silver-600">{member.user?.name?.[0]?.toUpperCase() ?? '—'}</span>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-silver-100">{member.user?.name || 'Bilinmeyen Üye'}</p>
                        <p className="text-xs text-silver-500">{member.role === 'LEADER' ? 'Lider' : 'Ekip Üyesi'}</p>
                      </div>
                    </div>
                    <p className="text-xs uppercase tracking-[0.16em] text-silver-500">{member.role}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-silver-500">Departmana atanmış üye yok.</p>
            )}
          </div>*/}

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