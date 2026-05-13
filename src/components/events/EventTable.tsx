import React, { useState, useMemo, useEffect } from 'react';
import { Users, Mic, Search, Filter, Edit3, Eye, Trash2, Loader2, AlertCircle, MoreVertical } from 'lucide-react';

import { FullEvent, EventType } from '../../types/event';
import { getEventsStaffCounts, getEventsSpeakerCounts } from '../../lib/supabaseEvents';

import { EVENT_TYPE_LABELS } from '../../types/event';

interface EventTableProps {
  events: FullEvent[];
  onEdit: (event: FullEvent) => void;
  onDelete: (id: string) => void;
  onView: (event: FullEvent) => void;
  loading?: boolean;
}

const isEventUpcoming = (event: FullEvent) => new Date(event.start_date) > new Date();
const formatDateRange = (start: string, end: string) => {
  const s = new Date(start).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const e = new Date(end).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  return `${s} - ${e}`;
};

const getTypeColor = (type: EventType) => {
  const colors: Record<EventType, string> = {
    'Workshop': 'from-blue-600 to-indigo-600',          // Tok bir mavi/lacivert
    'Face-to-Face': 'from-emerald-500 to-teal-600',    // Canlı yeşil/turkuaz
    'Bootcamp': 'from-orange-500 to-red-600',          // Ateş tonları
    'Webinar': 'from-purple-500 to-pink-600',          // Modern mor/pembe
    'Quiz Night': 'from-yellow-400 to-orange-500',     // Enerjik sarı/altın
    'Mülakat Yayını': 'from-cyan-400 to-blue-500',      // Açık mavi/buz mavisi
    'Coffee Talk': 'from-amber-600 to-orange-700',      // Kahve ve sıcak toprak tonları
    'İlk Konuşmam(Future)': 'from-fuchsia-500 to-purple-600', // Gelecekçi fuşya/mor
    'Other': 'from-slate-500 to-gray-700',             // Profesyonel gri/füme
};
  return colors[type] || 'from-gray-500 to-gray-600';
};

export const EventTable: React.FC<EventTableProps> = ({
  events,
  onEdit,
  onDelete,
  onView,
  loading = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const filteredEvents = useMemo(() => {
    return events.filter(event =>
      event.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [events, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / pageSize));
  const pagedEvents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredEvents.slice(start, start + pageSize);
  }, [filteredEvents, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, events.length]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const [staffCounts, setStaffCounts] = useState<Record<string, number>>({});
  const [speakerCounts, setSpeakerCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    if (events.length > 0) {
      Promise.all([
        getEventsStaffCounts(events.map(e => e.id)),
        getEventsSpeakerCounts(events.map(e => e.id))
      ]).then(([staff, speakers]) => {
        setStaffCounts(staff);
        setSpeakerCounts(speakers);
      });
    }
  }, [events]);


  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-silver-500 mr-3" />
        <span className="text-silver-500">Etkinlikler yükleniyor...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-silver-600" />
        <input
          type="text"
          placeholder="Etkinlik ara..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white/[0.03] border border-white/10 text-silver-100 placeholder-silver-700 focus:ring-1 focus:ring-ice-500/20 focus:border-ice-500/50 transition-all"
        />
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-white/10 bg-coal-800/50 backdrop-blur-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-silver-400">Etkinlik</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-silver-400">Tür</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-silver-400">Tarih</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-silver-400">Konum</th>
                <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-silver-400">Görevliler</th>
                <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-silver-400">Konuşmacılar</th>
                <th className="w-32 px-4 py-4 text-center text-xs font-bold uppercase tracking-wider text-silver-400">İşlemler</th>

              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {pagedEvents.map((event) => (
                <tr key={event.id} className={`group hover:bg-white/5 transition-colors ${isEventUpcoming(event) ? '' : 'opacity-75'}`}>
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-small text-silver-100 group-hover:text-white">{event.title}</div>
{event.description && (
  <div 
    className="text-xs text-silver-500 mt-1 line-clamp-2 max-w-[300px]"
    title={event.description}
  >
    {event.description.length > 30 
      ? `${event.description.slice(0, 30)}...`
      : event.description
    }
  </div>
)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r ${getTypeColor(event.event_type)} text-white ring-1 ring-white/20`}>
                      {EVENT_TYPE_LABELS[event.event_type]}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className={`text-xs font-medium px-2 py-1 rounded-full ${isEventUpcoming(event) ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-gray-500/20 text-gray-400'}`}>
                      {formatDateRange(event.start_date, event.end_date)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-silver-400">{event.location}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-gradient-to-r from-blue-500/20 to-indigo-500/20 text-blue-400 text-xs font-bold border border-blue-500/30">
                      <Users className="h-3 w-3" />
                      {staffCounts[event.id] || 0}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-400 text-xs font-bold border border-purple-500/30">
                      <Mic className="h-3 w-3" />
                      {speakerCounts[event.id] || 0}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right">

                    <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => onView(event)} title="Detay" className="p-1.5 rounded-lg text-silver-500 hover:text-ice-400 hover:bg-ice-500/10 transition-all">
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => onEdit(event)} title="Düzenle" className="p-1.5 rounded-lg text-silver-500 hover:text-ice-400 hover:bg-ice-500/10 transition-all">
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => onDelete(event.id)} title="Sil" className="p-1.5 rounded-lg text-silver-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="w-6 h-6 opacity-20 group-hover:opacity-100 mx-auto">
                      <MoreVertical className="h-4 w-4 text-silver-500" />
                    </div>
                  </td>
                </tr>
              ))}
              {filteredEvents.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <AlertCircle className="h-12 w-12 text-silver-600 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-bold text-silver-400 mb-1">Etkinlik bulunamadı</h3>
                    <p className="text-sm text-silver-600">Arama kriterlerini değiştirin veya yeni etkinlik ekleyin.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-white/10 bg-white/5 px-6 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-silver-400">
            Toplam {filteredEvents.length} etkinlik içerisinde {pagedEvents.length} gösteriliyor.
          </div>
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="rounded-lg px-3 py-1.5 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 bg-white/5 text-silver-200 hover:bg-white/10"
            >
              Önceki
            </button>
            <span className="text-sm text-silver-300">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="rounded-lg px-3 py-1.5 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 bg-white/5 text-silver-200 hover:bg-white/10"
            >
              Sonraki
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
