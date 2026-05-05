/* ============================================================
   Speaker Types - Zincir Atarlı Task Management
   ============================================================ */

// Speaker status enum
export type SpeakerStatus = 'green' | 'red' | 'neutral';

// Full Speaker from database (with relations)
export interface Speaker {
  id: string;
  full_name: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  image_url: string;
  description: string;
  status: SpeakerStatus;
  added_by: string | null;
  created_at: string;
  updated_at: string;
  
  // Optional: joined member data
  members?: {
    name: string;
    avatar: string;
  }[];
}

// Form data for creating/updating speakers
export interface SpeakerFormData {
  full_name: string;
  title?: string;
  company?: string;
  email?: string;
  phone?: string;
  image_url?: string;
  description?: string;
  status?: SpeakerStatus;
  added_by?: string | null;
}

// Query parameters for filtering
export interface SpeakerQueryParams {
  search?: string;
  status?: SpeakerStatus;
  added_by?: string;
  page?: number;
  limit?: number;
  sortBy?: keyof Speaker;
  sortOrder?: 'asc' | 'desc';
}

// Paginated response
export interface PaginatedSpeakersResponse {
  data: Speaker[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Error type
export interface SpeakerError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
}

// Validation result
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// Filter tab types
export type SpeakerFilterTab = 'all' | 'green' | 'red';
