/* ===========================================================
   Notifications CRUD Service - Zincir Atarlı Task Management
   =========================================================== */

import { supabase } from './supabase';
import {
  FullNotification,
  NotificationFormData,
  NotificationError,
  NotificationQueryParams,
  PaginatedNotificationsResponse,
  NotificationStats,
  NotificationType,
  NOTIFICATION_DEFAULTS,
} from '../types/notification';

// -----------------------------------------------------------
// 1. ERROR HANDLER
// -----------------------------------------------------------

/**
 * Supabase hatasını standart NotificationError formatına dönüştürür
 */
const handleError = (error: any): NotificationError => {
  console.error('Supabase Notification Error:', error);
  return {
    message: error?.message || 'Bilinmeyen bir hata oluştu',
    code: error?.code,
    details: error?.details,
    hint: error?.hint,
  };
};

/**
 * Hata fırlatır (throw)
 */
const throwError = (error: any): never => {
  const notificationError = handleError(error);
  throw new Error(notificationError.message);
};

// -----------------------------------------------------------
// 2. READ OPERATIONS
// -----------------------------------------------------------

/**
 * Tüm bildirimleri getir (isteğe bağlı sayfalama ile)
 */
export const getNotifications = async (
  params?: NotificationQueryParams
): Promise<PaginatedNotificationsResponse> => {
  const {
    type,
    is_read,
    user_id,
    page = NOTIFICATION_DEFAULTS.page,
    limit = NOTIFICATION_DEFAULTS.limit,
    sortBy = NOTIFICATION_DEFAULTS.sortBy,
    sortOrder = NOTIFICATION_DEFAULTS.sortOrder,
  } = params || {};

  // Sayfalama hesaplamaları
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from('notifications')
    .select('*', { count: 'exact' });

  // Filtreler
  if (type) {
    query = query.eq('type', type);
  }

  if (is_read !== undefined) {
    query = query.eq('is_read', is_read);
  }

  if (user_id) {
    query = query.eq('user_id', user_id);
  }

  // Sıralama (en yeni önce)
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
 * ID'ye göre bildirim getir
 */
export const getNotificationById = async (
  id: string
): Promise<FullNotification | null> => {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('id', id)
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
 * Okunmamış bildirim sayısını getir
 */
export const getUnreadCount = async (user_id?: string): Promise<number> => {
  let query = supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('is_read', false);

  if (user_id) {
    query = query.eq('user_id', user_id);
  }

  const { count, error } = await query;

  if (error) {
    throwError(error);
  }

  return count || 0;
};

/**
 * Son N bildirimi getir (hızlı erişim için)
 */
export const getRecentNotifications = async (
  limit: number = 5
): Promise<FullNotification[]> => {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throwError(error);
  }

  return data || [];
};

// -----------------------------------------------------------
// 3. UPDATE OPERATIONS
// -----------------------------------------------------------

/**
 * Bildirimi okundu olarak işaretle
 */
export const markAsRead = async (id: string): Promise<FullNotification> => {
  const { data, error } = await supabase
    .from('notifications')
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throwError(error);
  }

  return data;
};

/**
 * Tüm bildirimleri okundu olarak işaretle
 */
export const markAllAsRead = async (user_id?: string): Promise<number> => {
  let query = supabase
    .from('notifications')
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq('is_read', false);

  if (user_id) {
    query = query.eq('user_id', user_id);
  }

  const { error, count } = await query;

  if (error) {
    throwError(error);
  }

  return count || 0;
};

/**
 * Bildirim tipine göre okundu işaretle
 */
export const markNotificationsAsReadByType = async (
  type: NotificationType
): Promise<number> => {
  const { error, count } = await supabase
    .from('notifications')
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq('type', type)
    .eq('is_read', false);

  if (error) {
    throwError(error);
  }

  return count || 0;
};

// -----------------------------------------------------------
// 4. DELETE OPERATIONS
// -----------------------------------------------------------

