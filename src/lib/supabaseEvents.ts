/* ============================================================
   Events CRUD Service - Etkinlik Yönetim Sistemi
   ============================================================ */

import { supabase } from './supabase';
import {
  FullEvent,
  EventFormData,
  EventUpdateData,
  EventStaff,
  EventStaffWithMember,
  EventSpeaker,
  EventSpeakerWithSpeaker,
  EventError,
  EventQueryParams,
  PaginatedEventsResponse,
  EventStats,
  ValidationResult,
} from '../types/event';


// Re-export EventFormData for components
export type { EventFormData } from '../types/event';

// -----------------------------------------------------------
// 1. HELPERS & ERROR HANDLERS
// -----------------------------------------------------------

const handleError = (error: any): EventError => {
  console.error('🚨 Supabase Event Error Details:', {
    message: error?.message,
    code: error?.code,
    details: error?.details,
    hint: error?.hint,
    fullError: error
  });

  let userMessage = error?.message || 'Bilinmeyen hata oluştu';
  
  // Supabase-specific error codes
  switch (error?.code) {
    case '23502': // NOT NULL violation
      userMessage = 'Zorunlu alan eksiktir: ' + (error.details || 'Lütfen tüm alanları doldurun');
      break;
    case '23503': // Foreign key violation
      userMessage = 'Geçersiz referans: İlgili kayıt bulunamadı';
      break;
    case '23505': // Unique violation
      userMessage = 'Bu kayıt zaten mevcut';
      break;
    case '42703': // Column not found
      userMessage = 'Veritabanı şeması hatası - sütun mevcut değil';
      break;
    case 'PGRST116': // No rows returned
      userMessage = 'Kayıt bulunamadı';
      break;
  }

  return {
    message: userMessage,
    code: error?.code,
    details: error?.details,
    hint: error?.hint,
  };
};

const throwError = (error: any): never => {
  const eventError = handleError(error);
  throw new Error(eventError.message);
};

/**
 * Etkinliğin aktif olup olmadığını kontrol eder
 * (başlangıç tarihi geçmemiş veya bitiş tarihi geçmemiş)
 */
export const isEventActive = (event: FullEvent): boolean => {
  const now = new Date();
  const start = new Date(event.start_date);
  const end = new Date(event.end_date);
  return now >= start && now <= end;
};

/**
 * Etkinliğin gelecekte olup olmadığını kontrol eder
 */
export const isEventUpcoming = (event: FullEvent): boolean => {
  const now = new Date();
  const start = new Date(event.start_date);
  return start > now;
};

/**
 * Etkinliğin geçmiş olup olmadığını kontrol eder
 */
export const isEventPast = (event: FullEvent): boolean => {
  const now = new Date();
  const end = new Date(event.end_date);
  return end < now;
};

// -----------------------------------------------------------
// 2. VALIDATION
// -----------------------------------------------------------

export const validateEventData = (data: Partial<EventFormData>): ValidationResult => {
  const errors: string[] = [];

  if (data.title !== undefined) {
    if (!data.title.trim()) errors.push('Başlık zorunludur');
    else if (data.title.trim().length < 2) errors.push('Başlık en az 2 karakter');
    else if (data.title.trim().length > 200) errors.push('Başlık en fazla 200 karakter');
  }

  if (data.start_date !== undefined && data.end_date !== undefined) {
    const start = new Date(data.start_date);
    const end = new Date(data.end_date);
    if (end <= start) errors.push('Bitiş tarihi başlangıç tarihinden sonra olmalı');
  }

  if (data.drive_link !== undefined && data.drive_link) {
    try {
      new URL(data.drive_link);
    } catch {
      errors.push('Geçerli bir URL girin');
    }
  }

  return { valid: errors.length === 0, errors };
};

// -----------------------------------------------------------
// 3. READ OPERATIONS
// -----------------------------------------------------------

