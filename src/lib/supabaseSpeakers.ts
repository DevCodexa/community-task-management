/* ============================================================
   Speakers CRUD Service - Zincir Atarlı Task Management
   ============================================================ */

import { supabase } from './supabase';
import {
  Speaker,
  SpeakerFormData,
  SpeakerError,
  SpeakerQueryParams,
  PaginatedSpeakersResponse,
  ValidationResult,
} from '../types/speaker';

// Re-export for components
export type { SpeakerFormData } from '../types/speaker';

// -----------------------------------------------------------
// 1. HELPERS & ERROR HANDLERS
// -----------------------------------------------------------

const handleError = (error: any): SpeakerError => {
  console.error('Supabase Speaker Error:', error);
  return {
    message: error?.message || 'Bilinmeyen hata oluştu',
    code: error?.code,
    details: error?.details,
    hint: error?.hint,
  };
};

const throwError = (error: any): never => {
  const speakerError = handleError(error);
  // Enhanced error message for common cases
  if (error.code === 'PGRST116') {
    throw new Error('Kayıt bulunamadı');
  }
  throw new Error(speakerError.message);
};

// -----------------------------------------------------------
// 2. VALIDATION
// -----------------------------------------------------------

export const validateSpeakerData = (data: Partial<SpeakerFormData>): ValidationResult => {
  const errors: string[] = [];

  if (data.full_name !== undefined) {
    if (!data.full_name.trim()) errors.push('Ad Soyad zorunludur');
    else if (data.full_name.trim().length < 2) errors.push('Ad Soyad en az 2 karakter');
    else if (data.full_name.trim().length > 200) errors.push('Ad Soyad en fazla 200 karakter');
  }

  if (data.email !== undefined && data.email.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email.trim())) {
      errors.push('Geçerli bir e-posta adresi giriniz');
    }
  }

  return { valid: errors.length === 0, errors };
};

// -----------------------------------------------------------
// 3. READ OPERATIONS
// -----------------------------------------------------------

