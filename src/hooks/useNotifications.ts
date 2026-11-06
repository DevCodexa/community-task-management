import {
  getNotifications, getUnreadCount, markAsRead, markAllAsRead,
  deleteNotification, subscribeToNotifications,
} from '../lib/supabaseNotifications';
import { useNotificationsCore, type UseNotificationsOptions } from './useNotificationsCore';

const service = { getNotifications, getUnreadCount, markAsRead, markAllAsRead, deleteNotification, subscribeToNotifications };

export const useNotifications = (options: UseNotificationsOptions = {}) => useNotificationsCore(options, service);
