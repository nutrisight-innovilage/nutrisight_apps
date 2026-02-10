/**
 * authSyncStrategy.ts
 * ---------------------------------------------------------------------------
 * Sync strategy untuk authentication dan user data.
 * Implements SyncStrategy interface dari syncManager.
 * 
 * Features:
 * • User profile synchronization
 * • Offline registration sync
 * • Profile update sync
 * • Conflict resolution dengan server priority
 * ---------------------------------------------------------------------------
 */

import { SyncPayload } from '@/app/services/sync/syncQueue';
import { SyncStrategy } from '@/app/services/sync/syncManager';
import authOnlineAPI from '@/app/services/auth/authOnlineAPI';
import authOfflineAPI from '@/app/services/auth/authOfflineAPI';
import { User, RegisterRequest, UpdateUserRequest } from '@/app/types/user';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuthSyncData {
  action: 'register' | 'update' | 'profile_sync';
  userId?: string;
  token?: string;
  registerData?: RegisterRequest;
  updateData?: UpdateUserRequest;
}

// ---------------------------------------------------------------------------
// Auth Sync Strategy
// ---------------------------------------------------------------------------

export class AuthSyncStrategy implements SyncStrategy {
  /**
   * Prepare auth sync payload
   */
  async prepare(data: AuthSyncData): Promise<SyncPayload> {
    const payload: SyncPayload = {
      id: `auth_sync_${Date.now()}`,
      type: 'auth',
      data,
      priority: 1, // High priority for auth
      retryCount: 0,
      maxRetries: 5, // More retries for important auth data
      createdAt: new Date().toISOString(),
    };

    console.log('[AuthSyncStrategy] Prepared sync payload for action:', data.action);
    return payload;
  }

  /**
   * Upload/Sync auth data with server
   */
  async upload(payload: SyncPayload): Promise<any> {
    const data = payload.data as AuthSyncData;

    try {
      console.log('[AuthSyncStrategy] Starting auth sync for action:', data.action);

      switch (data.action) {
        case 'register':
          return await this.syncRegistration(data);

        case 'update':
          return await this.syncProfileUpdate(data);

        case 'profile_sync':
          return await this.syncProfile(data);

        default:
          throw new Error(`Unknown auth sync action: ${data.action}`);
      }
    } catch (error) {
      console.error('[AuthSyncStrategy] Upload failed:', error);
      throw error;
    }
  }

  /**
   * Sync offline registration to server
   */
  private async syncRegistration(data: AuthSyncData): Promise<any> {
    if (!data.registerData) {
      throw new Error('Register data is required');
    }

    console.log('[AuthSyncStrategy] Syncing registration...');
    const result = await authOnlineAPI.register(data.registerData);
    
    return {
      action: 'register',
      user: result.user,
      token: result.token,
    };
  }

  /**
   * Sync profile update to server
   */
  private async syncProfileUpdate(data: AuthSyncData): Promise<any> {
    if (!data.userId || !data.updateData || !data.token) {
      throw new Error('userId, updateData, and token are required');
    }

    console.log('[AuthSyncStrategy] Syncing profile update...');
    const result = await authOnlineAPI.updateUser(
      data.userId,
      data.updateData,
      data.token
    );

    return {
      action: 'update',
      user: result.user,
      token: result.token,
    };
  }

  /**
   * Sync profile from server
   */
  private async syncProfile(data: AuthSyncData): Promise<any> {
    if (!data.token) {
      throw new Error('Token is required for profile sync');
    }

    console.log('[AuthSyncStrategy] Syncing profile from server...');
    const user = await authOnlineAPI.getCurrentUser(data.token);

    return {
      action: 'profile_sync',
      user,
    };
  }

  /**
   * Handle successful sync
   */
  async onSuccess(result: any, payload: SyncPayload): Promise<void> {
    try {
      const data = payload.data as AuthSyncData;
      console.log('[AuthSyncStrategy] Processing success for action:', data.action);

      switch (data.action) {
        case 'register':
          await this.handleRegistrationSuccess(result);
          break;

        case 'update':
          await this.handleUpdateSuccess(result, data);
          break;

        case 'profile_sync':
          await this.handleProfileSyncSuccess(result);
          break;
      }

      console.log('[AuthSyncStrategy] Success handler completed');
    } catch (error) {
      console.error('[AuthSyncStrategy] Success handler failed:', error);
      throw error;
    }
  }

  /**
   * Handle successful registration sync
   */
  private async handleRegistrationSuccess(result: any): Promise<void> {
    const { user, token } = result;

    // Update local storage with server response
    // Server may have assigned a real ID, timestamps, etc.
    await authOfflineAPI.saveUserFromServer(user);

    console.log('[AuthSyncStrategy] Registration synced successfully');
  }

  /**
   * Handle successful profile update sync
   */
  private async handleUpdateSuccess(result: any, data: AuthSyncData): Promise<void> {
    const { user } = result;

    // Update local storage with server response
    await authOfflineAPI.saveUserFromServer(user);

    // Clear pending update
    if (data.userId) {
      await authOfflineAPI.clearPendingUpdate(data.userId);
    }

    console.log('[AuthSyncStrategy] Profile update synced successfully');
  }

