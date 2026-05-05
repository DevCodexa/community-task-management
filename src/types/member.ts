// ============================================================
// Members Type Definitions - Otomatik Veri Yapılandırma Sistemi
// ============================================================

// -----------------------------------------------------------
// 1. ENUM TYPES
// -----------------------------------------------------------

/**
 * Sistem rolü enum tipi
 * - Super Admin: Tam yetki
 * - Admin: Yönetici yetkileri
 * - User: Standart kullanıcı
 */
export type SystemRole = 'Super Admin' | 'Admin' | 'User';

/**
 * Veritabanı enum değerleri (SQL ile eşleşmeli)
 */
export const SYSTEM_ROLE_VALUES: SystemRole[] = ['Super Admin', 'Admin', 'User'];

// -----------------------------------------------------------
// 2. MAIN ENTITY INTERFACE
// -----------------------------------------------------------

/**
 * FullMember - Veritabanı şemasıyla birebir eşleşen interface
 * Tüm alanlar zorunlu (null olmayan)
 */
export interface FullMember {
  /** UUID - Otomatik oluşturulur */
  id: string;
  
  /** Kişisel Bilgiler */
  name: string;
  email: string;
  phone: string;
  
  /** Profesyonel Bilgiler */
  company: string;
  job_title: string;
  
  /** Topluluk Bilgileri */
  comm_title: string;      // Topluluk ünvanı (manuel girilir)
  bio: string;
  
  /** Doğum Günü (yıl içermez) */
  birth_day: number;       // 1-31
  birth_month: number;     // 1-12
  
  /** Sistem Rolü (enum) */
  system_role: SystemRole;
  
  /** Avatar URL */
  avatar: string;
  
  /** Görev Sayıları (max 3 görev sınırı) */
  active_tasks: number;    // 0-3
  total_tasks: number;     // Sabit 3
  
  /** Zaman Bilgileri */
  created_at: string;      // ISO 8601 formatında
  updated_at: string;      // ISO 8601 formatında
}

// -----------------------------------------------------------
// 3. FORM / CREATE TYPES
// -----------------------------------------------------------

/**
 * MemberFormData - Yeni üye oluşturma için gerekli alanlar
 * Omit: id, created_at, updated_at (otomatik oluşturulur)
 * Omit: active_tasks, total_tasks (varsayılan değerlerle başlar)
 */
export interface MemberFormData {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  job_title?: string;
  comm_title?: string;
  bio?: string;
  birth_day: number;
  birth_month: number;
  system_role?: SystemRole;
  avatar?: string;
}

// -----------------------------------------------------------
// 4. UPDATE TYPE
// -----------------------------------------------------------

/**
 * MemberUpdateData - Üye güncelleme için kullanılan Partial tip
 * Tüm alanlar opsiyoneldir
 */
export type MemberUpdateData = Partial<Omit<FullMember, 'id' | 'created_at' | 'updated_at'>>;

// -----------------------------------------------------------
// 5. RESPONSE TYPES
// -----------------------------------------------------------

/**
 * MemberResponse - Tekil üye API yanıt tipi
 */
export interface MemberResponse {
  data: FullMember | null;
  error: MemberError | null;
}

/**
 * MembersListResponse - Üye listesi API yanıt tipi
 */
export interface MembersListResponse {
  data: FullMember[];
  error: MemberError | null;
  count: number | null;
}

// -----------------------------------------------------------
// 6. ERROR TYPE
// -----------------------------------------------------------

/**
 * MemberError - Hata tipi
 */
export interface MemberError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
}

// -----------------------------------------------------------
// 7. VALIDATION TYPES
// -----------------------------------------------------------

/**
 * ValidationResult - Validasyon sonucu
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * MemberValidationRules - Validasyon kuralları
 */
export interface MemberValidationRules {
  name: { required: true; minLength: 2; maxLength: 100 };
  email: { required: true; pattern: RegExp };
  birth_day: { required: true; min: 1; max: 31 };
  birth_month: { required: true; min: 1; max: 12 };
  phone: { required: false; maxLength: 20 };
  company: { required: false; maxLength: 100 };
  job_title: { required: false; maxLength: 100 };
  comm_title: { required: false; maxLength: 100 };
  bio: { required: false; maxLength: 1000 };
}

// -----------------------------------------------------------
// 8. QUERY / FILTER TYPES
// -----------------------------------------------------------

/**
 * MemberQueryParams - Üye listeleme sorgu parametreleri
 */
export interface MemberQueryParams {
  search?: string;           // İsim veya email arama
  system_role?: SystemRole;  // Role göre filtrele
  comm_title?: string;       // Ünvana göre filtrele
  page?: number;             // Sayfa numarası (1-based)
  limit?: number;            // Sayfa başına kayıt
  sortBy?: keyof FullMember; // Sıralama alanı
  sortOrder?: 'asc' | 'desc'; // Sıralama yönü
}

/**
 * PaginatedMembersResponse - Sayfalanmış üye listesi
 */
export interface PaginatedMembersResponse {
  data: FullMember[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// -----------------------------------------------------------
// 9. CONSTANTS
// -----------------------------------------------------------

/**
 * Varsayılan değerler
 */
export const MEMBER_DEFAULTS = {
  system_role: 'User' as SystemRole,
  total_tasks: 3,
  active_tasks: 0,
  avatar: '',
  phone: '',
  company: '',
  job_title: '',
  comm_title: '',
  bio: '',
} as const;

/**
 * Görev limitleri
 */
export const TASK_LIMITS = {
  max_total_tasks: 3,
  min_active_tasks: 0,
} as const;

// -----------------------------------------------------------
// 10. UTILITY TYPES
// -----------------------------------------------------------

/**
 * MemberWithBirthdayInfo - Doğum günü bilgisi eklenmiş üye
 */
export interface MemberWithBirthdayInfo extends FullMember {
  daysUntilBirthday: number;
  isBirthdayToday: boolean;
}

/**
 * MemberStats - Üye istatistikleri
 */
export interface MemberStats {
  totalMembers: number;
  activeMembers: number;      // active_tasks > 0
  availableMembers: number;   // active_tasks < total_tasks
  roleDistribution: Record<SystemRole, number>;
  upcomingBirthdays: number;  // Sonraki 30 gün içinde
}

// ============================================================
// END OF TYPE DEFINITIONS
// ============================================================