/**
 * Bildirim sil
 */
export const deleteNotification = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', id);

  if (error) {
    throwError(error);
  }
};

/**
 * Okunmuş tüm bildirimleri sil
 */
export const clearReadNotifications = async (user_id?: string): Promise<number> => {
  let query = supabase
    .from('notifications')
    .delete()
    .eq('is_read', true);

  if (user_id) {
    query = query.eq('user_id', user_id);
  }

  const { error, count } = await query;

  if (error) {
    throwError(error);
  }

  return count || 0;
};

/**
 * Tüm bildirimleri sil
 */
export const clearAllNotifications = async (user_id?: string): Promise<number> => {
  let query = supabase.from('notifications').delete();

  if (user_id) {
    query = query.eq('user_id', user_id);
  }

  const { error, count } = await query;

  if (error) {
    throwError(error);
  }

  return count || 0;
};

// -----------------------------------------------------------
// 5. STATISTICS
// -----------------------------------------------------------

/**
 * Bildirim istatistiklerini getir
 */
export const getNotificationStats = async (
  user_id?: string
): Promise<NotificationStats> => {
  let query = supabase.from('notifications').select('*');

  if (user_id) {
    query = query.eq('user_id', user_id);
  }

  const { data, error } = await query;

  if (error) {
    throwError(error);
  }

  const notifications = data || [];

  const byType: Record<NotificationType, number> = {
    task_added: 0,
    task_completed: 0,
    task_deleted: 0,
    member_added: 0,
    member_removed: 0,
    member_updated: 0,
    birthday: 0,
  };

  notifications.forEach((n: FullNotification) => {
    byType[n.type]++;
  });

  return {
    total: notifications.length,
    unread: notifications.filter((n) => !n.is_read).length,
    read: notifications.filter((n) => n.is_read).length,
    byType,
  };
};

// -----------------------------------------------------------
// 6. REAL-TIME SUBSCRIPTION
// -----------------------------------------------------------

export type RealtimeNotificationCallback = (
  notification: FullNotification
) => void;

/**
 * Gerçek zamanlı bildirimlere abone ol
 */
export const subscribeToNotifications = (
  callback: RealtimeNotificationCallback,
  user_id?: string
): (() => void) => {
  // Build the channel name
  const channelName = user_id
    ? `notifications:${user_id}`
    : 'notifications:all';

  const channel = supabase.channel(channelName);

  channel
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: user_id ? `user_id=eq.${user_id}` : undefined,
      },
      (payload) => {
        if (payload.new) {
          callback(payload.new as FullNotification);
        }
      }
    )
    .subscribe();

  // Return unsubscribe function
  return () => {
    supabase.removeChannel(channel);
  };
};

// -----------------------------------------------------------
// 7. BIRTHDAY CHECK
// -----------------------------------------------------------

/**
 * Bugün doğum günü olan üyeleri kontrol et ve bildirim oluştur
 * (Bu fonksiyon app yüklendiğinde çağrılmalı)
 */
export const checkBirthdaysOnLoad = async (): Promise<number> => {
  // Call the database function to check birthdays
  const { data, error } = await supabase.rpc('check_birthdays_today');

  if (error) {
    // If RPC function doesn't exist, handle gracefully
    console.warn(
      'Birthday check function not available:',
      error.message
    );
    return 0;
  }

  // data contains the count of new birthday notifications created
  return data?.length || 0;
};

// -----------------------------------------------------------
// 8. MANUAL NOTIFICATION CREATE (for testing)
// -----------------------------------------------------------

/**
 * Manuel bildirim oluştur (test için)
 */
export const createNotification = async (
  notificationData: NotificationFormData
): Promise<FullNotification> => {
  const { data, error } = await supabase
    .from('notifications')
    .insert([notificationData])
    .select()
    .single();

  if (error) {
    throwError(error);
  }

  return data;
};

// ===========================================================
// END OF CRUD SERVICE
// ===========================================================
