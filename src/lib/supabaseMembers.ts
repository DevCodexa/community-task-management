// ============================================================
// Members CRUD Service - Otomatik Veri Yapılandırma Sistemi
// ============================================================

import { supabase } from './supabase';
import {
  FullMember,
  MemberFormData,
  MemberUpdateData,
  MemberError,
  MemberQueryParams,
  PaginatedMembersResponse,
  MemberWithBirthdayInfo,
  MemberStats,
  ValidationResult,
  SystemRole,
  MEMBER_DEFAULTS,
  TASK_LIMITS,
} from '../types/member';

// -----------------------------------------------------------
// 1. ERROR HANDLER
// -----------------------------------------------------------

/**
 * Supabase hatasını standart MemberError formatına dönüştürür
 */
const handleError = (error: any): MemberError => {
  console.error('Supabase Error:', error);
  return {
    message: error?.message || 'Bilinmeyen bir hata oluştu',
    code: error?.code,
    details: error?.details,
    hint: error?.hint,
  };
};

/**
 * Hata fırlat (throw)
 */
const throwError = (error: any): never => {
  const memberError = handleError(error);
  throw new Error(memberError.message);
};

// -----------------------------------------------------------
// 2. VALIDATION FUNCTIONS
// -----------------------------------------------------------

/**
 * Üye verilerini validasyon kurallarına göre kontrol eder
 */