export const getEvents = async (params?: EventQueryParams): Promise<PaginatedEventsResponse> => {
  const {
    search,
    event_type,
    from_date,
    to_date,
    page = 1,
    limit = 50,
    sortBy = 'start_date',
    sortOrder = 'asc',
  } = params || {};

  const from = (page - 1) * limit;

  let query = supabase.from('events').select('*', { count: 'exact' });

  if (search) query = query.ilike('title', `%${search}%`);
  if (event_type) query = query.eq('event_type', event_type);
  if (from_date) query = query.gte('start_date', from_date);
  if (to_date) query = query.lte('start_date', to_date);

  query = query.order(sortBy, { ascending: sortOrder === 'asc' }).range(from, from + limit - 1);

  const { data, error, count } = await query;
  if (error) throwError(error);

  return {
    data: data || [],
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
    hasNext: page * limit < (count || 0),
    hasPrev: page > 1,
  };
};

export const getEventById = async (id: string): Promise<FullEvent | null> => {
  const { data, error } = await supabase.from('events').select('*').eq('id', id).single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throwError(error);
  }
  return data;
};

/**
 * Tüm etkinlikleri sayısız getirir (istasyonlar için)
 */
export const getAllEvents = async (): Promise<FullEvent[]> => {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('start_date', { ascending: true });
  if (error) throwError(error);
  return data || [];
};

// -----------------------------------------------------------
// 4. CREATE / UPDATE / DELETE
// -----------------------------------------------------------

export const createEvent = async (eventData: EventFormData): Promise<FullEvent> => {
  const validation = validateEventData(eventData);
  if (!validation.valid) {
    throw new Error(validation.errors.join(', '));
  }

  // Varsayılan değerlerle birleştir + explicit null coalescing
  const normalizedData = {
    title: eventData.title || '',
    description: eventData.description || '',
    event_type: eventData.event_type || 'Other',
    start_date: eventData.start_date,
    end_date: eventData.end_date,
    drive_link: eventData.drive_link || '',
    location: eventData.location || ''
  };

  const { data, error } = await supabase.from('events').insert([normalizedData]).select().single();

  if (error) throwError(error);
  
  return data;
};

export const updateEvent = async (id: string, updateData: EventUpdateData): Promise<FullEvent> => {
  const currentEvent = await getEventById(id);
  if (!currentEvent) throw new Error('Etkinlik bulunamadı');

  // Tarih validasyonu
  const startDate = updateData.start_date || currentEvent.start_date;
  const endDate = updateData.end_date || currentEvent.end_date;
  
  if (new Date(endDate) <= new Date(startDate)) {
    throw new Error('Bitiş tarihi başlangıç tarihinden sonra olmalı');
  }

  // Explicit null coalescing for update
  const safeUpdateData = {
    title: updateData.title !== undefined ? updateData.title || '' : undefined,
    description: updateData.description !== undefined ? updateData.description || '' : undefined,
    event_type: updateData.event_type !== undefined ? updateData.event_type || 'Other' : undefined,
    start_date: updateData.start_date,
    end_date: updateData.end_date,
    drive_link: updateData.drive_link !== undefined ? updateData.drive_link || '' : undefined,
    location: updateData.location !== undefined ? updateData.location || '' : undefined
  };

  // Filter undefined values
  const updatePayload = Object.fromEntries(
    Object.entries(safeUpdateData).filter(([_, v]) => v !== undefined)
  );

  const { data, error } = await supabase
    .from('events')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single();

  if (error) throwError(error);
  
  return data;
};

export const deleteEvent = async (id: string): Promise<void> => {
  const event = await getEventById(id);
  if (!event) throw new Error('Etkinlik bulunamadı');

  // Önce görevlileri sil (cascade olacak ama explicit yapalım)
  const { error: staffError } = await supabase
    .from('event_staff')
    .delete()
    .eq('event_id', id);
  
  if (staffError) throwError(staffError);

  // Sonra etkinliği sil
  const { error } = await supabase.from('events').delete().eq('id', id);
  if (error) throwError(error);
};

// -----------------------------------------------------------
// 5. STAFF MANAGEMENT (Junction table operations)
// -----------------------------------------------------------

