// ============================================================
// ProfilePopup - Zincir Atarlı Task Management
// ============================================================

import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  Mail, 
  Briefcase, 
  LogOut, 
  Settings,
  Shield,
  Calendar,
} from 'lucide-react';
import { useUserProfile } from '../../context/UserProfileContext';

interface ProfilePopupProps {
  /** Callback when popup should close */
  onClose: () => void;
}

/**
 * Kullanıcı profil popup'ı.
 * Kullanıcı bilgilerini gösterir ve çıkış yapma seçeneği sunar.
 */
export const ProfilePopup: React.FC<ProfilePopupProps> = ({ onClose }) => {
  const { profile, user, signOut } = useUserProfile();
  const navigate = useNavigate();
  
  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Handle sign out
  const handleSignOut = async () => {
    await signOut();
    onClose();
    navigate('/');
  };

  if (!profile) {
    return null;
  }

  const hasAvatar = profile.avatar && profile.avatar.length > 0;

  // Animation variants
  const popupVariants = {
    hidden: { opacity: 0, y: -8, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -8, scale: 0.95 },
  };

  return (
    <motion.div
      variants={popupVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={{ type: 'spring', duration: 0.3 }}
      className="absolute right-0 top-full z-50 mt-3 w-72 overflow-hidden rounded-xl border border-white/[0.08] bg-[var(--bg-card)] shadow-2xl"
    >
      {/* Profile Header */}
      <div className="border-b border-white/[0.06] p-4">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--accent)] ring-2 ring-white/10">
            {hasAvatar ? (
              <img
                src={profile.avatar}
                alt={profile.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-lg font-semibold text-white">
                {getInitials(profile.name)}
              </span>
            )}
          </div>

          {/* Name and Role */}
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold text-[var(--text-primary)]">
              {profile.name}
            </h3>
            <div className="mt-0.5 flex items-center gap-1">
              <Shield className="h-3 w-3 text-[var(--accent)]" />
              <span className="text-xs text-[var(--text-secondary)]">
                {profile.system_role}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Details */}
      <div className="border-b border-white/[0.06] p-3">
        {/* Email */}
        <div className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/[0.02]">
          <Mail className="h-4 w-4 shrink-0 text-[var(--text-secondary)]" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-[var(--text-secondary)]">
              {profile.email || user?.email}
            </p>
          </div>
        </div>

        {/* Job Title */}
        {profile.job_title && (
          <div className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/[0.02]">
            <Briefcase className="h-4 w-4 shrink-0 text-[var(--text-secondary)]" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-[var(--text-secondary)]">
                {profile.job_title}
              </p>
            </div>
          </div>
        )}

        {/* Community Title */}
        {profile.comm_title && (
          <div className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/[0.02]">
            <User className="h-4 w-4 shrink-0 text-[var(--text-secondary)]" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-[var(--text-secondary)]">
                {profile.comm_title}
              </p>
            </div>
          </div>
        )}

        {/* Birthday */}
        {profile.birth_day > 0 && (
          <div className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/[0.02]">
            <Calendar className="h-4 w-4 shrink-0 text-[var(--text-secondary)]" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-[var(--text-secondary)]">
                {profile.birth_day}/{profile.birth_month} doğum günü
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-2">
        {/* Settings Button */}
        <button
          onClick={() => {
            onClose();
            navigate('/ayarlar');
          }}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[var(--text-primary)] hover:bg-white/[0.04] transition-colors"
        >
          <Settings className="h-4 w-4" />
          <span>Ayarlar</span>
        </button>

        {/* Sign Out Button */}
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span>Çıkış Yap</span>
        </button>
      </div>
    </motion.div>
  );
};

// ============================================================
// END OF PROFILEPOPUP
// ============================================================
