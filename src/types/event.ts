// ============================================================
// Events Type Definitions - Etkinlik Yönetim Sistemi
// ============================================================

// -----------------------------------------------------------
// 1. ENUM TYPES
// -----------------------------------------------------------

/**
 * Etkinlik türü enum tipi
 * - Workshop: Atölye çalışması
 * - Face-to-Face: Yüz yüze etkinlik
 * - Bootcamp: Yoğun eğitim programı
 * - Webinar: Online seminer
 * - Other: Diğer
 */
export type EventType = 'Workshop' | 'Face-to-Face' | 'Bootcamp' | 'Webinar'| 'Quiz Night'| 'Mülakat Yayını' | 'Coffee Talk'| 'İlk Konuşmam(Future)'| 'Other';

/**
 * Veritabanı enum değerleri (SQL ile eşleşmeli)
 */
export const EVENT_TYPE_VALUES: EventType[] = ['Workshop', 'Face-to-Face', 'Bootcamp', 'Webinar', 'Quiz Night','Mülakat Yayını','Coffee Talk','İlk Konuşmam(Future)','Other'];

// -----------------------------------------------------------
// 2. MAIN ENTITY INTERFACE
// -----------------------------------------------------------

/**
 * FullEvent - Veritabanı şemasıyla birebir eşleşen interface
 * Tüm alanlar zorunlu (null olmayan)
 */
export interface FullEvent {
  /** UUID - Otomatik oluşturulur */
  id: string;
  
  /** Etkinlik İçeriği */
  title: string;
  description: string;
  
  /** Etkinlik Türü (enum) */
  event_type: EventType;
  
  /** Başlangıç ve Bitiş Tarihi */
  start_date: string;      // ISO 8601 formatında
  end_date: string;      // ISO 8601 formatında
  
  /** Ek Bilgiler */
  drive_link: string;     // Google Drive vb. çalışma dosyaları linki
  location: string;      // Lokasyon (fiziksel veya online)
  
  /** Counts (optional, computed) */
  staffCount?: number;
  speakerCount?: number;

  /** Zaman Bilgileri */
  created_at: string;    // ISO 8601 formatında
  updated_at: string;    // ISO 8601 formatında
}


// -----------------------------------------------------------
// 3. FORM / CREATE TYPES
// -----------------------------------------------------------

/**
 * EventFormData - Yeni etkinlik oluşturma için gerekli alanlar
 * Omit: id, created_at, updated_at (otomatik oluşturulur)
 */
export interface EventFormData {
  title: string;
  description?: string;
  event_type?: EventType;
  start_date: string;
  end_date: string;
  drive_link?: string;
  location?: string;
}

// -----------------------------------------------------------
// 4. UPDATE TYPE
// -----------------------------------------------------------

/**
 * EventUpdateData - Etkinlik güncelleme için kullanılan Partial tip
 * Tüm alanlar opsiyoneldir
 */
export type EventUpdateData = Partial<Omit<FullEvent, 'id' | 'created_at' | 'updated_at'>>;

// -----------------------------------------------------------
// 5. STAFF TYPES
// -----------------------------------------------------------

/**
 * EventStaff - Junction table şeması
 */
export interface EventStaff {
  id: string;
  event_id: string;
  member_id: string;
  created_at: string;
}

/**
 * EventStaffWithMember - Görevli bilgileri + member detayları
 */
export interface EventStaffWithMember extends EventStaff {
  members: {
    id: string;
    name: string;
    email: string;
    avatar: string;
    comm_title: string;
  }[];
}

/**
 * EventSpeaker - Junction table şeması (NEW)
 */
export interface EventSpeaker {
  id: string;
  event_id: string;
  speaker_id: string;
  created_at: string;
}

/**
 * EventSpeakerWithSpeaker - Konuşmacı bilgileri + speaker detayları (NEW)
 */
