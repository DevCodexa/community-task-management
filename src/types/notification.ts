/* ===========================================================
   Notification Type Definitions - Zincir Atarlı Task Management
   =========================================================== */

// -----------------------------------------------------------
// 1. ENUM TYPES
// -----------------------------------------------------------

/**
 * Notification type enum
 * - task_added: New task added to the chain
 * - task_completed: Task completed
 * - task_deleted: Task removed from chain
 * - member_added: New member joined
 * - member_removed: Member left the community
 * - member_updated: Member profile updated
 * - birthday: Birthday notification
 */
export type NotificationType = 
  | 'task_added' 
  | 'task_completed' 
  | 'task_deleted' 
  | 'member_added' 
  | 'member_removed' 
  | 'member_updated' 
  | 'birthday';

export const NOTIFICATION_TYPE_VALUES: NotificationType[] = [
  'task_added',
  'task_completed',
  'task_deleted',
  'member_added',
  'member_removed',
  'member_updated',
  'birthday',
];

/**
 * Notification type display info for UI
 */
export const NOTIFICATION_TYPE_CONFIG: Record<NotificationType, {
  icon: string;
  color: string;
  bgColor: string;
  label: string;
}> = {
  task_added: {
    icon: '📋',
    color: 'text-ice-400',
    bgColor: 'bg-ice-400/10',
    label: 'Yeni Görev',
  },
  task_completed: {
    icon: '✅',
    color: 'text-green-400',
    bgColor: 'bg-green-400/10',
    label: 'Görev Tamamlandı',
  },
  task_deleted: {
    icon: '🗑️',
    color: 'text-red-400',
    bgColor: 'bg-red-400/10',
    label: 'Görev Silindi',
  },
  member_added: {
    icon: '👋',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-400/10',
    label: 'Yeni Üye',
  },
  member_removed: {
    icon: '👋',
    color: 'text-orange-400',
    bgColor: 'bg-orange-400/10',
    label: 'Üye Ayrıldı',
  },
  member_updated: {
    icon: '✏️',
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/10',
    label: 'Üye Güncellendi',
  },
  birthday: {
    icon: '🎉',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-400/10',
    label: 'Doğum Günü',
  },
};

// -----------------------------------------------------------
// 2. MAIN ENTITY INTERFACE
// -----------------------------------------------------------

/**
 * FullNotification - Database schema matching interface
 */
export interface FullNotification {
  /** UUID - Auto-generated */
  id: string;
  
  /** Notification Content */
  title: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  
  /** Related Entity References */
  related_id: string | null;
  related_type: string | null;
  
  /** User Reference (recipient) */
  user_id: string | null;
  
  /** Actor Reference (who caused it) */
  actor_id: string | null;
  actor_name: string | null;
  
  /** Timestamps */
  created_at: string;
  read_at: string | null;
}

// -----------------------------------------------------------
// 3. FORM / CREATE TYPES
// -----------------------------------------------------------

/**
 * NotificationFormData - Create notification (usually via trigger, not directly)
 */
export interface NotificationFormData {
  title: string;
  message: string;
  type: NotificationType;
  related_id?: string | null;
  related_type?: string | null;
  user_id?: string | null;
}

// -----------------------------------------------------------
// 4. QUERY TYPES
// -----------------------------------------------------------

/**
 * NotificationQueryParams - List/filter notifications
 */
export interface NotificationQueryParams {
  type?: NotificationType;
  is_read?: boolean;
  user_id?: string;
  page?: number;
  limit?: number;
  sortBy?: keyof FullNotification;
  sortOrder?: 'asc' | 'desc';
}

/**
 * PaginatedNotificationsResponse
 */
export interface PaginatedNotificationsResponse {
  data: FullNotification[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// -----------------------------------------------------------
// 5. RESPONSE TYPES
// -----------------------------------------------------------

/**
 * NotificationResponse
 */
export interface NotificationResponse {
  data: FullNotification | null;
  error: NotificationError | null;
}

/**
 * NotificationsListResponse
 */
export interface NotificationsListResponse {
  data: FullNotification[];
  error: NotificationError | null;
  count: number | null;
}

/**
 * NotificationError
 */
export interface NotificationError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
}

// -----------------------------------------------------------
// 6. STATS TYPES
// -----------------------------------------------------------

/**
 * NotificationStats
 */
export interface NotificationStats {
  total: number;
  unread: number;
  read: number;
  byType: Record<NotificationType, number>;
}

// -----------------------------------------------------------
// 7. CONSTANTS
// -----------------------------------------------------------

/**
 * Default pagination
 */
export const NOTIFICATION_DEFAULTS = {
  page: 1,
  limit: 20,
  sortBy: 'created_at' as keyof FullNotification,
  sortOrder: 'desc' as const,
};

/**
 * Animation delays for shake effect
 */
export const BELL_SHAKE_INTERVAL = 5000; // 5 seconds
export const BELL_SHAKE_DURATION = 0.5; // 0.5 seconds shake

// ===========================================================
// END OF TYPE DEFINITIONS
// ===========================================================
