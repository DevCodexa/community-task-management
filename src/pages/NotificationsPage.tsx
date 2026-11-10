import React from 'react';
import { clearAllNotifications, deleteNotification, getNotifications, markAllAsRead, markAsRead } from '../lib/supabaseNotifications';
import { useUserProfile } from '../context/UserProfileContext';
import { NotificationCenter } from './NotificationCenter';

const notificationService = { clearAllNotifications, deleteNotification, getNotifications, markAllAsRead, markAsRead };

export const NotificationsPage: React.FC = () => {
  const { profile, isLoading } = useUserProfile();
  if (isLoading) return <div className="p-8 text-sm text-[var(--text-secondary)]">Bildirimler yükleniyor…</div>;
  if (!profile?.id) return <div className="p-8 text-sm text-[var(--text-secondary)]">Bildirimleri görmek için oturum açmalısın.</div>;

  return <NotificationCenter
    key={profile.id}
    userId={profile.id}
    service={notificationService}
    confirmClear={() => window.confirm('Tüm bildirimlerini silmek istiyor musun? Bu işlem geri alınamaz.')}
  />;
};
