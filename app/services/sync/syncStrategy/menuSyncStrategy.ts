/**
 * menuSyncStrategy.ts (APPWRITE VERSION)
 * ---------------------------------------------------------------------------
 * Sync strategy untuk menu data dengan OFFLINE-FIRST approach using Appwrite.
 * 
 * Changes from original:
 * • ✅ Sync dengan Appwrite Databases instead of REST API
 * • ✅ Incremental sync menggunakan $updatedAt timestamps
 * • ✅ Real-time sync capability (optional)
 * • ✅ Efficient queries dengan Appwrite Query helpers
 * 
 * Features:
 * • Background sync tanpa blocking UI
 * • Incremental sync dengan timestamp
 * • Smart conflict resolution (server always wins for menu)
 * • Automatic retry dengan exponential backoff
 * ---------------------------------------------------------------------------
 */

import { SyncPayload } from '@/app/services/sync/syncQueue';
import { SyncStrategy } from '@/app/services/sync/syncManager';
import menuOnlineAPI from '@/app/services/menu/menuOnlineAPI';
import menuOfflineAPI from '@/app/services/menu/menuOfflineAPI';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MenuSyncData {
  type: 'cache_update' | 'full_sync';
  lastSyncTime?: string;
  forceRefresh?: boolean;
  silent?: boolean; // For background sync
}

// ---------------------------------------------------------------------------
// Menu Sync Strategy (OFFLINE-FIRST with Appwrite)
// ---------------------------------------------------------------------------

export class MenuSyncStrategy implements SyncStrategy {
  /**
   * Prepare menu sync payload
   */
  async prepare(data: MenuSyncData): Promise<SyncPayload> {
    // Get last sync time if not provided
    const lastSyncTime = data.lastSyncTime || await menuOfflineAPI.getLastSync();
    
    const payload: SyncPayload = {
      id: `menu_sync_${Date.now()}`,
      type: 'meal',
      data: {
        ...data,
        lastSyncTime: data.forceRefresh ? undefined : lastSyncTime,
      },
      priority: data.silent ? 5 : 3, // Lower priority for background sync
      retryCount: 0,
      maxRetries: data.silent ? 2 : 3, // Fewer retries for background sync
      createdAt: new Date().toISOString(),
    };

    console.log('[MenuSyncStrategy] Prepared sync payload:', {
      id: payload.id,
      type: data.type,
      silent: data.silent,
      forceRefresh: data.forceRefresh,
    });

    return payload;
  }

  /**
   * Upload/Sync menu data with Appwrite
   */
  async upload(payload: SyncPayload): Promise<any> {
    const data = payload.data as MenuSyncData;

    try {
      if (!data.silent) {
        console.log('[MenuSyncStrategy] Starting menu sync...');
      }

      // Fetch updates from Appwrite (incremental if lastSyncTime exists)
      // Appwrite handles incremental sync via $updatedAt queries
      const syncResult = await menuOnlineAPI.syncMenuCache(
        data.forceRefresh ? undefined : data.lastSyncTime || undefined
      );

      console.log(
        `[MenuSyncStrategy] Received ${syncResult.updated.length} updates, ` +
        `${syncResult.deleted.length} deletions`
      );

      return syncResult;
    } catch (error) {
      if (!data.silent) {
        console.error('[MenuSyncStrategy] Upload failed:', error);
      }
      throw error;
    }
  }

