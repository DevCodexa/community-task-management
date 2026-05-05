/* ===========================================================
   NotificationDropdown - Zincir Atarlı Task Management
   =========================================================== */

import React from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { 
  Bell, 
  Check, 
  Trash2, 
  Clock,
  X,
  Calendar,
  Users,
  Link2,
  UserPlus,
  UserMinus,
  CheckCircle2,
} from 'lucide-react';
import { FullNotification, NOTIFICATION_TYPE_CONFIG } from '../../types/notification';

interface NotificationDropdownProps {
  /** Bildirimler listesi */
  notifications: FullNotification[];
  /** Dropdown açık/kapalı */
  isOpen: boolean;
  /** Kapatma fonksiyonu */
  onClose: () => void;
  /** Bildirime tıklama */
  onNotificationClick: (notification: FullNotification) => void;
  /** Tümünü okundu yap */
  onMarkAllRead: () => void;
  /** Bildirim silme */
  onDelete: (id: string) => void;
  /** Yükleniyor mu */
  isLoading?: boolean;
  /**Ekstra class'lar */
  className?: string;
}

// Animation variants
/*const dropdownVariants = {
  hidden: {
    opacity: 0,
    y: -10,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 25,
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.95,
    transition: {
      duration: 0.15,
    },
  },
};*/

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0 },
};

/**
 * Zincir Atarlı temasına uygun (koyu arka plan, silver metinler)
 * bildirimleri listeleyen dropdown menü
 */
export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  notifications,
  isOpen,
  onClose,
  onNotificationClick,
  onMarkAllRead,
  onDelete,
  isLoading = false,
  className = '',
}) => {
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Az önce';
    if (diffMins < 60) return `${diffMins} dk önce`;
    if (diffHours < 24) return `${diffHours} saat önce`;
    if (diffDays < 7) return `${diffDays} gün önce`;
    
    return date.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
    });
  };

  // Get notification type icon
  const getNotificationIcon = (type: string) => {
    switch (type) {
    case 'task_added':
      return <Link2 className="h-4 w-4 text-ice-400" />;
    case 'task_completed':
      return <CheckCircle2 className="h-4 w-4 text-green-400" />;
    case 'task_deleted':
      return <Trash2 className="h-4 w-4 text-red-400" />;
    case 'member_added':
      return <UserPlus className="h-4 w-4 text-emerald-400" />;
    case 'member_removed':
      return <UserMinus className="h-4 w-4 text-orange-400" />;
    case 'birthday':
      return <Calendar className="h-4 w-4 text-yellow-400" />;
    default:
      return <Bell className="h-4 w-4 text-white/70" />;
    }
  };
const dropdownVariants: Variants = {
  hidden: { 
    opacity: 0, 
    y: -10,
    scale: 0.95
  },
  visible: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: { type: 'spring', duration: 0.3 }
  },
  exit: { 
    opacity: 0, 
    scale: 0.95,
    transition: { duration: 0.2 }
  }
};
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            onClick={onClose}
          />

          {/* Dropdown */}
          <motion.div
            variants={dropdownVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={`absolute right-0 top-full z-50 mt-3 w-96 
                       overflow-hidden rounded-xl border border-white/[0.08] 
                       bg-coal-800 shadow-2xl ${className || ''}`}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-ice-400" />
                <h3 className="text-sm font-semibold text-white">
                  Bildirimler
                </h3>
                {notifications.filter((n) => !n.is_read).length > 0 && (
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-ice-500/20 px-1.5 text-xs font-medium text-ice-400">
                    {notifications.filter((n) => !n.is_read).length}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {/* Mark all read button */}
                {notifications.some((n) => !n.is_read) && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onMarkAllRead}
                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-white/70 hover:bg-white/5 hover:text-white"
                  >
                    <Check className="h-3 w-3" />
                    Tümü okundu
                  </motion.button>
                )}
                {/* Close button */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="rounded-lg p-1 text-white/70 hover:bg-white/5 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </motion.button>
              </div>
            </div>

            {/* Notification List */}
            <div className="max-h-[400px] overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-ice-400" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Bell className="mb-2 h-12 w-12 text-white/30" />
                  <p className="text-sm text-white/70">
                    Henüz bildiriminiz yok
                  </p>
                  <p className="text-xs text-white/50">
                    Yeni görev veya üye eklendiğinde burada görünecek
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.04]">
                  {notifications.map((notification, index) => (
                    <motion.div
                      key={notification.id}
                      variants={itemVariants}
                      custom={index}
                      initial="hidden"
                      animate="visible"
                      transition={{ delay: index * 0.05 }}
                      className={`group relative flex cursor-pointer items-start gap-3 px-4 py-3 
                                 transition-colors hover:bg-white/[0.03] ${
                                   !notification.is_read
                                     ? 'bg-white/[0.02]'
                                     : 'opacity-70'
                                 }`}
                      onClick={() => onNotificationClick(notification)}
                    >
                      {/* Unread indicator */}
                      {!notification.is_read && (
                        <span className="absolute left-2 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-ice-400 shadow-[0_0_6px_rgba(116,192,252,0.6)]" />
                      )}

                      {/* Type Icon */}
                      <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg 
                                    ${NOTIFICATION_TYPE_CONFIG[notification.type]?.bgColor || 'bg-white/5'}`}>
                        {getNotificationIcon(notification.type)}
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className={`truncate text-sm font-medium ${
                            notification.is_read 
                              ? 'text-white/70' 
                              : 'text-white'
                          }`}>
                            {notification.title}
                          </p>
                        </div>
                        <p className="line-clamp-2 text-xs text-white/50">
                          {notification.message}
                        </p>
                        <div className="mt-1 flex items-center gap-2 text-xs text-white/40">
                          <Clock className="h-3 w-3" />
                          <span>{formatDate(notification.created_at)}</span>
                        </div>
                      </div>

                      {/* Delete button (on hover) */}
                      <motion.button
                        initial={{ opacity: 0 }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(notification.id);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 
                                   opacity-0 transition-opacity group-hover:opacity-100 
                                   hover:bg-red-500/20 hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </motion.button>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="border-t border-white/[0.06] px-4 py-2">
                <button className="w-full rounded-lg py-2 text-center text-xs text-white/70 hover:bg-white/5 hover:text-white">
                  Tüm bildirimleri görüntüle →
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// ===========================================================
// END OF NOTIFICATIONDROPDOWN
// ===========================================================
