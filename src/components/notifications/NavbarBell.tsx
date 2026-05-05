/* ===========================================================
   NavbarBell - Zincir Atarlı Task Management
   =========================================================== */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, BellRing } from 'lucide-react';

interface NavbarBellProps {
  /** Okunmamış bildirim sayısı */
  unreadCount: number;
  /** Zil ikonuna tıklandığında */
  onClick: () => void;
  /** Ekstra class'lar */
  className?: string;
}

// Shake animation configuration
const shakeAnimation = {
  rotate: [0, -10, 10, -10, 10, -5, 5, 0],
  transition: {
    duration: 0.5,
    ease: 'easeInOut',
  },
};

/**
 * Navbar'ın sağ üst köşesine framer-motion ile her 5 saniyede bir sallanan
 * (shake animasyonu) bir zil ikonu. Üzerinde okunmamış sayısını gösteren
 * bir badge bulunur.
 */
export const NavbarBell: React.FC<NavbarBellProps> = ({
  unreadCount,
  onClick,
  className = '',
}) => {
  const [isShaking, setIsShaking] = useState(false);
  const [hasNewNotification, setHasNewNotification] = useState(false);
  const prevUnreadCountRef = useRef(unreadCount);

  // Shake effect when there's a new notification
  useEffect(() => {
    const prevCount = prevUnreadCountRef.current;
    
    // Check if there's a new notification
    if (unreadCount > prevCount) {
      setHasNewNotification(true);
      setIsShaking(true);
      
      // Reset shake state after animation
      setTimeout(() => {
        setIsShaking(false);
      }, 500);
    } else if (unreadCount === prevCount && hasNewNotification) {
      // Reset new notification flag
      setHasNewNotification(false);
    }
    
    prevUnreadCountRef.current = unreadCount;
  }, [unreadCount, hasNewNotification]);

  // Automatic shake every 5 seconds if there are unread notifications
  useEffect(() => {
    if (unreadCount === 0) return;

    const interval = setInterval(() => {
      setIsShaking(true);
      
      setTimeout(() => {
        setIsShaking(false);
      }, 500);
    }, 5000); // 5 seconds

    return () => clearInterval(interval);
  }, [unreadCount]);

  return (
    <motion.button
      className={`relative flex items-center justify-center ${
        className || ''
      }`}
      onClick={onClick}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      animate={isShaking ? shakeAnimation : {}}
    >
      {/* Zil ikonu */}
      <AnimatePresence mode="wait">
        {unreadCount > 0 ? (
          <motion.div
            key="bell-ring"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
          >
            <BellRing className="h-6 w-6 text-ice-400 drop-shadow-[0_0_8px_rgba(116,192,252,0.5)]" />
          </motion.div>
        ) : (
          <motion.div
            key="bell"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
          >
            <Bell className="h-6 w-6 text-white/80 hover:text-white" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Okunmamış sayısı badge'ı */}
      <AnimatePresence>
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className={`absolute -top-1 -right-1 flex min-h-[20px] min-w-[20px] 
                       items-center justify-center rounded-full bg-red-500 px-1.5 
                       text-xs font-bold text-white shadow-lg 
                       ${
                         unreadCount > 99
                           ? 'text-[10px] px-1'
                           : unreadCount > 9
                             ? 'text-[10px] px-1'
                             : ''
                       }`}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </motion.span>
        )}
      </AnimatePresence>

      {/* Pulse effect for new notifications */}
      <AnimatePresence>
        {hasNewNotification && (
          <motion.span
            initial={{ scale: 1.5, opacity: 0.75 }}
            animate={{ scale: 2, opacity: 0 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 rounded-full bg-red-500"
          />
        )}
      </AnimatePresence>
    </motion.button>
  );
};

// ===========================================================
// END OF NAVBARBELL
// ===========================================================
