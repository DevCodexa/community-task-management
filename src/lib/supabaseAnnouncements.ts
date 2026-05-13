/* ============================================================
   Announcements CRUD Service - Duyurular
   ============================================================ */

import { supabase } from './supabase';
import type {
  AnnouncementFormData,
  AnnouncementQueryParams,
  AnnouncementUpdateData,
  FullAnnouncement,
  PaginatedAnnouncementsResponse,
  ValidationResult,
  AnnouncementError,
} from '../types/announcement';

import type { EventType } from '../types/event';
import { EVENT_TYPE_VALUES } from '../types/event';

// -----------------------------------------------------------
// 1) ERROR HELPERS
// -----------------------------------------------------------

const handleError = (error: any): AnnouncementError => {
  console.error('Supabase Announcements Error:', error);
  return {
    message: error?.message || 'Bilinmeyen hata oluştu',
    code: error?.code,
    details: error?.details,
    hint: error?.hint,
  };
};

const throwError = (error: any): never => {
  const e = handleError(error);
  throw new Error(e.message);
};

// -----------------------------------------------------------
// 2) VALIDATION
// -----------------------------------------------------------

const validateUrlOptional = (url: string | undefined): string | '' => {
  const v = (url ?? '').trim();
  if (!v) return '';
  try {
    const parsed = new URL(v);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
    return v;
  } catch {
    return '';
  }
};

