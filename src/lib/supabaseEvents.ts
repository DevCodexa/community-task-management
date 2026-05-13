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

  // DEBUG: Log exact Supabase payload
  console.log('📤 CREATE EVENT PAYLOAD:', JSON.stringify(normalizedData, null, 2));

  const { data, error } = await supabase.from('events').insert([normalizedData]).select().single();

  if (error) throwError(error);
  
  console.log('✅ CREATE EVENT SUCCESS:', data);
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

  // DEBUG: Log exact Supabase payload
  console.log('📤 UPDATE EVENT PAYLOAD (ID:', id, '):', JSON.stringify(updatePayload, null, 2));

  const { data, error } = await supabase
    .from('events')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single();

  if (error) throwError(error);
  
  console.log('✅ UPDATE EVENT SUCCESS:', data);
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

/**
 * Bir etkinliğe konuşmacı ekler (NEW)
 */
/**
 * Send speaker invite email notification
 * Fire-and-forget background task
 */
const sendSpeakerInviteEmailNotification = async (
  eventId: string,
  speakerId: string
): Promise<void> => {
  try {
    const [event, speakerResult] = await Promise.all([
      getEventById(eventId),
      supabase.from('speakers').select('full_name, email, title, company').eq('id', speakerId).single()
    ]);

    const speaker = speakerResult.data;
    if (!speaker?.email || !event) {
      console.warn('Missing speaker email or event, skipping invite');
      return;
    }

    const startDate = new Date(event.start_date).toLocaleDateString('tr-TR', {
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const html = generateSpeakerInviteEmailHtml(
      speaker.full_name,
      event.title,
      speaker.title || '',
      speaker.company || '',
      startDate,
      event.location || ''
    );

    const { sendEmail } = await import('./brevo');
    
    await sendEmail(
      speaker.email,
      `🎤 Konuşmacı Daveti: ${event.title}`,
      html
    );

    console.log('📧 Speaker invite sent to:', speaker.email);
  } catch (err) {
    console.warn('Failed to send speaker invite:', err);
  }
};

/**
 * Generate HTML for speaker invite email
 */
const generateSpeakerInviteEmailHtml = (
  speakerName: string,
  eventTitle: string,
  speakerTitle: string,
  speakerCompany: string,
  startDate: string,
  location: string
): string => {
  return `
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Konuşmacı Daveti</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0f0f1a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f0f1a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #1a1a2e; border-radius: 16px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 40px; text-align: center; background: linear-gradient(135deg, #0D8ABC 0%, #0a6a8a 100%);">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">
                🎤 Konuşmacı Daveti
              </h1>
              <p style="margin: 8px 0 0 0; font-size: 14px; color: rgba(255,255,255,0.8);">
                Zincir Atarlı Topluluk
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 24px 0; font-size: 16px; color: #e0e0e0;">
                Merhaba <strong style="color: #0D8ABC;">${speakerName}</strong> 🎉
              </p>
              <p style="margin: 0 0 32px 0; font-size: 15px; color: #a0a0a0; line-height: 1.6;">
                "${eventTitle}" etkinliğimize <strong>konuşmacı</strong> olarak davetlisiniz!
              </p>

              <!-- Event Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #252542; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <tr>
                  <td>
                    <h2 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 600; color: #ffffff;">
                      ${eventTitle}
                    </h2>
                    <p style="margin: 0 0 16px 0; font-size: 14px; color: #a0a0a0;">
                      <strong>${speakerTitle}</strong> - ${speakerCompany}
                    </p>
                    
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid #3a3a5a;">
                          <span style="font-size: 12px; color: #6a6a8a; text-transform: uppercase;">Tarih</span>
                          <p style="margin: 4px 0 0 0; font-size: 14px; color: #4dabf7;">${startDate}</p>
                        </td>
                        ${location ? `
                        <td style="padding: 8px 0; border-bottom: 1px solid #3a3a5a;">
                          <span style="font-size: 12px; color: #6a6a8a; text-transform: uppercase;">Konum</span>
                          <p style="margin: 4px 0 0 0; font-size: 14px; color: #40c057;">📍 ${location}</p>
                        </td>` : ''}
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Buttons -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom: 16px;">
                    <a href="https://community-tasks.vercel.app" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #0D8ABC 0%, #0a6a8a 100%); color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; border-radius: 10px; margin-right: 12px;">
                      Daveti Onayla →
                    </a>
                    <a href="mailto:noreply@community-tasks.com" style="display: inline-block; padding: 14px 32px; background: #6c757d; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; border-radius: 10px;">
                      Reddet
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; text-align: center; border-top: 1px solid #3a3a5a;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #6a6a8a;">
                Bu davet otomatik olarak gönderilmiştir.
              </p>
              <p style="margin: 0; font-size: 12px; color: #4a4a6a;">
                © ${new Date().getFullYear()} Zincir Atarlı Task Management
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
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

  // Send speaker invite email (fire-and-forget)
  sendSpeakerInviteEmailNotification(eventId, speakerId).catch((err: any) => {
    console.warn('Speaker invite email failed:', err);
  });

  return data;
};


/**
 * Send email notification to event staff member
 * This runs in the background to not block the main operation
 */
const sendEventStaffEmailNotification = async (
  eventId: string,
  memberId: string
): Promise<void> => {
  try {
    // Get event and member details
    const [event, memberResult] = await Promise.all([
      getEventById(eventId),
      supabase
        .from('members')
        .select('name, email')
        .eq('id', memberId)
        .single()
    ]);

    const member = memberResult.data;
    if (!member?.email || !event) {
// console.warn('Missing event or member email, skipping notification');
      return;
    }

    // Format event dates
    const startDate = new Date(event.start_date).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const endDate = new Date(event.end_date).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Generate HTML email
    const html = generateEventStaffEmailHtml(
      member.name,
      event.title,
      event.description || '',
      startDate,
      endDate,
      event.location || ''
    );

    // Send email via Brevo
    const { sendEmail } = await import('./brevo');
    
    await sendEmail(
      member.email,
      `📅 Etkinlik Görevlisi Oldun: ${event.title}`,
      html
    );

// console.log('📧 Event staff assignment email sent to:', member.email);
  } catch (err) {
// console.warn('Failed to send event staff email:', err);
  }
};

/**
 * Generate HTML for event staff assignment email
 */
const generateEventStaffEmailHtml = (
  memberName: string,
  eventTitle: string,
  eventDescription: string,
  startDate: string,
  endDate: string,
  location: string
): string => {
  return `
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Etkinlik Görevlisi Oldun</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0f0f1a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f0f1a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #1a1a2e; border-radius: 16px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 40px; text-align: center; background: linear-gradient(135deg, #0D8ABC 0%, #0a6a8a 100%);">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">
                📅 Etkinlik Görevlisi Oldun
              </h1>
              <p style="margin: 8px 0 0 0; font-size: 14px; color: rgba(255,255,255,0.8);">
                Zincir Atarlı Topluluk
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 24px 0; font-size: 16px; color: #e0e0e0;">
                Merhaba <strong style="color: #0D8ABC;">${memberName}</strong> 👋
              </p>
              <p style="margin: 0 0 32px 0; font-size: 15px; color: #a0a0a0; line-height: 1.6;">
                Bir etkinlikte görevli olarak eklendin! Aşağıda etkinlik detaylarını bulabilirsin.
              </p>

              <!-- Event Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #252542; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <tr>
                  <td>
                    <h2 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 600; color: #ffffff;">
                      ${eventTitle}
                    </h2>
                    ${eventDescription ? `
                    <p style="margin: 0 0 16px 0; font-size: 14px; color: #a0a0a0; line-height: 1.5;">
                      ${eventDescription}
                    </p>
                    ` : ''}
                    
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid #3a3a5a;">
                          <span style="font-size: 12px; color: #6a6a8a; text-transform: uppercase; letter-spacing: 0.5px;">Başlangıç</span>
                          <p style="margin: 4px 0 0 0; font-size: 14px; color: #4dabf7; font-weight: 500;">${startDate}</p>
                        </td>
                        <td style="padding: 8px 0; border-bottom: 1px solid #3a3a5a;">
                          <span style="font-size: 12px; color: #6a6a8a; text-transform: uppercase; letter-spacing: 0.5px;">Bitiş</span>
                          <p style="margin: 4px 0 0 0; font-size: 14px; color: #ff6b6b; font-weight: 500;">${endDate}</p>
                        </td>
                      </tr>
                      ${location ? `
                      <tr>
                        <td colspan="2" style="padding: 8px 0;">
                          <span style="font-size: 12px; color: #6a6a8a; text-transform: uppercase; letter-spacing: 0.5px;">Konum</span>
                          <p style="margin: 4px 0 0 0; font-size: 14px; color: #40c057;">📍 ${location}</p>
                        </td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="https://community-tasks.vercel.app" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #0D8ABC 0%, #0a6a8a 100%); color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; border-radius: 10px;">
                      Etkinliği Görüntüle →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; text-align: center; border-top: 1px solid #3a3a5a;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #6a6a8a;">
                Bu email otomatik olarak gönderilmiştir. Lütfen bu email'e yanıt vermeyin.
              </p>
              <p style="margin: 0; font-size: 12px; color: #4a4a6a;">
                © ${new Date().getFullYear()} Zincir Atarlı Task Management
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
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
