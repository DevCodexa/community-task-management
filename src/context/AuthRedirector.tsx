import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUserProfile } from './UserProfileContext';

/**
 * Global auth -> redirect guard.
 * - Session/auth invalid olunca kullanıcıyı temiz şekilde root (login) sayfasına yönlendirir.
 * - Aynı anda tekrar auth state change gelirse redirect loop oluşmaması için flag kullanır.
 * - Login sayfasındayken auth state değişse bile yönlendirme olmaz, kullanıcıyı rahatsız etmez.
 */
export const AuthRedirector: React.FC = () => {
  const { user, profile, isLoading } = useUserProfile();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectingRef = useRef(false);

  useEffect(() => {
    if (redirectingRef.current) return;

    // initial load bittiyse kontrol et
    if (isLoading) return;

    const isAuthed = !!user && !!profile;
    const isOnLogin = location.pathname === '/';

    if (!isAuthed && !isOnLogin) {
      redirectingRef.current = true;
      // route'u temizlemeden sadece redirect etmek yeterli
      navigate('/', { replace: true });
    }

    if (isAuthed) {
      redirectingRef.current = false;
    }
  }, [isLoading, user, profile, navigate, location.pathname]);

  return null;
};

