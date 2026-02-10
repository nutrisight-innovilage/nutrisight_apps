/**
 * authService.ts
 * ---------------------------------------------------------------------------
 * Business logic layer untuk authentication operations.
 * Abstraksi antara context dan API calls.
 * 
 * Features:
 * • Smart routing antara online/offline API
 * • Automatic sync queueing
 * • Network detection
 * • Session management
 * ---------------------------------------------------------------------------
 */

import NetInfo from '@react-native-community/netinfo';
import { User, AuthResponse, LoginRequest, RegisterRequest, UpdateUserRequest } from '@/app/types/user';
import authOnlineAPI from '@/app/services/auth/authOnlineAPI';
import authOfflineAPI from '@/app/services/auth/authOfflineAPI';
import authSyncStrategy, { syncPendingProfileUpdates, syncUserProfile } from '@/app/services/sync/syncStrategy/authSyncStrategy';
import { getSyncManager } from '@/app/services/sync/syncManager';
import { getSyncQueue } from '@/app/services/sync/syncQueue';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuthServiceConfig {
  autoSync: boolean;
  syncOnLogin: boolean;
  offlineMode: boolean;
}

// ---------------------------------------------------------------------------
// Auth Service Class
// ---------------------------------------------------------------------------

class AuthService {
  private config: AuthServiceConfig = {
    autoSync: true,
    syncOnLogin: true,
    offlineMode: false,
  };

  private isOnline: boolean = false;

  constructor() {
    this.setupNetworkListener();
    this.initializeSyncStrategy();
  }

  /**
   * Setup network listener
   */
  private setupNetworkListener(): void {
    NetInfo.addEventListener(state => {
      this.isOnline = state.isConnected ?? false;
    });
  }

  /**
   * Initialize sync strategy with sync manager
   */
  private async initializeSyncStrategy(): Promise<void> {
    try {
      const syncQueue = getSyncQueue();
      const syncManager = getSyncManager(syncQueue);
      
      // Register auth sync strategy
      syncManager.registerStrategy('auth', authSyncStrategy);
      
      console.log('[AuthService] Sync strategy initialized');
    } catch (error) {
      console.error('[AuthService] Failed to initialize sync strategy:', error);
    }
  }

  /**
   * Check network status
   */
  private async checkNetwork(): Promise<boolean> {
    const state = await NetInfo.fetch();
    this.isOnline = state.isConnected ?? false;
    return this.isOnline;
  }

  /**
   * Register new user
   */
  async register(data: RegisterRequest): Promise<AuthResponse> {
    try {
      const isOnline = await this.checkNetwork();

      // Try online first
      if (isOnline && !this.config.offlineMode) {
        try {
          const authData = await authOnlineAPI.register(data);
          
          // Save to offline storage as backup
          await authOfflineAPI.saveUserFromServer(authData.user);
          
          console.log('[AuthService] User registered online');
          return authData;
        } catch (error) {
          console.warn('[AuthService] Online registration failed, falling back to offline');
        }
      }

      // Fallback to offline registration
      const authData = await authOfflineAPI.register(data);
      
      // Queue for sync when online
      if (this.config.autoSync) {
        await this.queueRegistrationSync(data);
      }
      
      console.log('[AuthService] User registered offline');
      return authData;
    } catch (error) {
      console.error('[AuthService] Registration failed:', error);
      throw error;
    }
  }

  /**
   * Login user
   */
  async login(data: LoginRequest): Promise<AuthResponse> {
    try {
      const isOnline = await this.checkNetwork();

      // Try online first
      if (isOnline && !this.config.offlineMode) {
        try {
          const authData = await authOnlineAPI.login(data);
          
          // Save to offline storage
          await authOfflineAPI.saveUserFromServer(authData.user);
          
          // Sync pending updates if enabled
          if (this.config.syncOnLogin && this.config.autoSync) {
            this.syncPendingUpdatesInBackground(authData.token);
          }
          
          console.log('[AuthService] User logged in online');
          return authData;
        } catch (error) {
          console.warn('[AuthService] Online login failed, falling back to offline');
        }
      }

      // Fallback to offline login
      const authData = await authOfflineAPI.login(data);
      
      console.log('[AuthService] User logged in offline');
      return authData;
    } catch (error) {
      console.error('[AuthService] Login failed:', error);
      throw error;
    }
  }

