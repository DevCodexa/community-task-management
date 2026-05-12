import React from 'react';
import { Edit2, Trash2, ExternalLink, Eye } from 'lucide-react';
import type { FullAnnouncement } from '../../types/announcement';
import { EVENT_TYPE_LABELS } from '../../types/event';

type AnnouncementWithMemberCount = FullAnnouncement & { memberCount?: number };

interface AnnouncementTableProps {
  announcements: AnnouncementWithMemberCount[];

  loading: boolean;
  onEdit: (a: FullAnnouncement) => void;
  onView: (a: FullAnnouncement) => void;
  onDelete: (id: string) => void;
}


export const AnnouncementTable: React.FC<AnnouncementTableProps> = ({
  announcements,
  loading,
  onEdit,
  onView,
  onDelete,
}) => {
  if (loading) {
    return (
      <div className="p-10 flex items-center justify-center">
        <span className="text-silver-500">Yükleniyor...</span>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="text-left text-xs text-silver-500 uppercase tracking-wider">
            <th className="py-4 px-6">Duyuru</th>
            <th className="py-4 px-6">Tür</th>
            <th className="py-4 px-6">Link</th>
            <th className="py-4 px-6">Duyuru Tarihi</th>
            <th className="py-4 px-6">Üye Sayısı</th>
            <th className="py-4 px-6 text-right">Aksiyon</th>

          </tr>
        </thead>
        <tbody>
          {announcements.map((a) => (
            <tr key={a.id} className="border-t border-white/10 hover:bg-white/5 transition-colors">
              <td className="py-4 px-6">
                <button
                  type="button"
                  onClick={() => onView(a)}
                  className="text-silver-100 font-semibold hover:text-white text-left"
                >
                  {a.title}
                </button>

          {a.description ? (
                  <div className="text-xs text-silver-500 mt-1 line-clamp-1 ">{a.description}</div>
                ) : (
                  <div className="text-xs text-silver-500 mt-1">—</div>
                )}
              </td>
              <td className="py-4 px-6">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-white/5 border border-white/10 text-silver-200">
                  {EVENT_TYPE_LABELS[a.type]}
                </span>
              </td>
              <td className="py-4 px-6">
                {a.link ? (
                  <a
                    className="inline-flex items-center gap-1 text-ice-300 hover:underline text-sm"
                    href={a.link}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Git
                  </a>
                ) : (
                  <span className="text-silver-500">Yok</span>
                )}
              </td>
              <td className="py-4 px-6 text-sm text-silver-400">
                {new Date(a.created_at).toLocaleDateString('tr-TR', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </td>
              <td className="py-4 px-6 text-sm text-silver-300">
                {a.memberCount ?? 0}
              </td>
              <td className="py-4 px-6 text-right">
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => onView(a)}
                    className="p-2 rounded-xl text-ice-300 hover:text-white hover:bg-blue-500/20 transition-all flex items-center gap-2"
                    title="Detayı gör"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onEdit(a)}
                    className="p-2 rounded-xl text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 transition-all"
                    title="Düzenle"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(a.id)}
                    className="p-2 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/20 transition-all"
                    title="Sil"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </td>

            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

