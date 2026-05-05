/* ===========================================================
   NotificationDetailModal - Zincir Atarlı Task Management
   =========================================================== */

import React from 'react';
import { motion, AnimatePresence, Variants  } from 'framer-motion';
import { 
  X, 
  Clock, 
  Check, 
  Calendar,
  Link2,
  Users,
  Trash2,
  UserPlus,
  UserMinus,
  CheckCircle2,
} from 'lucide-react';
import { FullNotification, NOTIFICATION_TYPE_CONFIG } from '../../types/notification';

interface NotificationDetailModalProps {
  /** Bildirim */
  notification: FullNotification | null;
  /** Modal açık/kapalı */
  isOpen: boolean;
  /** Kapatma fonksiyonu */
  onClose: () => void;
  /** Okundu yap */
  onMarkAsRead?: () => void;
  /** Sil */
  onDelete?: () => void;
}

// Modal animation
const modalVariants: Variants = {
  hidden: { 
    opacity: 0, 
    scale: 0.9, 
    x: "-50%", 
    y: "-45%" // Başlangıçta biraz aşağıda
  },
  visible: { 
    opacity: 1, 
    scale: 1, 
    x: "-50%", 
    y: "-50%", // Tam merkez
    transition: { type: 'spring', damping: 25, stiffness: 300 }
  },
  exit: { 
    opacity: 0, 
    scale: 0.9, 
    x: "-50%", 
    y: "-45%" 
  }
};
/*const modalVariants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: 20,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 25,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 20,
    transition: {
      duration: 0.15,
    },
  },
};*/

// Backdrop animation
const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

/**
 * Bildirime tıklandığında açılan ve tüm detayları gösteren
 * şık bir pop-up (Modal)
 */
export const NotificationDetailModal: React.FC<NotificationDetailModalProps> = ({
  notification,
  isOpen,
  onClose,
  onMarkAsRead,
  onDelete,
}) => {
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get notification type icon
  const getNotificationIcon = (type: string) => {
    switch (type) {
    case 'task_added':
      return <Link2 className="h-5 w-5 text-ice-400" />;
    case 'task_completed':
      return <CheckCircle2 className="h-5 w-5 text-green-400" />;
    case 'task_deleted':
      return <Trash2 className="h-5 w-5 text-red-400" />;
    case 'member_added':
      return <UserPlus className="h-5 w-5 text-emerald-400" />;
    case 'member_removed':
      return <UserMinus className="h-5 w-5 text-orange-400" />;
    case 'birthday':
      return <Calendar className="h-5 w-5 text-yellow-400" />;
    default:
      return <Users className="h-5 w-5 text-white/70" />;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && notification && (
        <>
          {/* Backdrop */}
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 
                       overflow-hidden rounded-2xl border border-white/[0.08] 
                       bg-coal-800 shadow-2xl"
          >
            {/* Header with gradient border effect */}
            <div className="relative border-b border-white/[0.06]">
              {/* Gradient overlay */}
              <div className="absolute inset-0 h-16 bg-gradient-to-r from-ice-500/10 via-transparent to-purple-500/10" />
              
              <div className="relative flex items-center justify-between p-5">
                <div className="flex items-center gap-3">
                  {/* Type Icon */}
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl 
                                ${NOTIFICATION_TYPE_CONFIG[notification.type]?.bgColor || 'bg-white/5'}`}>
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  {/* Title and type label */}
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-white/50">
                      {NOTIFICATION_TYPE_CONFIG[notification.type]?.label || 'Bildirim'}
                    </p>
                    <h2 className="text-lg font-semibold text-white">
                      {notification.title}
                    </h2>
                  </div>
                </div>

                {/* Close button */}
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </motion.button>
              </div>
            </div>

            {/* Content */}
            <div className="p-5">
              {/* Message */}
              <div className="mb-6 rounded-xl bg-white/[0.02] p-4">
                <p className="text-sm leading-relaxed text-white/90">
                  {notification.message}
                </p>
              </div>

              {/* Details */}
              <div className="space-y-3">
                {/* Created at */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white/50">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm">Oluşturulma</span>
                  </div>
                  <span className="text-sm text-white/70">
                    {formatDate(notification.created_at)}
                  </span>
                </div>

                {/* Read status */}
                {notification.is_read && notification.read_at && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white/50">
                      <Check className="h-4 w-4 text-green-400" />
                      <span className="text-sm">Okundu</span>
                    </div>
                    <span className="text-sm text-white/70">
                      {formatDate(notification.read_at)}
                    </span>
                  </div>
                )}

                {/* Actor */}
                {notification.actor_name && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white/50">
                      <Users className="h-4 w-4" />
                      <span className="text-sm">İşlem Yapan</span>
                    </div>
                    <span className="text-sm text-white/70">
                      {notification.actor_name}
                    </span>
                  </div>
                )}

                {/* Related entity */}
                {notification.related_id && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white/50">
                      <Link2 className="h-4 w-4" />
                      <span className="text-sm">İlişkili</span>
                    </div>
                    <span className="text-sm text-ice-400">
                      {notification.related_type}#{notification.related_id.slice(0, 8)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Footer actions */}
            <div className="flex items-center justify-between border-t border-white/[0.06] p-4">
              {/* Delete button */}
              {onDelete && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onDelete}
                  className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-red-400 
                             hover:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4" />
                  Sil
                </motion.button>
              )}

              <div className="flex-1" />

              {/* Mark as read / Close button */}
              {!notification.is_read && onMarkAsRead ? (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onMarkAsRead}
                  className="flex items-center gap-2 rounded-lg bg-ice-500/20 px-4 py-2 
                             text-sm font-medium text-ice-400 hover:bg-ice-500/30"
                >
                  <Check className="h-4 w-4" />
                  Okundu İşaretle
                </motion.button>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onClose}
                  className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20"
                >
                  Kapat
                </motion.button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// ===========================================================
// END OF NOTIFICATIONDETAILMODAL
// ===========================================================