  /**
   * Logout user
   */
  async logout(token?: string): Promise<void> {
    try {
      const isOnline = await this.checkNetwork();

      // Try to notify server if online
      if (isOnline && token) {
        try {
          await authOnlineAPI.logout(token);
        } catch (error) {
          console.warn('[AuthService] Online logout notification failed');
        }
      }

      // Always logout locally
      await authOfflineAPI.logout();
      
      console.log('[AuthService] User logged out');
    } catch (error) {
      console.error('[AuthService] Logout failed:', error);
      throw error;
    }
  }

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<AuthResponse | null> {
    try {
      // Always get from local storage first (fastest)
      const authData = await authOfflineAPI.getCurrentUser();
      
      // If online and auto-sync enabled, sync profile in background
      if (authData && this.config.autoSync && this.isOnline) {
        this.syncProfileInBackground(authData.token);
      }
      
      return authData;
    } catch (error) {
      console.error('[AuthService] Failed to get current user:', error);
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const authData = await this.getCurrentUser();
    return authData !== null;
  }

  /**
   * Update user profile
   */
  async updateUser(
    userId: string,
    userData: UpdateUserRequest,
    token: string
  ): Promise<AuthResponse> {
    try {
      const isOnline = await this.checkNetwork();

      // Try online first
      if (isOnline && !this.config.offlineMode) {
        try {
          const authData = await authOnlineAPI.updateUser(userId, userData, token);
          
          // Update offline storage
          await authOfflineAPI.saveUserFromServer(authData.user);
          
          // Clear pending update if exists
          await authOfflineAPI.clearPendingUpdate(userId);
          
          console.log('[AuthService] User profile updated online');
          return authData;
        } catch (error) {
          console.warn('[AuthService] Online update failed, falling back to offline');
        }
      }

      // Fallback to offline update
      const authData = await authOfflineAPI.updateUser(userId, userData, token);
      
      // Mark as pending sync (already done in authOfflineAPI.updateUser)
      console.log('[AuthService] User profile updated offline');
      return authData;
    } catch (error) {
      console.error('[AuthService] Update failed:', error);
      throw error;
    }
  }

  /**
   * Delete user account
   */
  async deleteAccount(userId: string, token?: string): Promise<void> {
    try {
      const isOnline = await this.checkNetwork();

      // Try online first
      if (isOnline && token) {
        try {
          await authOnlineAPI.deleteAccount(userId, token);
        } catch (error) {
          console.warn('[AuthService] Online deletion failed, continuing with offline');
        }
      }

      // Always delete locally
      await authOfflineAPI.deleteAccount(userId);
      
      console.log('[AuthService] User account deleted');
    } catch (error) {
      console.error('[AuthService] Account deletion failed:', error);
      throw error;
    }
  }

  /**
   * Change password
   */
  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
    token?: string
  ): Promise<void> {
    try {
      const isOnline = await this.checkNetwork();

      // Try online first
      if (isOnline && token) {
        try {
          await authOnlineAPI.changePassword(userId, oldPassword, newPassword, token);
          
          // Update offline storage
          await authOfflineAPI.changePassword(userId, oldPassword, newPassword);
          
          console.log('[AuthService] Password changed online');
          return;
        } catch (error) {
          console.warn('[AuthService] Online password change failed, falling back to offline');
        }
      }

      // Fallback to offline
      await authOfflineAPI.changePassword(userId, oldPassword, newPassword);
      
      console.log('[AuthService] Password changed offline');
    } catch (error) {
      console.error('[AuthService] Password change failed:', error);
      throw error;
    }
  }

  /**
   * Check if email is available
   */
  async checkEmailAvailable(email: string): Promise<boolean> {
    try {
      const isOnline = await this.checkNetwork();

      // Try online first for accurate check
      if (isOnline) {
        try {
          return await authOnlineAPI.checkEmailAvailable(email);
        } catch (error) {
          console.warn('[AuthService] Online email check failed, falling back to offline');
        }
      }

      // Fallback to offline check
      return await authOfflineAPI.checkEmailAvailable(email);
    } catch (error) {
      console.error('[AuthService] Email availability check failed:', error);
      return false;
    }
  }

