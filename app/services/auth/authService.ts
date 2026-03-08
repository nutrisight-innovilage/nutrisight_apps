/**
 * authService.ts (REFACTORED - SyncManager Integration + DB Document Check)
 * ---------------------------------------------------------------------------
 * TRUE OFFLINE-FIRST dengan SyncManager integration.
 * 
 * REFACTORED CHANGES:
 * • ✅ Semua write operations menggunakan authOfflineAPI (offline-first)
 * • ✅ Semua sync operations menggunakan SyncManager.sync() (no manual sync)
 * • ✅ Background sync handled by SyncManager automatically
 * • ✅ Network detection handled by SyncManager
 * • ✅ Retry logic handled by SyncManager
 * • ✅ getCurrentUser detects missing DB document → warns user
 * • ❌ REMOVED: Manual queue operations
 * • ❌ REMOVED: Manual server API calls
 * • ❌ REMOVED: Custom background sync methods
 * ---------------------------------------------------------------------------
 */

import NetInfo from '@react-native-community/netinfo';
import { User, AuthResponse, LoginRequest, RegisterRequest, UpdateUserRequest } from '@/app/types/user';
import authOnlineAPI from '@/app/services/auth/authOnlineAPI';
import authOfflineAPI from '@/app/services/auth/authOfflineAPI';
import { getSyncManager } from '@/app/services/sync/syncManager';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuthServiceConfig {
  autoSync: boolean;
  syncOnLogin: boolean;
}

// ---------------------------------------------------------------------------
// Auth Service Class (REFACTORED)
// ---------------------------------------------------------------------------

class AuthService {
  private config: AuthServiceConfig = {
    autoSync: true,
    syncOnLogin: true,
  };

  private isOnline: boolean = false;

  constructor() {
    this.setupNetworkListener();
  }

