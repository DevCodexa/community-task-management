import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  UserPlus,
} from 'lucide-react';
import { Speaker, SpeakerFormData, SpeakerStatus } from '../../types/speaker';
import { createSpeaker, updateSpeaker } from '../../lib/supabaseSpeakers';

interface SpeakerModalProps {
  isOpen: boolean;
  onClose: () => void;
  speaker?: Speaker | null;
  onSuccess: () => void;
}

const initialFormData: SpeakerFormData = {
  full_name: '',
  title: '',
  company: '',
  email: '',
  phone: '',
  image_url: '',
  description: '',
  status: 'neutral',
  added_by: null,
};

export const SpeakerModal: React.FC<SpeakerModalProps> = ({
  isOpen,
  onClose,
  speaker,
  onSuccess,
}) => {
  const [formData, setFormData] = useState<SpeakerFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!speaker;

useEffect(() => {
    if (speaker) {
      setFormData({
        full_name: speaker.full_name,
        title: speaker.title || '',
        company: speaker.company || '',
        email: speaker.email || '',
        phone: speaker.phone || '',
        image_url: speaker.image_url || '',
        description: speaker.description || '',
        status: speaker.status,
        added_by: speaker.added_by,
      });
    } else {
      setFormData(initialFormData);
    }
    setError(null);
  }, [speaker, isOpen]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (isEditing && speaker) {
        // Send only CHANGED fields as Partial<SpeakerFormData>
        const changedData: Partial<SpeakerFormData> = {};
        
        // Compare with original speaker data
        if (formData.full_name !== speaker.full_name) changedData.full_name = formData.full_name;
        if (formData.title !== speaker.title) changedData.title = formData.title;
        if (formData.company !== speaker.company) changedData.company = formData.company;
        if (formData.email !== speaker.email) changedData.email = formData.email;
        if (formData.phone !== speaker.phone) changedData.phone = formData.phone;
        if (formData.image_url !== speaker.image_url) changedData.image_url = formData.image_url;
        if (formData.description !== speaker.description) changedData.description = formData.description;
        if (formData.status !== speaker.status) changedData.status = formData.status;
        if (formData.added_by !== speaker.added_by) changedData.added_by = formData.added_by;

        // Only send if there are changes
        if (Object.keys(changedData).length > 0) {
          await updateSpeaker(speaker.id, changedData);
        } else {
          // No changes - just close
          onSuccess();
          onClose();
          return;
        }
      } else {
        await createSpeaker(formData);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Speaker form error:', err);
      setError(err.message || 'Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Glassmorphism Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-xl"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-coal-800/60 backdrop-blur-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <UserPlus className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-silver-100">
                {isEditing ? 'Konuşmacı Düzenle' : 'Yeni Konuşmacı Ekle'}
              </h2>
              <p className="text-xs text-silver-600">
                {isEditing
                  ? 'Konuşmacı bilgilerini güncelleyin'
                  : 'Yeni bir topluluk konuşmacısı ekleyin'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-silver-500 hover:text-silver-200 hover:bg-white/[0.05] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mx-6 mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
              {error}
            </div>
          )}

<div className="p-6 space-y-4">
            {/* Full Name - Required */}
            <div>
              <label className="block text-sm font-semibold text-silver-300 mb-2">
                Ad Soyad <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-silver-100 placeholder-silver-600 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 transition-all"
                placeholder="Ad Soyad"
              />
            </div>

            {/* Image URL */}
            <div>
              <label className="block text-sm font-semibold text-silver-300 mb-2">
                Profil Fotoğrafı URL
              </label>
              <input
                type="url"
                name="image_url"
                value={formData.image_url || ''}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-silver-100 placeholder-silver-600 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 transition-all"
                placeholder="https://..."
              />
            </div>

            {/* Title & Company */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-silver-300 mb-2">
                  Ünvan / Title
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-silver-100 placeholder-silver-600 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 transition-all"
                  placeholder="Konuşmacı ünvanı"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-silver-300 mb-2">
                  Şirket
                </label>
                <input
                  type="text"
                  name="company"
                  value={formData.company || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-silver-100 placeholder-silver-600 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 transition-all"
                  placeholder="Şirket adı"
                />
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-semibold text-silver-300 mb-2">
                Durum
              </label>
              <select
                name="status"
                value={formData.status || 'neutral'}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-silver-100 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 transition-all"
              >
                <option value="neutral">Neutral</option>
                <option value="green">Green</option>
                <option value="red">Red</option>
              </select>
            </div>

            {/* Email & Phone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-silver-300 mb-2">
                  E-posta
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-silver-100 placeholder-silver-600 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 transition-all"
                  placeholder="E-posta adresi"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-silver-300 mb-2">
                  Telefon
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-silver-100 placeholder-silver-600 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 transition-all"
                  placeholder="Telefon numarası"
                />
              </div>
            </div>

            

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-silver-300 mb-2">
                Açıklama
              </label>
              <textarea
                name="description"
                value={formData.description || ''}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-silver-100 placeholder-silver-600 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 transition-all resize-y"
                placeholder="Konuşmacı hakkında açıklama..."
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 px-6 pb-6 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg text-sm font-medium text-silver-400 hover:text-silver-200 hover:bg-white/[0.05] transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 hover:text-amber-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="h-4 w-4" />
              {isSubmitting
                ? 'Kaydediliyor...'
                : isEditing
                ? 'Güncelle'
                : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
