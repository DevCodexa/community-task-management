import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Calendar, Link2, Pencil, Plus, Trash2, Upload, Search } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

import { getAreasByDepartmentId, getDepartments, getProjectsByAreaId, getAreaMembersByAreaId,  OrgProject, } from '../lib/supabaseOrgHierarchy';
import { ProjectModal } from '../components/org/ProjectModal';

export const ProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const { areaId } = useParams<{ areaId: string }>();

  const [areaName, setAreaName] = useState<string>('Alan');
  const [departmentName, setDepartmentName] = useState<string>('Bölüm');
  const [projects, setProjects] = useState<OrgProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalProject, setModalProject] = useState<OrgProject | null>(null);

  const [memberCountMap, setMemberCountMap] = useState<Map<string, number>>(new Map());

  const fetchAreaCrumbs = async () => {
    if (!areaId) return;

    // We only have getDepartments() + getAreasByDepartmentId(deptId).
    // To get breadcrumb names reliably without adding new services, we iterate departments.
    const depts = await getDepartments();
    for (const d of depts) {
      const areas = await getAreasByDepartmentId(d.id);
      const found = areas.find((a) => a.id === areaId);
      if (found) {
        setDepartmentName(found ? d.name : d.name);
        setAreaName(found.name);
        return;
      }
    }
  };

  const refresh = async () => {
    if (!areaId) return;
    setLoading(true);
    setError(null);

    try {
      await fetchAreaCrumbs();
      const data = await getProjectsByAreaId(areaId);
      setProjects(data);
    } catch (e: any) {
      setError(e?.message || 'Projeler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areaId]);

  // Ekip sayısı: elimizde proje-personel tablosu yok; bu yüzden alan ekip sayısını projeye yansıtıyoruz.
  // (DB şemasına göre proje üyeliği ayrı tutulmuyorsa, bu doğru olacaktır.)
  useEffect(() => {
    let active = true;
    (async () => {
      if (!areaId) return;
      try {
        const members = await getAreaMembersByAreaId(areaId);
        const count = members.length;
        if (!active) return;
        const map = new Map<string, number>();
        projects.forEach((p) => map.set(p.id, count));
        setMemberCountMap(map);
      } catch {
        // ignore
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areaId, projects.length]);

  const filteredProjects = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;

    return projects.filter((p) => {
      return (
        p.name.toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q) ||
        (p.external_url || '').toLowerCase().includes(q)
      );
    });
  }, [projects, query]);

  const computeStatus = (p: OrgProject): { label: string; className: string } => {
    const now = new Date();

    const start = p.start_date ? new Date(p.start_date) : null;
    const end = p.end_date ? new Date(p.end_date) : null;

    // Bu sistemde start_date null gelirse "Başlamadı" kabul ediyoruz.
    if (!start) {
      return { label: 'Başlamadı', className: 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20' };
    }

    if (start && end && end < now) {
      return { label: 'Tamamlandı', className: 'bg-silver-500/10 text-silver-400 ring-1 ring-white/15' };
    }

    if (start && (!end || (now >= start && end >= now))) {
      return { label: 'Devam Ediyor', className: 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20' };
    }

    // now < start
    return { label: 'Başlamadı', className: 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20' };
  };

  const handleOpenCreate = () => {
    setModalProject(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: OrgProject) => {
    setModalProject(p);
    setIsModalOpen(true);
  };

  return (
    <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/organizasyon/bolumler`) }
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-silver-100 hover:bg-white/[0.06] hover:border-white/20 transition-all"
          >
            <ArrowLeft className="h-4 w-4 text-ice-300" />
            Bölümlere
          </button>

          <div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-silver-600">Bölümler</span>
              <span className="text-silver-500">›</span>
              <button
                type="button"
                onClick={() => navigate('/organizasyon/bolumler')}
                className="text-ice-300 hover:text-ice-200 font-semibold"
              >
                {departmentName}
              </button>
              <span className="text-silver-500">›</span>
              <span className="font-semibold text-silver-100">{areaName}</span>
            </div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-silver-100 sm:text-3xl mt-1">Projeler</h1>
            <p className="mt-1 text-sm text-silver-600">Projeleri ekleyin, güncelleyin ve yönetin.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-ice-500/20 to-ice-500/10 border border-ice-500/20 px-5 py-3 text-sm font-semibold text-ice-300 hover:bg-gradient-to-r from-ice-500/25 to-ice-500/15 hover:border-ice-500/30 transition-all shadow-[0_0_40px_rgba(116,192,252,0.08)]"
          >
            <Plus className="h-4 w-4" />
            Yeni Proje Ekle
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-silver-600" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Proje adı, açıklama veya linke göre ara..."
          className="w-full sm:max-w-xl pl-10 pr-4 py-2.5 rounded-lg bg-white/[0.03] border border-white/10 text-silver-100 text-sm placeholder:text-silver-700 focus:outline-none focus:border-ice-500/50 focus:ring-1 focus:ring-ice-500/20 transition-all"
        />
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-3">
          <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
            <Calendar className="h-4 w-4 text-red-300" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-400">Hata</p>
            <p className="text-xs text-red-300/80 mt-1">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-xs text-red-400 hover:text-red-300 underline">Kapat</button>
        </div>
      )}

      <div className="glass-card rounded-3xl p-1">
        <div className="p-1 sm:p-4">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center">
              <div className="h-12 w-12 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center">
                <div className="h-6 w-6 rounded-full border-2 border-ice-300/40 border-t-ice-300 animate-spin" />
              </div>
              <p className="text-sm text-silver-500 mt-4">Projeler yükleniyor...</p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-silver-400 font-medium">Kayıt bulunamadı</p>
              <p className="text-sm text-silver-600 mt-1">Arama kriterlerinizi değiştirmeyi deneyin.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead>
                  <tr className="text-xs text-silver-600">
                    <th className="px-4 py-3 font-semibold">Proje Adı & Açıklama</th>
                    <th className="px-4 py-3 font-semibold">Durum</th>
                    <th className="px-4 py-3 font-semibold">Ekip</th>
                    <th className="px-4 py-3 font-semibold">Dosya/Link</th>
                    <th className="px-4 py-3 font-semibold">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredProjects.map((p) => {
                    const status = computeStatus(p);
                    const count = memberCountMap.get(p.id) ?? 0;

                    return (
                      <tr key={p.id} className="group hover:bg-white/[0.03] transition-colors">
                        <td className="px-4 py-4">
                          <div>
                            <div className="text-sm font-bold text-silver-100 truncate">{p.name}</div>
                            <div className="text-sm text-silver-600 line-clamp-1">{p.description || '—'}</div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${status.className}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-white/[0.03] border border-white/10 text-silver-200">
                            {count}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            {p.file_url && (
                              <button
                                type="button"
                                onClick={() => window.open(p.file_url || '#', '_blank')}
                                className="text-silver-300 hover:text-ice-300"
                                title="Dosya"
                              >
                                <Upload className="h-4 w-4" />
                              </button>
                            )}
                            {p.external_url && (
                              <button
                                type="button"
                                onClick={() => window.open(p.external_url || '#', '_blank')}
                                className="text-silver-300 hover:text-ice-300"
                                title="Link"
                              >
                                <Link2 className="h-4 w-4" />
                              </button>
                            )}
                            {!p.file_url && !p.external_url && <span className="text-sm text-silver-600">—</span>}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(p)}
                              className="text-sm font-semibold text-ice-300 hover:text-ice-200"
                            >
                              <span className="inline-flex items-center gap-2">
                                <Pencil className="h-4 w-4" />
                                Güncelle
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                // silme modal içinde yapılacak; basit confirm
                                const ok = window.confirm(`"${p.name}" projesini silmek istiyor musunuz?`);
                                if (!ok) return;
                                setModalProject(p);
                                setIsModalOpen(true);
                              }}
                              className="text-sm font-semibold text-red-300/80 hover:text-red-300"
                            >
                              <span className="inline-flex items-center gap-2">
                                <Trash2 className="h-4 w-4" />
                                Sil
                              </span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <ProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setIsModalOpen(false);
          setModalProject(null);
          refresh();
        }}
        areaId={areaId || ''}
        project={modalProject}
      />
    </div>
  );
};

