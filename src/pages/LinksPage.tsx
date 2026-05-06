import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  ExternalLink,
  Folder,
  Loader2,
  AlertCircle,
  Edit2,
  ChevronDown
} from 'lucide-react';
import { 
  getAllUsefulLinks, 
  groupLinksByCategory, 
  deleteUsefulLink,
  UsefulLink,
  GroupedLinks 
} from '../lib/supabaseUsefulLinks';
import { LinkFormModal } from '../components/links/LinkFormModal';

export const LinksPage: React.FC = () => {
  const [links, setLinks] = useState<UsefulLink[]>([]);
  const [groupedLinks, setGroupedLinks] = useState<GroupedLinks[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<UsefulLink | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [openCategory, setOpenCategory] = useState<string | null>(null);


  useEffect(() => {
    fetchLinks();
  }, []);

  const fetchLinks = async () => {
    try {
      setLoading(true);
      const data = await getAllUsefulLinks();
      setLinks(data);
      setGroupedLinks(groupLinksByCategory(data));
      setError('');
    } catch (err: any) {
      setError(err.message || 'Linkler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingLink(null);
    setIsFormOpen(true);
  };

  const handleEdit = (link: UsefulLink) => {
    setEditingLink(link);
    setIsFormOpen(true);
  };

  const handleFormSuccess = () => {
    fetchLinks();
    setIsFormOpen(false);
    setEditingLink(null);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteUsefulLink(id);
      await fetchLinks();
    } catch (err: any) {
      setError(err.message || 'Link silinemedi');
    }
  };

  const openLink = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const toggleCategory = (category: string) => {
    setOpenCategory((prev) => (prev === category ? null : category));
  };


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
          <h1 className="font-display text-3xl font-bold tracking-tight text-silver-100">
            Faydalı Linkler
          </h1>
          <p className="mt-2 text-xl text-silver-500">
            Topluluk için önemli linkler ve kaynaklar ({groupedLinks.reduce((sum, g) => sum + g.count, 0)} link)
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-ice-500 to-blue-500 text-white hover:from-ice-600 hover:to-blue-600 shadow-lg hover:shadow-xl transition-all"
        >
          <Plus className="h-4 w-4" />
          Yeni Link
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-8 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Content Card */}
      <div className="glass-card rounded-3xl p-1">
        <div className="bg-coal-800/50 rounded-2xl overflow-hidden">
          {groupedLinks.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-silver-600 py-8">
              <ExternalLink className="h-12 w-12 mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Henüz link yok</h3>
              <p className="text-sm mb-6">İlk faydalı linki ekleyerek başlayın</p>
              <button
                onClick={handleAdd}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-sm font-semibold hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg"
              >
                <Plus className="h-4 w-4" />
                İlk Linki Ekle
              </button>
            </div>
          ) : (
            <div className="p-8 space-y-8">
              {groupedLinks.map((group) => {
                const isOpen = openCategory === group.category;

                return (
                  <div key={group.category} className="space-y-4">
                    <button
                      type="button"
                      onClick={() => toggleCategory(group.category)}
                      className="w-full flex items-center gap-2 text-silver-200 hover:text-white transition-colors"
                      aria-expanded={isOpen}
                    >
                      <Folder className="h-5 w-5 text-silver-400" />
                      <h2 className="flex-1 font-semibold text-lg uppercase tracking-wider text-left">
                        {group.category}
                      </h2>
                      <span className="text-sm text-silver-600 font-mono">({group.count})</span>
                      <ChevronDown
                        className={`h-5 w-5 text-silver-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : 'rotate-0'}`}
                      />
                    </button>

                    <div
                      className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}
                    >
                      <div className="pt-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {group.links.map((linkLink) => (
                            <div
                              key={linkLink.id}
                              className="group relative p-6 rounded-2xl bg-coal-900/50 border border-white/10 hover:border-white/20 hover:bg-coal-900/70 transition-all shadow-lg hover:shadow-2xl"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <a
                                    href={linkLink.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-semibold text-lg text-silver-100 group-hover:text-white truncate block line-clamp-1 hover:underline pr-2"
                                    title={linkLink.url}
                                  >
                                    {linkLink.title}
                                  </a>
                                  {linkLink.description && (
                                    <p className="text-sm text-silver-400 mt-2 line-clamp-2">
                                      {linkLink.description}
                                    </p>
                                  )}
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                                  <button
                                    onClick={() => handleEdit(linkLink)}
                                    className="p-2 rounded-xl text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 transition-all"
                                    title="Düzenle"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(linkLink.id)}
                                    className="p-2 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/20 transition-all"
                                    title="Sil"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Link Form Modal */}
      <LinkFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingLink(null);
        }}
        link={editingLink}
        onSuccess={handleFormSuccess}
      />

      {/* Delete Confirmation Overlay */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-xl" onClick={() => setDeleteConfirm(null)} />
          <div className="relative w-full max-w-sm bg-coal-900/95 border border-white/10 rounded-2xl p-6 shadow-3xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20">
                <Trash2 className="h-5 w-5 text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-white">Link Sil</h3>
            </div>
            <p className="text-silver-300 mb-6">
              Bu linki silmek istediğinize emin misiniz? İşlem geri alınamaz.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-white/20 text-silver-400 hover:bg-white/10 transition-all text-sm font-medium"
              >
                İptal
              </button>
              <button
                onClick={() => {
                  handleDelete(deleteConfirm);
                  setDeleteConfirm(null);
                }}
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

