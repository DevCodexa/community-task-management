/* ===========================================================
   useNotifications Hook - Zincir Atarlı Task Management
   =========================================================== */

import { useState, useEffect, useCallback } from 'react';
import {
  FullNotification,
  NotificationQueryParams,
  NotificationStats,
} from '../types/notification';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  subscribeToNotifications,
  checkBirthdaysOnLoad,
  RealtimeNotificationCallback,
} from '../lib/supabaseNotifications';

// ===========================================================
// HOOK INTERFACE
// ===========================================================

interface UseNotificationsOptions {
  /** Number of notifications to fetch initially */
  initialLimit?: number;
  /** Whether to enable real-time subscription */
  enableRealtime?: boolean;
  /** User ID for filtering (optional) */
  user_id?: string;
  /** Whether to check birthdays on mount */
  checkBirthdays?: boolean;
}

interface UseNotificationsReturn {
  // State
  notifications: FullNotification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  stats: NotificationStats | null;
  
  // Actions
  fetchNotifications: (params?: NotificationQueryParams) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  removeNotification: (id: string) => Promise<void>;
  refreshUnreadCount: () => Promise<void>;
  checkBirthdays: () => Promise<number>;
}

// ===========================================================
// HOOK IMPLEMENTATION
// ===========================================================

/**
 * Bildirimlerin state yönetimini yapan custom hook
 * Okunmamış sayısını hesaplar ve gerçek zamanlı güncellemeleri yönetir
 */
export const useNotifications = (
  options: UseNotificationsOptions = {}
): UseNotificationsReturn => {
  const {
    initialLimit = 20,
    enableRealtime = true,
    user_id,
    checkBirthdays: shouldCheckBirthdays = true,
  } = options;

  // State
  const [notifications, setNotifications] = useState<FullNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<NotificationStats | null>(null);

  // Real-time unsubscribe function
  const [unsubscribe, setUnsubscribe] = useState<(() => void) | null>(null);

  // ===========================================================
  // FETCH NOTIFICATIONS
  // ===========================================================

  const fetchNotifications = useCallback(
    async (params?: NotificationQueryParams) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await getNotifications({
          limit: initialLimit,
          ...params,
        });

        setNotifications(response.data);
      } catch (err: any) {
        setError(err.message || 'Bildirimler yüklenirken hata oluştu');
        console.error('Fetch notifications error:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [initialLimit]
  );

  // ===========================================================
  // REFRESH UNREAD COUNT
  // ===========================================================

  const refreshUnreadCount = useCallback(async () => {
    try {
      const count = await getUnreadCount(user_id);
      setUnreadCount(count);
    } catch (err: any) {
      console.error('Refresh unread count error:', err);
    }
  }, [user_id]);

  // ===========================================================
  // MARK AS READ
  // ===========================================================

  const handleMarkAsRead = useCallback(
    async (id: string) => {
      try {
        await markAsRead(id);

        // Update local state
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === id ? { ...n, is_read: true } : n
          )
        );

        // Decrease unread count
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err: any) {
        setError(err.message || 'Bildirim okundu işaretlenirken hata oluştu');
        console.error('Mark as read error:', err);
      }
    },
    []
  );

  // ===========================================================
  // MARK ALL AS READ
  // ===========================================================

  const handleMarkAllAsRead = useCallback(async () => {
    try {
      await markAllAsRead(user_id);

      // Update local state
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true }))
      );

      // Reset unread count
      setUnreadCount(0);
    } catch (err: any) {
      setError(err.message || 'Bildirimler okundu işaretlenirken hata oluştu');
      console.error('Mark all as read error:', err);
    }
  }, [user_id]);

  // ===========================================================
  // REMOVE NOTIFICATION
  // ===========================================================

  const removeNotification = useCallback(async (id: string) => {
    try {
      const notification = notifications.find((n) => n.id === id);

      await deleteNotification(id);

      // Update local state
      setNotifications((prev) => prev.filter((n) => n.id !== id));

      // Decrease unread count if was unread
      if (notification && !notification.is_read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err: any) {
      setError(err.message || 'Bildirim silinirken hata oluştu');
      console.error('Remove notification error:', err);
    }
  }, [notifications]);

  // ===========================================================
  // CHECK BIRTHDAYS
  // ===========================================================

  const checkBirthdays = useCallback(async (): Promise<number> => {
    try {
      const count = await checkBirthdaysOnLoad();
      // Refresh notifications after birthday check
      await fetchNotifications();
      await refreshUnreadCount();
      return count;
    } catch (err: any) {
      console.error('Check birthdays error:', err);
      return 0;
    }
  }, [fetchNotifications, refreshUnreadCount]);

  // ===========================================================
  // REAL-TIME SUBSCRIPTION
  // ===========================================================

  useEffect(() => {
    if (!enableRealtime) return;

    // Define callback for new notifications
    const callback: RealtimeNotificationCallback = (notification) => {
      // Add new notification to the beginning of the list
      setNotifications((prev) => [notification, ...prev]);

      // Increment unread count for unread notifications
      if (!notification.is_read) {
        setUnreadCount((prev) => prev + 1);
      }
    };

    // Subscribe to real-time notifications
    const unsubscribeFn = subscribeToNotifications(callback, user_id);
    setUnsubscribe(() => unsubscribeFn);

    // Cleanup on unmount
    return () => {
      if (unsubscribeFn) {
        unsubscribeFn();
      }
    };
  }, [enableRealtime, user_id]);

  // ===========================================================
  // INITIAL FETCH
  // ===========================================================

  useEffect(() => {
    const initialize = async () => {
      setIsLoading(true);

      // Fetch initial notifications
      await fetchNotifications();

      // Get initial unread count
      await refreshUnreadCount();

      // Check birthdays if enabled
      if (shouldCheckBirthdays) {
        await checkBirthdays();
      }

      setIsLoading(false);
    };

    initialize();
  }, []);

  // ===========================================================
  // RETURN
  // ===========================================================

  return {
    // State
    notifications,
    unreadCount,
    isLoading,
    error,
    stats,

    // Actions
    fetchNotifications,
    markAsRead: handleMarkAsRead,
    markAllAsRead: handleMarkAllAsRead,
    removeNotification,
    refreshUnreadCount,
    checkBirthdays,
  };
};

// ===========================================================
// END OF HOOK
// ===========================================================
