// src/context/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { authService, type UserProfile } from '../services/authService';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChange(async (user) => {
      try {
        setUser(user);
        
        if (user) {
          // Fetch user profile from Firestore
          const profile = await authService.getUserProfile(user.uid);
          setUserProfile(profile);
        } else {
          setUserProfile(null);
        }
      } catch (error) {
        console.error('Error in auth state change:', error);
        setUser(null);
        setUserProfile(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const signOut = async () => {
    setLoading(true);
    await authService.signOut();
    setUser(null);
    setUserProfile(null);
    setLoading(false);
  };

  const refreshUserProfile = async () => {
    if (!user) return;
    
    try {
      console.log('🔄 Refreshing user profile...');
      
      // Reload Firebase Auth user to get latest provider data
      await user.reload();
      
      // Get the updated user object from Firebase Auth
      const updatedUser = authService.getCurrentUser();
      if (updatedUser) {
        setUser(updatedUser);
      }
      
      // Refresh the Firestore user profile with fresh data
      const profile = await authService.getUserProfile(user.uid);
      console.log('✅ Profile refreshed:', {
        hasGithubUsername: !!profile?.githubUsername,
        githubUsername: profile?.githubUsername
      });
      
      // Create a new object to force React to detect the change
      if (profile) {
        setUserProfile({ ...profile });
      } else {
        setUserProfile(null);
      }
    } catch (error) {
      console.error('❌ Error refreshing user profile:', error);
    }
  };

  const value: AuthContextType = {
    user,
    userProfile,
    loading,
    signOut,
    refreshUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};