/**
 * Bir etkinliğe görevli ekler
 */
export const addStaffToEvent = async (eventId: string, memberId: string): Promise<EventStaff> => {
  // Önce etkinliğin var olduğunu kontrol et
  const event = await getEventById(eventId);
  if (!event) throw new Error('Etkinlik bulunamadı');

  // Üyenin var olduğunu kontrol et
  const { data: member, error: memberError } = await supabase
    .from('members')
    .select('id')
    .eq('id', memberId)
    .single();
  
  if (memberError || !member) throw new Error('Üye bulunamadı');

  // Zaten görevli mi kontrol et
  const { data: existing } = await supabase
    .from('event_staff')
    .select('id')
    .eq('event_id', eventId)
    .eq('member_id', memberId)
    .single();
  
  if (existing) throw new Error('Bu üye zaten etkinlikte görevli');

  const { data, error } = await supabase
    .from('event_staff')
    .insert([{ event_id: eventId, member_id: memberId }])
    .select()
    .single();

  if (error) throwError(error);

  // Send email notification to staff member (fire-and-forget - don't await)
  sendEventStaffEmailNotification(eventId, memberId).catch(err => {
    console.warn('Email notification failed:', err);
  });

  return data;
};

export const addSpeakerToEvent = async (eventId: string, speakerId: string): Promise<EventSpeaker> => {
  const event = await getEventById(eventId);
  if (!event) throw new Error('Etkinlik bulunamadı');

  const { data: speaker, error: speakerError } = await supabase
    .from('speakers')
    .select('id')
    .eq('id', speakerId)
    .single();
  
  if (speakerError || !speaker) throw new Error('Konuşmacı bulunamadı');

  const { data: existing } = await supabase
    .from('event_speakers')
    .select('id')
    .eq('event_id', eventId)
    .eq('speaker_id', speakerId)
    .single();
  
  if (existing) throw new Error('Bu konuşmacı zaten etkinliğe atanmış');

  const { data, error } = await supabase
    .from('event_speakers')
    .insert([{ event_id: eventId, speaker_id: speakerId }])
    .select()
    .single();

  if (error) throwError(error);

  return data;
};


/**
 * Bir etkinlikten görevli çıkarır
 */
export const removeStaffFromEvent = async (eventId: string, memberId: string): Promise<void> => {
  const { error } = await supabase
    .from('event_staff')
    .delete()
    .eq('event_id', eventId)
    .eq('member_id', memberId);
  
  if (error) throwError(error);
};

/**
 * Bir etkinlikten konuşmacı çıkarır (NEW)
 */
export const removeSpeakerFromEvent = async (eventId: string, speakerId: string): Promise<void> => {
  const { error } = await supabase
    .from('event_speakers')
    .delete()
    .eq('event_id', eventId)
    .eq('speaker_id', speakerId);
  
  if (error) throwError(error);
};


/**
 * Bir etkinliğin tüm görevlilerini getirir (members ile JOIN)
 */
export const getEventStaff = async (eventId: string): Promise<EventStaffWithMember[]> => {
  const { data, error } = await supabase
    .from('event_staff')
    .select('*, members(id, name, email, avatar, comm_title)')
    .eq('event_id', eventId);
  
  if (error) throwError(error);
  return data || [];
};

/**
 * Bir etkinliğin tüm konuşmacılarını getirir (speakers ile JOIN) (NEW)
 */
export const getEventSpeakers = async (eventId: string): Promise<EventSpeakerWithSpeaker[]> => {
  const { data, error } = await supabase
    .from('event_speakers')
    .select('*, speakers(id, full_name, title, company, image_url)')
    .eq('event_id', eventId);
  
  if (error) throwError(error);
  return data || [];
};


/**
 * Tüm etkinliklerin görevli sayılarını getirir
 */
