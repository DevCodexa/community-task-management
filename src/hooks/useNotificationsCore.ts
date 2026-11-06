/* ===========================================================
   useNotifications Hook - Zincir Atarlı Task Management
   =========================================================== */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  FullNotification,
  NotificationQueryParams,
  NotificationStats,
} from '../types/notification';
import type { RealtimeNotificationCallback } from '../lib/supabaseNotifications';
import type { PaginatedNotificationsResponse } from '../types/notification';
import {
  mergeNotificationFeed,
  shouldAcceptRealtimeNotification,
} from '../lib/notificationState.js';
import { subscribeNotificationChanges } from '../lib/notificationChanges';

// ===========================================================
// HOOK INTERFACE
// ===========================================================

export interface UseNotificationsOptions {
  /** Number of notifications to fetch initially */
  initialLimit?: number;
  /** Whether to enable real-time subscription */
  enableRealtime?: boolean;
  /** Authenticated member ID; notifications stay scoped to this recipient. */
  user_id?: string;
}

export interface UseNotificationsReturn {
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
}


// ===========================================================
// HOOK IMPLEMENTATION
// ===========================================================

/**
 * Bildirimlerin state yönetimini yapan custom hook
 * Okunmamış sayısını hesaplar ve gerçek zamanlı güncellemeleri yönetir
 */
export interface NotificationFeedService {
  getNotifications: (params: NotificationQueryParams) => Promise<PaginatedNotificationsResponse>;
  getUnreadCount: (userId: string) => Promise<number>;
  markAsRead: (id: string) => Promise<FullNotification>;
  markAllAsRead: (userId: string) => Promise<number>;
  deleteNotification: (id: string) => Promise<void>;
  subscribeToNotifications: (callback: RealtimeNotificationCallback, userId: string) => () => void;
}