  /**
   * Setup network listener
   * SyncManager handles actual sync, we just track status
   */
  private setupNetworkListener(): void {
    NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected ?? false;
      
      console.log(`[AuthService] Network: ${this.isOnline ? 'ONLINE' : 'OFFLINE'}`);
      
      // When coming back online, SyncManager will auto-sync
      if (wasOffline && this.isOnline) {
        console.log('[AuthService] Back online - SyncManager will handle sync');
      }
    });
  }

  /**
   * Check network status
   */
  private async checkNetwork(): Promise<boolean> {
    const state = await NetInfo.fetch();
    this.isOnline = state.isConnected ?? false;
    return this.isOnline;
  }

  // ===========================================================================
  // ✅ DB DOCUMENT VALIDATION
  // ===========================================================================

  /**
   * Check if user has required fields that indicate a valid DB document.
   * 
   * Appwrite Auth only provides: email, name, phone
   * Database document also has: age, weight, height, gender, role
   * 
   * If age/weight/height are all 0 → user exists in Auth but NOT in Database.
   */
  private isUserMissingDbDocument(user: User): boolean {
    // These fields are required in DB document and cannot be 0 for a real user
    const hasNoAge = !user.age || user.age === 0;
    const hasNoWeight = !user.weight || user.weight === 0;
    const hasNoHeight = !user.height || user.height === 0;
    const hasNoGender = !user.gender || user.gender === 'male'; // default fallback from convertAppwriteUser
    const hasNoRole = !user.role || user.role === 'dewasa';     // default fallback from convertAppwriteUser

    // If ALL critical fields are defaults/zero → DB document is missing
    return hasNoAge && hasNoWeight && hasNoHeight;
  }

  // ===========================================================================
  // OFFLINE-FIRST OPERATIONS (REFACTORED)
  // ===========================================================================

  /**
   * ✅ REFACTORED: Register new user
   */
  async register(data: RegisterRequest): Promise<AuthResponse> {
    try {
      // 1. ALWAYS register locally first (instant success)
      const authData = await authOfflineAPI.register(data);
      console.log('[AuthService] ✅ User registered locally');

      // 2. Queue for background sync via SyncManager
      if (this.config.autoSync) {
        try {
          const syncManager = getSyncManager();
          await syncManager.sync('auth', {
            action: 'register',
            registerData: data,
            userId: authData.user.id,
          });
          console.log('[AuthService] 📋 Registration queued for sync');
        } catch (syncErr) {
          console.warn('[AuthService] Failed to queue sync, will retry later:', syncErr);
        }
      }

      return authData;
    } catch (error) {
      console.error('[AuthService] Registration failed:', error);
      throw error;
    }
  };

  /**
   * ✅ REFACTORED: Login user (with DB document check)
   */
  async login(data: LoginRequest): Promise<AuthResponse> {
    try {
      let authData: AuthResponse;
      
      // 1. ALWAYS try local login first
      try {
        authData = await authOfflineAPI.login(data);
        console.log('[AuthService] ✅ User logged in locally');
      } catch (localError) {
        // If local login fails and we're online, try server
        if (this.isOnline) {
          console.log('[AuthService] Local login failed, trying server...');
          authData = await authOnlineAPI.login(data);
          
          // Save server response locally
          await authOfflineAPI.saveUserFromServer(authData.user);
          console.log('[AuthService] ✅ User logged in from server and saved locally');
        } else {
          throw localError;
        }
      }

      // 2. ✅ Check if user has a valid DB document
      if (this.isUserMissingDbDocument(authData.user)) {
        console.error('═══════════════════════════════════════════════════════════');
        console.error('[AuthService] ❌ AKUN TIDAK LENGKAP');
        console.error('[AuthService] User terdaftar di Appwrite Auth tapi TIDAK ada di Database.');
        console.error('[AuthService] Data profil (umur, berat, tinggi, dll) tidak ditemukan.');
        console.error('[AuthService] → Mohon HAPUS akun ini dan DAFTAR ULANG saat online.');
        console.error(`[AuthService] User ID: ${authData.user.id}`);
        console.error(`[AuthService] Email: ${authData.user.email}`);
        console.error('═══════════════════════════════════════════════════════════');

        // Throw error so UI can handle it
        throw new Error(
          'Akun tidak lengkap: data profil tidak ditemukan di database. ' +
          'Mohon hapus akun dan daftar ulang saat online.'
        );
      }

      // 3. Trigger sync on login if enabled
      if (this.config.syncOnLogin) {
        this.triggerLoginSync(authData.token);
      }

      return authData;
    } catch (error) {
      console.error('[AuthService] Login failed:', error);
      throw error;
    }
  }

  /**
   * ✅ REFACTORED: Logout user
   */
  async logout(token?: string): Promise<void> {
    try {
      // 1. ALWAYS logout locally first
      await authOfflineAPI.logout();
      console.log('[AuthService] ✅ User logged out locally');

      // 2. Queue logout notification for server via SyncManager
      if (token) {
        try {
          const syncManager = getSyncManager();
          await syncManager.sync('auth', {
            action: 'logout',
            token,
          });
          console.log('[AuthService] 📋 Logout notification queued');
        } catch (syncErr) {
          console.warn('[AuthService] Failed to queue logout notification:', syncErr);
        }
      }
    } catch (error) {
      console.error('[AuthService] Logout failed:', error);
      throw error;
    }
  }

  /**
   * ✅ UPDATED: Get current user (with DB document validation)
   * 
   * ALWAYS reads from local storage (fastest, most reliable).
   * Now also checks if the user has a valid DB document.
   * Returns null if user data is incomplete (missing DB document).
   */
  async getCurrentUser(): Promise<AuthResponse | null> {
    try {
      const authData = await authOfflineAPI.getCurrentUser();
      
      if (!authData) {
        return null;
      }

      // ✅ Validate that user has a DB document (not just Auth account)
      if (this.isUserMissingDbDocument(authData.user)) {
        console.warn('──────────────────────────────────────────────────────');
        console.warn('[AuthService] ⚠️ AKUN TIDAK LENGKAP TERDETEKSI');
        console.warn('[AuthService] User ada di Auth tapi TIDAK di Database.');
        console.warn(`[AuthService] User: ${authData.user.email} (${authData.user.id})`);
        console.warn('[AuthService] → Hapus akun dan daftar ulang saat online.');
        console.warn('──────────────────────────────────────────────────────');
        
        // Return null — treat as unauthenticated
        // This prevents downstream errors like "User not authenticated" in mealService
        return null;
      }

      return authData;
    } catch (error) {
      console.error('[AuthService] Failed to get current user:', error);
      return null;
    }
  }

  /**
   * ✅ UNCHANGED: Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const authData = await this.getCurrentUser();
    return authData !== null;
  }

  /**
   * ✅ REFACTORED: Update user profile
   */
  async updateUser(
    userId: string,
    userData: UpdateUserRequest,
    token: string
  ): Promise<AuthResponse> {
    try {
      // 1. ALWAYS update locally first (instant success)
      const authData = await authOfflineAPI.updateUser(userId, userData, token);
      console.log('[AuthService] ✅ User profile updated locally');

      // 2. Queue for background sync via SyncManager
      try {
        const syncManager = getSyncManager();
        await syncManager.sync('auth', {
          action: 'updateProfile',
          userId,
          userData,
          token,
        });
        console.log('[AuthService] 📋 Profile update queued for sync');
      } catch (syncErr) {
        console.warn('[AuthService] Failed to queue sync, will retry later:', syncErr);
      }

      return authData;
    } catch (error) {
      console.error('[AuthService] Update failed:', error);
      throw error;
    }
  }

  /**
   * ✅ REFACTORED: Delete user account
   */
  async deleteAccount(userId: string, token?: string): Promise<void> {
    try {
      // 1. ALWAYS delete locally first
      await authOfflineAPI.deleteAccount(userId);
      console.log('[AuthService] ✅ User account deleted locally');

      // 2. Queue deletion notification via SyncManager
      if (token) {
        try {
          const syncManager = getSyncManager();
          await syncManager.sync('auth', {
            action: 'deleteAccount',
            userId,
            token,
          });
          console.log('[AuthService] 📋 Account deletion queued for sync');
        } catch (syncErr) {
          console.warn('[AuthService] Failed to queue deletion sync:', syncErr);
        }
      }
    } catch (error) {
      console.error('[AuthService] Account deletion failed:', error);
      throw error;
    }
  }

  /**
   * ✅ REFACTORED: Change password
   */
  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
    token?: string
  ): Promise<void> {
    try {
      // 1. ALWAYS change locally first
      await authOfflineAPI.changePassword(userId, oldPassword, newPassword);
      console.log('[AuthService] ✅ Password changed locally');

      // 2. Queue for background sync via SyncManager
      if (token) {
        try {
          const syncManager = getSyncManager();
          await syncManager.sync('auth', {
            action: 'changePassword',
            userId,
            oldPassword,
            newPassword,
            token,
          });
          console.log('[AuthService] 📋 Password change queued for sync');
        } catch (syncErr) {
          console.warn('[AuthService] Failed to queue password sync:', syncErr);
        }
      }
    } catch (error) {
      console.error('[AuthService] Password change failed:', error);
      throw error;
    }
  }

  /**
   * ✅ UNCHANGED: Check if email is available (HYBRID)
   */
  async checkEmailAvailable(email: string): Promise<boolean> {
    try {
      if (this.isOnline) {
        try {
          return await authOnlineAPI.checkEmailAvailable(email);
        } catch (error) {
          console.warn('[AuthService] Online email check failed, using local');
        }
      }
      return await authOfflineAPI.checkEmailAvailable(email);
    } catch (error) {
      console.error('[AuthService] Email availability check failed:', error);
      return false;
    }
  }

  /**
   * ✅ UNCHANGED: Verify token (ONLINE-ONLY)
   */
  async verifyToken(token: string): Promise<AuthResponse> {
    try {
      if (!this.isOnline) {
        throw new Error('Cannot verify token offline');
      }
      return await authOnlineAPI.verifyToken(token);
    } catch (error) {
      console.error('[AuthService] Token verification failed:', error);
      throw error;
    }
  }

  /**
   * ✅ UNCHANGED: Refresh token (ONLINE-ONLY)
   */
  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    try {
      if (!this.isOnline) {
        throw new Error('Cannot refresh token offline');
      }
      return await authOnlineAPI.refreshToken(refreshToken);
    } catch (error) {
      console.error('[AuthService] Token refresh failed:', error);
      throw error;
    }
  }

  // ===========================================================================
  // SYNC OPERATIONS (REFACTORED - Using SyncManager)
  // ===========================================================================

  /**
   * ✅ Trigger sync on login
   */
  private triggerLoginSync(token: string): void {
    try {
      const syncManager = getSyncManager();
      
      syncManager.syncType('auth').then(result => {
        if (result.success) {
          console.log(`[AuthService] ✅ Login sync complete - ${result.processedCount} items synced`);
        } else {
          console.warn(`[AuthService] ⚠️ Login sync had errors - ${result.failedCount} failed`);
        }
      }).catch(error => {
        console.error('[AuthService] Login sync failed:', error);
      });
    } catch (error) {
      console.error('[AuthService] Failed to trigger login sync:', error);
    }
  }

  /**
   * ✅ REFACTORED: Manually sync pending updates
   */
  async syncPendingUpdates(token: string): Promise<{
    success: boolean;
    syncedCount: number;
    errors: string[];
  }> {
    try {
      const isOnline = await this.checkNetwork();

      if (!isOnline) {
        return { success: false, syncedCount: 0, errors: ['Device is offline'] };
      }

      const syncManager = getSyncManager();
      const result = await syncManager.syncType('auth');

      return {
        success: result.success,
        syncedCount: result.processedCount,
        errors: result.errors.map(e => e.error),
      };
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
   * ✅ REFACTORED: Manually sync user profile
   */
  async syncUserProfile(token: string): Promise<boolean> {
    try {
      const isOnline = await this.checkNetwork();

      if (!isOnline) {
        console.warn('[AuthService] Cannot sync profile - device is offline');
        return false;
      }

      const serverProfile = await authOnlineAPI.verifyToken(token);
      await authOfflineAPI.saveUserFromServer(serverProfile.user);
      
      console.log('[AuthService] ✅ Profile synced from server');
      return true;
    } catch (error) {
      console.error('[AuthService] Failed to sync user profile:', error);
      return false;
    }
  }

  /**
   * ✅ REFACTORED: Get pending updates count
   */
  async getPendingUpdatesCount(): Promise<number> {
    try {
      const syncManager = getSyncManager();
      return await syncManager.getPendingCount('auth');
    } catch (error) {
      console.error('[AuthService] Failed to get pending updates count:', error);
      return 0;
    }
  }

  /**
   * ✅ REFACTORED: Force sync all pending data
   */
  async forceSyncAll(token: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const isOnline = await this.checkNetwork();

      if (!isOnline) {
        return { success: false, message: 'Device is offline - cannot sync' };
      }

      const syncManager = getSyncManager();
      const result = await syncManager.syncType('auth');
      await this.syncUserProfile(token);

      return {
        success: result.success,
        message: result.success
          ? `Successfully synced ${result.processedCount} updates`
          : `Sync completed with ${result.failedCount} errors`,
      };
    } catch (error) {
      console.error('[AuthService] Force sync failed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ===========================================================================
  // STATUS & DIAGNOSTICS (REFACTORED)
  // ===========================================================================

  async getSyncStatus(): Promise<{
    isOnline: boolean;
    pendingUpdates: number;
    syncManagerStatus: any;
  }> {
    const isOnline = await this.checkNetwork();
    const pendingUpdates = await this.getPendingUpdatesCount();

    let syncManagerStatus = null;
    try {
      const syncManager = getSyncManager();
      syncManagerStatus = await syncManager.getStatus();
    } catch (error) {
      console.warn('[AuthService] Could not get SyncManager status:', error);
    }

    return { isOnline, pendingUpdates, syncManagerStatus };
  }

  async getSyncDiagnostics(): Promise<any> {
    try {
      const syncManager = getSyncManager();
      return await syncManager.exportDiagnostics();
    } catch (error) {
      console.error('[AuthService] Failed to get diagnostics:', error);
      return null;
    }
  }

  pauseSync(): void {
    try {
      const syncManager = getSyncManager();
      syncManager.pauseSync();
      console.log('[AuthService] Sync paused');
    } catch (error) {
      console.error('[AuthService] Failed to pause sync:', error);
    }
  }

  resumeSync(): void {
    try {
      const syncManager = getSyncManager();
      syncManager.resumeSync();
      console.log('[AuthService] Sync resumed');
    } catch (error) {
      console.error('[AuthService] Failed to resume sync:', error);
    }
  }

  // ===========================================================================
  // CONFIGURATION
  // ===========================================================================

  setConfig(config: Partial<AuthServiceConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('[AuthService] Config updated:', this.config);
  }

  getConfig(): AuthServiceConfig {
    return { ...this.config };
  }

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