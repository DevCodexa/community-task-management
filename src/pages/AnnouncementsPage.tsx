import React, { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Search,
  Megaphone,
  Loader2,
  AlertCircle,
  Trash2,
  LayoutGrid,
  Table,
  Filter,
} from 'lucide-react';

import { EventType, EVENT_TYPE_LABELS, EVENT_TYPE_VALUES } from '../types/event';
import type { FullAnnouncement } from '../types/announcement';
import {
  getAnnouncements,
  deleteAnnouncement,
} from '../lib/supabaseAnnouncements';

import { AnnouncementFormModal } from '../components/announcements/AnnouncementFormModal';
import { AnnouncementTable } from '../components/announcements/AnnouncementTable';
import { AnnouncementCard } from '../components/announcements/AnnouncementCard';
import { AnnouncementDetailsModal } from '../components/announcements/AnnouncementDetailsModal';

export const AnnouncementsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [items, setItems] = useState<FullAnnouncement[]>([]);

  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<EventType | 'All'>('All');

  const [page, setPage] = useState(1);
  const [limit] = useState(12);
  const [totalPages, setTotalPages] = useState(1);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<FullAnnouncement | null>(null);

  const [details, setDetails] = useState<FullAnnouncement | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data, totalPages: tp } = await getAnnouncements({
        search: search.trim() || undefined,
        type: typeFilter === 'All' ? undefined : typeFilter,
        page,
        limit,
        sortBy: 'created_at',
        sortOrder: 'desc',
      });
      setItems(data);
      setTotalPages(tp);
    } catch (e: any) {
      setError(e?.message || 'Duyurular yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, typeFilter]);

  // Search debounce-like behavior (simple)
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      load();
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handleAdd = () => {
    setEditing(null);
    setIsFormOpen(true);
  };

  const handleEdit = (a: FullAnnouncement) => {
    setEditing(a);
    setIsFormOpen(true);
  };

  const handleView = (a: FullAnnouncement) => {
    setDetails(a);
    setIsDetailsOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAnnouncement(id);
      setDeleteConfirmId(null);
      setPage(1);
      await load();
    } catch (e: any) {
      setError(e?.message || 'Silme başarısız');
    }
  };

  const typeOptions = useMemo(() => {
    return [
      { value: 'All' as const, label: 'Tümü' },
      ...EVENT_TYPE_VALUES.map((t) => ({ value: t, label: EVENT_TYPE_LABELS[t] })),
    ];
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Loader2 className="h-8 w-8 animate-spin text-ice-400" />
      </div>
    );
  }

  return (
    <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-silver-100">Duyurular</h1>
          <p className="mt-2 text-xl text-silver-500">
            Topluluk için duyuru yönetimi
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-silver-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Duyuru ara..."
              className="pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/20 text-silver-100 placeholder-silver-600 focus:ring-2 focus:ring-ice-500/30 focus:border-white/50 transition-all w-72"
            />
          </div>

          <button
            onClick={handleAdd}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-ice-500 to-blue-500 text-white hover:from-ice-600 hover:to-blue-600 shadow-lg hover:shadow-xl transition-all"
          >
            <Plus className="h-4 w-4" />
            Yeni Duyuru
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Filters + View mode */}
      <div className="glass-card rounded-3xl p-1 mb-8">
        <div className="bg-coal-800/50 rounded-2xl p-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-silver-500" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-silver-100 focus:ring-2 focus:ring-ice-500/30 focus:border-white/50 transition-all"
              >
                {typeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-xs text-silver-500">
              {items.length} sonuç
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl p-1">
            <button
              onClick={() => setViewMode('card')}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'card'
                  ? 'bg-white/10 text-white border border-white/20'
                  : 'text-silver-400 hover:text-silver-200 hover:bg-white/5'
              }`}
            >
              <LayoutGrid className="inline-block h-4 w-4 mr-2" />
              Kart
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'table'
                  ? 'bg-white/10 text-white border border-white/20'
                  : 'text-silver-400 hover:text-silver-200 hover:bg-white/5'
              }`}
            >
              <Table className="inline-block h-4 w-4 mr-2" />
              Tablo
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {items.length === 0 ? (
        <div className="glass-card rounded-3xl p-8 text-center py-20">
          <div className="w-28 h-28 mx-auto mb-8 p-6 rounded-3xl flex items-center justify-center bg-gradient-to-r from-ice-500/10 to-blue-500/10 border border-ice-500/20">
            <Megaphone className="h-12 w-12 text-ice-400 opacity-80" />
          </div>
          <h3 className="text-2xl font-bold text-silver-200 mb-3">Henüz duyuru yok</h3>
          <p className="text-silver-500 text-lg mb-8 max-w-md mx-auto leading-relaxed">
            İlk duyuruyu ekleyerek topluluğunu bilgilendir.
          </p>
          <button
            onClick={handleAdd}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl font-semibold text-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700 shadow-xl hover:shadow-2xl transition-all duration-200 ring-1 ring-white/20"
          >
            <Plus className="h-5 w-5" />
            Yeni Duyuru Oluştur
          </button>
        </div>
      ) : viewMode === 'card' ? (
        <div className="glass-card rounded-3xl p-1">
          <div className="bg-coal-800/50 rounded-2xl p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {items.map((a) => (
                <AnnouncementCard
                  key={a.id}
                  announcement={a}
                  onEdit={handleEdit}
                  onDelete={(id) => setDeleteConfirmId(id)}
                  onView={handleView}
                />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-card rounded-3xl p-1">
          <div className="bg-coal-800/50 rounded-2xl overflow-hidden">
            <AnnouncementTable
              announcements={items}
              onEdit={handleEdit}
              onDelete={(id) => setDeleteConfirmId(id)}
              onView={handleView}
              loading={loading}
            />
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-3">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-4 py-2.5 rounded-xl border border-white/20 text-silver-400 hover:bg-white/10 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Önceki
          </button>
          <div className="text-sm text-silver-500">
            Sayfa <span className="text-silver-200 font-semibold">{page}</span> / {totalPages}
          </div>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="px-4 py-2.5 rounded-xl border border-white/20 text-silver-400 hover:bg-white/10 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Sonraki
          </button>
        </div>
      )}

      {/* Form Modal */}
      <AnnouncementFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        announcement={editing}
        onSuccess={() => {
          setIsFormOpen(false);
          setEditing(null);
          setPage(1);
          load();
        }}
      />

      {/* Details Modal */}
      <AnnouncementDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        announcement={details}
      />

      {/* Delete Confirm */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-xl" onClick={() => setDeleteConfirmId(null)} />
          <div className="relative w-full max-w-sm bg-coal-900/95 border border-white/10 rounded-2xl p-6 shadow-3xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20">
                <Trash2 className="h-5 w-5 text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-white">Duyuru Sil</h3>
            </div>
            <p className="text-silver-300 mb-6">Bu duyuruyu silmek istediğinize emin misiniz? Geri alınamaz.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-white/20 text-silver-400 hover:bg-white/10 transition-all text-sm font-medium"
              >
                İptal
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-500/90 hover:bg-red-600 text-white shadow-lg hover:shadow-xl transition-all text-sm font-semibold"
              >
                Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

