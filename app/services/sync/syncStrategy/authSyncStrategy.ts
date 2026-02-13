/**
 * authSyncStrategy.ts (APPWRITE VERSION)
 * ---------------------------------------------------------------------------
 * Sync strategy untuk authentication dan user data dengan Appwrite.
 * 
 * Changes from original:
 * • ✅ Adjusted untuk Appwrite session-based auth
 * • ✅ Sync user documents to Appwrite Databases
 * • ✅ Handle profile updates via Appwrite Account + Databases
 * • ✅ Conflict resolution dengan server priority
 * 
 * Features:
 * • User profile synchronization
 * • Offline registration sync
 * • Profile update sync
 * • Appwrite-compatible data handling
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
  action: 
    | 'register' 
    | 'updateProfile'
    | 'changePassword'
    | 'logout'
    | 'deleteAccount';
  
  // For different actions
  userId?: string;
  token?: string;
  
  // register
  registerData?: RegisterRequest;
  
  // updateProfile
  userData?: UpdateUserRequest;
  
  // changePassword
  oldPassword?: string;
  newPassword?: string;
}

// Add result types
interface RegisterSyncResult {
  action: 'register';
  user: User;
  token: string;
  note?: string;
}

interface UpdateProfileSyncResult {
  action: 'updateProfile';
  user: User;
  token: string;
}

interface PasswordChangeSyncResult {
  action: 'changePassword';
  userId: string;
}

interface LogoutSyncResult {
  action: 'logout';
}

interface DeleteAccountSyncResult {
  action: 'deleteAccount';
  userId: string;
}

type AuthSyncResult = 
  | RegisterSyncResult 
  | UpdateProfileSyncResult 
  | PasswordChangeSyncResult 
  | LogoutSyncResult 
  | DeleteAccountSyncResult;

// ---------------------------------------------------------------------------
// Auth Sync Strategy (Appwrite)
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
   * Upload/Sync auth data with Appwrite
   */
  async upload(payload: SyncPayload): Promise<AuthSyncResult> {
    const data = payload.data as AuthSyncData;

    try {
      console.log('[AuthSyncStrategy] Starting auth sync for action:', data.action);

      switch (data.action) {
        case 'register':
          return await this.syncRegistration(data);

        case 'updateProfile':
          return await this.syncProfileUpdate(data);

        case 'changePassword':
          return await this.syncPasswordChange(data);

        case 'logout':
          return await this.syncLogout(data);

        case 'deleteAccount':
          return await this.syncAccountDeletion(data);

        default:
          throw new Error(`Unknown auth sync action: ${data.action}`);
      }
    } catch (error) {
      console.error('[AuthSyncStrategy] Upload failed:', error);
      throw error;
    }
  }

  /**
   * Sync offline registration to Appwrite
   */
  private async syncRegistration(data: AuthSyncData): Promise<RegisterSyncResult> {
    if (!data.registerData) {
      throw new Error('Register data is required');
    }

    console.log('[AuthSyncStrategy] Syncing registration...');
    
    // Note: In Appwrite, registration creates both Account and Session
    // We need to check if user already exists first
    try {
      const result = await authOnlineAPI.register(data.registerData);
      
      return {
        action: 'register',
        user: result.user,
        token: result.token,
      };
    } catch (error: any) {
      // If email already exists, this is expected for offline-first
      if (error.message?.includes('already exists') || error.message?.includes('email')) {
        console.warn('[AuthSyncStrategy] User already registered on server');
        
        // Try to login instead
        const loginResult = await authOnlineAPI.login({
          email: data.registerData.email,
          password: data.registerData.password,
        });
        
        return {
          action: 'register',
          user: loginResult.user,
          token: loginResult.token,
          note: 'User already existed, logged in instead',
        };
      }
      
      throw error;
    }
  }

  /**
   * Sync profile update to Appwrite
   */
  private async syncProfileUpdate(data: AuthSyncData): Promise<UpdateProfileSyncResult> {
    if (!data.userId || !data.userData || !data.token) {
      throw new Error('userId, userData, and token are required');
    }

    console.log('[AuthSyncStrategy] Syncing profile update...');
    
    const result = await authOnlineAPI.updateUser(
      data.userId,
      data.userData,
      data.token
    );

    return {
      action: 'updateProfile',
      user: result.user,
      token: result.token,
    };
  }

  /**
   * Sync password change to Appwrite
   */
  private async syncPasswordChange(data: AuthSyncData): Promise<PasswordChangeSyncResult> {
    if (!data.userId || !data.oldPassword || !data.newPassword || !data.token) {
      throw new Error('All password change fields are required');
    }

    console.log('[AuthSyncStrategy] Syncing password change...');
    
    await authOnlineAPI.changePassword(
      data.userId,
      data.oldPassword,
      data.newPassword,
      data.token
    );

    return {
      action: 'changePassword',
      userId: data.userId,
    };
  }

  /**
   * Sync logout to Appwrite
   */
  private async syncLogout(data: AuthSyncData): Promise<LogoutSyncResult> {
    if (!data.token) {
      throw new Error('Token is required for logout');
    }

    console.log('[AuthSyncStrategy] Syncing logout...');
    
    await authOnlineAPI.logout(data.token);

    return {
      action: 'logout',
    };
  }

  /**
   * Sync account deletion to Appwrite
   */
  private async syncAccountDeletion(data: AuthSyncData): Promise<DeleteAccountSyncResult> {
    if (!data.userId || !data.token) {
      throw new Error('userId and token are required');
    }

    console.log('[AuthSyncStrategy] Syncing account deletion...');
    
    await authOnlineAPI.deleteAccount(data.userId, data.token);

    return {
      action: 'deleteAccount',
      userId: data.userId,
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

        case 'updateProfile':
          await this.handleUpdateSuccess(result, data);
          break;

        case 'changePassword':
          await this.handlePasswordChangeSuccess(data);
          break;

        case 'logout':
          await this.handleLogoutSuccess();
          break;

        case 'deleteAccount':
          await this.handleDeleteAccountSuccess();
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

    // Update local storage with Appwrite response
    // Appwrite may have different user ID format, timestamps, etc.
    await authOfflineAPI.saveUserFromServer(user);

    console.log('[AuthSyncStrategy] Registration synced successfully');
  }

  /**
   * Handle successful profile update sync
   */
  private async handleUpdateSuccess(result: any, data: AuthSyncData): Promise<void> {
    const { user } = result;

    // Update local storage with Appwrite response
    await authOfflineAPI.saveUserFromServer(user);

    // Clear pending update
    if (data.userId) {
      await authOfflineAPI.clearPendingUpdate(data.userId);
    }

    console.log('[AuthSyncStrategy] Profile update synced successfully');
  }

  /**
   * Handle successful password change sync
   */
  private async handlePasswordChangeSuccess(data: AuthSyncData): Promise<void> {
    console.log('[AuthSyncStrategy] Password change synced successfully');
    
    // Password is already updated locally by authOfflineAPI
    // No additional action needed
  }

  /**
   * Handle successful logout sync
   */
  private async handleLogoutSuccess(): Promise<void> {
    console.log('[AuthSyncStrategy] Logout synced successfully');
    
    // Local data already cleared by authService
    // No additional action needed
  }

  /**
   * Handle successful account deletion sync
   */
  private async handleDeleteAccountSuccess(): Promise<void> {
    console.log('[AuthSyncStrategy] Account deletion synced successfully');
    
    // Local data already cleared by authService
    // No additional action needed
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
    if (error.message.includes('already exists') || error.message.includes('email')) {
      console.warn('[AuthSyncStrategy] Registration conflict - email exists on Appwrite');
      // Could trigger conflict resolution here
    }

    if (error.message.includes('Unauthorized') || error.message.includes('401')) {
      console.warn('[AuthSyncStrategy] Session expired - need to re-login');
      // Could trigger re-authentication here
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
    const validActions = ['register', 'updateProfile', 'changePassword', 'logout', 'deleteAccount'];
    if (!authData.action || !validActions.includes(authData.action)) {
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

      case 'updateProfile':
        if (!authData.userId || !authData.userData || !authData.token) {
          console.error('[AuthSyncStrategy] userId, userData, and token required for update');
          return false;
        }
        break;

      case 'changePassword':
        if (!authData.userId || !authData.oldPassword || !authData.newPassword || !authData.token) {
          console.error('[AuthSyncStrategy] All password fields required');
          return false;
        }
        break;

      case 'logout':
        if (!authData.token) {
          console.error('[AuthSyncStrategy] Token required for logout');
          return false;
        }
        break;

      case 'deleteAccount':
        if (!authData.userId || !authData.token) {
          console.error('[AuthSyncStrategy] userId and token required for deletion');
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
          action: 'updateProfile',
          userId,
          userData: updateData,
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
 * Sync current user profile from Appwrite
 */
export const syncUserProfile = async (token: string): Promise<boolean> => {
  try {
    // Fetch from Appwrite
    const user = await authOnlineAPI.getCurrentUser(token);
    
    // Save to local storage
    await authOfflineAPI.saveUserFromServer(user);
    
    console.log('[AuthSyncStrategy] User profile synced from Appwrite');
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