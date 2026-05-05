/* ===========================================================
   NotificationContainer - Zincir Atarlı Task Management
   =========================================================== */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNotifications } from '../../hooks/useNotifications';
import { NavbarBell } from './NavbarBell';
import { NotificationDropdown } from './NotificationDropdown';
import { NotificationDetailModal } from './NotificationDetailModal';
import { FullNotification } from '../../types/notification';

/**
 * NotificationContainer
 * 
 * Tüm bildirim UI bileşenlerini birleştiren wrapper component.
 * - NavbarBell: Sağ üst köşede zil ikonu + badge
 * - NotificationDropdown: Bildirimler listesi
 * - NotificationDetailModal: Bildirim detay modalı
 */
export const NotificationContainer: React.FC = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<FullNotification | null>(null);
  
  // Use the notifications hook
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    removeNotification,
    checkBirthdays,
  } = useNotifications({
    initialLimit: 20,
    enableRealtime: true,
    checkBirthdays: true,
  });

  // Handle notification click - open detail modal
  const handleNotificationClick = (notification: FullNotification) => {
    setSelectedNotification(notification);
    
    // Mark as read if not already
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    
    // Close dropdown
    setIsDropdownOpen(false);
  };

  // Handle bell click - toggle dropdown
  const handleBellClick = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  // Handle close dropdown
  const handleCloseDropdown = () => {
    setIsDropdownOpen(false);
  };

  // Handle close modal
  const handleCloseModal = () => {
    setSelectedNotification(null);
  };

  // Handle delete from modal
  const handleDeleteFromModal = () => {
    if (selectedNotification) {
      removeNotification(selectedNotification.id);
      setSelectedNotification(null);
    }
  };

  // Handle mark as read from modal
  const handleMarkAsReadFromModal = () => {
    if (selectedNotification && !selectedNotification.is_read) {
      markAsRead(selectedNotification.id);
      // Update local state
      setSelectedNotification(prev => prev ? { ...prev, is_read: true } : null);
    }
  };

  return (
    <>
      {/* Navbar Bell Icon */}
      <div className="relative">
        <NavbarBell
          unreadCount={unreadCount}
          onClick={handleBellClick}
        />
        
        {/* Dropdown */}
        <NotificationDropdown
          notifications={notifications}
          isOpen={isDropdownOpen}
          onClose={handleCloseDropdown}
          onNotificationClick={handleNotificationClick}
          onMarkAllRead={markAllAsRead}
          onDelete={removeNotification}
          isLoading={isLoading}
        />
      </div>

      {/* Detail Modal */}
      <NotificationDetailModal
        notification={selectedNotification}
        isOpen={!!selectedNotification}
        onClose={handleCloseModal}
        onMarkAsRead={handleMarkAsReadFromModal}
        onDelete={handleDeleteFromModal}
      />
    </>
  );
};

// ===========================================================
// END OF NOTIFICATIONCONTAINER
// ===========================================================