  /**
   * Verify token
   */
  async verifyToken(token: string): Promise<AuthResponse> {
    try {
      const isOnline = await this.checkNetwork();

      if (!isOnline) {
        throw new Error('Cannot verify token offline');
      }

      return await authOnlineAPI.verifyToken(token);
    } catch (error) {
      console.error('[AuthService] Token verification failed:', error);
      throw error;
    }
  }

  /**
   * Refresh token
   */
  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    try {
      const isOnline = await this.checkNetwork();

      if (!isOnline) {
        throw new Error('Cannot refresh token offline');
      }

      return await authOnlineAPI.refreshToken(refreshToken);
    } catch (error) {
      console.error('[AuthService] Token refresh failed:', error);
      throw error;
    }
  }

  // ---------------------------------------------------------------------------
  // Sync Operations
  // ---------------------------------------------------------------------------

  /**
   * Queue registration for sync
   */
  private async queueRegistrationSync(data: RegisterRequest): Promise<void> {
    try {
      const syncQueue = getSyncQueue();
      await syncQueue.add('auth', {
        action: 'register',
        registerData: data,
      }, 1, 5); // High priority, 5 retries
      
      console.log('[AuthService] Registration queued for sync');
    } catch (error) {
      console.error('[AuthService] Failed to queue registration:', error);
    }
  }

  /**
   * Sync pending updates in background
   */
  private syncPendingUpdatesInBackground(token: string): void {
    syncPendingProfileUpdates(token).catch(error => {
      console.error('[AuthService] Background sync failed:', error);
    });
  }

  /**
   * Sync profile in background
   */
  private syncProfileInBackground(token: string): void {
    syncUserProfile(token).catch(error => {
      console.error('[AuthService] Background profile sync failed:', error);
    });
  }

  /**
   * Manually sync pending updates
   */
  async syncPendingUpdates(token: string): Promise<{
    success: boolean;
    syncedCount: number;
    errors: string[];
  }> {
    try {
      const isOnline = await this.checkNetwork();

      if (!isOnline) {
        return {
          success: false,
          syncedCount: 0,
          errors: ['Device is offline'],
        };
      }

      return await syncPendingProfileUpdates(token);
    } catch (error) {
      console.error('[AuthService] Failed to sync pending updates:', error);
      return {
        success: false,
        syncedCount: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * Manually sync user profile
   */
  async syncUserProfile(token: string): Promise<boolean> {
    try {
      const isOnline = await this.checkNetwork();

      if (!isOnline) {
        console.warn('[AuthService] Cannot sync profile - device is offline');
        return false;
      }

      return await syncUserProfile(token);
    } catch (error) {
      console.error('[AuthService] Failed to sync user profile:', error);
      return false;
    }
  }

  /**
   * Get pending updates count
   */
  async getPendingUpdatesCount(): Promise<number> {
    try {
      const pending = await authOfflineAPI.getPendingUpdates();
      return Object.keys(pending).length;
    } catch (error) {
      console.error('[AuthService] Failed to get pending updates count:', error);
      return 0;
    }
  }

  // ---------------------------------------------------------------------------
  // Configuration
  // ---------------------------------------------------------------------------

  /**
   * Update config
   */
  setConfig(config: Partial<AuthServiceConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('[AuthService] Config updated:', this.config);
  }

  /**
   * Get current config
   */
  getConfig(): AuthServiceConfig {
    return { ...this.config };
  }

  /**
   * Enable offline mode
   */
  enableOfflineMode(): void {
    this.config.offlineMode = true;
    console.log('[AuthService] Offline mode enabled');
  }

  /**
   * Disable offline mode
   */
  disableOfflineMode(): void {
    this.config.offlineMode = false;
    console.log('[AuthService] Offline mode disabled');
  }

  /**
   * Clear all local data
   */
  async clearAllData(): Promise<void> {
    await authOfflineAPI.clearAllData();
    console.log('[AuthService] All local data cleared');
  }
}

// ---------------------------------------------------------------------------
// Singleton Instance
// ---------------------------------------------------------------------------

const authService = new AuthService();

export default authService;