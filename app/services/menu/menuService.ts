/**
 * menuService.ts (FIXED - Pagination + Timeout)
 * ---------------------------------------------------------------------------
 * ADDITIONAL FIXES on top of race condition fixes:
 * • ✅ FIX #5: Increased sync timeout (30s → 120s) for large datasets
 * • ✅ FIX #6: Poll interval increased to reduce CPU during long syncs
 * ---------------------------------------------------------------------------
 */

import NetInfo from '@react-native-community/netinfo';
import { FoodItem, FoodItemDetail } from '@/app/types/food';
import menuOnlineAPI from '@/app/services/menu/menuOnlineAPI';
import menuOfflineAPI from '@/app/services/menu/menuOfflineAPI';
import { getSyncManager } from '@/app/services/sync/syncManager';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MenuServiceConfig {
  autoSync: boolean;
  syncInterval: number; // hours
  offlineFirst: boolean;
}

type SyncListener = (success: boolean) => void;

// ---------------------------------------------------------------------------
// Menu Service Class
// ---------------------------------------------------------------------------

class MenuService {
  private config: MenuServiceConfig = {
    autoSync: true,
    syncInterval: 24,
    offlineFirst: true,
  };

  private detailsCache: Record<string, FoodItemDetail> = {};
  private isOnline: boolean = false;
  private syncListeners: SyncListener[] = [];
  private syncPromise: Promise<boolean> | null = null;

  constructor() {
    this.setupNetworkListener();
    this.initializeOfflineFirst();
  }

  // ===========================================================================
  // SYNC LISTENER API
  // ===========================================================================

  addSyncListener(listener: SyncListener): () => void {
    this.syncListeners.push(listener);
    return () => {
      this.syncListeners = this.syncListeners.filter(l => l !== listener);
    };
  }

  private notifySyncListeners(success: boolean): void {
    console.log(`[MenuService] 📢 Notifying ${this.syncListeners.length} listener(s), success=${success}`);
    this.syncListeners.forEach(listener => {
      try {
        listener(success);
      } catch (error) {
        console.error('[MenuService] Listener error:', error);
      }
    });
  }

  // ===========================================================================
  // INITIALIZATION
  // ===========================================================================

  private async initializeOfflineFirst(): Promise<void> {
    try {
      const hasCachedData = await menuOfflineAPI.hasCachedData();
      
      if (!hasCachedData) {
        console.log('[MenuService] No cache found, will sync when online');
      }

      const isOnline = await this.checkNetwork();
      if (isOnline && await this.needsSync()) {
        this.queueBackgroundSync();
      }
    } catch (error) {
      console.error('[MenuService] Failed to initialize offline-first:', error);
    }
  }

