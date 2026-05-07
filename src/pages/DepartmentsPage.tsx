import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Building2, LayoutGrid, List, Plus, Search, User } from 'lucide-react';

import { useNavigate } from 'react-router-dom';
import { getDepartments, deleteDepartment, OrgDepartment } from '../lib/supabaseOrgHierarchy';
import { OrgDepartmentCard } from '../components/org/OrgDepartmentCard';
import { DepartmentModal } from '../components/org/DepartmentModal';
import { DepartmentDetailModal } from '../components/org/DepartmentDetailModal';

export const DepartmentsPage: React.FC = () => {
  const navigate = useNavigate();

  const [departments, setDepartments] = useState<OrgDepartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<OrgDepartment | null>(null);

  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');


  const fetchDepartments = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDepartments();
      setDepartments(data);
    } catch (e: any) {
      setError(e?.message || 'Bölümler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const filteredDepartments = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return departments;

    return departments.filter((d) => {
      const respName = d.responsible_person?.name || '';
      return (
        d.name.toLowerCase().includes(q) ||
        (d.description || '').toLowerCase().includes(q) ||
        respName.toLowerCase().includes(q)
      );
    });
  }, [departments, query]);

  const openDetail = (department: OrgDepartment) => {
    setSelectedDepartment(department);
    setIsDetailOpen(true);
  };

  const openEdit = (department: OrgDepartment) => {
    setSelectedDepartment(department);
    setIsEditOpen(true);
  };

  const closeDetail = () => {
    setIsDetailOpen(false);
    setSelectedDepartment(null);
  };

  const closeEdit = () => {
    setIsEditOpen(false);
    setSelectedDepartment(null);
  };

  const handleDeleteDepartment = async (department: OrgDepartment) => {
    const confirmed = window.confirm(`"${department.name}" bölümünü kalıcı olarak silmek istediğinize emin misiniz?`);
    if (!confirmed) return;

    setLoading(true);
    setError(null);
    try {
      await deleteDepartment(department.id);
      await fetchDepartments();
      if (selectedDepartment?.id === department.id) {
        closeDetail();
      }
    } catch (e: any) {
      setError(e?.message || 'Bölüm silinemedi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Top Bar */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-silver-100 hover:bg-white/[0.06] hover:border-white/20 transition-all"
          >
            <ArrowLeft className="h-4 w-4 text-ice-300" />
            Dashboard
          </button>

          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-silver-100 sm:text-3xl">
              Bölümler
            </h1>
            <p className="mt-1 text-sm text-silver-600">
              Topluluğun bölümlerini yönetin.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-ice-500/20 to-ice-500/10 border border-ice-500/20 px-5 py-3 text-sm font-semibold text-ice-300 hover:bg-gradient-to-r from-ice-500/25 to-ice-500/15 hover:border-ice-500/30 transition-all shadow-[0_0_40px_rgba(116,192,252,0.08)]"
          >
            <Plus className="h-4 w-4" />
            Yeni Bölüm
          </button>

          <div className="inline-flex rounded-xl border border-white/10 bg-white/[0.03] p-1">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                viewMode === 'cards'
                  ? 'bg-white/[0.06] text-silver-100 border border-white/15 shadow-[0_0_0_rgba(0,0,0,0)]'
                  : 'text-silver-400 hover:text-silver-200'
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
              Kart Görünümü
            </button>

            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                viewMode === 'table'
                  ? 'bg-white/[0.06] text-silver-100 border border-white/15 shadow-[0_0_0_rgba(0,0,0,0)]'
                  : 'text-silver-400 hover:text-silver-200'
              }`}
            >
              <List className="h-4 w-4" />
              Tablo Görünümü
            </button>
          </div>
        </div>

      </div>

      {/* Search */}
      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-silver-600" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Bölüm adı, açıklama veya sorumlu kişiye göre ara..."
          className="w-full sm:max-w-xl pl-10 pr-4 py-2.5 rounded-lg bg-white/[0.03] border border-white/10 text-silver-100 text-sm placeholder:text-silver-700 focus:outline-none focus:border-ice-500/50 focus:ring-1 focus:ring-ice-500/20 transition-all"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-3">
          <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
            <User className="h-4 w-4 text-red-300" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-400">Hata</p>
            <p className="text-xs text-red-300/80 mt-1">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-xs text-red-400 hover:text-red-300 underline"
          >
            Kapat
          </button>
        </div>
      )}

      {/* View */}
      <div className="glass-card rounded-3xl p-1">
        <div className="p-1 sm:p-4">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center">
              <div className="h-12 w-12 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center">
                <div className="h-6 w-6 rounded-full border-2 border-ice-300/40 border-t-ice-300 animate-spin" />
              </div>
              <p className="text-sm text-silver-500 mt-4">Bölümler yükleniyor...</p>
            </div>
          ) : filteredDepartments.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-silver-400 font-medium">Kayıt bulunamadı</p>
              <p className="text-sm text-silver-600 mt-1">
                Arama kriterlerinizi değiştirmeyi deneyin.
              </p>
            </div>
          ) : viewMode === 'table' ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead>
                  <tr className="text-xs text-silver-600">
                    <th className="px-4 py-3 font-semibold">Bölüm Adı</th>
                    <th className="px-4 py-3 font-semibold">Açıklama</th>
                    <th className="px-4 py-3 font-semibold">Sorumlu Kişi</th>
                    <th className="px-4 py-3 font-semibold">Oluşturulma</th>
                    <th className="px-4 py-3 font-semibold">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredDepartments.map((dept) => (
                    <tr
                      key={dept.id}
                      className="group hover:bg-white/[0.03] transition-colors"
                      onClick={() => navigate(`/organizasyon/bolum/${dept.id}/alanlar`)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl border border-white/10 bg-white/[0.03] flex items-center justify-center">
                            <Building2 className="h-4 w-4 text-ice-300" />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-silver-100 truncate">{dept.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-silver-600 line-clamp-1">{dept.description || '—'}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full border border-white/10 bg-white/[0.03] overflow-hidden flex items-center justify-center shrink-0">
                            {dept.responsible_person?.avatar ? (
                              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                              <img
                                src={dept.responsible_person.avatar}
                                alt={dept.responsible_person.name}
                                className="h-full w-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-white/[0.05] flex items-center justify-center text-silver-600 text-xs font-bold">
                                {(dept.responsible_person?.name?.[0] || '—').toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-silver-100 truncate">{dept.responsible_person?.name || 'Atanmadı'}</div>
                            <div className="text-xs text-silver-600 truncate">Sorumlu</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-silver-600">
                          {dept.created_at ? new Date(dept.created_at).toLocaleDateString('tr-TR') : '—'}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap items-center gap-3 opacity-100 group-hover:opacity-100">
                          <button
                            type="button"
                            className="text-sm font-semibold text-ice-300 hover:text-ice-200"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDetail(dept);
                            }}
                          >
                            Detay
                          </button>
                          <button
                            type="button"
                            className="text-sm font-semibold text-amber-300 hover:text-amber-200"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEdit(dept);
                            }}
                          >
                            Düzenle
                          </button>
                          <button
                            type="button"
                            className="text-sm font-semibold text-red-300/80 hover:text-red-300"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteDepartment(dept);
                            }}
                          >
                            Sil
                          </button>
                          
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredDepartments.map((dept) => (
                <OrgDepartmentCard
                  key={dept.id}
                  department={dept}
                  onClick={() => navigate(`/organizasyon/bolum/${dept.id}/alanlar`)}
                  onView={() => openDetail(dept)}
                  onEdit={() => openEdit(dept)}
                  onDelete={() => handleDeleteDepartment(dept)}
                />
              ))}
            </div>
          )}
        </div>
      </div>


      {/* Modal */}
      <DepartmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setIsModalOpen(false);
          fetchDepartments();
        }}
      />

      <DepartmentModal
        isOpen={isEditOpen}
        onClose={closeEdit}
        onSuccess={() => {
          closeEdit();
          fetchDepartments();
        }}
        department={selectedDepartment}
      />

      <DepartmentDetailModal
        isOpen={isDetailOpen}
        onClose={closeDetail}
        department={selectedDepartment}
      />
    </div>
  );
};