export interface EventSpeakerWithSpeaker extends EventSpeaker {
  speakers: {
    id: string;
    full_name: string;
    title: string;
    company: string;
    image_url: string;
  }[];
}


// -----------------------------------------------------------
// 6. RESPONSE TYPES
// -----------------------------------------------------------

/**
 * EventResponse - Tekil etkinlik API yanıt tipi
 */
export interface EventResponse {
  data: FullEvent | null;
  error: EventError | null;
}

/**
 * EventsListResponse - Etkinlik listesi API yanıt tipi
 */
export interface EventsListResponse {
  data: FullEvent[];
  error: EventError | null;
  count: number | null;
}

// -----------------------------------------------------------
// 7. ERROR TYPE
// -----------------------------------------------------------

/**
 * EventError - Hata tipi
 */
export interface EventError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
}

// -----------------------------------------------------------
// 8. VALIDATION TYPES
// -----------------------------------------------------------

/**
 * ValidationResult - Validasyon sonucu
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * EventValidationRules - Validasyon kuralları
 */
export interface EventValidationRules {
  title: { required: true; minLength: 2; maxLength: 200 };
  description: { required: false; maxLength: 2000 };
  event_type: { required: true };
  start_date: { required: true };
  end_date: { required: true };
  drive_link: { required: false; maxLength: 500 };
  location: { required: false; maxLength: 200 };
}

// -----------------------------------------------------------
// 9. QUERY / FILTER TYPES
// -----------------------------------------------------------

/**
 * EventQueryParams - Etkinlik listeleme sorgu parametreleri
 */
export interface EventQueryParams {
  search?: string;           // Başlık arama
  event_type?: EventType;   // Türüne göre filtrele
  from_date?: string;        // Başlangıç tarihinden itibaren
  to_date?: string;         // Bitiş tarihine kadar
  page?: number;             // Sayfa numarası (1-based)
  limit?: number;            // Sayfa başına kayıt
  sortBy?: keyof FullEvent; // Sıralama alanı
  sortOrder?: 'asc' | 'desc'; // Sıralama yönü
}

/**
 * PaginatedEventsResponse - Sayfalanmış etkinlik listesi
 */
export interface PaginatedEventsResponse {
  data: FullEvent[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// -----------------------------------------------------------
// 10. CONSTANTS
// -----------------------------------------------------------

/**
 * Varsayılan değerler
 */
export const EVENT_DEFAULTS = {
  event_type: 'Other' as EventType,
  description: '',
  drive_link: '',
  location: '',
} as const;

/**
 * Etkinlik türü Türkçe etiketleri
 */
export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  'Workshop': 'Atölye Çalışması',
  'Face-to-Face': 'Yüz Yüze Etkinlik',
  'Bootcamp': 'Bootcamp',
  'Webinar': 'Webinar',
  'Quiz Night': 'Quiz Night',
  'Mülakat Yayını': 'Mülakat Yayını',
  'Coffee Talk': 'Coffee Talk',
  'İlk Konuşmam(Future)': 'İlk Konuşmam (Future)',
  'Other': 'Diğer'
};

// -----------------------------------------------------------
// 11. UTILITY TYPES
// -----------------------------------------------------------

/**
 * EventWithStaff - Etkinlik + görevlileri birlikte
 */
export interface EventWithStaff extends FullEvent {
  staff: EventStaffWithMember[];
}

/**
 * UpcomingEvent - Yaklaşan etkinlik
 */
export interface UpcomingEvent extends FullEvent {
  daysUntilStart: number;
  isToday: boolean;
  staffCount: number;
}

/**
 * EventStats - Etkinlik istatistikleri
 */
export interface EventStats {
  totalEvents: number;
  upcomingEvents: number;   // Bugünden sonra
  pastEvents: number;      // Bugünden önce
  typeDistribution: Record<EventType, number>;
  totalStaffAssignments: number;
}

// ============================================================
// END OF TYPE DEFINITIONS
// ============================================================
