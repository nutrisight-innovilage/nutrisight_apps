/**
 * menuSyncStrategy.ts
 * ---------------------------------------------------------------------------
 * Sync strategy untuk menu data.
 * Implements SyncStrategy interface dari syncManager.
 * 
 * Features:
 * • Menu cache synchronization
 * • Incremental sync dengan timestamp
 * • Bidirectional sync (upload & download)
 * • Conflict resolution
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
}

// ---------------------------------------------------------------------------
// Menu Sync Strategy
// ---------------------------------------------------------------------------

export class MenuSyncStrategy implements SyncStrategy {
  /**
   * Prepare menu sync payload
   */
  async prepare(data: MenuSyncData): Promise<SyncPayload> {
    const payload: SyncPayload = {
      id: `menu_sync_${Date.now()}`,
      type: 'meal', // Using 'meal' as closest match to menu
      data,
      priority: 3, // Medium priority
      retryCount: 0,
      maxRetries: 3,
      createdAt: new Date().toISOString(),
    };

    console.log('[MenuSyncStrategy] Prepared sync payload');
    return payload;
  }

  /**
   * Upload/Sync menu data with server
   */
  async upload(payload: SyncPayload): Promise<any> {
    const data = payload.data as MenuSyncData;

    try {
      console.log('[MenuSyncStrategy] Starting menu sync...');

      // Get last sync time from local storage or use provided
      const lastSyncTime = data.lastSyncTime || await menuOfflineAPI.getLastSync();

      // Fetch updates from server
      const syncResult = await menuOnlineAPI.syncMenuCache(
        data.forceRefresh ? undefined : lastSyncTime || undefined
      );

      console.log(
        `[MenuSyncStrategy] Received ${syncResult.updated.length} updates, ` +
        `${syncResult.deleted.length} deletions`
      );

      return syncResult;
    } catch (error) {
      console.error('[MenuSyncStrategy] Upload failed:', error);
      throw error;
    }
  }

  /**
   * Handle successful sync
   */
  async onSuccess(result: any, payload: SyncPayload): Promise<void> {
    try {
      console.log('[MenuSyncStrategy] Processing sync results...');

      const { updated, deleted, timestamp } = result;

      // Get current cached items
      const currentItems = await menuOfflineAPI.fetchMenuItems();
      const currentDetailsData = await menuOfflineAPI.fetchMultipleFoodDetails(
        currentItems.map(i => i.id)
      );

      // Create details map
      const detailsMap: Record<string, any> = {};
      currentDetailsData.forEach(detail => {
        detailsMap[detail.id] = detail;
      });

      // Process updates
      if (updated && updated.length > 0) {
        for (const item of updated) {
          // Add/update in details map
          detailsMap[item.id] = item;
        }
        console.log(`[MenuSyncStrategy] Processed ${updated.length} updates`);
      }

      // Process deletions
      if (deleted && deleted.length > 0) {
        for (const itemId of deleted) {
          delete detailsMap[itemId];
        }
        console.log(`[MenuSyncStrategy] Processed ${deleted.length} deletions`);
      }

      // Convert details map to items list
      const updatedItems = Object.values(detailsMap).map((detail: any) => ({
        id: detail.id,
        foodName: detail.foodName,
        description: detail.description,
        imageUrl: detail.imageUrl,
        category: detail.category,
      }));

      // Save to local storage
      await menuOfflineAPI.saveMenuItems(updatedItems);
      await menuOfflineAPI.saveMenuDetails(detailsMap);

      // Update last sync time
      await menuOfflineAPI.updateLastSync();

      console.log('[MenuSyncStrategy] Menu cache updated successfully');
    } catch (error) {
      console.error('[MenuSyncStrategy] Success handler failed:', error);
      throw error;
    }
  }

  /**
   * Handle sync failure
   */
  async onFailure(error: Error, payload: SyncPayload): Promise<void> {
    console.error('[MenuSyncStrategy] Sync failed:', error.message);

    // Log failure for analytics/debugging
    const failureLog = {
      timestamp: new Date().toISOString(),
      payloadId: payload.id,
      error: error.message,
      retryCount: payload.retryCount,
    };

    console.log('[MenuSyncStrategy] Failure logged:', failureLog);

    // Don't throw - let sync manager handle retry logic
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
   * Get priority for menu sync (medium priority)
   */
  getPriority(): number {
    return 3;
  }

  /**
   * Get max retries for menu sync
   */
  getMaxRetries(): number {
    return 3;
  }
}

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

/**
 * Trigger menu sync
 */
export const triggerMenuSync = async (
  forceRefresh: boolean = false
): Promise<boolean> => {
  try {
    const strategy = new MenuSyncStrategy();

    const syncData: MenuSyncData = {
      type: forceRefresh ? 'full_sync' : 'cache_update',
      forceRefresh,
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

    return true;
  } catch (error) {
    console.error('[MenuSyncStrategy] Trigger sync failed:', error);
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

    if (!lastSync) {
      console.log('[MenuSyncStrategy] No previous sync found');
      return true;
    }

    const lastSyncTime = new Date(lastSync).getTime();
    const now = Date.now();
    const ageHours = (now - lastSyncTime) / (1000 * 60 * 60);

    const needsSync = ageHours >= maxAgeHours;

    console.log(
      `[MenuSyncStrategy] Cache age: ${ageHours.toFixed(1)} hours, ` +
      `needs sync: ${needsSync}`
    );

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
    };
  } catch (error) {
    console.error('[MenuSyncStrategy] Error getting sync status:', error);
    return {
      hasCachedData: false,
      lastSync: null,
      cacheAge: null,
      needsSync: true,
    };
  }
};

// Export singleton instance
export default new MenuSyncStrategy();