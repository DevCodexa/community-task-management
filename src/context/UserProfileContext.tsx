// ============================================================
// User Profile Context - Zincir Atarlı Task Management
// ============================================================

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { getMemberByEmail } from '../lib/supabaseMembers';
import { FullMember } from '../types/member';
import { User, Session } from '@supabase/supabase-js';

// Context type
interface UserProfileContextType {
  user: User | null;
  profile: FullMember | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

// Default values
const defaultContext: UserProfileContextType = {
  user: null,
  profile: null,
  isLoading: true,
  isAuthenticated: false,
  signOut: async () => {},
  refreshProfile: async () => {},
};

// Create context
const UserProfileContext = createContext<UserProfileContextType>(defaultContext);

// Provider props
interface UserProfileProviderProps {
  children: ReactNode;
}

// Provider component
export const UserProfileProvider: React.FC<UserProfileProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<FullMember | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch profile when user changes
  const fetchProfile = async (userEmail: string) => {
    try {
      const profileData = await getMemberByEmail(userEmail);
      setProfile(profileData);
    } catch (error) {
      // console.error('Error fetching profile:', error);
      setProfile(null);
    }
  };

  // Handle auth state change
  const handleAuthChange = async (event: string, session: Session | null) => {
    if (event === 'SIGNED_IN' && session) {
      setUser(session.user);
      await fetchProfile(session.user.email || '');
    } else if (event === 'SIGNED_OUT') {
      setUser(null);
      setProfile(null);
    } else if (event === 'TOKEN_REFRESHED' && session) {
      setUser(session.user);
    }
    setIsLoading(false);
  };

  // Initial load and subscribe to auth changes
  useEffect(() => {
  // console.log('UserProfileContext useEffect triggered');
    
    const initializeAuth = async () => {
      // console.log('initializeAuth called');
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        // console.log('getSession result:', { session: !!session, userEmail: session?.user?.email, error });
        
        if (session) {
          // console.log('Setting user:', session.user.id);
          setUser(session.user);
          if (session.user.email) {
            // console.log('Fetching profile for:', session.user.email);
            await fetchProfile(session.user.email);
          }
        } else {
          console.log('No session - anonymous mode');
        }
        // console.log('Setting isLoading false');
        setIsLoading(false);
      } catch (error) {
        // console.error('initializeAuth ERROR:', error);
        setIsLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        // console.log('onAuthStateChange:', event, !!session);
      handleAuthChange(event, session);
    });

    return () => {
      // console.log('UserProfileContext cleanup');
      subscription.unsubscribe();
    };
  }, []);

  // Sign out function
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
    } catch (error) {
      // console.error('Error signing out:', error);
    }
  };

  // Refresh profile function
  const refreshProfile = async () => {
    if (user?.email) {
      setIsLoading(true);
      await fetchProfile(user.email);
      setIsLoading(false);
    }
  };

  const value: UserProfileContextType = {
    user,
    profile,
    isLoading,
    isAuthenticated: !!user && !!profile,
    signOut,
    refreshProfile,
  };

  return (
    <UserProfileContext.Provider value={value}>
      {children}
    </UserProfileContext.Provider>
  );
};

// Custom hook to use the context
export const useUserProfile = () => {
  const context = useContext(UserProfileContext);
  
  if (!context) {
    throw new Error('useUserProfile must be used within a UserProfileProvider');
  }
  
  return context;
};

// Export the context itself for testing
export { UserProfileContext };

// ============================================================
// END OF USER PROFILE CONTEXT
// ============================================================