export const getEventsStaffCounts = async (eventIds: string[]): Promise<Record<string, number>> => {
  if (!eventIds.length) return {};
  
  const { data, error } = await supabase
    .from('event_staff')
    .select('event_id')
    .in('event_id', eventIds);
  
  if (error) throwError(error);

  // Her etkinlik için say
  const counts: Record<string, number> = {};
  eventIds.forEach(id => counts[id] = 0);
  (data || []).forEach(staff => {
    if (counts[staff.event_id] !== undefined) {
      counts[staff.event_id]++;
    }
  });

  return counts;
};

/**
 * Tüm etkinliklerin konuşmacı sayılarını getirir (NEW)
 */
export const getEventsSpeakerCounts = async (eventIds: string[]): Promise<Record<string, number>> => {
  if (!eventIds.length) return {};
  
  const { data, error } = await supabase
    .from('event_speakers')
    .select('event_id')
    .in('event_id', eventIds);
  
  if (error) throwError(error);

  const counts: Record<string, number> = {};
  eventIds.forEach(id => counts[id] = 0);
  (data || []).forEach(speaker => {
    if (counts[speaker.event_id] !== undefined) {
      counts[speaker.event_id]++;
    }
  });

  return counts;
};


// -----------------------------------------------------------
// 6. STATS
// -----------------------------------------------------------

export const getEventStats = async (): Promise<EventStats> => {
  const { data: allEvents, error } = await supabase.from('events').select('*');
  if (error) throwError(error);

  const events = allEvents || [];
  const now = new Date();

  const typeDistribution: Record<string, number> = {
    'Workshop': 0,
    'Face-to-Face': 0,
    'Bootcamp': 0,
    'Webinar': 0,
    'Other': 0,
  };

  let upcoming = 0;
  let past = 0;

  events.forEach(event => {
    const start = new Date(event.start_date);
    const end = new Date(event.end_date);

    // Tür dağılımı
    if (typeDistribution[event.event_type] !== undefined) {
      typeDistribution[event.event_type]++;
    }

    // Zaman durumu
    if (end < now) {
      past++;
    } else if (start > now) {
      upcoming++;
    }
  });

  // Toplam görevli atamaları
  const { count: staffCount } = await supabase
    .from('event_staff')
    .select('*', { count: 'exact', head: true });

  return {
    totalEvents: events.length,
    upcomingEvents: upcoming,
    pastEvents: past,
    typeDistribution: typeDistribution as any,
    totalStaffAssignments: staffCount || 0,
  };
};

// -----------------------------------------------------------
// 7. ADDITIONAL QUERIES
// -----------------------------------------------------------

/**
 * Yaklaşan etkinlikleri getirir
 */
export const getUpcomingEvents = async (limit: number = 5): Promise<FullEvent[]> => {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .gte('start_date', new Date().toISOString())
    .order('start_date', { ascending: true })
    .limit(limit);

  if (error) throwError(error);
  return data || [];
};

/**
 * Geçmiş etkinlikleri getirir
 */
export const getPastEvents = async (limit: number = 10): Promise<FullEvent[]> => {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .lt('end_date', new Date().toISOString())
    .order('start_date', { ascending: false })
    .limit(limit);

  if (error) throwError(error);
  return data || [];
};

/**
 * Belirli bir üyenin görevli olduğu etkinlikleri getirir
 */
export const getEventsByStaffMember = async (memberId: string): Promise<FullEvent[]> => {
  const { data: staffRecords, error } = await supabase
    .from('event_staff')
    .select('event_id')
    .eq('member_id', memberId);

  if (error) throwError(error);
  if (!staffRecords?.length) return [];

  const eventIds = staffRecords.map(s => s.event_id);

  const { data, error: eventError } = await supabase
    .from('events')
    .select('*')
    .in('id', eventIds)
    .order('start_date', { ascending: true });

  if (eventError) throwError(eventError);
  return data || [];
};

/**
 * Etkinliğin detaylarını görevlilerle birlikte getirir
 */
export const getEventWithStaff = async (id: string) => {
  const event = await getEventById(id);
  if (!event) return null;

  const staff = await getEventStaff(id);

  return {
    ...event,
    staff,
    staffCount: staff.length,
  };
};
