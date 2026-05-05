import React, { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  ExternalLink, 
  AlertCircle,
  Loader2 
} from 'lucide-react';
import { 
  createUsefulLink, 
  updateUsefulLink, 
  validateLinkData,
  UsefulLink, 
  UsefulLinkFormData 
} from '../../lib/supabaseUsefulLinks';

interface LinkFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  link?: UsefulLink | null;
  onSuccess: () => void;
}

export const LinkFormModal: React.FC<LinkFormModalProps> = ({
  isOpen,
  onClose,
  link,
  onSuccess
}) => {
  const [formData, setFormData] = useState<UsefulLinkFormData>({
    title: '',
    url: '',
    description: '',
    category_name: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (link) {
        setFormData({
          title: link.title,
          url: link.url,
          description: link.description,
          category_name: link.category_name
        });
      } else {
        setFormData({
          title: '',
          url: '',
          description: '',
          category_name: ''
        });
      }
      setError('');
    }
  }, [isOpen, link]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const validation = validateLinkData(formData);
    if (!validation.valid) {
      setError(validation.errors.join(', '));
      setLoading(false);
      return;
    }

    try {
      if (link) {
        await updateUsefulLink(link.id, formData);
      } else {
        await createUsefulLink(formData);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Link kaydedilemedi');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-xl" 
        onClick={onClose}
      />
      <div className="relative w-full max-w-2xl mx-auto rounded-3xl border border-white/10 bg-gradient-to-b from-coal-800/95 via-coal-900/90 to-coal-800/95 shadow-3xl backdrop-blur-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-coal-900/50 border-b border-white/5 p-6 backdrop-blur-xl z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-2xl bg-gradient-to-br from-ice-500/10 to-blue-500/10 border border-ice-500/20">
                <ExternalLink className="h-5 w-5 text-ice-400" />
              </div>
              <div>
                <h2 className="font-display text-2xl font-bold text-silver-100">
                  {link ? 'Link Düzenle' : 'Yeni Link'}
                </h2>
                <p className="text-sm text-silver-500">
                  Link detaylarını girin
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-silver-400 hover:text-silver-200 hover:bg-white/10 transition-all"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-silver-300 mb-2">
                Başlık *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                required
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-silver-100 placeholder-silver-600 focus:outline-none focus:ring-2 focus:ring-ice-500/30 focus:border-white/50 transition-all"
                placeholder="Link başlığı..."
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-silver-300 mb-2">
                Kategori *
              </label>
              <input
                type="text"
                value={formData.category_name}
                onChange={(e) => setFormData({...formData, category_name: e.target.value})}
                required
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-silver-100 placeholder-silver-600 focus:outline-none focus:ring-2 focus:ring-ice-500/30 focus:border-white/50 transition-all"
                placeholder="Tasarım, Geliştirme vb..."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-silver-300 mb-2">
              URL *
            </label>
            <input
              type="url"
              value={formData.url}
              onChange={(e) => setFormData({...formData, url: e.target.value})}
              required
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-silver-100 placeholder-silver-600 focus:outline-none focus:ring-2 focus:ring-ice-500/30 focus:border-white/50 transition-all"
              placeholder="https://..."
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-silver-300 mb-2">
              Açıklama
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-silver-100 placeholder-silver-600 focus:outline-none focus:ring-2 focus:ring-ice-500/30 focus:border-white/50 transition-all resize-y min-h-[80px]"
              placeholder="Link açıklaması (opsiyonel)..."
            />
          </div>

          <div className="flex items-center gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-xl text-sm font-semibold text-silver-400 hover:text-silver-200 hover:bg-white/10 transition-all border border-white/10"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {loading ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