  /**
   * Handle successful sync (OFFLINE-FIRST: Update cache efficiently)
   */
  async onSuccess(result: any, payload: SyncPayload): Promise<void> {
    const data = payload.data as MenuSyncData;

    try {
      if (!data.silent) {
        console.log('[MenuSyncStrategy] Processing sync results...');
      }

      const { updated, deleted, timestamp } = result;

      // Skip processing if no changes
      if ((!updated || updated.length === 0) && (!deleted || deleted.length === 0)) {
        console.log('[MenuSyncStrategy] No changes to process');
        await menuOfflineAPI.updateLastSync();
        return;
      }

      // STEP 1: Get current cached data
      const currentItems = await menuOfflineAPI.fetchMenuItems();
      const currentDetailsData = await menuOfflineAPI.fetchMultipleFoodDetails(
        currentItems.map(i => i.id)
      );

      // STEP 2: Create details map for efficient updates
      const detailsMap: Record<string, any> = {};
      currentDetailsData.forEach(detail => {
        detailsMap[detail.id] = detail;
      });

      // STEP 3: Apply updates from Appwrite
      if (updated && updated.length > 0) {
        for (const item of updated) {
          detailsMap[item.id] = item;
        }
        console.log(`[MenuSyncStrategy] Applied ${updated.length} updates from Appwrite`);
      }

      // STEP 4: Apply deletions (if any)
      // Note: Appwrite soft-delete would need custom implementation
      if (deleted && deleted.length > 0) {
        for (const itemId of deleted) {
          delete detailsMap[itemId];
        }
        console.log(`[MenuSyncStrategy] Applied ${deleted.length} deletions`);
      }

      // STEP 5: Convert to items list
      const updatedItems = Object.values(detailsMap).map((detail: any) => ({
        id: detail.id,
        foodName: detail.foodName,
        description: detail.description,
        imageUrl: detail.imageUrl,
        category: detail.category,
      }));

      // STEP 6: Batch save to local storage
      await Promise.all([
        menuOfflineAPI.saveMenuItems(updatedItems),
        menuOfflineAPI.saveMenuDetails(detailsMap),
        menuOfflineAPI.updateLastSync(),
      ]);

      console.log('[MenuSyncStrategy] Cache updated successfully:', {
        totalItems: updatedItems.length,
        updated: updated?.length || 0,
        deleted: deleted?.length || 0,
      });
    } catch (error) {
      console.error('[MenuSyncStrategy] Success handler failed:', error);
      throw error;
    }
  }

  /**
   * Handle sync failure (OFFLINE-FIRST: Fail gracefully)
   */
  async onFailure(error: Error, payload: SyncPayload): Promise<void> {
    const data = payload.data as MenuSyncData;

    // Only log if not silent
    if (!data.silent) {
      console.error('[MenuSyncStrategy] Sync failed:', error.message);
    }

    // Log failure for analytics/debugging
    const failureLog = {
      timestamp: new Date().toISOString(),
      payloadId: payload.id,
      error: error.message,
      retryCount: payload.retryCount,
      silent: data.silent,
    };

    console.log('[MenuSyncStrategy] Failure logged:', failureLog);

    // Don't throw - let sync manager handle retry logic
    // In offline-first, failed sync doesn't break the app
  }

  /**
   * Validate sync data
   */
  validate(data: any): boolean {
    if (!data || typeof data !== 'object') {
      console.error('[MenuSyncStrategy] Invalid data: not an object');
      return false;
    }

    const menuData = data as MenuSyncData;

    // Validate sync type
    if (!menuData.type || !['cache_update', 'full_sync'].includes(menuData.type)) {
      console.error('[MenuSyncStrategy] Invalid sync type');
      return false;
    }

    // Validate lastSyncTime if provided
    if (menuData.lastSyncTime && isNaN(Date.parse(menuData.lastSyncTime))) {
      console.error('[MenuSyncStrategy] Invalid lastSyncTime format');
      return false;
    }

    return true;
  }

  /**
   * Get priority (lower for background sync)
   */
  getPriority(): number {
    return 3;
  }

  /**
   * Get max retries
   */
  getMaxRetries(): number {
    return 3;
  }
}

// ---------------------------------------------------------------------------
// Helper Functions (OFFLINE-FIRST with Appwrite)
// ---------------------------------------------------------------------------

/**
 * Trigger menu sync (background, non-blocking)
 */
export const triggerMenuSync = async (
  forceRefresh: boolean = false,
  silent: boolean = true
): Promise<boolean> => {
  try {
    const strategy = new MenuSyncStrategy();

    const syncData: MenuSyncData = {
      type: forceRefresh ? 'full_sync' : 'cache_update',
      forceRefresh,
      silent,
    };

    // Validate
    if (!strategy.validate(syncData)) {
      throw new Error('Invalid sync data');
    }

    // Prepare payload
    const payload = await strategy.prepare(syncData);

    // Execute sync
    const result = await strategy.upload(payload);

    // Handle success
    await strategy.onSuccess(result, payload);

    if (!silent) {
      console.log('[MenuSyncStrategy] Sync completed successfully');
    }

    return true;
  } catch (error) {
    if (!silent) {
      console.error('[MenuSyncStrategy] Trigger sync failed:', error);
    }
    return false;
  }
};

