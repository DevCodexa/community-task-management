import React from 'react';
import { X, Mail, Phone, Building, Calendar, Mic } from 'lucide-react';
import { Speaker } from '../../types/speaker';

interface SpeakerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  speaker: Speaker | null;
}

const getStatusBadgeStyle = (status: string) => {
  switch (status) {
    case 'green':
      return 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20';
    case 'red':
      return 'bg-red-500/10 text-red-400 ring-1 ring-red-500/20';
    default:
      return 'bg-silver-500/10 text-silver-400 ring-1 ring-silver-500/20';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'green':
      return 'Green';
    case 'red':
      return 'Red';
    default:
      return 'Neutral';
  }
};

export const SpeakerDetailModal: React.FC<SpeakerDetailModalProps> = ({
  isOpen,
  onClose,
  speaker,
}) => {
  if (!isOpen || !speaker) return null;

  const formatDate = (dateString: string) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

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
              <Mic className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-silver-100">Konuşmacı Detayları</h2>
              <p className="text-xs text-silver-600">
                Konuşmacı bilgilerini görüntüleyin
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

        {/* Content */}
        <div className="p-6">
{/* Profile Header */}
        <div className="flex items-start gap-4 mb-6">
            <div className="relative">
              {speaker.image_url ? (
                <img
                  src={speaker.image_url}
                  alt={speaker.full_name}
                  className="h-20 w-20 rounded-full object-cover ring-2 ring-white/[0.06]"
                />
              ) : (
                <div className="h-20 w-20 rounded-full bg-amber-500/20 flex items-center justify-center ring-2 ring-white/[0.06]">
                  <span className="text-2xl font-bold text-amber-400">
                    {speaker.full_name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <span
                className={`absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-coal-800 ${
                  speaker.status === 'green'
                    ? 'bg-emerald-400'
                    : speaker.status === 'red'
                    ? 'bg-red-400'
                    : 'bg-silver-400'
                }`}
              />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-silver-100">
                {speaker.full_name}
              </h3>
              {speaker.title && (
                <p className="text-sm text-amber-400 mt-1">{speaker.title}</p>
              )}
              {speaker.company && (
                <p className="text-sm text-silver-400">{speaker.company}</p>
              )}
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold mt-2 ${getStatusBadgeStyle(
                  speaker.status
                )}`}
              >
                {getStatusLabel(speaker.status)}
              </span>
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Email */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div className="flex items-center gap-2 text-silver-500 mb-1">
                <Mail className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wider">
                  E-posta
                </span>
              </div>
              <p className="text-sm text-silver-200 font-medium">
                {speaker.email || '—'}
              </p>
            </div>

            {/* Phone */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div className="flex items-center gap-2 text-silver-500 mb-1">
                <Phone className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wider">
                  Telefon
                </span>
              </div>
              <p className="text-sm text-silver-200 font-medium">
                {speaker.phone || '—'}
              </p>
            </div>

            {/* Company */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div className="flex items-center gap-2 text-silver-500 mb-1">
                <Building className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wider">
                  Şirket
                </span>
              </div>
              <p className="text-sm text-silver-200 font-medium">
                {speaker.company || '—'}
              </p>
            </div>

            {/* Created At */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div className="flex items-center gap-2 text-silver-500 mb-1">
                <Calendar className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wider">
                  Eklenme Tarihi
                </span>
              </div>
              <p className="text-sm text-silver-200 font-medium">
                {formatDate(speaker.created_at)}
              </p>
            </div>
          </div>

          {/* Description */}
          {speaker.description && (
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-silver-400 mb-2">
                Açıklama
              </h4>
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <p className="text-sm text-silver-300 leading-relaxed">
                  {speaker.description}
                </p>
              </div>
            </div>
          )}

          {/* Updated At */}
          {speaker.updated_at && speaker.updated_at !== speaker.created_at && (
            <div className="mt-4 text-xs text-silver-600">
              Son güncelleme: {formatDate(speaker.updated_at)}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 pb-6 pt-2">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-lg text-sm font-medium text-silver-300 hover:text-white hover:bg-white/[0.05] transition-colors border border-white/10"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