  private setupNetworkListener(): void {
    NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected ?? false;

      console.log(`[MenuService] Network: ${this.isOnline ? 'ONLINE' : 'OFFLINE'}`);

      if (wasOffline && this.isOnline && this.config.autoSync) {
        console.log('[MenuService] Network restored, queueing background sync');
        this.queueBackgroundSync();
      }
    });
  }

  private async checkNetwork(): Promise<boolean> {
    const state = await NetInfo.fetch();
    this.isOnline = state.isConnected ?? false;
    return this.isOnline;
  }

  private async needsSync(): Promise<boolean> {
    try {
      const lastSync = await menuOfflineAPI.getLastSync();
      
      if (!lastSync) {
        return true;
      }

      const lastSyncTime = new Date(lastSync).getTime();
      const hoursSinceSync = (Date.now() - lastSyncTime) / (1000 * 60 * 60);
      
      return hoursSinceSync >= this.config.syncInterval;
    } catch (error) {
      console.error('[MenuService] Failed to check sync status:', error);
      return false;
    }
  }

  // ===========================================================================
  // ✅ FIX #5 & #6: CORE SYNC EXECUTION (increased timeout)
  // ===========================================================================

  private async executeSync(forceRefresh: boolean, silent: boolean): Promise<boolean> {
    try {
      const syncManager = getSyncManager();

      await syncManager.sync('menu', {
        type: forceRefresh ? 'full_sync' : 'cache_update',
        forceRefresh,
        silent,
      });

      // ✅ FIX #5: 120s timeout for large datasets (was 30s)
      // Syncing thousands of items takes time, especially on slow connections
      const timeout = forceRefresh ? 180000 : 120000; // 3min for force, 2min for normal
      const success = await this.waitForSyncComplete(timeout);
      // ✅ FIX: "no changes" bukan berarti gagal — cek apakah cache ada isi
      const hasData = (await menuOfflineAPI.fetchMenuItems()).length > 0;
      this.notifySyncListeners(success || hasData);

      return success || hasData;
    } catch (error) {
      console.error('[MenuService] executeSync failed:', error);
      this.notifySyncListeners(false);
      return false;
    }
  }

  /**
   * ✅ FIX #6: Adaptive poll interval
   * - First 10s: check every 500ms (for small syncs)
   * - After 10s: check every 2s (reduce CPU for large syncs)
   */
  private waitForSyncComplete(timeout: number): Promise<boolean> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      let initialLastSync: string | null = null;

      menuOfflineAPI.getLastSync().then(ls => { initialLastSync = ls; });

      const poll = async () => {
        try {
          const syncManager = getSyncManager();
          const pending = await syncManager.getPendingCount('menu');
          const syncing = syncManager.isSyncing();

          if (pending === 0 && !syncing) {
            const currentLastSync = await menuOfflineAPI.getLastSync();
            const cacheUpdated = currentLastSync !== null && currentLastSync !== initialLastSync;
            
            console.log(`[MenuService] Sync poll complete. Cache updated: ${cacheUpdated}`);
            resolve(cacheUpdated);
            return;
          }

          // Timeout check
          const elapsed = Date.now() - startTime;
          if (elapsed > timeout) {
            console.warn(`[MenuService] Sync poll timed out after ${elapsed}ms`);
            resolve(false);
            return;
          }

          // ✅ FIX #6: Adaptive interval
          const nextInterval = elapsed < 10000 ? 500 : 2000;
          setTimeout(poll, nextInterval);
        } catch (error) {
          console.error('[MenuService] Sync poll error:', error);
          resolve(false);
        }
      };

      // Start polling
      setTimeout(poll, 500);
    });
  }

  // ===========================================================================
  // OFFLINE-FIRST READ OPERATIONS (unchanged)
  // ===========================================================================

  async fetchMenuItems(): Promise<FoodItem[]> {
    try {
      const cachedItems = await menuOfflineAPI.fetchMenuItems();
      
      if (this.config.autoSync && await this.needsSync()) {
        this.queueBackgroundSync();
      }

      return cachedItems;
    } catch (error) {
      console.error('[MenuService] Failed to fetch menu items:', error);
      
      try {
        return await menuOfflineAPI.fetchMenuItems();
      } catch (fallbackError) {
        console.error('[MenuService] Fallback also failed:', fallbackError);
        throw error;
      }
    }
  }

  async fetchFoodItemDetail(id: string): Promise<FoodItemDetail> {
    try {
      if (this.detailsCache[id]) {
        return this.detailsCache[id];
      }

      const detail = await menuOfflineAPI.fetchFoodItemDetail(id);
      console.log(`[MenuService] Fetched detail for ${id} from local`);
      
      this.detailsCache[id] = detail;
      
      if (this.config.autoSync && await this.needsSync()) {
        this.queueBackgroundSync();
      }

      return detail;
    } catch (error) {
      console.error('[MenuService] Failed to fetch food detail:', error);
      throw error;
    }
  }

  async fetchMultipleFoodDetails(ids: string[]): Promise<FoodItemDetail[]> {
    try {
      const cachedDetails: FoodItemDetail[] = [];
      const idsToFetch: string[] = [];

      ids.forEach(id => {
        if (this.detailsCache[id]) {
          cachedDetails.push(this.detailsCache[id]);
        } else {
          idsToFetch.push(id);
        }
      });

      let newDetails: FoodItemDetail[] = [];
      if (idsToFetch.length > 0) {
        newDetails = await menuOfflineAPI.fetchMultipleFoodDetails(idsToFetch);
        
        newDetails.forEach(detail => {
          this.detailsCache[detail.id] = detail;
        });
      }

      if (this.config.autoSync && await this.needsSync()) {
        this.queueBackgroundSync();
      }

      return [...cachedDetails, ...newDetails];
    } catch (error) {
      console.error('[MenuService] Failed to fetch multiple food details:', error);
      throw error;
    }
  }

  async searchMenuItems(query: string): Promise<FoodItem[]> {
    try {
      return await menuOfflineAPI.searchMenuItems(query);
    } catch (error) {
      console.error('[MenuService] Failed to search menu items:', error);
      throw error;
    }
  }

  async fetchMenuByCategory(category: string): Promise<FoodItem[]> {
    try {
      return await menuOfflineAPI.fetchMenuByCategory(category);
    } catch (error) {
      console.error('[MenuService] Failed to fetch menu by category:', error);
      throw error;
    }
  }

  async getNutritionalSummary(ids: string[]) {
    try {
      return await menuOfflineAPI.getNutritionalSummary(ids);
    } catch (error) {
      console.error('[MenuService] Failed to calculate nutrition:', error);
      throw error;
    }
  }

  async getRecommendedItems(nutritionGoals?: {
    maxCalories?: number;
    minProtein?: number;
    maxCarbs?: number;
  }): Promise<FoodItem[]> {
    try {
      return await menuOfflineAPI.getRecommendedItems(nutritionGoals);
    } catch (error) {
      console.error('[MenuService] Failed to get recommendations:', error);
      throw error;
    }
  }

  // ===========================================================================
  // SYNC OPERATIONS
  // ===========================================================================

  private queueBackgroundSync(): void {
    if (this.syncPromise) {
      console.log('[MenuService] ⏭️ Background sync already running, skipping duplicate');
      return;
    }

    console.log('[MenuService] 📋 Queueing background sync...');

    this.syncPromise = this.executeSync(false, true)
      .finally(() => {
        this.syncPromise = null;
      });
  }

  async syncMenu(forceRefresh: boolean = false): Promise<boolean> {
    try {
      const isOnline = await this.checkNetwork();
      const cachedItems = await menuOfflineAPI.fetchMenuItems();

      // ✅ Auto-recovery: cache kosong → paksa full sync
      if (cachedItems.length === 0) {
        console.warn('[MenuService] ⚠️ Cache empty — forcing full resync');
        forceRefresh = true;
      }

      if (!isOnline) {
        console.warn('[MenuService] Cannot sync - device is offline');
        return false;
      }
      
      if (this.syncPromise) {
        console.log('[MenuService] ⏳ Sync in progress, waiting for it to complete...');
        return await this.syncPromise;
      }

      this.clearCache();

      this.syncPromise = this.executeSync(forceRefresh, false)
        .finally(() => {
          this.syncPromise = null;
        });

      return await this.syncPromise;
    } catch (error) {
      console.error('[MenuService] Failed to sync menu:', error);
      return false;
    }
  }

  async forceRefresh(): Promise<boolean> {
    try {
      const isOnline = await this.checkNetwork();

      if (!isOnline) {
        console.warn('[MenuService] Cannot refresh - device is offline');
        return false;
      }

      if (this.syncPromise) {
        console.log('[MenuService] Waiting for current sync before force refresh...');
        await this.syncPromise;
      }

      this.clearCache();

      this.syncPromise = this.executeSync(true, false)
        .finally(() => {
          this.syncPromise = null;
        });

      return await this.syncPromise;
    } catch (error) {
      console.error('[MenuService] Failed to force refresh:', error);
      return false;
    }
  }

  async getSyncStatus(): Promise<{
    hasCachedData: boolean;
    lastSync: string | null;
    cacheAge: number | null;
    needsSync: boolean;
    isOnline: boolean;
    syncInProgress: boolean;
    pendingSyncs: number;
  }> {
    const hasCachedData = await menuOfflineAPI.hasCachedData();
    const lastSync = await menuOfflineAPI.getLastSync();
    const isOnline = await this.checkNetwork();
    const needsSync = await this.needsSync();

    let cacheAge: number | null = null;
    if (lastSync) {
      const lastSyncTime = new Date(lastSync).getTime();
      cacheAge = Math.floor((Date.now() - lastSyncTime) / (1000 * 60 * 60));
    }

    let syncInProgress = this.syncPromise !== null;
    let pendingSyncs = 0;
    try {
      const syncManager = getSyncManager();
      if (!syncInProgress) {
        syncInProgress = syncManager.isSyncing();
      }
      pendingSyncs = await syncManager.getPendingCount('menu');
    } catch (error) {
      console.warn('[MenuService] Could not get SyncManager status:', error);
    }

    return {
      hasCachedData,
      lastSync,
      cacheAge,
      needsSync,
      isOnline,
      syncInProgress,
      pendingSyncs,
    };
  }

  // ===========================================================================
  // CACHE MANAGEMENT
  // ===========================================================================

  async prefetchMenuData(): Promise<void> {
    try {
      console.log('[MenuService] Prefetching menu data...');
      
      const items = await this.fetchMenuItems();
      
      const itemsToPrefetch = items.slice(0, 10);
      await this.fetchMultipleFoodDetails(itemsToPrefetch.map(i => i.id));
      
      console.log('[MenuService] Prefetch completed');
    } catch (error) {
      console.error('[MenuService] Prefetch failed:', error);
    }
  }

  clearCache(): void {
    this.detailsCache = {};
    console.log('[MenuService] Memory cache cleared');
  }

  async clearAllCache(): Promise<void> {
    this.detailsCache = {};
    await menuOfflineAPI.clearCache();
    console.log('[MenuService] All cache cleared');
  }

  getCachedDetail(id: string): FoodItemDetail | undefined {
    return this.detailsCache[id];
  }

  async getCacheInfo() {
    const offlineInfo = await menuOfflineAPI.getCacheInfo();
    const isOnline = await this.checkNetwork();
    const needsSync = await this.needsSync();
    
    let syncInProgress = this.syncPromise !== null;
    let pendingSyncs = 0;
    try {
      const syncManager = getSyncManager();
      if (!syncInProgress) {
        syncInProgress = syncManager.isSyncing();
      }
      pendingSyncs = await syncManager.getPendingCount('menu');
    } catch (error) {
      console.warn('[MenuService] Could not get SyncManager status:', error);
    }
    
    return {
      ...offlineInfo,
      memoryCacheSize: Object.keys(this.detailsCache).length,
      isOnline,
      needsSync,
      syncInProgress,
      pendingSyncs,
      strategy: 'offline-first',
      syncManager: 'enabled',
    };
  }

  async isReady(): Promise<boolean> {
    return await menuOfflineAPI.hasCachedData();
  }

  // ===========================================================================
  // CONFIGURATION & DIAGNOSTICS
  // ===========================================================================

  setConfig(config: Partial<MenuServiceConfig>): void {
    const newConfig = { ...this.config, ...config };
    newConfig.offlineFirst = true;
    
    this.config = newConfig;
    console.log('[MenuService] Config updated:', this.config);
  }

  getConfig(): MenuServiceConfig {
    return { ...this.config };
  }

  async getSyncDiagnostics(): Promise<any> {
    try {
      const syncManager = getSyncManager();
      const diagnostics = await syncManager.exportDiagnostics();
      
      return {
        ...diagnostics,
        menuSpecific: {
          hasCachedData: await menuOfflineAPI.hasCachedData(),
          lastSync: await menuOfflineAPI.getLastSync(),
          needsSync: await this.needsSync(),
          syncInterval: this.config.syncInterval,
          syncInProgress: this.syncPromise !== null,
          listenerCount: this.syncListeners.length,
        },
      };
    } catch (error) {
      console.error('[MenuService] Failed to get diagnostics:', error);
      return null;
    }
  }

  pauseSync(): void {
    try {
      const syncManager = getSyncManager();
      syncManager.pauseSync();
      console.log('[MenuService] Menu sync paused');
    } catch (error) {
      console.error('[MenuService] Failed to pause sync:', error);
    }
  }

  resumeSync(): void {
    try {
      const syncManager = getSyncManager();
      syncManager.resumeSync();
      console.log('[MenuService] Menu sync resumed');
    } catch (error) {
      console.error('[MenuService] Failed to resume sync:', error);
    }
  }

  async clearPendingSyncs(): Promise<void> {
    try {
      const syncManager = getSyncManager();
      await syncManager.clearType('menu');
      console.log('[MenuService] Pending menu syncs cleared');
    } catch (error) {
      console.error('[MenuService] Failed to clear pending syncs:', error);
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton Instance
// ---------------------------------------------------------------------------

const menuService = new MenuService();

export default menuService;