/**
 * menuService.ts (REFACTORED - SyncManager Integration)
 * ---------------------------------------------------------------------------
 * TRUE OFFLINE-FIRST dengan SyncManager integration.
 * Mengikuti pattern dari authService & cartContext untuk consistency.
 * 
 * REFACTORED CHANGES:
 * • ✅ Cache sebagai primary data source (unchanged)
 * • ✅ Background sync menggunakan SyncManager (was: manual menuSyncStrategy)
 * • ✅ Network detection handled by SyncManager
 * • ✅ Retry logic handled by SyncManager
 * • ❌ REMOVED: Manual sync calls (triggerMenuSync)
 * • ❌ REMOVED: Manual syncInProgress flag
 * • ❌ REMOVED: Custom background sync methods
 * 
 * Flow Pattern:
 * 1. Always read from cache (menuOfflineAPI)
 * 2. Check if sync needed
 * 3. Queue for sync (SyncManager.sync) - non-blocking
 * 4. SyncManager handles rest automatically
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
  offlineFirst: boolean; // Always true for offline-first
}

// ---------------------------------------------------------------------------
// Menu Service Class (REFACTORED - OFFLINE-FIRST + SyncManager)
// ---------------------------------------------------------------------------

class MenuService {
  private config: MenuServiceConfig = {
    autoSync: true,
    syncInterval: 24,
    offlineFirst: true, // Enforced offline-first
  };

  private detailsCache: Record<string, FoodItemDetail> = {};
  private isOnline: boolean = false;

  constructor() {
    this.setupNetworkListener();
    this.initializeOfflineFirst();
  }

  /**
   * Initialize offline-first strategy
   */
  private async initializeOfflineFirst(): Promise<void> {
    try {
      // Check if we have cached data
      const hasCachedData = await menuOfflineAPI.hasCachedData();
      
      if (!hasCachedData) {
        console.log('[MenuService] No cache found, will sync when online');
      }

      // Trigger background sync if online and needed
      const isOnline = await this.checkNetwork();
      if (isOnline && await this.needsSync()) {
        this.queueBackgroundSync();
      }
    } catch (error) {
      console.error('[MenuService] Failed to initialize offline-first:', error);
    }
  }

  /**
   * Setup network listener for opportunistic sync
   * SyncManager will auto-sync when online, but we also trigger explicitly
   */
  private setupNetworkListener(): void {
    NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected ?? false;

      console.log(`[MenuService] Network: ${this.isOnline ? 'ONLINE' : 'OFFLINE'}`);

      // Trigger sync when coming back online
      if (wasOffline && this.isOnline && this.config.autoSync) {
        console.log('[MenuService] Network restored, queueing background sync');
        this.queueBackgroundSync();
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

  /**
   * Check if menu needs sync
   */
  private async needsSync(): Promise<boolean> {
    try {
      const lastSync = await menuOfflineAPI.getLastSync();
      
      if (!lastSync) {
        return true; // Never synced
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
  // OFFLINE-FIRST READ OPERATIONS
  // ===========================================================================

  /**
   * ✅ UNCHANGED: Fetch menu items (OFFLINE-FIRST)
   * Always returns cached data immediately, syncs in background
   */
  async fetchMenuItems(): Promise<FoodItem[]> {
    try {
      // STEP 1: Always fetch from cache first (OFFLINE-FIRST)
      const cachedItems = await menuOfflineAPI.fetchMenuItems();
      
      // STEP 2: Queue background sync if needed (non-blocking)
      if (this.config.autoSync && await this.needsSync()) {
        this.queueBackgroundSync();
      }

      // STEP 3: Return cached data immediately
      return cachedItems;
    } catch (error) {
      console.error('[MenuService] Failed to fetch menu items:', error);
      
      // If cache fails, try to get fallback data from offline API
      try {
        return await menuOfflineAPI.fetchMenuItems();
      } catch (fallbackError) {
        console.error('[MenuService] Fallback also failed:', fallbackError);
        throw error;
      }
    }
  }

  /**
   * ✅ UNCHANGED: Fetch food item detail (OFFLINE-FIRST with memory cache)
   */
  async fetchFoodItemDetail(id: string): Promise<FoodItemDetail> {
    try {
      // STEP 1: Check memory cache first (fastest)
      if (this.detailsCache[id]) {
        return this.detailsCache[id];
      }

      // STEP 2: Fetch from local storage (offline-first)
      const detail = await menuOfflineAPI.fetchFoodItemDetail(id);
      
      // STEP 3: Update memory cache
      this.detailsCache[id] = detail;
      
      // STEP 4: Opportunistic background sync
      if (this.config.autoSync && await this.needsSync()) {
        this.queueBackgroundSync();
      }

      return detail;
    } catch (error) {
      console.error('[MenuService] Failed to fetch food detail:', error);
      throw error;
    }
  }

  /**
   * ✅ UNCHANGED: Fetch multiple food details (OFFLINE-FIRST)
   */
  async fetchMultipleFoodDetails(ids: string[]): Promise<FoodItemDetail[]> {
    try {
      // STEP 1: Check memory cache
      const cachedDetails: FoodItemDetail[] = [];
      const idsToFetch: string[] = [];

      ids.forEach(id => {
        if (this.detailsCache[id]) {
          cachedDetails.push(this.detailsCache[id]);
        } else {
          idsToFetch.push(id);
        }
      });

      // STEP 2: Fetch remaining from local storage
      let newDetails: FoodItemDetail[] = [];
      if (idsToFetch.length > 0) {
        newDetails = await menuOfflineAPI.fetchMultipleFoodDetails(idsToFetch);
        
        // Update memory cache
        newDetails.forEach(detail => {
          this.detailsCache[detail.id] = detail;
        });
      }

      // STEP 3: Opportunistic background sync
      if (this.config.autoSync && await this.needsSync()) {
        this.queueBackgroundSync();
      }

      return [...cachedDetails, ...newDetails];
    } catch (error) {
      console.error('[MenuService] Failed to fetch multiple food details:', error);
      throw error;
    }
  }

  /**
   * ✅ UNCHANGED: Search menu items (OFFLINE-FIRST)
   */
  async searchMenuItems(query: string): Promise<FoodItem[]> {
    try {
      // Always search from local cache
      return await menuOfflineAPI.searchMenuItems(query);
    } catch (error) {
      console.error('[MenuService] Failed to search menu items:', error);
      throw error;
    }
  }

  /**
   * ✅ UNCHANGED: Get menu by category (OFFLINE-FIRST)
   */
  async fetchMenuByCategory(category: string): Promise<FoodItem[]> {
    try {
      // Always fetch from local cache
      return await menuOfflineAPI.fetchMenuByCategory(category);
    } catch (error) {
      console.error('[MenuService] Failed to fetch menu by category:', error);
      throw error;
    }
  }

  /**
   * ✅ UNCHANGED: Get nutritional summary (OFFLINE-FIRST)
   */
  async getNutritionalSummary(ids: string[]) {
    try {
      // Always calculate from local cache
      return await menuOfflineAPI.getNutritionalSummary(ids);
    } catch (error) {
      console.error('[MenuService] Failed to calculate nutrition:', error);
      throw error;
    }
  }

  /**
   * ✅ UNCHANGED: Get recommended items (OFFLINE-FIRST)
   */
  async getRecommendedItems(nutritionGoals?: {
    maxCalories?: number;
    minProtein?: number;
    maxCarbs?: number;
  }): Promise<FoodItem[]> {
    try {
      // Always get recommendations from local cache
      return await menuOfflineAPI.getRecommendedItems(nutritionGoals);
    } catch (error) {
      console.error('[MenuService] Failed to get recommendations:', error);
      throw error;
    }
  }

  // ===========================================================================
  // SYNC OPERATIONS (REFACTORED - Using SyncManager)
  // ===========================================================================

  /**
   * ✅ REFACTORED: Queue background sync via SyncManager
   * Non-blocking, automatic retry handling
   */
  private queueBackgroundSync(): void {
    try {
      const syncManager = getSyncManager();
      
      // Queue menu sync - SyncManager will handle when to actually sync
      syncManager.sync('menu', {
        action: 'syncMenu',
        forceRefresh: false,
        syncInterval: this.config.syncInterval,
      }).catch(error => {
        // Non-blocking - will retry via SyncManager
        console.warn('[MenuService] Failed to queue sync, will retry later:', error);
      });
      
      console.log('[MenuService] 📋 Menu sync queued');
    } catch (error) {
      console.error('[MenuService] Failed to queue background sync:', error);
    }
  }

  /**
   * ✅ REFACTORED: Sync menu with server (explicit user-triggered sync)
   * Now uses SyncManager instead of manual triggerMenuSync
   */
  async syncMenu(forceRefresh: boolean = false): Promise<boolean> {
    try {
      const isOnline = await this.checkNetwork();

      if (!isOnline) {
        console.warn('[MenuService] Cannot sync - device is offline');
        return false;
      }

      // Check if already syncing
      const syncManager = getSyncManager();
      if (syncManager.isSyncing()) {
        console.log('[MenuService] Sync already in progress');
        return false;
      }

      // Queue for sync and wait for result
      await syncManager.sync('menu', {
        action: 'syncMenu',
        forceRefresh,
        syncInterval: this.config.syncInterval,
      });

      // Trigger immediate sync (user-initiated)
      const result = await syncManager.syncType('menu');

      return result.success && result.processedCount > 0;
    } catch (error) {
      console.error('[MenuService] Failed to sync menu:', error);
      return false;
    }
  }

  /**
   * ✅ REFACTORED: Force refresh from server and update cache
   * This is for explicit user pull-to-refresh action
   */
  async forceRefresh(): Promise<boolean> {
    try {
      const isOnline = await this.checkNetwork();

      if (!isOnline) {
        console.warn('[MenuService] Cannot refresh - device is offline');
        return false;
      }

      // Clear memory cache before refresh
      this.clearCache();

      // Queue force refresh
      const syncManager = getSyncManager();
      await syncManager.sync('menu', {
        action: 'syncMenu',
        forceRefresh: true,
        syncInterval: this.config.syncInterval,
      });

      // Trigger immediate sync
      const result = await syncManager.syncType('menu');

      return result.success && result.processedCount > 0;
    } catch (error) {
      console.error('[MenuService] Failed to force refresh:', error);
      return false;
    }
  }

  /**
   * ✅ REFACTORED: Get sync status
   * Now includes SyncManager status
   */
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
      cacheAge = Math.floor((Date.now() - lastSyncTime) / (1000 * 60 * 60)); // hours
    }

    // Get SyncManager status
    let syncInProgress = false;
    let pendingSyncs = 0;
    try {
      const syncManager = getSyncManager();
      syncInProgress = syncManager.isSyncing();
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

  /**
   * ✅ UNCHANGED: Prefetch and cache menu data
   * Used during app initialization to warm up cache
   */
  async prefetchMenuData(): Promise<void> {
    try {
      console.log('[MenuService] Prefetching menu data...');
      
      // Fetch all items (from cache)
      const items = await this.fetchMenuItems();
      
      // Prefetch details for first few items
      const itemsToPrefetch = items.slice(0, 10);
      await this.fetchMultipleFoodDetails(itemsToPrefetch.map(i => i.id));
      
      console.log('[MenuService] Prefetch completed');
    } catch (error) {
      console.error('[MenuService] Prefetch failed:', error);
    }
  }

  /**
   * ✅ UNCHANGED: Clear memory cache only
   */
  clearCache(): void {
    this.detailsCache = {};
    console.log('[MenuService] Memory cache cleared');
  }

  /**
   * ✅ UNCHANGED: Clear all local storage cache
   * WARNING: This will delete all offline data
   */
  async clearAllCache(): Promise<void> {
    this.detailsCache = {};
    await menuOfflineAPI.clearCache();
    console.log('[MenuService] All cache cleared');
  }

  /**
   * ✅ UNCHANGED: Get cached detail from memory
   */
  getCachedDetail(id: string): FoodItemDetail | undefined {
    return this.detailsCache[id];
  }

  /**
   * ✅ REFACTORED: Get cache info
   * Now includes SyncManager info
   */
  async getCacheInfo() {
    const offlineInfo = await menuOfflineAPI.getCacheInfo();
    const isOnline = await this.checkNetwork();
    const needsSync = await this.needsSync();
    
    // Get SyncManager status
    let syncInProgress = false;
    let pendingSyncs = 0;
    try {
      const syncManager = getSyncManager();
      syncInProgress = syncManager.isSyncing();
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

  /**
   * ✅ UNCHANGED: Check if service is ready (has cached data)
   */
  async isReady(): Promise<boolean> {
    return await menuOfflineAPI.hasCachedData();
  }

  // ===========================================================================
  // CONFIGURATION & DIAGNOSTICS
  // ===========================================================================

  /**
   * ✅ UNCHANGED: Update config
   */
  setConfig(config: Partial<MenuServiceConfig>): void {
    // Prevent disabling offline-first
    const newConfig = { ...this.config, ...config };
    newConfig.offlineFirst = true; // Always enforce offline-first
    
    this.config = newConfig;
    console.log('[MenuService] Config updated:', this.config);
  }

  /**
   * ✅ UNCHANGED: Get current config
   */
  getConfig(): MenuServiceConfig {
    return { ...this.config };
  }

  /**
   * ✅ NEW: Get SyncManager diagnostics for menu
   */
  async getSyncDiagnostics(): Promise<any> {
    try {
      const syncManager = getSyncManager();
      const diagnostics = await syncManager.exportDiagnostics();
      
      // Filter untuk menu-related data saja
      return {
        ...diagnostics,
        menuSpecific: {
          hasCachedData: await menuOfflineAPI.hasCachedData(),
          lastSync: await menuOfflineAPI.getLastSync(),
          needsSync: await this.needsSync(),
          syncInterval: this.config.syncInterval,
        },
      };
    } catch (error) {
      console.error('[MenuService] Failed to get diagnostics:', error);
      return null;
    }
  }

  /**
   * ✅ NEW: Pause menu sync operations
   */
  pauseSync(): void {
    try {
      const syncManager = getSyncManager();
      syncManager.pauseSync();
      console.log('[MenuService] Menu sync paused');
    } catch (error) {
      console.error('[MenuService] Failed to pause sync:', error);
    }
  }

  /**
   * ✅ NEW: Resume menu sync operations
   */
  resumeSync(): void {
    try {
      const syncManager = getSyncManager();
      syncManager.resumeSync();
      console.log('[MenuService] Menu sync resumed');
    } catch (error) {
      console.error('[MenuService] Failed to resume sync:', error);
    }
  }

  /**
   * ✅ NEW: Clear pending menu syncs
   */
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