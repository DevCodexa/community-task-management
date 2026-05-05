import React, { useState, useEffect } from 'react';
import { X, Save, Calendar, AlertCircle, Loader2, CheckCircle2, CalendarClock } from 'lucide-react';
import { createEvent, updateEvent, addStaffToEvent, addSpeakerToEvent, getEventStaff, getEventSpeakers } from '../../lib/supabaseEvents';
import { getMembers } from '../../lib/supabaseMembers';
import { getSpeakers } from '../../lib/supabaseSpeakers';
import { Speaker } from '../../types/speaker';
import { MultiSelectInput } from '../ui/MultiSelectInput';

import { EventFormData, FullEvent, EventType, EVENT_TYPE_VALUES, EVENT_TYPE_LABELS, EVENT_DEFAULTS } from '../../types/event';
import { FullMember } from '../../types/member';
import { PaginatedMembersResponse } from '../../types/member';

interface EventFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  event?: FullEvent | null;
  onSuccess: () => void;
}

export const EventFormModal: React.FC<EventFormModalProps> = ({
  isOpen,
  onClose,
  event,
  onSuccess
}) => {
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    event_type: 'Other',
    start_date: '',
    end_date: '',
    drive_link: '',
    location: ''
  });
  const [selectedStaff, setSelectedStaff] = useState<string[]>([]);
  const [selectedSpeakers, setSelectedSpeakers] = useState<string[]>([]);
  const [members, setMembers] = useState<FullMember[]>([]);
  const [speakers, setSpeakers] = useState<Speaker[]>([]);

  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState('');
  const [dateError, setDateError] = useState('');

  // Load data on open
  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, event]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      // Load members and speakers
      const [membersResponse, speakersResponse] = await Promise.all([
        getMembers({ limit: 100 }) as Promise<PaginatedMembersResponse>,
        getSpeakers({ limit: 100 })
      ]);
      setMembers(membersResponse.data);
      setSpeakers(speakersResponse.data);

      // Load existing staff and speakers if editing
      if (event) {
        const [staff, speakersList] = await Promise.all([
          getEventStaff(event.id),
          getEventSpeakers(event.id)
        ]);
        setSelectedStaff(staff.map(s => s.member_id));
        setSelectedSpeakers(speakersList.map(s => s.speaker_id));
        setFormData({
          title: event.title,
          description: event.description || '',
          event_type: event.event_type,
          start_date: event.start_date.slice(0, 16),
          end_date: event.end_date.slice(0, 16),
          drive_link: event.drive_link,
          location: event.location
        });
      } else {
        setSelectedStaff([]);
        setSelectedSpeakers([]);
        setFormData({
          title: '',
          description: '',
          event_type: 'Other' as EventType,
          start_date: '',
          end_date: '',
          drive_link: '',
          location: ''
        });
      }
    } catch (err) {
      setError('Veriler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };


  // Date validation
  useEffect(() => {
    if (formData.start_date && formData.end_date) {
      const start = new Date(formData.start_date);
      const end = new Date(formData.end_date);
      if (end <= start) {
        setDateError('Bitiş tarihi başlangıç tarihinden sonra olmalı');
      } else {
        setDateError('');
      }
    }
  }, [formData.start_date, formData.end_date]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Client-side validation for critical fields
    const requiredFields = {
      title: formData.title.trim(),
      event_type: formData.event_type,
      start_date: formData.start_date,
      end_date: formData.end_date,
      description: formData.description?.trim() || '',
      location: formData.location?.trim()|| ''
    };

    const missingFields = Object.entries(requiredFields)
      .filter(([value]) => !value)
      .map(([key]) => {
        const labels = {
          title: 'Başlık',
          description: 'Açıklama',
          location: 'Konum',
          event_type: 'Tür'
        };
        return labels[key as keyof typeof labels] || key;
      });

    if (missingFields.length > 0) {
      setError(`${missingFields.join(', ')} alanları zorunlu!`);
      return;
    }

    if (dateError || loading) return;

    setSubmitLoading(true);
    setError('');

    // DEBUG: Log exact payload
    console.log('🔍 FORM PAYLOAD BEFORE SAVE:', JSON.stringify({
      ...formData,
      ...EVENT_DEFAULTS
    }, null, 2));
    
    try {
      // DOĞRUSU BU (formData en sonda olmalı):
      const eventData = { ...EVENT_DEFAULTS, ...formData };  
      
      let savedEvent: FullEvent;
      if (event) {
        console.log('📝 UPDATING EVENT ID:', event.id);
        savedEvent = await updateEvent(event.id, eventData);
      } else {
        console.log('➕ CREATING NEW EVENT');
        savedEvent = await createEvent(eventData);
      }

      console.log('✅ EVENT SAVED:', savedEvent);

      // Add selected staff
      for (const memberId of selectedStaff) {
        await addStaffToEvent(savedEvent.id, memberId);
      }

      // Add selected speakers (NEW)
      for (const speakerId of selectedSpeakers) {
        await addSpeakerToEvent(savedEvent.id, speakerId);
      }

      onSuccess();
      onClose();

    } catch (err: any) {
      console.error('❌ Event save error:', err);
      
      // Enhanced Supabase error parsing
      let errorMsg = err.message || 'Kaydetme başarısız';
      if (err.code === '23502') {
        errorMsg = 'Zorunlu alanlar eksik: ' + (err.details || 'Başlık, tarih veya tür');
      } else if (err.code === '23505') {
        errorMsg = 'Bu kayıt zaten mevcut';
      } else if (err.code) {
        errorMsg += ` (Kod: ${err.code})`;
      }
      
      setError(errorMsg);
    } finally {
      setSubmitLoading(false);
    }
  };

  // toggleStaff removed - now handled by MultiSelectInput


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-xl" onClick={onClose} />
      <div className="relative w-full max-w-2xl mx-auto rounded-3xl border border-white/10 bg-gradient-to-b from-coal-800/95 via-coal-900/90 to-coal-800/95 shadow-3xl backdrop-blur-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-coal-900/50 border-b border-white/5 p-6 backdrop-blur-xl z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 border border-emerald-500/20">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="font-display text-2xl font-bold text-silver-100">
                  {event ? 'Etkinlik Düzenle' : 'Yeni Etkinlik'}
                </h2>
                <p className="text-sm text-silver-500">Detayları girin</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl text-silver-400 hover:text-silver-200 hover:bg-white/10 transition-all">
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
          {dateError && (
            <div className="p-4 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-orange-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-orange-400">{dateError}</p>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-silver-300 mb-2">Başlık *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              required
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-silver-100 placeholder-silver-600 focus:ring-2 focus:ring-ice-500/30 focus:border-white/50 transition-all"
              placeholder="Etkinlik başlığı..."
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-silver-300 mb-2">Açıklama</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full min-h-[120px] px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-silver-100 placeholder-silver-600 focus:ring-2 focus:ring-ice-500/30 focus:border-white/50 transition-all resize-vertical"
              placeholder="Etkinlik detayları..."
            />
          </div>
          {/* Grid: Type, Dates, Location */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              
              <label className="block text-xs font-semibold text-silver-400 uppercase tracking-wider mb-2">Tür</label>
              <select
                value={formData.event_type}
                onChange={(e) => setFormData({...formData, event_type: e.target.value as EventType})}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-silver-100 focus:ring-2 focus:ring-ice-500/30 focus:border-white/50 transition-all"
              >
                
                {EVENT_TYPE_VALUES.map(type => (
                  <option key={type} value={type}>{EVENT_TYPE_LABELS[type]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-silver-400 uppercase tracking-wider mb-2">Başlangıç</label>
              <div className="relative">
                <CalendarClock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-silver-500" />
                <input
                  type="datetime-local"
                  value={formData.start_date}
                  onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/20 text-silver-100 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-silver-400 uppercase tracking-wider mb-2">Bitiş</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-silver-500" />
                <input
                  type="datetime-local"
                  value={formData.end_date}
                  onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/20 text-silver-100 focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500/50 transition-all"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-silver-300 mb-2">Drive Link</label>
              <input
                type="url"
                value={formData.drive_link}
                onChange={(e) => setFormData({...formData, drive_link: e.target.value})}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-silver-100 placeholder-silver-600 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all"
                placeholder="https://drive.google.com/..."
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-silver-300 mb-2">Konum</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-silver-100 placeholder-silver-600 focus:ring-2 focus:ring-ice-500/30 focus:border-ice-500/50 transition-all"
                placeholder="İstanbul Tech Hub, Online - Zoom vb."
              />
            </div>
          </div>

          {/* Staff MultiSelectInput */}
          <MultiSelectInput
            label="Görevliler"
            options={members.map(m => ({ id: m.id, name: m.name }))}
            selectedIds={selectedStaff}
            onChange={setSelectedStaff}
            placeholder="Görevli ara..."
          />

          {/* Speakers MultiSelectInput (NEW) */}
          <MultiSelectInput
            label="Konuşmacılar"
            options={speakers.map(s => ({ id: s.id, name: s.full_name }))}
            selectedIds={selectedSpeakers}
            onChange={setSelectedSpeakers}
            placeholder="Konuşmacı ara..."
          />


          {/* Submit */}
          <div className="flex items-center gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-xl text-sm font-semibold text-silver-400 hover:text-silver-200 hover:bg-white/10 transition-all border border-white/10"
              disabled={submitLoading}
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={submitLoading || !!dateError}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed border-0"
            >
              {submitLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Kaydediliyor...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Kaydet
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