export const validateMemberData = (data: Partial<MemberFormData>): ValidationResult => {
  const errors: string[] = [];

  // İsim kontrolü
  if (data.name !== undefined) {
    if (!data.name.trim()) {
      errors.push('İsim alanı zorunludur');
    } else if (data.name.trim().length < 2) {
      errors.push('İsim en az 2 karakter olmalıdır');
    } else if (data.name.trim().length > 100) {
      errors.push('İsim en fazla 100 karakter olabilir');
    }
  }

  // Email kontrolü
  if (data.email !== undefined) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!data.email.trim()) {
      errors.push('Email alanı zorunludur');
    } else if (!emailRegex.test(data.email)) {
      errors.push('Geçerli bir email adresi giriniz');
    }
  }

  // Doğum günü kontrolü (1-31)
  if (data.birth_day !== undefined) {
    if (data.birth_day < 1 || data.birth_day > 31) {
      errors.push('Doğum günü 1-31 arasında olmalıdır');
    }
  }

  // Doğum ayı kontrolü (1-12)
  if (data.birth_month !== undefined) {
    if (data.birth_month < 1 || data.birth_month > 12) {
      errors.push('Doğum ayı 1-12 arasında olmalıdır');
    }
  }

  // Telefon kontrolü
  if (data.phone !== undefined && data.phone.length > 20) {
    errors.push('Telefon numarası en fazla 20 karakter olabilir');
  }

  // Şirket kontrolü
  if (data.company !== undefined && data.company.length > 100) {
    errors.push('Şirket adı en fazla 100 karakter olabilir');
  }

  // Ünvan kontrolü
  if (data.job_title !== undefined && data.job_title.length > 100) {
    errors.push('İş ünvanı en fazla 100 karakter olabilir');
  }

  // Topluluk unvanı kontrolü
  if (data.comm_title !== undefined && data.comm_title.length > 100) {
    errors.push('Topluluk unvanı en fazla 100 karakter olabilir');
  }

  // Biyografi kontrolü
  if (data.bio !== undefined && data.bio.length > 1000) {
    errors.push('Biyografi en fazla 1000 karakter olabilir');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Görev limiti validasyonu
 */
export const validateTaskLimit = (activeTasks: number, totalTasks: number): ValidationResult => {
  const errors: string[] = [];

  if (activeTasks < 0) {
    errors.push('Aktif görev sayısı negatif olamaz');
  }

  if (totalTasks < 0 || totalTasks > TASK_LIMITS.max_total_tasks) {
    errors.push(`Toplam görev sayısı 0-${TASK_LIMITS.max_total_tasks} arasında olmalıdır`);
  }

  if (activeTasks > totalTasks) {
    errors.push(`Aktif görev sayısı (${activeTasks}) toplam görev sayısını (${totalTasks}) aşamaz`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

// -----------------------------------------------------------
// 3. READ OPERATIONS
// -----------------------------------------------------------

/**
 * Tüm üyeleri getir (isteğe bağlı sayfalama ile)
 */
export const getMembers = async (params?: MemberQueryParams): Promise<PaginatedMembersResponse> => {
  const {
    search,
    system_role,
    comm_title,
    page = 1,
    limit = 50,
    sortBy = 'created_at',
    sortOrder = 'desc',
  } = params || {};

  // Sayfalama hesaplamaları
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from('members')
    .select('*', { count: 'exact' });

  // Arama filtresi (isim veya email)
  if (search) {
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
  }

  // Rol filtresi
  if (system_role) {
    query = query.eq('system_role', system_role);
  }

  // Topluluk unvanı filtresi
  if (comm_title) {
    query = query.ilike('comm_title', `%${comm_title}%`);
  }

  // Sıralama
  query = query.order(sortBy, { ascending: sortOrder === 'asc' });

  // Sayfalama
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    throwError(error);
  }

  const total = count || 0;
  const totalPages = Math.ceil(total / limit);

  return {
    data: data || [],
    total,
    page,
    limit,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
};

/**
 * ID'ye göre üye getir
 */
export const getMemberById = async (id: string): Promise<FullMember | null> => {
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Kayıt bulunamadı
      return null;
    }
    throwError(error);
  }

  return data;
};

/**
 * Email'e göre üye getir
 */
export const getMemberByEmail = async (email: string): Promise<FullMember | null> => {
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .eq('email', email)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throwError(error);
  }

  return data;
};

/**
 * İsim veya email ile üye ara
 */
export const searchMembers = async (query: string): Promise<FullMember[]> => {
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
    .order('name', { ascending: true });

  if (error) {
    throwError(error);
  }

  return data || [];
};

/**
 * Yaklaşan doğum günlerini getir (sonraki 30 gün)
 */
export const getUpcomingBirthdays = async (): Promise<MemberWithBirthdayInfo[]> => {
  const today = new Date();
  const currentDay = today.getDate();
  const currentMonth = today.getMonth() + 1;

  const { data, error } = await supabase
    .from('members')
    .select('*');

  if (error) {
    throwError(error);
  }

  if (!data) return [];

  const membersWithBirthdayInfo: MemberWithBirthdayInfo[] = data.map((member: FullMember) => {
    const daysUntil = calculateDaysUntilBirthday(
      member.birth_day,
      member.birth_month,
      currentDay,
      currentMonth
    );

    return {
      ...member,
      daysUntilBirthday: daysUntil,
      isBirthdayToday: daysUntil === 0,
    };
  });

  // Sadece sonraki 30 gün içinde olanları filtrele ve sırala
  return membersWithBirthdayInfo
    .filter((m) => m.daysUntilBirthday >= 0 && m.daysUntilBirthday <= 30)
    .sort((a, b) => a.daysUntilBirthday - b.daysUntilBirthday);
};

/**
 * Doğum gününe kaç gün kaldığını hesaplar
 */
const calculateDaysUntilBirthday = (
  birthDay: number,
  birthMonth: number,
  currentDay: number,
  currentMonth: number
): number => {
  if (birthMonth === currentMonth) {
    if (birthDay >= currentDay) {
      return birthDay - currentDay;
    }
    // Geçen ay için gelecek yılı hesapla
    const daysInCurrentMonth = new Date(new Date().getFullYear(), currentMonth, 0).getDate();
    return (daysInCurrentMonth - currentDay) + birthDay +
           (birthMonth === 12 ? 31 : new Date(new Date().getFullYear(), birthMonth + 1, 0).getDate());
  }

  let daysUntil = 0;
  const currentYear = new Date().getFullYear();

  // Kalan günler (bu ay)
  const daysInCurrentMonth = new Date(currentYear, currentMonth, 0).getDate();
  daysUntil += daysInCurrentMonth - currentDay;

  // Ara ayların günleri
  let month = currentMonth + 1;
  while (month !== birthMonth) {
    if (month > 12) month = 1;
    if (month === birthMonth) break;
    daysUntil += new Date(currentYear, month, 0).getDate();
    month++;
  }

  // Doğum günü ayının günleri
  daysUntil += birthDay;

  return daysUntil;
};

// -----------------------------------------------------------
// 4. CREATE OPERATIONS
// -----------------------------------------------------------

/**
 * Yeni üye oluştur
 */
export const createMember = async (memberData: MemberFormData): Promise<FullMember> => {
  // Validasyon
  const validation = validateMemberData(memberData);
  if (!validation.valid) {
    throw new Error(`Validasyon hatası: ${validation.errors.join(', ')}`);
  }

  // Varsayılan değerleri uygula
  const newMember = {
    name: memberData.name.trim(),
    email: memberData.email.trim().toLowerCase(),
    phone: memberData.phone?.trim() || MEMBER_DEFAULTS.phone,
    company: memberData.company?.trim() || MEMBER_DEFAULTS.company,
    job_title: memberData.job_title?.trim() || MEMBER_DEFAULTS.job_title,
    comm_title: memberData.comm_title?.trim() || MEMBER_DEFAULTS.comm_title,
    bio: memberData.bio?.trim() || MEMBER_DEFAULTS.bio,
    birth_day: memberData.birth_day,
    birth_month: memberData.birth_month,
    system_role: memberData.system_role || MEMBER_DEFAULTS.system_role,
    avatar: memberData.avatar || 
      `https://ui-avatars.com/api/?name=${encodeURIComponent(memberData.name)}&background=0D8ABC&color=fff`,
    active_tasks: MEMBER_DEFAULTS.active_tasks,
    total_tasks: MEMBER_DEFAULTS.total_tasks,
  };

  const { data, error } = await supabase
    .from('members')
    .insert([newMember])
    .select()
    .single();

  if (error) {
    // Unique constraint hatası kontrolü
    if (error.code === '23505') {
      throw new Error('Bu email adresi ile kayıtlı bir üye zaten var');
    }
    throwError(error);
  }

  // ------------------------------
  // Onboarding mail trigger (YENİ KAYIT)
  // Fire-and-forget yapıyoruz ki UX etkilenmesin.
  // Bu kod updateMember içinde değil; createMember içinde.
  // ------------------------------
  try {
    const { sendNewMemberWelcomeEmail } = await import('./brevo');

    // İstenen: link şimdilik /profil
    const profilePath = '/profil';

    console.log('Brevo tetiklendi, alıcı:', data.email);

    sendNewMemberWelcomeEmail(
      data.email,
      data.name,
      data.comm_title,
      profilePath
    ).catch((err: any) => {
      console.warn('Yeni üye onboarding mail gönderimi başarısız:', err);
    });
  } catch (err) {
    console.warn('Yeni üye onboarding mail import başarısız:', err);
  }


  return data;
};

// -----------------------------------------------------------
// 5. UPDATE OPERATIONS
// -----------------------------------------------------------

/**
 * Üye güncelle
 */
export const updateMember = async (
  id: string,
  memberData: MemberUpdateData
): Promise<FullMember> => {
  // Validasyon
  const validation = validateMemberData(memberData);
  if (!validation.valid) {
    throw new Error(`Validasyon hatası: ${validation.errors.join(', ')}`);
  }

  // Görev limiti kontrolü (eğer active_tasks veya total_tasks güncelleniyorsa)
  if (memberData.active_tasks !== undefined || memberData.total_tasks !== undefined) {
    // Mevcut üyeyi getir
    const currentMember = await getMemberById(id);
    if (!currentMember) {
      throw new Error('Güncellenecek üye bulunamadı');
    }

    const newActiveTasks = memberData.active_tasks ?? currentMember.active_tasks;
    const newTotalTasks = memberData.total_tasks ?? currentMember.total_tasks;

    const taskValidation = validateTaskLimit(newActiveTasks, newTotalTasks);
    if (!taskValidation.valid) {
      throw new Error(`Görev limiti hatası: ${taskValidation.errors.join(', ')}`);
    }
  }

  // Email güncelleniyorsa küçük harfe çevir
  const updateData: any = { ...memberData };
  if (updateData.email) {
    updateData.email = updateData.email.trim().toLowerCase();
  }

  const { data, error } = await supabase
    .from('members')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('Bu email adresi ile kayıtlı bir üye zaten var');
    }
    throwError(error);
  }

  return data;
};