export const validateAnnouncementData = (data: Partial<AnnouncementFormData>): ValidationResult => {
  const errors: string[] = [];

  if (data.title !== undefined) {
    const t = data.title.trim();
    if (!t) errors.push('Başlık zorunludur');
    else if (t.length < 2) errors.push('Başlık en az 2 karakter');
    else if (t.length > 200) errors.push('Başlık en fazla 200 karakter');
  }

  if (data.description !== undefined) {
    const d = data.description ?? '';
    if (d.length > 5000) errors.push('Açıklama en fazla 5000 karakter');
  }

  if (data.type !== undefined) {
    if (!EVENT_TYPE_VALUES.includes(data.type as EventType)) {
      errors.push('Geçersiz duyuru tipi');
    }
  }

  if (data.link !== undefined) {
    const normalized = validateUrlOptional(data.link);
    if (data.link.trim() && !normalized) errors.push('Geçerli bir http(s) URL girin');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

// -----------------------------------------------------------
// 3) READ OPERATIONS
// -----------------------------------------------------------

export const getAnnouncements = async (params?: AnnouncementQueryParams): Promise<PaginatedAnnouncementsResponse> => {
  const {
    search,
    type,
    page = 1,
    limit = 12,
    sortBy = 'created_at',
    sortOrder = 'desc',
  } = params || {};

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // memberCount: announcement_members tablosundan duyuru bazlı count
  // select listesine aggregation ekliyoruz.
  let query = supabase
    .from('announcements')
    .select(
      '* , announcement_members(count)',
      { count: 'exact' }
    );

  if (search) query = query.ilike('title', `%${search}%`);
  if (type) query = query.eq('type', type);

  query = query.order(sortBy as any, { ascending: sortOrder === 'asc' }).range(from, to);

  const { data, error, count } = await query;
  if (error) throwError(error);

  const dataWithMemberCount = (data || []).map((a: any) => ({
    ...a,
    memberCount: Array.isArray(a?.announcement_members)
      ? a.announcement_members?.[0]?.count ?? 0
      : a?.announcement_members?.[0]?.count ?? 0,
  }));

  return {
    data: dataWithMemberCount || [],
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
    hasNext: page * limit < (count || 0),
    hasPrev: page > 1,
  };
};


export const getAnnouncementById = async (id: string): Promise<FullAnnouncement | null> => {
  const { data, error } = await supabase.from('announcements').select('*').eq('id', id).single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throwError(error);
  }
  return data;
};

export const getAnnouncementMembers = async (announcementId: string): Promise<string[]> => {
  // We only need member IDs for selection.
  const { data, error } = await supabase
    .from('announcement_members')
    .select('member_id')
    .eq('announcement_id', announcementId);

  if (error) throwError(error);

  return (data || []).map((r: any) => r.member_id as string);
};

// -----------------------------------------------------------
// 4) LINK (members) MUTATIONS
// -----------------------------------------------------------

export const setAnnouncementMembers = async (announcementId: string, memberIds: string[]): Promise<void> => {
  // Replace pattern: delete old then insert new.
  const uniqueIds = Array.from(new Set(memberIds));

  const { error: delErr } = await supabase.from('announcement_members').delete().eq('announcement_id', announcementId);
  if (delErr) throwError(delErr);

  if (uniqueIds.length === 0) return;

  const payload = uniqueIds.map((member_id) => ({ announcement_id: announcementId, member_id }));

  const { error: insErr } = await supabase.from('announcement_members').insert(payload);
  if (insErr) throwError(insErr);
};

// -----------------------------------------------------------
// 5) CREATE / UPDATE / DELETE
// -----------------------------------------------------------

export const createAnnouncement = async (data: AnnouncementFormData): Promise<FullAnnouncement> => {
  const validation = validateAnnouncementData(data);
  if (!validation.valid) throw new Error(validation.errors.join(', '));

  const normalized = {
    title: data.title.trim(),
    description: data.description ?? '',
    link: validateUrlOptional(data.link) || '',
    type: data.type,
  };

  const { data: created, error } = await supabase.from('announcements').insert([normalized]).select().single();
  if (error) throwError(error);

  // Members
  await setAnnouncementMembers(created.id, data.memberIds);

  // Mail - fire-and-forget
  sendAnnouncementMembersEmailNotification(created.id, created.title, data.memberIds).catch(() => {});

  return created;
};

export const updateAnnouncement = async (id: string, update: AnnouncementUpdateData & { memberIds?: string[] }): Promise<FullAnnouncement> => {
  const payload: any = {};

  if (update.title !== undefined) payload.title = update.title.trim();
  if (update.description !== undefined) payload.description = update.description ?? '';
  if (update.link !== undefined) payload.link = validateUrlOptional(update.link) || '';
  if (update.type !== undefined) payload.type = update.type;

  // Update announcement core
  const { data: updated, error } = await supabase.from('announcements').update(payload).eq('id', id).select().single();
  if (error) throwError(error);

  // Update members if provided
  if (update.memberIds) {
    await setAnnouncementMembers(id, update.memberIds);
    // Mail fire-and-forget
    sendAnnouncementMembersEmailNotification(id, updated.title, update.memberIds).catch(() => {});
  }

  return updated;
};

export const deleteAnnouncement = async (id: string): Promise<void> => {
  // cascade will delete announcement_members
  const { error } = await supabase.from('announcements').delete().eq('id', id);
  if (error) throwError(error);
};

// -----------------------------------------------------------
// 6) MAIL SYSTEM
// -----------------------------------------------------------

const sendAnnouncementMembersEmailNotification = async (announcementId: string, announcementTitle: string, memberIds: string[]): Promise<void> => {
  // Fire-and-forget: do not block UI.
  try {
    // If "All Members" chosen, memberIds will be empty and handled elsewhere.
    // Here we expect explicit member ids.

    if (!memberIds.length) return;

    const { data: members } = await supabase.from('members').select('email, name').in('id', memberIds);
    const list = (members || []).filter((m: any) => m.email);

    if (!list.length) return;

    const { sendEmail } = await import('./brevo');

    const subject = `📣 Yeni Duyuru: ${announcementTitle}`;
    const html = generateAnnouncementEmailHtml(announcementTitle);

    await Promise.all(
      list.map((m: any) =>
        sendEmail(m.email, subject, html).catch(() => {})
      )
    );
  } catch {
    // swallow
  }
};

const generateAnnouncementEmailHtml = (announcementTitle: string): string => {
  const safeTitle = (announcementTitle || '').replace(/</g, '<').replace(/>/g, '>');

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Duyuru</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background-color:#0f0f1a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f0f1a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#1a1a2e;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:28px 40px;text-align:center;background:linear-gradient(135deg,#0D8ABC 0%, #0a6a8a 100%);">
              <h1 style="margin:0;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">Duyuru Geldi! 📣</h1>
              <p style="margin:8px 0 0 0;font-size:14px;color:rgba(255,255,255,0.85);">Yeni güncellemeler için kontrol et</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 12px 0;font-size:16px;color:#e0e0e0;">
                <strong style="color:#0D8ABC;">${safeTitle}</strong>
              </p>
              <p style="margin:0 0 22px 0;font-size:14px;color:#a0a0a0;line-height:1.7;">
                Duyuru detaylarını yönetim ekranından görüntüleyebilirsin.
              </p>
              <p style="margin:0;font-size:12px;color:#6a6a8a;line-height:1.6;text-align:center;">
                Bu e-posta otomatik olarak gönderilmiştir. Lütfen yanıtlamayın.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:22px 40px;text-align:center;border-top:1px solid #3a3a5a;">
              <p style="margin:0;font-size:12px;color:#4a4a6a;">© ${new Date().getFullYear()} WolfTeam</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

