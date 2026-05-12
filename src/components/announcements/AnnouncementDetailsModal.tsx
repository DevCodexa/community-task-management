import React from 'react';
import { X, Link as LinkIcon, Megaphone, Calendar } from 'lucide-react';
import type { FullAnnouncement } from '../../types/announcement';
import { EVENT_TYPE_LABELS } from '../../types/event';

interface AnnouncementDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  announcement: FullAnnouncement | null;
}

export const AnnouncementDetailsModal: React.FC<AnnouncementDetailsModalProps> = ({
  isOpen,
  onClose,
  announcement,
}: AnnouncementDetailsModalProps) => {
  if (!isOpen) return null;
  return (
    <div className={`fixed inset-0 z-[65] ${isOpen ? 'flex' : 'hidden'} items-center justify-center p-4`}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-xl" onClick={onClose} />
      {announcement && (
        <div className="relative w-full max-w-2xl mx-auto bg-coal-900/95 border border-white/10 rounded-3xl p-8 shadow-3xl max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">{announcement.title}</h2>
            <button onClick={onClose} className="p-2 rounded-xl text-silver-400 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex items-center gap-3 mb-5">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-white/5 border border-white/10 text-silver-200">
              <Megaphone className="h-4 w-4 text-ice-300" />
              {EVENT_TYPE_LABELS[announcement.type]}
            </span>
            <div className="flex items-center gap-2 text-xs text-silver-500">
              <Calendar className="h-4 w-4" />
              {new Date(announcement.created_at).toLocaleDateString('tr-TR', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              })}
            </div>
          </div>

          <div className="space-y-4 text-silver-300">
            {announcement.description ? (
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-silver-500 block mb-2">Açıklama</span>
                <p className="text-sm leading-relaxed text-silver-200">{announcement.description}</p>
              </div>
            ) : null}

            {announcement.link ? (
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-silver-500 block mb-2 flex items-center gap-2">
                  <LinkIcon className="h-4 w-4" />
                  Bağlantı
                </span>
                <a
                  href={announcement.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-ice-300 hover:underline text-sm"
                >
                  {announcement.link}
                </a>
              </div>
            ) : null}

            <div className="pt-4 border-t border-white/10">
              <span className="text-xs font-semibold uppercase tracking-wider text-silver-500 block mb-2">Kullanıcı deneyimi</span>
              <p className="text-sm text-silver-400 leading-relaxed">
                Bu duyuru detayları sadece bilgilendirme amaçlı gösterilir. Yönetimden düzenleyebilir veya silebilirsiniz.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