/**
 * Üyenin aktif görev sayısını artır (güvenli)
 */
export const incrementActiveTasks = async (id: string): Promise<FullMember> => {
  const member = await getMemberById(id);
  if (!member) {
    throw new Error('Üye bulunamadı');
  }

  if (member.active_tasks >= member.total_tasks) {
    throw new Error(`Görev limiti aşıldı. Maksimum ${member.total_tasks} görev alınabilir.`);
  }

  return updateMember(id, { active_tasks: member.active_tasks + 1 });
};

/**
 * Üyenin aktif görev sayısını azalt (güvenli)
 */
export const decrementActiveTasks = async (id: string): Promise<FullMember> => {
  const member = await getMemberById(id);
  if (!member) {
    throw new Error('Üye bulunamadı');
  }

  if (member.active_tasks <= 0) {
    throw new Error('Aktif görev sayısı zaten 0');
  }

  return updateMember(id, { active_tasks: member.active_tasks - 1 });
};

// -----------------------------------------------------------
// 6. DELETE OPERATIONS
// -----------------------------------------------------------

/**
 * Üye sil
 */
export const deleteMember = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('members')
    .delete()
    .eq('id', id);

  if (error) {
    throwError(error);
  }
};

// -----------------------------------------------------------
// 7. STATISTICS
// -----------------------------------------------------------

