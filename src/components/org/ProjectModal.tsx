import React, { useEffect, useMemo, useState } from 'react';
import { X, Pencil, Trash2, Save, Search, UserCheck, } from 'lucide-react';
import { Input } from '../ui/Input';
import { useTheme } from '../../context/ThemeContext';
import { OrgProject, getAreaMembersByAreaId, createProject, updateProject, deleteProject, setProjectMembers } from '../../lib/supabaseOrgHierarchy';
import { supabase } from '../../lib/supabase';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  areaId: string;
  project?: OrgProject | null;
}

type Mode = 'create' | 'edit';

type CandidateMember = {
  id: string;
  name: string;
  email: string;
  avatar: string;
};

export const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  areaId,
  project,
}) => {
  const { isIceBlue } = useTheme();

  const mode: Mode = project?.id ? 'edit' : 'create';

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [memberQuery, setMemberQuery] = useState('');
  const [memberCandidates, setMemberCandidates] = useState<CandidateMember[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setName('');
    setDescription('');
    setFileUrl('');
    setExternalUrl('');
    setStartDate('');
    setEndDate('');

    setMemberQuery('');
    setMemberCandidates([]);
    setSelectedMemberIds([]);
    setSubmitting(false);
    setError(null);

    if (mode === 'edit' && project) {
      setName(project.name);
      setDescription(project.description || '');
      setFileUrl(project.file_url || '');
      setExternalUrl(project.external_url || '');
      setStartDate(project.start_date ? new Date(project.start_date).toISOString().slice(0, 10) : '');
      setEndDate(project.end_date ? new Date(project.end_date).toISOString().slice(0, 10) : '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mode, project?.id, areaId]);

  useEffect(() => {
    if (!isOpen || !areaId) return;

    const query = memberQuery.trim().toLowerCase();
    if (query.length < 2) {
      setMemberCandidates([]);
      return;
    }

    let active = true;

    (async () => {
      try {
        const res = await getAreaMembersByAreaId(areaId);
        const mapped: CandidateMember[] = (res || []).map((m: any) => ({
          id: m.user_id,
          name: m.user?.name || '—',
          email: m.user?.email || '',
          avatar: m.user?.avatar || '',
        }));

        if (!active) return;

        const filtered = mapped.filter((member) => {
          return (
            member.name.toLowerCase().includes(query) ||
            member.email.toLowerCase().includes(query)
          );
        });

        setMemberCandidates(filtered);
      } catch (e: any) {
        if (!active) return;
        setError(e?.message || 'Ekip üyeleri yüklenemedi.');
      }
    })();

    return () => {
      active = false;
    };
  }, [isOpen, areaId, memberQuery]);

  const filteredAreaMembers = useMemo(() => {
    const q = memberQuery.trim().toLowerCase();
    if (!q) return memberCandidates;

    return memberCandidates.filter((m) => {
      return (m.name || '').toLowerCase().includes(q) || (m.email || '').toLowerCase().includes(q);
    });
  }, [memberCandidates, memberQuery]);

  const toggleMember = (id: string) => {
    setSelectedMemberIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      return [...prev, id];
    });
  };

  const handleSubmit = async () => {
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Proje adı zorunludur.');
      return;
    }
    if (!areaId) {
      setError('AreaId bulunamadı.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        area_id: areaId,
        name: trimmedName,
        description: description.trim() ? description.trim() : null,
        file_url: fileUrl.trim() ? fileUrl.trim() : null,
        external_url: externalUrl.trim() ? externalUrl.trim() : null,
        start_date: startDate ? startDate : null,
        end_date: endDate ? endDate : null,
      };

      if (mode === 'create') {
        const created = await createProject(payload);

        // Proje üye ataması
        if (selectedMemberIds.length) {
          await setProjectMembers({
            project_id: created.id,
            memberIds: selectedMemberIds,
          });
        }
      } else {
        if (!project?.id) throw new Error('Güncellenecek proje bulunamadı.');
        await updateProject({
          project_id: project.id,
          ...payload,
        } as any);

        // Proje üye ataması (edit sırasında da sync)
        await setProjectMembers({
          project_id: project.id,
          memberIds: selectedMemberIds,
        });
      }


      onSuccess();
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Proje kaydedilemedi.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (mode !== 'edit' || !project?.id) return;

    const ok = window.confirm(`"${project.name}" projesini silmek istediğinize emin misiniz?`);
    if (!ok) return;

    setSubmitting(true);
    setError(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        setError('Oturum gerekli: silme işlemi için giriş yapmalısınız.');
        return;
      }

      await deleteProject(project.id);
      onSuccess();
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Proje silinemedi.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-xl" onClick={onClose} />

      <div className="relative w-full max-w-2xl rounded-3xl border border-white/10 bg-coal-900/95 shadow-3xl overflow-hidden max-h-[calc(100vh-4rem)]" style={{ background: isIceBlue ? 'rgba(255,255,255,0.92)' : undefined }}>
        <div className="p-6 border-b border-white/10 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-ice-500/10 border border-ice-500/20">
                {mode === 'edit' ? <Pencil className="h-4 w-4 text-ice-400" /> : <Save className="h-4 w-4 text-ice-400" />}
              </span>
              <h2 className="text-lg font-bold text-silver-100">{mode === 'edit' ? 'Proje Düzenle' : 'Proje Ekle'}</h2>
            </div>
            <p className="mt-1 text-sm text-silver-600">Başlangıç/bitiş, doküman ve ekip atamasını yapın.</p>
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

          <div className="space-y-5">
            <Input label="Proje Adı" value={name} onChange={(e) => setName((e.target as HTMLInputElement).value)} placeholder="Örn: Yazılım Altyapısı" />
            <Input label="Açıklama" value={description} onChange={(e) => setDescription((e.target as HTMLInputElement).value)} placeholder="Kısa açıklama" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Başlangıç"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate((e.target as HTMLInputElement).value)}
              />
              <Input
                label="Bitiş"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate((e.target as HTMLInputElement).value)}
              />
            </div>

            <Input label="Dosya URL" value={fileUrl} onChange={(e) => setFileUrl((e.target as HTMLInputElement).value)} placeholder="https://... (opsiyonel)" />
            <Input label="Çalışma Linki (external_url)" value={externalUrl} onChange={(e) => setExternalUrl((e.target as HTMLInputElement).value)} placeholder="https://... (opsiyonel)" />

            {/* Team selection UI (restricted to area members). */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-silver-500">Ekip</p>
                  <p className="text-sm text-silver-400 mt-1">Alan içindeki üyelere göre seçin ve gerekli kişileri atayın.</p>
                </div>
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs border border-ice-500/20 bg-ice-500/10 text-ice-300">
                  <UserCheck className="h-3.5 w-3.5" />
                  {selectedMemberIds.length} seçili
                </span>
              </div>

              {selectedMemberIds.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {selectedMemberIds.map((id) => {
                    const selectedMember = memberCandidates.find((m) => m.id === id);
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => toggleMember(id)}
                        className="inline-flex items-center gap-2 rounded-full border border-ice-500/20 bg-ice-500/10 px-3 py-1 text-xs text-ice-100 hover:bg-ice-500/15 transition-all"
                      >
                        <span className="truncate max-w-[10rem]">{selectedMember?.name || 'Seçili Üye'}</span>
                        <span aria-hidden="true">×</span>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-silver-600" />
                <input
                  value={memberQuery}
                  onChange={(e) => setMemberQuery(e.target.value)}
                  placeholder="Üye ara..."
                  className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-white/[0.03] border border-white/10 text-silver-100 text-sm placeholder:text-silver-700 focus:outline-none focus:border-ice-500/50 focus:ring-1 focus:ring-ice-500/20 transition-all"
                />
              </div>

              <div className="max-h-52 overflow-auto pr-1">
                {filteredAreaMembers.length === 0 ? (
                  <p className="text-sm text-silver-600 py-2">Eşleşen üye bulunamadı.</p>
                ) : (
                  <div className="space-y-2">
                    {filteredAreaMembers.map((m) => {
                      const active = selectedMemberIds.includes(m.id);
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => toggleMember(m.id)}
                          className={`w-full text-left rounded-xl border px-3 py-2 flex items-center gap-3 transition-all ${
                            active ? 'bg-ice-500/15 border-ice-500/30' : 'bg-white/[0.02] border-white/10 hover:bg-white/[0.04]'
                          }`}
                        >
                          <div className="h-9 w-9 rounded-full border border-white/10 bg-white/[0.03] overflow-hidden flex items-center justify-center shrink-0">
                            {m.avatar ? (
                              <img src={m.avatar} alt={m.name} className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-xs font-bold text-silver-600">{(m.name?.[0] || '—').toUpperCase()}</span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-silver-100 truncate">{m.name}</p>
                            <p className="text-xs text-silver-600 truncate">{m.email || '—'}</p>
                          </div>
                          <div className="shrink-0">
                            {active ? (
                              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-ice-500/20 border border-ice-500/30 text-ice-300">✓</span>
                            ) : (
                              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 text-silver-500">+</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* If DB has project-members later, this is where we would persist selection. */}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-6">
            {mode === 'edit' && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-500/20 bg-red-500/10 text-red-200 hover:bg-red-500/15 transition-all disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" />
                Sil
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-white/20 text-silver-400 hover:bg-white/10 transition-all text-sm font-medium"
              disabled={submitting}
            >
              Vazgeç
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-ice-500/20 border border-ice-500/20 text-ice-300 hover:bg-ice-500/25 hover:border-ice-500/30 transition-all text-sm font-semibold disabled:opacity-60"
            >
              {submitting ? 'Kaydediliyor...' : mode === 'edit' ? 'Güncelle' : 'Kaydet'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