/**
 * Check if menu cache needs sync
 */
export const needsMenuSync = async (
  maxAgeHours: number = 24
): Promise<boolean> => {
  try {
    const lastSync = await menuOfflineAPI.getLastSync();

    // No previous sync = needs sync
    if (!lastSync) {
      return true;
    }

    const lastSyncTime = new Date(lastSync).getTime();
    const now = Date.now();
    const ageHours = (now - lastSyncTime) / (1000 * 60 * 60);

    const needsSync = ageHours >= maxAgeHours;

    return needsSync;
  } catch (error) {
    console.error('[MenuSyncStrategy] Error checking sync status:', error);
    return true; // Sync on error to be safe
  }
};

/**
 * Get menu sync status
 */
export const getMenuSyncStatus = async (): Promise<{
  hasCachedData: boolean;
  lastSync: string | null;
  cacheAge: number | null;
  needsSync: boolean;
  strategy: string;
}> => {
  try {
    const hasCachedData = await menuOfflineAPI.hasCachedData();
    const lastSync = await menuOfflineAPI.getLastSync();

    let cacheAge: number | null = null;
    if (lastSync) {
      const lastSyncTime = new Date(lastSync).getTime();
      cacheAge = Math.floor((Date.now() - lastSyncTime) / (1000 * 60 * 60)); // hours
    }

    const needsSync = await needsMenuSync();

    return {
      hasCachedData,
      lastSync,
      cacheAge,
      needsSync,
      strategy: 'offline-first-appwrite',
    };
  } catch (error) {
    console.error('[MenuSyncStrategy] Error getting sync status:', error);
    return {
      hasCachedData: false,
      lastSync: null,
      cacheAge: null,
      needsSync: true,
      strategy: 'offline-first-appwrite',
    };
  }
};

/**
 * Initialize first-time cache (for new installations)
 */
export const initializeCache = async (): Promise<boolean> => {
  try {
    const hasCachedData = await menuOfflineAPI.hasCachedData();
    
    if (hasCachedData) {
      console.log('[MenuSyncStrategy] Cache already initialized');
      return true;
    }

    console.log('[MenuSyncStrategy] Initializing cache for first time from Appwrite...');
    
    // Try to sync from Appwrite
    const success = await triggerMenuSync(true, false);
    
    if (success) {
      console.log('[MenuSyncStrategy] Cache initialized from Appwrite');
      return true;
    }

    // If sync fails, fallback data will be used by menuOfflineAPI
    console.log('[MenuSyncStrategy] Using fallback data');
    return false;
  } catch (error) {
    console.error('[MenuSyncStrategy] Failed to initialize cache:', error);
    return false;
  }
};

/**
 * Enable real-time sync (Appwrite Realtime)
 * This is OPTIONAL and can be enabled for premium features
 */
export const enableRealtimeSync = async (): Promise<() => void> => {
  try {
    console.log('[MenuSyncStrategy] Enabling real-time sync...');

    // Note: Would need to import Appwrite client and setup subscription
    // Example:
    // const unsubscribe = client.subscribe(
    //   `databases.${DATABASE_ID}.collections.${COLLECTIONS.MENU_ITEMS}.documents`,
    //   response => {
    //     console.log('[MenuSyncStrategy] Real-time update received');
    //     triggerMenuSync(false, true); // Silent background sync
    //   }
    // );

    // For now, return a no-op unsubscribe function
    return () => {
      console.log('[MenuSyncStrategy] Real-time sync disabled');
    };
  } catch (error) {
    console.error('[MenuSyncStrategy] Failed to enable real-time sync:', error);
    return () => {};
  }
};

// Export singleton instance
export default new MenuSyncStrategy();