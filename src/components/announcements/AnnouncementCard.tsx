import React from 'react';
import { Edit2, Trash2, ExternalLink, Megaphone } from 'lucide-react';
import type { FullAnnouncement } from '../../types/announcement';
import { EVENT_TYPE_LABELS } from '../../types/event';

interface AnnouncementCardProps {
  announcement: FullAnnouncement;
  onEdit: (a: FullAnnouncement) => void;
  onDelete: (id: string) => void;
  onView: (a: FullAnnouncement) => void;
}

const getTypeGradient = (type: FullAnnouncement['type']) => {
  const map: Record<string, string> = {
    Workshop: 'from-emerald-500 to-emerald-600',
    'Face-to-Face': 'from-teal-500 to-emerald-600',
    Bootcamp: 'from-orange-500 to-red-600',
    Webinar: 'from-purple-500 to-pink-600',
    'Quiz Night': 'from-yellow-400 to-orange-500',
    'Mülakat Yayını': 'from-cyan-400 to-blue-500',
    'Coffee Talk': 'from-amber-600 to-orange-700',
    'İlk Konuşmam(Future)': 'from-fuchsia-500 to-purple-600',
    Other: 'from-slate-500 to-gray-700',
  };
  return map[type] || 'from-slate-500 to-gray-700';
};

export const AnnouncementCard: React.FC<AnnouncementCardProps> = ({
  announcement,
  onEdit,
  onDelete,
  onView,
}) => {
  const hasLink = !!announcement.link;

  return (
    <div className="group relative p-6 rounded-2xl bg-coal-900/50 border border-white/10 hover:border-white/20 hover:bg-coal-900/70 transition-all shadow-lg hover:shadow-2xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <button
            type="button"
            onClick={() => onView(announcement)}
            className="text-left"
            aria-label={`Duyuru detay: ${announcement.title}`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-r ${getTypeGradient(
                  announcement.type
                )}/20 border border-white/10`}
              >
                <Megaphone className="h-4 w-4 text-ice-300" />
              </span>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-white/5 text-silver-200 border border-white/10`}
              >
                {EVENT_TYPE_LABELS[announcement.type]}
              </span>
            </div>
          </button>
            <h3 className="mt-3 text-xl font-bold text-silver-100 group-hover:text-white  max-w-full overflow-hidden truncate">
              {announcement.title}
            </h3>
          {announcement.description ? (
            <p className="mt-3 text-sm text-silver-400 line-clamp-3">
              {announcement.description}
            </p>
          ) : (
            <p className="mt-3 text-sm text-silver-500 italic">Açıklama yok</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col items-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
          <button
            type="button"
            onClick={() => onView(announcement)}
            className="p-2 rounded-xl text-silver-400 hover:text-silver-200 hover:bg-white/10 transition-all"
            title="Detay"
          >
            <ExternalLink className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onEdit(announcement)}
            className="p-2 rounded-xl text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 transition-all"
            title="Düzenle"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(announcement.id)}
            className="p-2 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/20 transition-all"
            title="Sil"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Footer meta */}
      <div className="mt-5 flex items-center justify-between">
        <div className="text-xs text-silver-500">
          {new Date(announcement.created_at).toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </div>
        {hasLink && (
          <a
            href={announcement.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-ice-300 text-xs font-semibold hover:underline"
            title="Dış bağlantı"
            onClick={(e) => {
              // prevent parent button focus
              e.stopPropagation();
            }}
          >
            Git
          </a>
        )}
      </div>
    </div>
  );
};

