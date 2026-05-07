import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Building2, ExternalLink, Eye, Pencil, Search, Trash2, Plus, Users } from 'lucide-react';
import { AreaDetailModal } from '../components/org/AreaDetailModal';

import { useNavigate, useParams } from 'react-router-dom';
import {
  deleteArea,
  getDepartments,
  getAreasByDepartmentId,
  getAreaMembersByAreaId,
  OrgArea,
  OrgAreaMember,
} from '../lib/supabaseOrgHierarchy';
import { AreaModal } from '../components/org/AreaModal';

export const AreasPage: React.FC = () => {
  const navigate = useNavigate();
  const { deptId } = useParams<{ deptId: string }>();

  const [departmentName, setDepartmentName] = useState<string>('Bölüm');
  const [areas, setAreas] = useState<OrgArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedArea, setSelectedArea] = useState<OrgArea | null>(null);
  const [selectedDetailArea, setSelectedDetailArea] = useState<OrgArea | null>(null);

  const fetchDepartmentName = async (id: string) => {
    const depts = await getDepartments();
    const found = depts.find((d) => d.id === id);
    setDepartmentName(found?.name ?? 'Bölüm');
  };

  const fetchAreas = async (id: string) => {
    const data = await getAreasByDepartmentId(id);
    setAreas(data);
  };

  const fetchMembersCounts = async (list: OrgArea[]): Promise<Map<string, number>> => {
    const counts = new Map<string, number>();

    await Promise.all(
      list.map(async (a) => {
        const members: OrgAreaMember[] = await getAreaMembersByAreaId(a.id);
        counts.set(a.id, members.length);
      })
    );

    return counts;
  };

  const [membersCountMap, setMembersCountMap] = useState<Map<string, number>>(new Map());

  const fetchAll = async () => {
    if (!deptId) {
      setError('Bölüm ID bulunamadı.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await fetchDepartmentName(deptId);
      await fetchAreas(deptId);
    } catch (e: any) {
      setError(e?.message || 'Alanlar yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deptId]);

  useEffect(() => {
    if (!areas.length) return;

    let active = true;
    (async () => {
      try {
        const map = await fetchMembersCounts(areas);
        if (!active) return;
        setMembersCountMap(map);
      } catch {
        // ekip sayısı hesaplanamazsa listeler yine görünür
      }
    })();

    return () => {
      active = false;
    };
  }, [areas]);

  const filteredAreas = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return areas;

    return areas.filter((a) => {
      const leaderName = a.area_leader?.name || '';
      return (
        a.name.toLowerCase().includes(q) ||
        (a.description || '').toLowerCase().includes(q) ||
        leaderName.toLowerCase().includes(q)
      );
    });
  }, [areas, query]);

  const openCreateModal = () => {
    setSelectedArea(null);
    setIsModalOpen(true);
  };

  const openEditModal = (area: OrgArea) => {
    setSelectedArea(area);
    setIsModalOpen(true);
  };

  const openDetailModal = async (area: OrgArea) => {
    setDetailLoading(true);
    setError(null);

    try {
      const members = await getAreaMembersByAreaId(area.id);
      setSelectedDetailArea({ ...area, members });
      setIsDetailOpen(true);
    } catch (e: any) {
      setError(e?.message || 'Alan üyeleri yüklenemedi.');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetailModal = () => {
    setIsDetailOpen(false);
    setSelectedDetailArea(null);
  };

  const handleDeleteArea = async (area: OrgArea) => {
    const confirmed = window.confirm(`"${area.name}" alanını kalıcı olarak silmek istediğinize emin misiniz?`);
    if (!confirmed) return;

    setLoading(true);
    setError(null);
    try {
      await deleteArea(area.id);
      await fetchAll();
    } catch (e: any) {
      setError(e?.message || 'Alan silinemedi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header / Breadcrumb */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/organizasyon/bolumler')}
            className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-silver-100 hover:bg-white/[0.06] hover:border-white/20 transition-all"
          >
            <ArrowLeft className="h-4 w-4 text-ice-300" />
            Bölümlere Dön
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]">
                <Building2 className="h-4 w-4 text-ice-300" />
              </span>
              <h1 className="font-display text-2xl font-bold tracking-tight text-silver-100 sm:text-3xl">
                Bölümler <span className="text-silver-600">›</span> {departmentName} <span className="text-silver-600">›</span> Alanlar
              </h1>
            </div>
            <p className="mt-1 text-sm text-silver-600">Alanlarınızı yönetin ve ekip atamalarını gerçekleştirin.</p>
          </div>
        </div>

        {/* Top Bar (right side) */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/organizasyon/bolumler')}
            className="sm:hidden inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-silver-100 hover:bg-white/[0.06] hover:border-white/20 transition-all"
            aria-label="Geri Git"
          >
            <ArrowLeft className="h-4 w-4 text-ice-300" />
            Geri Git
          </button>

          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-ice-500/20 to-ice-500/10 border border-ice-500/20 px-5 py-3 text-sm font-semibold text-ice-300 hover:bg-gradient-to-r from-ice-500/25 to-ice-500/15 hover:border-ice-500/30 transition-all shadow-[0_0_40px_rgba(116,192,252,0.08)]"
          >
            <Plus className="h-4 w-4" />
            Yeni Alan Ekle
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-silver-600" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Alan adı, açıklama veya lider adına göre ara..."
          className="w-full sm:max-w-xl pl-10 pr-4 py-2.5 rounded-lg bg-white/[0.03] border border-white/10 text-silver-100 text-sm placeholder:text-silver-700 focus:outline-none focus:border-ice-500/50 focus:ring-1 focus:ring-ice-500/20 transition-all"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-3">
          <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
            <Users className="h-4 w-4 text-red-300" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-400">Hata</p>
            <p className="text-xs text-red-300/80 mt-1">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-xs text-red-400 hover:text-red-300 underline">
            Kapat
          </button>
        </div>
      )}

      {/* Table */}
      <div className="glass-card rounded-3xl p-1">
        <div className="p-1 sm:p-4">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center">
              <div className="h-12 w-12 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center">
                <div className="h-6 w-6 rounded-full border-2 border-ice-300/40 border-t-ice-300 animate-spin" />
              </div>
              <p className="text-sm text-silver-500 mt-4">Alanlar yükleniyor...</p>
            </div>
          ) : filteredAreas.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-silver-400 font-medium">Kayıt bulunamadı</p>
              <p className="text-sm text-silver-600 mt-1">Arama kriterlerinizi değiştirmeyi deneyin.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead>
                  <tr className="text-xs text-silver-600">
                    <th className="px-4 py-3 font-semibold">Alan Adı</th>
                    <th className="px-4 py-3 font-semibold">Açıklama</th>
                    <th className="px-4 py-3 font-semibold">Alan Lideri</th>
                    <th className="px-4 py-3 font-semibold">Proje Sayısı</th>
                    <th className="px-4 py-3 font-semibold">Ekip Sayısı</th>
                    <th className="px-4 py-3 font-semibold">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredAreas.map((area) => {
                    const memberCount = membersCountMap.get(area.id) ?? 0;
                    const projectCount = area.projects?.length ?? 0;

                    return (
                      <tr key={area.id} className="group hover:bg-white/[0.03] transition-colors">
                        {/* Alan Adı */}
                        <td className="px-4 py-4">
                          <div className="text-sm font-bold text-silver-100 truncate">{area.name}</div>
                        </td>

                        {/* Açıklama */}
                        <td className="px-4 py-4">
                          <div className="text-sm text-silver-600 line-clamp-1">{area.description || '—'}</div>
                        </td>

                        {/* Alan Lideri */}
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full border border-white/10 bg-white/[0.03] overflow-hidden flex items-center justify-center shrink-0">
                              {area.area_leader?.avatar ? (
                                <img
                                  src={area.area_leader.avatar}
                                  alt={area.area_leader.name}
                                  className="h-full w-full object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="h-8 w-8 rounded-full bg-white/[0.05] flex items-center justify-center text-silver-600 text-xs font-bold">
                                  {(area.area_leader?.name?.[0] || '—').toUpperCase()}
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-silver-100 truncate">{area.area_leader?.name || 'Atanmadı'}</div>
                              <div className="text-xs text-silver-600 truncate">Lider</div>
                            </div>
                          </div>
                        </td>

                        {/* Proje Sayısı */}
                        <td className="px-4 py-4">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-white/[0.03] border border-white/10 text-silver-200">
                            {projectCount}
                          </span>
                        </td>

                        {/* Ekip Sayısı */}
                        <td className="px-4 py-4">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-white/[0.03] border border-white/10 text-silver-200">
                            {memberCount}
                          </span>
                        </td>

                        {/* İşlemler */}
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              className="p-2 rounded-lg text-ice-300 transition-transform duration-200 hover:scale-110 hover:text-ice-200 hover:bg-white/10"
                              onClick={() => void openDetailModal(area)}
                              title="Detay"
                              aria-label="Alan detayını görüntüle"
                              disabled={detailLoading}
                            >
                              <Eye className="h-4 w-4" />
                            </button>

                            <button
                              type="button"
                              className="p-2 rounded-lg text-silver-300 transition-transform duration-200 hover:scale-110 hover:text-silver-100 hover:bg-white/10"
                              onClick={() => navigate(`/organizasyon/alan/${area.id}/projeler`)}
                              title="Projeler Sayfasına Git"
                              aria-label="Projeler sayfasına git"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </button>

                            <button
                              type="button"
                              className="p-2 rounded-lg text-blue-500 transition-transform duration-200 hover:scale-110 hover:text-blue-400 hover:bg-white/10"
                              onClick={() => openEditModal(area)}
                              title="Güncelle"
                              aria-label="Alanı düzenle"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>

                            <button
                              type="button"
                              className="p-2 rounded-lg text-red-500 transition-transform duration-200 hover:scale-110 hover:text-red-400 hover:bg-white/10"
                              onClick={() => handleDeleteArea(area)}
                              title="Sil"
                              aria-label="Alanı sil"
                            >
                              <Trash2 className="h-4 w-4" />
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

      {/* Modal */}
      <AreaDetailModal
        isOpen={isDetailOpen}
        onClose={closeDetailModal}
        area={selectedDetailArea}
      />

      <AreaModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={async () => {
          setIsModalOpen(false);
          setSelectedArea(null);
          await fetchAll();
        }}
        departmentId={deptId || ''}
        area={selectedArea}
      />
    </div>
  );
};


