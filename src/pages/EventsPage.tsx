import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Calendar, LayoutList, Trash2, X } from 'lucide-react';
import { EventTable } from '../components/events';
import { EventFormModal } from '../components/events';
import { FullEvent, EventType, EVENT_TYPE_LABELS } from '../types/event';
import { getEvents, deleteEvent, getEventStaff } from '../lib/supabaseEvents';

export const EventsPage: React.FC = () => {
  const [events, setEvents] = useState<FullEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'All' | EventType>('All');
  
  type TabType = 'All' | EventType;
  interface Tab {
    id: TabType;
    label: string;
    count: number;
  }

  const tabs = useMemo<Tab[]>(() => {
    const typeCounts = events.reduce((acc, event) => {
      acc[event.event_type] = (acc[event.event_type] || 0) + 1;
      return acc;
    }, {} as Record<EventType, number>);

    const allCount = events.length;
    const tabList: Tab[] = [{ id: 'All', label: 'Tümü', count: allCount }];

    Object.entries(EVENT_TYPE_LABELS).forEach(([type, label]) => {
      tabList.push({ id: type as EventType, label, count: typeCounts[type as EventType] || 0 });
    });

    return tabList;
  }, [events]);

  const filteredEvents = useMemo(() => {
    if (activeTab === 'All') return events;
    return events.filter(event => event.event_type === activeTab);
  }, [events, activeTab]);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<FullEvent | null>(null);
  const [viewedEvent, setViewedEvent] = useState<FullEvent | null>(null);
  const [staffForEvent, setStaffForEvent] = useState<any[]>([]);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const { data } = await getEvents();
      setEvents(data || []);
    } catch (error) {
      console.error('Etkinlikler yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleEdit = (event: FullEvent) => {
    setSelectedEvent(event);
    setIsFormOpen(true);
  };

  const handleAdd = () => {
    setSelectedEvent(null);
    setIsFormOpen(true);
  };

  const handleView = async (event: FullEvent) => {
    setViewedEvent(event);
    try {
      const staff = await getEventStaff(event.id);
      setStaffForEvent(staff);
    } catch (err) {
      console.error('Staff yüklenemedi:', err);
      setStaffForEvent([]);
    }
    setIsDetailsOpen(true);
  };

  const handleFormSuccess = () => {
    fetchEvents();
    setIsFormOpen(false);
    setSelectedEvent(null);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteEvent(id);
      fetchEvents();
    } catch (error) {
      console.error('Silme başarısız:', error);
    }
  };

  // tabs and filteredEvents already defined above

  const getTypeColor = (type: EventType) => {
    const colors: Record<EventType, string> = {
      'Workshop': 'from-blue-600 to-indigo-600',
      'Face-to-Face': 'from-emerald-500 to-teal-600',
      'Bootcamp': 'from-orange-500 to-red-600',
      'Webinar': 'from-purple-500 to-pink-600',
      'Quiz Night': 'from-yellow-400 to-orange-500',
      'Mülakat Yayını': 'from-cyan-400 to-blue-500',
      'Coffee Talk': 'from-amber-600 to-orange-700',
      'İlk Konuşmam(Future)': 'from-fuchsia-500 to-purple-600',
      'Other': 'from-slate-500 to-gray-700',
    };
    return colors[type] || 'from-gray-500 to-gray-600';
  };

  return (
    <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-silver-100">
            Etkinlik Yönetimi
          </h1>
          <p className="mt-2 text-xl text-silver-500">
            Yaklaşan etkinlikler ve görevli atamaları
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleAdd}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all"
          >
            <Plus className="h-4 w-4" />
            Yeni Etkinlik
          </button>
          <div className="flex bg-white/5 border border-white/10 rounded-xl p-1">
            <button className="p-2 rounded-lg text-silver-400 hover:text-silver-200 flex items-center gap-1">
              <LayoutList className="h-4 w-4" />
              <span className="text-xs font-medium">Tablo</span>
            </button>
          </div>
        </div>
      </div>

      {/* Event Type Tabs */}
      <div className="mb-8">
        <div className="flex gap-2 overflow-x-auto pb-2 -mb-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const badgeColor = tab.id === 'All' ? 'from-slate-500/20 to-gray-600/20 text-slate-300' : getTypeColor(tab.id as EventType) + '/20';
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 group
                  ${isActive 
                    ? 'bg-gradient-to-r bg-white/10 text-white border border-white/20 shadow-sm ring-1 ring-white/30 scale-[1.02]' 
                    : 'text-silver-400 hover:text-silver-200 hover:bg-white/5 border border-transparent hover:shadow-md hover:scale-[1.01]'
                  }
                `}
              >
                <span className={`w-2 h-2 rounded-full ${getTypeColor(tab.id as EventType)} opacity-60 ${isActive ? 'scale-125 opacity-100' : ''}`}></span>
                <span>{tab.label}</span>
                <span className={`
                  ml-1.5 px-2 py-0.5 rounded-full text-xs font-bold
                  ${isActive ? badgeColor + ' ring-1 ring-white/30' : 'bg-white/5 text-silver-500'}
                `}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content: Table or Empty State */}
      {filteredEvents.length > 0 ? (
        <div className="glass-card rounded-3xl p-1">
          <div className="bg-coal-800/50 rounded-2xl overflow-hidden">
            <EventTable
              events={filteredEvents}
              onEdit={handleEdit}
              onDelete={(id) => setDeleteConfirm(id)}
              onView={handleView}
              loading={loading}
            />
          </div>
        </div>
      ) : (
        <div className="glass-card rounded-3xl p-8 text-center py-20">
          <div className={`
            w-28 h-28 mx-auto mb-8 p-6 rounded-3xl flex items-center justify-center
            ${activeTab === 'All' 
              ? 'bg-gradient-to-r from-slate-500/10 to-gray-600/10 border border-slate-500/20' 
              : `bg-gradient-to-r ${getTypeColor(activeTab as EventType)}/10 border ring-1 ring-${getTypeColor(activeTab as EventType)}/20`
            }
          `}>
            <Calendar className={`h-12 w-12 ${activeTab === 'All' ? 'text-slate-500/50' : `text-[${getTypeColor(activeTab as EventType)}] opacity-40`}`} />
          </div>
          <h3 className="text-2xl font-bold text-silver-200 mb-3">
            {activeTab === 'All' 
              ? 'Henüz etkinlik bulunmamaktadır' 
              : `Bu kategoride henüz bir etkinlik bulunmamaktadır`
            }
          </h3>
          <p className="text-silver-500 text-lg mb-8 max-w-md mx-auto leading-relaxed">
            {activeTab === 'All' 
              ? 'İlk etkinliğinizi oluşturun ve topluluğunuzu harekete geçirin!' 
              : `İlk ${EVENT_TYPE_LABELS[activeTab as EventType]} etkinliğinizi planlayın.`
            }
          </p>
          <button
            onClick={handleAdd}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl font-semibold text-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700 shadow-xl hover:shadow-2xl transition-all duration-200 ring-1 ring-white/20"
          >
            <Plus className="h-5 w-5" />
            Yeni Etkinlik Oluştur
          </button>
        </div>
      )}

      {/* Form Modal */}
      <EventFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        event={selectedEvent}
        onSuccess={handleFormSuccess}
      />

      {/* Details Modal (Fixed) */}
      <div className={`fixed inset-0 z-[65] ${isDetailsOpen ? 'flex' : 'hidden'} items-center justify-center p-4`}>
        <div className="absolute inset-0 bg-black/70 backdrop-blur-xl" onClick={() => setIsDetailsOpen(false)} />
        {viewedEvent && (
          <div className="relative w-full max-w-2xl mx-auto bg-coal-900/95 border border-white/10 rounded-3xl p-8 shadow-3xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">{viewedEvent.title}</h2>
              <button onClick={() => setIsDetailsOpen(false)} className="p-2 rounded-xl text-silver-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 text-silver-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-silver-400 uppercase tracking-wider mb-2">Tür</label>
                  <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r ${getTypeColor(viewedEvent.event_type)} text-white ring-1 ring-white/20`}>
                                        {EVENT_TYPE_LABELS[viewedEvent.event_type]}</span>
                 {/* <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold mt-1 bg-gradient-to-r from-gray-500 to-gray-600 text-white">
                   <option> {EVENT_TYPE_LABELS[viewedEvent.event_type] || viewedEvent.event_type}  </option>           
                     Fixed type display 
                  </div>*/}
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-silver-500">Tarih</span>
                  <div className="text-sm font-medium mt-1">
                    {new Date(viewedEvent.start_date).toLocaleDateString('tr-TR', { 
                      day: 'numeric', month: 'short', year: 'numeric', 
                      hour: '2-digit', minute: '2-digit' 
                    })} - {new Date(viewedEvent.end_date).toLocaleDateString('tr-TR', { 
                      day: 'numeric', month: 'short', year: 'numeric', 
                      hour: '2-digit', minute: '2-digit' 
                    })}
                  </div>
                </div>
              </div>
              {viewedEvent.location && (
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 text-silver-500">📍</span>
                  <span>{viewedEvent.location}</span>
                </div>
              )}
              {viewedEvent.drive_link && (
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-silver-500">Drive Link</span>
                  <a href={viewedEvent.drive_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-ice-400 hover:text-ice-300 text-sm mt-1 underline">
                    📎 {viewedEvent.drive_link.slice(0, 50)}...
                  </a>
                </div>
              )}
              {viewedEvent.description && (
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-silver-500 mb-2 block">Açıklama</span>
                  <p className="text-sm leading-relaxed">{viewedEvent.description}</p>
                </div>
              )}

<div className="pt-6 border-t border-white/10">
  <span className="text-xs font-semibold uppercase tracking-wider text-silver-500 block mb-4">
    Görevliler
  </span>
  
  {staffForEvent.length === 0 ? (
    <span className="text-xs text-silver-500 italic">Henüz görevli atanmadı</span>
  ) : (
    <div className="flex flex-wrap gap-x-6 gap-y-4">
      {staffForEvent.map((s: any) => (
        <div key={s.member_id} className="flex items-center gap-3 min-w-fit">
          {/* Sol tarafta ikon/avatar 
          <div className="w-9 h-9 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center justify-center text-lg shadow-inner">
            👤
          </div>*/}
          <span className="w-5 h-5 bg-blue-500/20 rounded-full flex items-center justify-center text-xs font-bold text-blue-400">👤</span>
          {/* Sağ tarafta alt alta isim ve title */}
          <div className="flex flex-col">
            <span className="text-sm text-white leading-tight text-xs text-silver-300 flex items-center gap-2">
              {s.members?.name || s.name || 'İsimsiz'}
            </span>
            <span className="text-[11px] font-medium text-silver-500 mt-0.5">
              {s.members?.title || s.members.comm_title || 'Yazılımcı'}
            </span>
          </div>
        </div>
      ))}
    </div>
  )}
</div>


             {/* <div className="pt-4 border-t border-white/10">
                <span className="text-xs font-semibold uppercase tracking-wider text-silver-500">Görevliler</span>
                {staffForEvent.length === 0 ? (
                  <span className="text-xs text-silver-500 mt-1 block">Henüz atanmadı</span>
                ) : (
                  <div className="mt-2 space-y-1">
                    {staffForEvent.map((s: any) => (
                      <div key={s.member_id} className="text-xs text-silver-300 flex items-center gap-2">
                        <span className="w-5 h-5 bg-blue-500/20 rounded-full flex items-center justify-center text-xs font-bold text-blue-400">👤</span>
                               {s.members?.name || s.name || s.member_id & s.members.comm_title} 
                      </div>
                    ))}
                  </div>
                )}
              </div>*/}



            </div>
          </div>
        )}
      </div>

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-xl" onClick={() => setDeleteConfirm(null)} />
          <div className="relative w-full max-w-sm bg-coal-900/95 border border-white/10 rounded-2xl p-6 shadow-3xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20">
                <Trash2 className="h-5 w-5 text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-white">Etkinlik Sil</h3>
            </div>
            <p className="text-silver-300 mb-6">Bu etkinlik ve görevli atamaları silinecek. Geri alınamaz.</p>
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