export const getSpeakers = async (params?: SpeakerQueryParams): Promise<PaginatedSpeakersResponse> => {
  const {
    search,
    status,
    added_by,
    page = 1,
    limit = 50,
    sortBy = 'created_at',
    sortOrder = 'desc',
  } = params || {};

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase.from('speakers').select('*, members(name, avatar)', { count: 'exact' });

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,company.ilike.%${search}%`);
  }
  if (status) {
    query = query.eq('status', status);
  }
  if (added_by) {
    query = query.eq('added_by', added_by);
  }

  query = query.order(sortBy, { ascending: sortOrder === 'asc' }).range(from, to);

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

export const getSpeakerById = async (id: string): Promise<Speaker | null> => {
  const { data, error } = await supabase.from('speakers').select('*, members(*)').eq('id', id).single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throwError(error);
  }
  return data;
};

// -----------------------------------------------------------
// 4. CREATE / UPDATE / DELETE
// -----------------------------------------------------------

export const createSpeaker = async (speakerData: SpeakerFormData): Promise<Speaker> => {
  const validation = validateSpeakerData(speakerData);
  if (!validation.valid) {
    throw new Error(validation.errors.join(', '));
  }

  const { data, error } = await supabase.from('speakers').insert([{
    full_name: speakerData.full_name.trim(),
    title: speakerData.title?.trim() || '',
    company: speakerData.company?.trim() || '',
    email: speakerData.email?.trim() || '',
    phone: speakerData.phone?.trim() || '',
    image_url: speakerData.image_url?.trim() || '',
    description: speakerData.description?.trim() || '',
    status: speakerData.status || 'neutral',
    added_by: speakerData.added_by || null,
  }]).select().single();

  if (error) throwError(error);
  return data;
};

export const updateSpeaker = async (id: string, updateData: Partial<SpeakerFormData>): Promise<Speaker> => {
  // 1. Validate input data first
  const validation = validateSpeakerData(updateData);
  if (!validation.valid) {
    throw new Error(`Doğrulama hatası: ${validation.errors.join(', ')}`);
  }

  // 2. Prepare update payload (trim strings, handle undefined)
  const payload: any = {};
  if (updateData.full_name !== undefined) payload.full_name = updateData.full_name.trim();
  if (updateData.title !== undefined) payload.title = updateData.title?.trim() || '';
  if (updateData.company !== undefined) payload.company = updateData.company?.trim() || '';
  if (updateData.email !== undefined) payload.email = updateData.email?.trim() || '';
  if (updateData.phone !== undefined) payload.phone = updateData.phone?.trim() || '';
  if (updateData.image_url !== undefined) payload.image_url = updateData.image_url?.trim() || '';
  if (updateData.description !== undefined) payload.description = updateData.description?.trim() || '';
  if (updateData.status !== undefined) payload.status = updateData.status;
  if (updateData.added_by !== undefined) payload.added_by = updateData.added_by;

  if (Object.keys(payload).length === 0) {
    throw new Error('Güncellenecek alan bulunamadı');
  }

// 3. First check if speaker exists
  const { data: existingSpeaker, error: fetchError } = await supabase
    .from('speakers')
    .select('id')
    .eq('id', id)
    .maybeSingle();

  if (fetchError) {
    console.error('Fetch existing speaker error:', fetchError);
    throw new Error(`Kayıt kontrolü hatası: ${fetchError.message}`);
  }

  if (!existingSpeaker) {
    throw new Error(`ID ${id} ile konuşmacı bulunamadı`);
  }

  console.log(`Updating speaker ID: ${id}`);

  // 4. Perform update
  const { data: rawData, error } = await supabase
    .from('speakers')
    .update(payload)
    .eq('id', id)
    .select('*, members(*)')
    .single();  // Use .single() now since we confirmed existence

  if (error) {
    console.error('Update error details:', error);
    // Handle common RLS/permission errors
    if (error.code === '42501') {
      throw new Error('İzin hatası: Bu kaydı güncelleyemezsiniz');
    }
    throw new Error(error.message || 'Güncelleme sırasında hata oluştu');
  }

  if (!rawData) {
    throw new Error('Güncelleme başarılı ama sonuç alınamadı');
  }

  return rawData as Speaker;
};

export const deleteSpeaker = async (id: string): Promise<void> => {
  const { error } = await supabase.from('speakers').delete().eq('id', id);
  if (error) throwError(error);
};

// -----------------------------------------------------------
// 5. STATS
// -----------------------------------------------------------

export interface SpeakerStats {
  totalSpeakers: number;
  greenSpeakers: number;
  redSpeakers: number;
  neutralSpeakers: number;
}

export const getSpeakerStats = async (): Promise<SpeakerStats> => {
  const { data, error } = await supabase.from('speakers').select('status');
  if (error) throwError(error);

  const speakers = data || [];

  return {
    totalSpeakers: speakers.length,
    greenSpeakers: speakers.filter(s => s.status === 'green').length,
    redSpeakers: speakers.filter(s => s.status === 'red').length,
    neutralSpeakers: speakers.filter(s => s.status === 'neutral').length,
  };
};

// -----------------------------------------------------------
// 6. GET ALL MEMBERS (for dropdown)
// -----------------------------------------------------------

export interface MemberOption {
  id: string;
  name: string;
}

export interface RecentSpeaker {
  id: string;
  full_name: string;
  title: string | null;
  company: string | null;
  image_url: string | null;
  created_at: string;
}

export const getTotalSpeakers = async (): Promise<number> => {
  const { count, error } = await supabase
    .from('speakers')
    .select('*', { count: 'exact', head: true });
  
  if (error) throwError(error);
  return count || 0;
};

export const getRecentSpeakers = async (limit: number = 5): Promise<RecentSpeaker[]> => {
  const { data, error } = await supabase
    .from('speakers')
    .select('id, full_name, title, company, image_url, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throwError(error);

  return (data || []).map(speaker => ({
    id: speaker.id,
    full_name: speaker.full_name,
    title: speaker.title,
    company: speaker.company,
    image_url: speaker.image_url,
    created_at: speaker.created_at,
  }));
};

export const getMemberOptions = async (): Promise<MemberOption[]> => {
  const { data, error } = await supabase
    .from('members')
    .select('id, name')
    .order('name', { ascending: true });

  if (error) throwError(error);

  return (data || []).map(member => ({
    id: member.id,
    name: member.name,
  }));
};

