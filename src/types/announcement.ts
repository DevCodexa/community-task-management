// ============================================================
// Announcements Type Definitions - Duyurular Yönetim Sistemi
// ============================================================

import type { EventType } from './event';

// -----------------------------------------------------------
// 1) MAIN ENTITY
// -----------------------------------------------------------

export interface FullAnnouncement {
  id: string;
  title: string;
  description: string;
  link: string; // optional, empty string means not set
  type: EventType;
  created_at: string;
  updated_at: string;
}

// -----------------------------------------------------------
// 2) FORM TYPES
// -----------------------------------------------------------

export interface AnnouncementFormData {
  title: string;
  description: string;
  link?: string;
  type: EventType;
  memberIds: string[]; // selected members
}

export type AnnouncementUpdateData = Partial<Pick<AnnouncementFormData, 'title' | 'description' | 'link' | 'type'>>;

// -----------------------------------------------------------
// 3) MEMBER JUNCTION TYPES
// -----------------------------------------------------------

export interface AnnouncementMember {
  id: string;
  announcement_id: string;
  member_id: string;
  created_at: string;
}

// -----------------------------------------------------------
// 4) MEMBERS LIST (for join queries if needed)
// -----------------------------------------------------------

export interface AnnouncementMemberWithProfile {
  announcement_id: string;
  member_id: string;
  created_at: string;
  members: {
    id: string;
    name: string;
    email: string;
    avatar: string;
    comm_title?: string;
  };
}

// -----------------------------------------------------------
// 5) QUERIES / RESPONSES
// -----------------------------------------------------------

export interface AnnouncementQueryParams {
  search?: string;
  type?: EventType;
  page?: number;
  limit?: number;
  sortBy?: keyof FullAnnouncement;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedAnnouncementsResponse {
  data: FullAnnouncement[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface AnnouncementError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface AnnouncementStats {
  totalAnnouncements: number;
}

