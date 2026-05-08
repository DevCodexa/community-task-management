import React, { useEffect, useMemo, useState } from 'react';
import { Pencil, Trash2, Eye, UserX } from 'lucide-react';
import { Speaker } from '../../types/speaker';

interface SpeakerTableProps {
  speakers: Speaker[];
  onEdit: (speaker: Speaker) => void;
  onDelete: (id: string) => void;
  onDetail: (speaker: Speaker) => void;
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

export const SpeakerTable: React.FC<SpeakerTableProps> = ({
  speakers,
  onEdit,
  onDelete,
  onDetail,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const totalPages = Math.max(1, Math.ceil(speakers.length / pageSize));

  const pagedSpeakers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return speakers.slice(start, start + pageSize);
  }, [speakers, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [speakers.length]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-left border-collapse">
<thead>
          <tr className="border-b border-white/[0.08]">
            <th className="pb-4 pt-2 pl-4 text-[11px] font-semibold uppercase tracking-wider text-silver-600">
              Konuşmacı
            </th>
           {/*} <th className="pb-4 pt-2 text-[11px] font-semibold uppercase tracking-wider text-silver-600">
              Ünvan
            </th>*/}
            <th className="pb-4 pt-2 text-[11px] font-semibold uppercase tracking-wider text-silver-600">
              İletişim
            </th>
            <th className="pb-4 pt-2 text-[11px] font-semibold uppercase tracking-wider text-silver-600">
              Şirket
            </th>
            
            <th className="pb-4 pt-2 text-[11px] font-semibold uppercase tracking-wider text-silver-600">
              Durum
            </th>
            <th className="pb-4 pt-2 text-[11px] font-semibold uppercase tracking-wider text-silver-600">
              Açıklama
            </th>
            <th className="pb-4 pt-2 pr-4 text-[11px] font-semibold uppercase tracking-wider text-silver-600 text-right">
              İşlemler
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.03]">
          {pagedSpeakers.map((speaker) => (
            <tr
              key={speaker.id}
              className="group transition-all duration-200 hover:bg-white/[0.015]"
            >
              {/* Photo & Name */}
              <td className="py-5 pl-4">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    {speaker.image_url ? (
                      <img
                        src={speaker.image_url}
                        alt={speaker.full_name}
                        className="h-11 w-11 rounded-full object-cover ring-2 ring-white/[0.06] group-hover:ring-white/[0.12] transition-all"
                      />
                    ) : (
                      <div className="h-11 w-11 rounded-full bg-amber-500/20 flex items-center justify-center ring-2 ring-white/[0.06] group-hover:ring-white/[0.12] transition-all">
                        <span className="text-sm font-bold text-amber-400">
                          {speaker.full_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-silver-100 tracking-[-0.01em]">
                      {speaker.full_name}
                    </p>
                    <span className="text-[13px] text-silver-300 font-medium">
                  {speaker.title || '—'}
                </span>
                  </div>
                </div>
              </td>

{/* Title 
              <td className="py-5">
                <span className="text-[13px] text-silver-300 font-medium">
                  {speaker.title || '—'}
                </span>
              </td>*/}

              {/* Contact */}
              <td className="py-5">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[13px] text-silver-300 font-medium">
                    {speaker.email || '—'}
                  </span>
                  <span className="text-[11px] text-silver-700 font-normal">
                    {speaker.phone || '—'}
                  </span>
                </div>
              </td>

              {/* Company */}
              <td className="py-5">
                <span className="text-[13px] text-silver-300 font-medium">
                  {speaker.company || '—'}
                </span>
              </td>

              

              {/* Status */}
              <td className="py-5">
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${getStatusBadgeStyle(
                    speaker.status
                  )}`}
                >
                  {getStatusLabel(speaker.status)}
                </span>
              </td>

              {/* Description */}
              <td className="py-5 max-w-[200px]">
                <p className="text-[11px] text-silver-600 line-clamp-2 leading-relaxed">
                  {speaker.description || 'Henüz açıklama eklenmemiş.'}
                </p>
              </td>

              {/* Actions */}
              <td className="py-5 pr-4 text-right">
                <div className="inline-flex items-center gap-0.5">
                  <button
                    onClick={() => onEdit(speaker)}
                    className="p-2 rounded-lg text-silver-600 hover:text-amber-400 hover:bg-white/[0.04] transition-all duration-200"
                    title="Düzenle"
                  >
                    <Pencil className="h-3.5 w-3.5" strokeWidth={2.5} />
                  </button>
                  <button
                    onClick={() => onDetail(speaker)}
                    className="p-2 rounded-lg text-silver-600 hover:text-silver-200 hover:bg-white/[0.04] transition-all duration-200"
                    title="Detay"
                  >
                    <Eye className="h-3.5 w-3.5" strokeWidth={2.5} />
                  </button>
                  <button
                    onClick={() => onDelete(speaker.id)}
                    className="p-2 rounded-lg text-silver-600 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
                    title="Sil"
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={2.5} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-sm text-silver-400">
        <div>
          {speakers.length > 0 ? (
            <span>
              {`${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, speakers.length)} / ${speakers.length} konuşmacı gösteriliyor`}
            </span>
          ) : (
            <span>Her sayfada en fazla 10 konuşmacı gösterilir.</span>
          )}
        </div>
        {speakers.length > 0 && (
          <div className="inline-flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 hover:bg-white/5"
            >
              Önceki
            </button>
            <span className="min-w-[4rem] text-center">{`${currentPage} / ${totalPages}`}</span>
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 hover:bg-white/5"
            >
              Sonraki
            </button>
          </div>
        )}
      </div>

      {speakers.length === 0 && (
        <div className="py-16 text-center">
          <UserX className="h-8 w-8 text-silver-700 mx-auto mb-3" />
          <p className="text-silver-600 text-sm font-medium">
            Henüz konuşmacı bulunmamaktadır.
          </p>
        </div>
      )}
    </div>
  );
};
