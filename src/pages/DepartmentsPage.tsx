import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Plus, Search, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getDepartments } from '../lib/supabaseOrgHierarchy';
import { OrgDepartmentCard } from '../components/org/OrgDepartmentCard';
import { DepartmentModal } from '../components/org/DepartmentModal';
import { OrgDepartment } from '../lib/supabaseOrgHierarchy';

export const DepartmentsPage: React.FC = () => {
  const navigate = useNavigate();

  const [departments, setDepartments] = useState<OrgDepartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

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
              Luminary Topluluğu bölümlerini yönetin.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-ice-500/20 to-ice-500/10 border border-ice-500/20 px-5 py-3 text-sm font-semibold text-ice-300 hover:bg-gradient-to-r from-ice-500/25 to-ice-500/15 hover:border-ice-500/30 transition-all shadow-[0_0_40px_rgba(116,192,252,0.08)]"
        >
          <Plus className="h-4 w-4" />
          Yeni Bölüm
        </button>
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

      {/* Cards */}
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
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredDepartments.map((dept) => (
                <OrgDepartmentCard
                  key={dept.id}
                  department={dept}
                  onClick={() =>
                    navigate(`/organizasyon/bolum/${dept.id}/alanlar`)
                  }
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
    </div>
  );
};