/**
 * Üye istatistiklerini getir
 */
export const getMemberStats = async (): Promise<MemberStats> => {
  const { data, error } = await supabase
    .from('members')
    .select('*');

  if (error) {
    throwError(error);
  }

  const members = data || [];

  const roleDistribution: Record<SystemRole, number> = {
    'Super Admin': 0,
    'Admin': 0,
    'User': 0,
  };

  members.forEach((member: FullMember) => {
    roleDistribution[member.system_role]++;
  });

  const upcomingBirthdays = await getUpcomingBirthdays();

  return {
    totalMembers: members.length,
    activeMembers: members.filter((m: FullMember) => m.active_tasks > 0).length,
    availableMembers: members.filter((m: FullMember) => m.active_tasks < m.total_tasks).length,
    roleDistribution,
    upcomingBirthdays: upcomingBirthdays.length,
  };
};

// -----------------------------------------------------------
// 8. UTILITY FUNCTIONS
// -----------------------------------------------------------

/**
 * Üyenin görev alıp alamayacağını kontrol eder
 */
export const canTakeTask = async (id: string): Promise<boolean> => {
  const member = await getMemberById(id);
  if (!member) return false;
  return member.active_tasks < member.total_tasks;
};

/**
 * Üyenin kalan görev kapasitesini getir
 */
export const getRemainingTaskCapacity = async (id: string): Promise<number> => {
  const member = await getMemberById(id);
  if (!member) return 0;
  return member.total_tasks - member.active_tasks;
};

// -----------------------------------------------------------
// 9. DASHBOARD SERVICE (Yeni Eklenen)
// -----------------------------------------------------------

export interface RecentMember {
  id: string;
  name: string;
  avatar: string | null;
  comm_title: string | null;
  created_at: string;
}

/**
 * Son eklenen üyeleri getirir
 */
export const getRecentMembers = async (limit: number = 5): Promise<RecentMember[]> => {
  const { data, error } = await supabase
    .from('members')
    .select('id, name, avatar, comm_title, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throwError(error);
  }

  return (data || []).map(member => ({
    id: member.id,
    name: member.name,
    avatar: member.avatar,
    comm_title: member.comm_title,
    created_at: member.created_at,
  }));
};

// ============================================================
// END OF CRUD SERVICE
// ============================================================

