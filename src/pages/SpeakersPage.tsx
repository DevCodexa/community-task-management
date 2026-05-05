import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  UserPlus,
  Loader2,
  AlertCircle,
  Trash2,
  AlertTriangle,
  Mic,
} from 'lucide-react';
import { SpeakerTable } from '../components/speakers/SpeakerTable';
import { SpeakerModal } from '../components/speakers/SpeakerModal';
import { SpeakerDetailModal } from '../components/speakers/SpeakerDetailModal';
import { Speaker, SpeakerFilterTab } from '../types/speaker';
import {
  getSpeakers,
  deleteSpeaker,
} from '../lib/supabaseSpeakers';

export const SpeakersPage: React.FC = () => {
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<SpeakerFilterTab>('all');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSpeaker, setEditingSpeaker] = useState<Speaker | null>(null);

  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    speaker: Speaker | null;
  }>({ open: false, speaker: null });

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedSpeaker, setSelectedSpeaker] = useState<Speaker | null>(null);

  const fetchSpeakers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getSpeakers();
      setSpeakers(response.data);
    } catch (err: any) {
      setError(err.message || 'Konuşmacılar yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSpeakers();
  }, []);

  const filteredSpeakers = useMemo(() => {
    let filtered = speakers;

    // Filter by status - NEW LOGIC: 'all' excludes red
    if (activeFilter === 'all') {
      // Show only green + neutral, exclude red
      filtered = filtered.filter(s => s.status !== 'red');
    } else if (activeFilter === 'green') {
      filtered = filtered.filter(s => s.status === 'green');
    } else if (activeFilter === 'red') {
      filtered = filtered.filter(s => s.status === 'red');
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(s =>
        s.full_name.toLowerCase().includes(q) ||
        s.company?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [speakers, searchQuery, activeFilter]);

  const handleEdit = (speaker: Speaker) => {
    setEditingSpeaker(speaker);
    setIsFormOpen(true);
  };

  const handleAdd = () => {
    setEditingSpeaker(null);
    setIsFormOpen(true);
  };

  const handleFormSuccess = () => {
    fetchSpeakers();
  };

  const handleDetail = (speaker: Speaker) => {
    setShowDetailModal(true);
    setSelectedSpeaker(speaker);
  };

  const onCloseDetail = () => {
    setShowDetailModal(false);
    setSelectedSpeaker(null);
  };

  const promptDelete = (id: string) => {
    const speaker = speakers.find(s => s.id === id);
    if (speaker) {
      setDeleteConfirm({ open: true, speaker });
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.speaker) return;
    try {
      await deleteSpeaker(deleteConfirm.speaker.id);
      setDeleteConfirm({ open: false, speaker: null });
      fetchSpeakers();
    } catch (err: any) {
      setError(err.message || 'Silme işlemi başarısız oldu.');
      setDeleteConfirm({ open: false, speaker: null });
    }
  };

  const filterTabs: { key: SpeakerFilterTab; label: string; count: number }[] = useMemo(() => [
    { key: 'all', label: 'Tümü (Red Hariç)', count: speakers.filter(s => s.status !== 'red').length },
    { key: 'green', label: 'Green', count: speakers.filter(s => s.status === 'green').length },
    { key: 'red', label: 'Red', count: speakers.filter(s => s.status === 'red').length },
  ], [speakers]);

  return (
    <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl font-bold tracking-tight text-silver-100 sm:text-3xl">
              Konuşmacılar
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
              {speakers.length} konuşmacı
            </span>
          </div>
          <p className="mt-1 text-sm text-silver-600">
            Topluluk konuşmacılarını görüntüleyin, düzenleyin ve yönetin
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 hover:text-amber-300 transition-all shrink-0"
        >
          <UserPlus className="h-4 w-4" />
          Yeni Konuşmacı
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
        {filterTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveFilter(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              activeFilter === tab.key
                ? 'bg-white/10 text-white border border-white/20'
                : 'text-silver-500 hover:text-silver-300 hover:bg-white/5 border border-transparent'
            }`}
          >
            {tab.label}
            <span className={`ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full text-xs ${
              activeFilter === tab.key
                ? 'bg-amber-500/20 text-amber-300'
                : 'bg-white/5 text-silver-500'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-silver-600" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="İsim, şirket veya e-posta ara..."
          className="w-full sm:max-w-md pl-10 pr-4 py-2.5 rounded-lg bg-white/[0.03] border border-white/10 text-silver-100 text-sm placeholder:text-silver-700 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all"
        />
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-400">Bir hata oluştu</p>
            <p className="text-xs text-red-300/80 mt-0.5">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-xs text-red-400 hover:text-red-300 underline"
          >
            Kapat
          </button>
        </div>
      )}

      {/* Table Card */}
      <div className="glass-card rounded-2xl p-1">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 text-silver-600 animate-spin mb-3" />
            <p className="text-sm text-silver-500">Konuşmacılar yükleniyor...</p>
          </div>
        ) : (
          <SpeakerTable
            speakers={filteredSpeakers}
            onEdit={handleEdit}
            onDelete={promptDelete}
            onDetail={handleDetail}
          />
        )}
      </div>

      {/* Create / Edit Modal */}
      <SpeakerModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        speaker={editingSpeaker}
        onSuccess={handleFormSuccess}
      />

      {/* Delete Confirmation Dialog */}
      {deleteConfirm.open && deleteConfirm.speaker && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-xl"
            onClick={() => setDeleteConfirm({ open: false, speaker: null })}
          />
          <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-coal-800/90 shadow-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-red-500/10">
                <Trash2 className="h-5 w-5 text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-silver-100">Konuşmacıyı Sil</h3>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 mb-6">
              <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-300/90">
                <strong className="text-red-400">{deleteConfirm.speaker.full_name}</strong>{' '}
                isimli konuşmacıyı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm({ open: false, speaker: null })}
                className="px-4 py-2.5 rounded-lg text-sm font-medium text-silver-400 hover:text-silver-200 hover:bg-white/[0.05] transition-colors"
              >
                İptal
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2.5 rounded-lg text-sm font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 hover:text-red-300 transition-all"
              >
                Evet, Sil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <SpeakerDetailModal
        isOpen={showDetailModal}
        onClose={onCloseDetail}
        speaker={selectedSpeaker}
      />
    </div>
  );
};