export const useNotificationsCore = (
  options: UseNotificationsOptions,
  service: NotificationFeedService
): UseNotificationsReturn => {
  const {
    initialLimit = 20,
    enableRealtime = true,
    user_id,
  } = options;

  // State
  const [notifications, setNotifications] = useState<FullNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats] = useState<NotificationStats | null>(null);
  const seenNotificationIds = useRef<Set<string>>(new Set());
  const pendingReadIds = useRef<Set<string>>(new Set());
  const fetchRequestId = useRef(0);
  const unreadRequestId = useRef(0);
  const activeUserId = useRef<string | undefined>(user_id);

  // ===========================================================
  // FETCH NOTIFICATIONS
  // ===========================================================

  const fetchNotifications = useCallback(
    async (params?: NotificationQueryParams) => {
      const requestId = ++fetchRequestId.current;

      // Do not read a global notification feed while the authenticated profile is loading.
      if (!user_id) {
        activeUserId.current = undefined;
        seenNotificationIds.current.clear();
        setNotifications([]);
        setUnreadCount(0);
        setError(null);
        setIsLoading(false);
        return;
      }

      if (activeUserId.current !== user_id) {
        activeUserId.current = user_id;
        seenNotificationIds.current.clear();
        setNotifications([]);
        setUnreadCount(0);
      }

      setIsLoading(true);
      setError(null);

      try {
        // Put user_id last so callers cannot accidentally broaden the query.
        const response = await service.getNotifications({
          limit: initialLimit,
          ...params,
          user_id,
        });
        if (requestId !== fetchRequestId.current) return;

        response.data.forEach((notification) => seenNotificationIds.current.add(notification.id));
        setNotifications((prev) => mergeNotificationFeed(prev, response.data, user_id));
      } catch (err: any) {
        if (requestId !== fetchRequestId.current) return;
        setError(err.message || 'Bildirimler yüklenirken hata oluştu');
        console.error('Fetch notifications error:', err);
      } finally {
        if (requestId === fetchRequestId.current) setIsLoading(false);
      }
    },
    [initialLimit, user_id, service]
  );

  // ===========================================================
  // REFRESH UNREAD COUNT
  // ===========================================================

  const refreshUnreadCount = useCallback(async () => {
    const requestId = ++unreadRequestId.current;
    if (!user_id) {
      setUnreadCount(0);
      return;
    }

    try {
      const count = await service.getUnreadCount(user_id);
      if (requestId === unreadRequestId.current) setUnreadCount(count);
    } catch (err: any) {
      console.error('Refresh unread count error:', err);
    }
  }, [user_id, service]);

  // ===========================================================
  // MARK AS READ
  // ===========================================================

  const handleMarkAsRead = useCallback(
    async (id: string) => {
      const existing = notifications.find((notification) => notification.id === id);
      if (!user_id || !existing || existing.is_read || pendingReadIds.current.has(id)) return;

      pendingReadIds.current.add(id);
      try {
        await service.markAsRead(id);
        setNotifications((prev) =>
          prev.map((n) => n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n)
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err: any) {
        setError(err.message || 'Bildirim okundu işaretlenirken hata oluştu');
        console.error('Mark as read error:', err);
      } finally {
        pendingReadIds.current.delete(id);
      }
    },
    [notifications, user_id, service]
  );

  // ===========================================================
  // MARK ALL AS READ
  // ===========================================================

  const handleMarkAllAsRead = useCallback(async () => {
    if (!user_id) return;
    try {
      await service.markAllAsRead(user_id);

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
  }, [user_id, service]);

  // ===========================================================
  // REMOVE NOTIFICATION
  // ===========================================================

  const removeNotification = useCallback(async (id: string) => {
    if (!user_id) return;
    try {
      const notification = notifications.find((n) => n.id === id);

      await service.deleteNotification(id);

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
  }, [notifications, user_id, service]);

  // The full notification page and the bell are mounted independently.
  // Reconcile mutations made on that page without broadcasting another user's data.
  useEffect(() => subscribeNotificationChanges((change) => {
    if (!user_id || change.userId !== user_id) return;
    if (change.type === 'clear-all') {
      seenNotificationIds.current.clear();
      setNotifications([]);
    } else if (change.type === 'delete') {
      setNotifications((prev) => prev.filter((item) => item.id !== change.id));
    } else if (change.type === 'read-all') {
      setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })));
    } else if (change.type === 'read') {
      const id = change.id;
      setNotifications((prev) => prev.map((item) => item.id === id ? { ...item, is_read: true } : item));
    }
    // Discard an older fetch that could otherwise restore a deleted/unread row.
    fetchRequestId.current += 1;
    void fetchNotifications();
    void refreshUnreadCount();
  }), [user_id, fetchNotifications, refreshUnreadCount]);


  // ===========================================================
  // REAL-TIME SUBSCRIPTION
  // ===========================================================

  useEffect(() => {
    if (!enableRealtime || !user_id) return;

    // A realtime INSERT can race the initial SELECT. Deduplicate by stable database ID.
    const callback: RealtimeNotificationCallback = (notification) => {
      // Defense in depth: never add a notification for another recipient to this UI.
      if (!shouldAcceptRealtimeNotification(notification, user_id, seenNotificationIds.current)) return;
      setNotifications((prev) => [notification, ...prev.filter((item) => item.id !== notification.id)]);
      // Refresh from the database rather than incrementing a count that may race the initial fetch.
      if (!notification.is_read) void refreshUnreadCount();
    };

    const unsubscribeFn = service.subscribeToNotifications(callback, user_id);
    return () => unsubscribeFn();
  }, [enableRealtime, user_id, refreshUnreadCount, service]);

  // ===========================================================
  // INITIAL FETCH
  // ===========================================================

  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      if (!user_id) {
        setNotifications([]);
        setUnreadCount(0);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      await fetchNotifications();
      await refreshUnreadCount();

      if (!cancelled) setIsLoading(false);
    };

    void initialize();
    return () => {
      cancelled = true;
      // Ignore results from a previous recipient or an unmounted component.
      fetchRequestId.current += 1;
      unreadRequestId.current += 1;
    };
  }, [fetchNotifications, refreshUnreadCount, user_id]);

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
  };
};

// ===========================================================
// END OF HOOK
// ===========================================================
