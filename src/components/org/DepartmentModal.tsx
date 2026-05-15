import React, { useEffect, useMemo, useState } from 'react';
import { X, Search, UserCheck, Building2 } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { Input } from '../ui/Input';
import { createDepartment, updateDepartment, getDepartmentMembersByDepartmentId, setDepartmentMembers, OrgDepartment } from '../../lib/supabaseOrgHierarchy';
import { searchMembers } from '../../lib/supabaseMembers';
import { supabase } from '../../lib/supabase';


type MemberPick = {
  id: string;
  name: string;
  email: string;
  avatar: string;
};

interface DepartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  department?: OrgDepartment | null;
}

export const DepartmentModal: React.FC<DepartmentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  department,
}) => {
  const { isIceBlue } = useTheme();
  const isEditing = Boolean(department?.id);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const [memberQuery, setMemberQuery] = useState('');
  const [members, setMembers] = useState<MemberPick[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const [loadingMembers, setLoadingMembers] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberPick | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setName(department?.name ?? '');
    setDescription(department?.description ?? '');
    setMemberQuery('');
    setMembers([]);
    setSelectedMemberId(department?.responsible_person?.id ?? null);
    setSelectedMember(
      department?.responsible_person
        ? {
            id: department.responsible_person.id,
            name: department.responsible_person.name,
            email: department.responsible_person.email ?? '',
            avatar: department.responsible_person.avatar,
          }
        : null
    );
    setLoadingMembers(false);
    setSubmitting(false);
    setError(null);
  }, [isOpen, department]);

  useEffect(() => {
    if (!isOpen || !department?.id) return;

    const loadMembers = async () => {
      try {
        const departmentMembers = await getDepartmentMembersByDepartmentId(department.id);
        const leader = departmentMembers.find((m) => m.role === 'LEADER');
        if (leader) {
          setSelectedMemberId(leader.user_id);
          if (leader.user) {
            setSelectedMember({
              id: leader.user.id,
              name: leader.user.name,
              email: leader.user.email ?? '',
              avatar: leader.user.avatar,
            });
          }
        }
      } catch (e: any) {
        // ignore, modal can still work without preloaded team
      }
    };

    loadMembers();
  }, [isOpen, department?.id]);

  useEffect(() => {
    if (!isOpen) return;

    const q = memberQuery.trim();
    if (!q || q.length < 2) {
      setMembers([]);
      return;
    }

    let active = true;
    (async () => {
      setLoadingMembers(true);
      setError(null);
      try {
        const res = await searchMembers(q);
        if (!active) return;

        const mapped: MemberPick[] = (res || []).map((m: any) => ({
          id: m.id,
          name: m.name,
          email: m.email,
          avatar: m.avatar,
        }));

        setMembers(mapped);
      } catch (e: any) {
        if (!active) return;
        setError(e?.message || 'Kişiler yüklenemedi.');
      } finally {
        if (!active) return;
        setLoadingMembers(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [memberQuery, isOpen]);

  const filteredMembers = useMemo(() => {
    const q = memberQuery.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => {
      const email = (m.email || '').toLowerCase();
      const nm = (m.name || '').toLowerCase();
      return nm.includes(q) || email.includes(q);
    });
  }, [members, memberQuery]);

  const handleSubmit = async () => {
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Ad alanı zorunludur.');
      return;
    }
    if (!selectedMemberId) {
      setError('Sorumlu kişi seçmelisiniz.');
      return;
    }
    if (!selectedMember) {
      setError('Seçtiğiniz kişi bulunamadı. Lütfen tekrar seçin.');
      return;
    }

    setSubmitting(true);
    try {
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      console.log('DepartmentModal submit session:', {
        hasSession: !!sessionData?.session,
        sessionErr,
        userId: sessionData?.session?.user?.id,
      });

      if (!sessionData?.session) {
        setError('Oturum gerekli: Bölüm oluşturmak için giriş yapmalısınız.');
        setSubmitting(false);
        return;
      }

      if (isEditing && department) {
        await updateDepartment({
          department_id: department.id,
          name: trimmedName,
          description: description.trim() ? description.trim() : null,
          responsible_person_id: selectedMemberId,
        });

        await setDepartmentMembers({
          department_id: department.id,
          memberIds: [selectedMemberId],
          leaderId: selectedMemberId,
        });
      } else {
        const created = await createDepartment({
          name: trimmedName,
          description: description.trim() ? description.trim() : null,
          responsible_person_id: selectedMemberId,
        });

        await setDepartmentMembers({
          department_id: created.id,
          memberIds: [selectedMemberId],
          leaderId: selectedMemberId,
        });

      }

      onSuccess();
    } catch (e: any) {
      setError(e?.message || (isEditing ? 'Bölüm güncellenemedi.' : 'Bölüm oluşturulamadı.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-xl" onClick={onClose} />

      <div
        className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-coal-900/95 shadow-3xl overflow-hidden max-h-[calc(100vh-4rem)]"
        style={{ background: isIceBlue ? 'rgba(255,255,255,0.92)' : undefined }}
      >
        <div className="p-6 border-b border-white/10 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-ice-500/10 border border-ice-500/20">
                <Building2 className="h-4 w-4 text-ice-400" />
              </span>
              <h2 className="text-lg font-bold text-silver-100">
                {isEditing ? 'Bölümü Düzenle' : 'Bölüm Ekle'}
              </h2>
            </div>
            <p className="mt-1 text-sm text-silver-600">
              {isEditing ? 'Mevcut bölümü ve sorumlu kişiyi güncelleyin.' : 'Ad, açıklama ve sorumlu kişi seçin.'}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl border border-white/10 text-silver-400 hover:text-silver-200 hover:bg-white/[0.05] transition-colors"
            aria-label="Kapat"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(100vh-20rem)]">
          {error && (
            <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <Input
              label="Ad"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Örn: Yazılım"
            />

            <Input
              label="Açıklama"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Kısa açıklama (opsiyonel)"
            />

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-silver-500">Sorumlu Kişi</p>
                  <p className="text-sm text-silver-400 mt-1">İsim veya e-posta ile ara.</p>
                </div>
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs border border-ice-500/20 bg-ice-500/10 text-ice-300">
                  <UserCheck className="h-3.5 w-3.5" />
                  Seçim
                </span>
              </div>

              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-silver-600" />
                <input
                  value={memberQuery}
                  onChange={(e) => setMemberQuery(e.target.value)}
                  placeholder="İsim veya e-posta ara..."
                  className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-white/[0.03] border border-white/10 text-silver-100 text-sm placeholder:text-silver-700 focus:outline-none focus:border-ice-500/50 focus:ring-1 focus:ring-ice-500/20 transition-all"
                />
              </div>

              {loadingMembers ? (
                <p className="text-sm text-silver-400 py-2">Kişiler aranıyor...</p>
              ) : (
                <div className="max-h-56 overflow-auto pr-1">
                  {filteredMembers.length === 0 ? (
                    <p className="text-sm text-silver-600 py-2">Kişi bulunamadı.</p>
                  ) : (
                    <div className="space-y-2">
                      {filteredMembers.map((m) => {
                        const active = m.id === selectedMemberId;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                        setSelectedMemberId(m.id);
                        setSelectedMember(m);
                      }}
                            className={`w-full text-left rounded-xl border px-3 py-2 flex items-center gap-3 transition-all ${
                              active
                                ? 'bg-ice-500/15 border-ice-500/30'
                                : 'bg-white/[0.02] border-white/10 hover:bg-white/[0.04]'
                            }`}
                          >
                            <div className="h-9 w-9 rounded-full border border-white/10 bg-white/[0.03] overflow-hidden flex items-center justify-center shrink-0">
                              {m.avatar ? (
                                <img src={m.avatar} alt={m.name} className="h-full w-full object-cover" />
                              ) : (
                                <span className="text-xs font-bold text-silver-600">
                                  {m.name?.[0]?.toUpperCase() ?? '—'}
                                </span>
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-silver-100 truncate">{m.name}</p>
                              <p className="text-xs text-silver-600 truncate">{m.email}</p>
                            </div>

                            <div className="shrink-0">
                              {active ? (
                                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-ice-500/20 border border-ice-500/30 text-ice-300">
                                  ✓
                                </span>
                              ) : (
                                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 text-silver-500">
                                  +
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>


            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-xl border border-white/20 text-silver-400 hover:bg-white/10 transition-all text-sm font-medium"
              >
                Vazgeç
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 px-4 py-2.5 rounded-xl bg-ice-500/20 border border-ice-500/20 text-ice-300 hover:bg-ice-500/25 hover:border-ice-500/30 transition-all text-sm font-semibold disabled:opacity-60"
              >
                {submitting ? 'Kaydediliyor...' : isEditing ? 'Güncelle' : 'Bölümü Oluştur'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

