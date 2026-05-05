// ============================================================
// UserProfileButton - Zincir Atarlı Task Management
// ============================================================

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useUserProfile } from '../../context/UserProfileContext';
import { ProfilePopup } from './ProfilePopup';

interface UserProfileButtonProps {
  /** Extra class names */
  className?: string;
}

/**
 * Header'ın sağ üst köşesinde kullanıcı avatarını gösteren buton.
 * Tıklandığında profil popup'ını açar.
 */
export const UserProfileButton: React.FC<UserProfileButtonProps> = ({ className = '' }) => {
  const { profile, isAuthenticated, isLoading } = useUserProfile();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get user initials for avatar fallback
  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 ${className}`}>
        <div className="h-8 w-8 animate-pulse rounded-full bg-[var(--bg-tertiary)]" />
      </div>
    );
  }

  // Not authenticated - don't show
  if (!isAuthenticated || !profile) {
    return null;
  }

  const hasAvatar = profile.avatar && profile.avatar.length > 0;

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-2 py-1.5 
                   text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors ${isOpen ? 'bg-[var(--bg-tertiary)]' : ''}`}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {/* Avatar */}
        <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-[var(--accent)] ring-2 ring-white/10">
          {hasAvatar ? (
            <img
              src={profile.avatar}
              alt={profile.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-sm font-semibold text-white">
              {getInitials(profile.name)}
            </span>
          )}
        </div>

        {/* Name */}
        <span className="hidden max-w-[100px] truncate md:inline">
          {profile.name}
        </span>

        {/* Chevron */}
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </motion.button>

      {/* Profile Popup */}
      <AnimatePresence>
        {isOpen && (
          <ProfilePopup
            onClose={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================================
// END OF USERPROFILEBUTTON
// ============================================================
