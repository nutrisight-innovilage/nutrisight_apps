/**
 * authContext.tsx
 * ---------------------------------------------------------------------------
 * Slim context wrapper untuk authentication.
 * Business logic ada di authService.
 * 
 * Context hanya:
 * • Menyimpan state
 * • Provide data ke children
 * • Wrapper untuk service calls
 * ---------------------------------------------------------------------------
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User, UpdateUserRequest } from '@/app/types/user';
import authService from '@/app/services/auth/authService';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuthContextType {
  // Data
  user: User | null;
  token: string | null;
  
  // States
  loading: boolean;
  isAuthenticated: boolean;
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: UpdateUserRequest) => Promise<void>;
  deleteAccount: () => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
  
  // Sync
  syncProfile: () => Promise<boolean>;
  syncPendingUpdates: () => Promise<{
    success: boolean;
    syncedCount: number;
    errors: string[];
  }>;
  getPendingUpdatesCount: () => Promise<number>;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // State
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Derived state
  const isAuthenticated = user !== null;

  // ---------------------------------------------------------------------------
  // Actions - delegated to service
  // ---------------------------------------------------------------------------

  /**
   * Load user from storage
   */
  const loadUser = useCallback(async () => {
    try {
      setLoading(true);
      
      const authData = await authService.getCurrentUser();
      
      if (authData) {
        setUser(authData.user);
        setToken(authData.token);
      }
    } catch (error) {
      console.error('[AuthContext] Error loading user:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Login
   */
  const login = useCallback(async (email: string, password: string) => {
    try {
      const authData = await authService.login({ email, password });
      
      setUser(authData.user);
      setToken(authData.token);
    } catch (error) {
      console.error('[AuthContext] Login error:', error);
      throw error;
    }
  }, []);

  /**
   * Register
   */
  const register = useCallback(async (data: any) => {
    try {
      const authData = await authService.register(data);
      
      setUser(authData.user);
      setToken(authData.token);
    } catch (error) {
      console.error('[AuthContext] Register error:', error);
      throw error;
    }
  }, []);

  /**
   * Logout
   */
  const logout = useCallback(async () => {
    try {
      await authService.logout(token || undefined);
      
      setUser(null);
      setToken(null);
    } catch (error) {
      console.error('[AuthContext] Logout error:', error);
      // Still clear local state even if error
      setUser(null);
      setToken(null);
    }
  }, [token]);

  /**
   * Update user profile
   */
  const updateUser = useCallback(async (userData: UpdateUserRequest) => {
    try {
      if (!user || !token) {
        throw new Error('No user logged in');
      }

      const authData = await authService.updateUser(user.id, userData, token);
      
      setUser(authData.user);
      // Token might be updated
      if (authData.token) {
        setToken(authData.token);
      }
    } catch (error) {
      console.error('[AuthContext] Update user error:', error);
      throw error;
    }
  }, [user, token]);

  /**
   * Delete account
   */
  const deleteAccount = useCallback(async () => {
    try {
      if (!user) {
        throw new Error('No user logged in');
      }

      await authService.deleteAccount(user.id, token || undefined);
      
      setUser(null);
      setToken(null);
    } catch (error) {
      console.error('[AuthContext] Delete account error:', error);
      throw error;
    }
  }, [user, token]);

  /**
   * Change password
   */
  const changePassword = useCallback(async (oldPassword: string, newPassword: string) => {
    try {
      if (!user) {
        throw new Error('No user logged in');
      }

      await authService.changePassword(user.id, oldPassword, newPassword, token || undefined);
    } catch (error) {
      console.error('[AuthContext] Change password error:', error);
      throw error;
    }
  }, [user, token]);

  /**
   * Sync profile from server
   */
  const syncProfile = useCallback(async (): Promise<boolean> => {
    try {
      if (!token) {
        console.warn('[AuthContext] Cannot sync profile - no token');
        return false;
      }

      const success = await authService.syncUserProfile(token);
      
      // Reload user if sync successful
      if (success) {
        await loadUser();
      }
      
      return success;
    } catch (error) {
      console.error('[AuthContext] Sync profile error:', error);
      return false;
    }
  }, [token, loadUser]);

  /**
   * Sync pending updates
   */
  const syncPendingUpdates = useCallback(async () => {
    try {
      if (!token) {
        return {
          success: false,
          syncedCount: 0,
          errors: ['No token available'],
        };
      }

      const result = await authService.syncPendingUpdates(token);
      
      // Reload user if any updates were synced
      if (result.syncedCount > 0) {
        await loadUser();
      }
      
      return result;
    } catch (error) {
      console.error('[AuthContext] Sync pending updates error:', error);
      return {
        success: false,
        syncedCount: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }, [token, loadUser]);

  /**
   * Get pending updates count
   */
  const getPendingUpdatesCount = useCallback(async (): Promise<number> => {
    try {
      return await authService.getPendingUpdatesCount();
    } catch (error) {
      console.error('[AuthContext] Get pending updates count error:', error);
      return 0;
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  // Load user on mount
  useEffect(() => {
    loadUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------------------------------------
  // Context Value
  // ---------------------------------------------------------------------------

  const value: AuthContextType = {
    // Data
    user,
    token,
    
    // States
    loading,
    isAuthenticated,
    
    // Actions
    login,
    register,
    logout,
    updateUser,
    deleteAccount,
    changePassword,
    
    // Sync
    syncProfile,
    syncPendingUpdates,
    getPendingUpdatesCount,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Custom hook to use auth context
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};