  /**
   * Handle successful profile sync from server
   */
  private async handleProfileSyncSuccess(result: any): Promise<void> {
    const { user } = result;

    // Save server profile to local storage
    await authOfflineAPI.saveUserFromServer(user);

    console.log('[AuthSyncStrategy] Profile synced from server successfully');
  }

  /**
   * Handle sync failure
   */
  async onFailure(error: Error, payload: SyncPayload): Promise<void> {
    const data = payload.data as AuthSyncData;
    
    console.error(
      `[AuthSyncStrategy] Sync failed for action ${data.action}:`,
      error.message
    );

    // Log failure for analytics/debugging
    const failureLog = {
      timestamp: new Date().toISOString(),
      action: data.action,
      payloadId: payload.id,
      error: error.message,
      retryCount: payload.retryCount,
    };

    console.log('[AuthSyncStrategy] Failure logged:', failureLog);

    // Special handling for different errors
    if (error.message.includes('Email already registered')) {
      console.warn('[AuthSyncStrategy] Registration conflict - email exists on server');
      // Could trigger conflict resolution here
    }

    // Don't throw - let sync manager handle retry logic
  }

  /**
   * Validate sync data
   */
  validate(data: any): boolean {
    if (!data || typeof data !== 'object') {
      console.error('[AuthSyncStrategy] Invalid data: not an object');
      return false;
    }

    const authData = data as AuthSyncData;

    // Validate action
    if (!authData.action || !['register', 'update', 'profile_sync'].includes(authData.action)) {
      console.error('[AuthSyncStrategy] Invalid action');
      return false;
    }

    // Validate based on action
    switch (authData.action) {
      case 'register':
        if (!authData.registerData) {
          console.error('[AuthSyncStrategy] Register data required for register action');
          return false;
        }
        break;

      case 'update':
        if (!authData.userId || !authData.updateData || !authData.token) {
          console.error('[AuthSyncStrategy] userId, updateData, and token required for update');
          return false;
        }
        break;

      case 'profile_sync':
        if (!authData.token) {
          console.error('[AuthSyncStrategy] Token required for profile sync');
          return false;
        }
        break;
    }

    return true;
  }

  /**
   * Get priority for auth sync (highest priority)
   */
  getPriority(): number {
    return 1;
  }

  /**
   * Get max retries for auth sync
   */
  getMaxRetries(): number {
    return 5; // More retries for critical auth data
  }
}

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

/**
 * Sync pending profile updates
 */
export const syncPendingProfileUpdates = async (
  token: string
): Promise<{
  success: boolean;
  syncedCount: number;
  errors: string[];
}> => {
  try {
    const strategy = new AuthSyncStrategy();
    const pendingUpdates = await authOfflineAPI.getPendingUpdates();

    const results = {
      success: true,
      syncedCount: 0,
      errors: [] as string[],
    };

    for (const [userId, updateData] of Object.entries(pendingUpdates)) {
      try {
        const syncData: AuthSyncData = {
          action: 'update',
          userId,
          updateData,
          token,
        };

        const payload = await strategy.prepare(syncData);
        const result = await strategy.upload(payload);
        await strategy.onSuccess(result, payload);

        results.syncedCount += 1;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(`User ${userId}: ${errorMsg}`);
        results.success = false;
      }
    }

    console.log(
      `[AuthSyncStrategy] Synced ${results.syncedCount} pending updates, ` +
      `${results.errors.length} errors`
    );

    return results;
  } catch (error) {
    console.error('[AuthSyncStrategy] Failed to sync pending updates:', error);
    return {
      success: false,
      syncedCount: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
};

/**
 * Sync current user profile from server
 */
export const syncUserProfile = async (token: string): Promise<boolean> => {
  try {
    const strategy = new AuthSyncStrategy();

    const syncData: AuthSyncData = {
      action: 'profile_sync',
      token,
    };

    if (!strategy.validate(syncData)) {
      throw new Error('Invalid sync data');
    }

    const payload = await strategy.prepare(syncData);
    const result = await strategy.upload(payload);
    await strategy.onSuccess(result, payload);

    return true;
  } catch (error) {
    console.error('[AuthSyncStrategy] Failed to sync user profile:', error);
    return false;
  }
};

/**
 * Check if there are pending auth updates
 */
export const hasPendingAuthUpdates = async (): Promise<boolean> => {
  try {
    const pendingUpdates = await authOfflineAPI.getPendingUpdates();
    return Object.keys(pendingUpdates).length > 0;
  } catch (error) {
    console.error('[AuthSyncStrategy] Error checking pending updates:', error);
    return false;
  }
};

/**
 * Get auth sync status
 */
export const getAuthSyncStatus = async (): Promise<{
  pendingUpdatesCount: number;
  pendingUserIds: string[];
}> => {
  try {
    const pendingUpdates = await authOfflineAPI.getPendingUpdates();

    return {
      pendingUpdatesCount: Object.keys(pendingUpdates).length,
      pendingUserIds: Object.keys(pendingUpdates),
    };
  } catch (error) {
    console.error('[AuthSyncStrategy] Error getting sync status:', error);
    return {
      pendingUpdatesCount: 0,
      pendingUserIds: [],
    };
  }
};

// Export singleton instance
export default new AuthSyncStrategy();