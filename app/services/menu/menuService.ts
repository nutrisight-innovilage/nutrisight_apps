/**
 * menuService.ts
 * ---------------------------------------------------------------------------
 * Business logic layer untuk menu operations.
 * Abstraksi antara context dan API calls.
 * 
 * Features:
 * • Smart routing antara online/offline API
 * • Automatic caching
 * • Network detection
 * • Sync orchestration
 * ---------------------------------------------------------------------------
 */

import NetInfo from '@react-native-community/netinfo';
import { FoodItem, FoodItemDetail } from '@/app/types/food';
import menuOnlineAPI from '@/app/services/menu/menuOnlineAPI';
import menuOfflineAPI from '@/app/services/menu/menuOfflineAPI';
import menuSyncStrategy, { triggerMenuSync, needsMenuSync } from '@/app/services/sync/syncStrategy/menuSyncStrategy';
import { getSyncManager } from '@/app/services/sync/syncManager';
import { getSyncQueue } from '@/app/services/sync/syncQueue';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MenuServiceConfig {
  autoSync: boolean;
  syncInterval: number; // hours
  cacheFirst: boolean;
}

// ---------------------------------------------------------------------------
// Menu Service Class
// ---------------------------------------------------------------------------

class MenuService {
  private config: MenuServiceConfig = {
    autoSync: true,
    syncInterval: 24,
    cacheFirst: true,
  };

  private detailsCache: Record<string, FoodItemDetail> = {};
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
      
      // Register menu sync strategy
      syncManager.registerStrategy('meal', menuSyncStrategy);
      
      console.log('[MenuService] Sync strategy initialized');
    } catch (error) {
      console.error('[MenuService] Failed to initialize sync strategy:', error);
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
   * Fetch menu items with smart routing
   */
  async fetchMenuItems(): Promise<FoodItem[]> {
    try {
      const isOnline = await this.checkNetwork();

      // Try online first if available
      if (isOnline) {
        try {
          const items = await menuOnlineAPI.fetchMenuItems();
          
          // Save to offline cache
          await menuOfflineAPI.saveMenuItems(items);
          
          return items;
        } catch (error) {
          console.warn('[MenuService] Online fetch failed, falling back to offline');
        }
      }

      // Fallback to offline
      const items = await menuOfflineAPI.fetchMenuItems();
      
      // Check if sync is needed
      if (this.config.autoSync && await needsMenuSync(this.config.syncInterval)) {
        this.syncInBackground();
      }

      return items;
    } catch (error) {
      console.error('[MenuService] Failed to fetch menu items:', error);
      throw error;
    }
  }

  /**
   * Fetch food item detail with caching
   */
  async fetchFoodItemDetail(id: string): Promise<FoodItemDetail> {
    try {
      // Check memory cache first
      if (this.detailsCache[id]) {
        return this.detailsCache[id];
      }

      const isOnline = await this.checkNetwork();

      // Try online first if available
      if (isOnline) {
        try {
          const detail = await menuOnlineAPI.fetchFoodItemDetail(id);
          
          // Update cache
          this.detailsCache[id] = detail;
          
          return detail;
        } catch (error) {
          console.warn('[MenuService] Online fetch failed, falling back to offline');
        }
      }

      // Fallback to offline
      const detail = await menuOfflineAPI.fetchFoodItemDetail(id);
      
      // Update cache
      this.detailsCache[id] = detail;
      
      return detail;
    } catch (error) {
      console.error('[MenuService] Failed to fetch food detail:', error);
      throw error;
    }
  }

  /**
   * Fetch multiple food details with caching
   */
  async fetchMultipleFoodDetails(ids: string[]): Promise<FoodItemDetail[]> {
    try {
      // Separate cached and non-cached
      const cachedDetails: FoodItemDetail[] = [];
      const idsToFetch: string[] = [];

      ids.forEach(id => {
        if (this.detailsCache[id]) {
          cachedDetails.push(this.detailsCache[id]);
        } else {
          idsToFetch.push(id);
        }
      });

      // If all cached, return immediately
      if (idsToFetch.length === 0) {
        return cachedDetails;
      }

      const isOnline = await this.checkNetwork();
      let newDetails: FoodItemDetail[] = [];

      // Try online first if available
      if (isOnline) {
        try {
          newDetails = await menuOnlineAPI.fetchMultipleFoodDetails(idsToFetch);
        } catch (error) {
          console.warn('[MenuService] Online fetch failed, falling back to offline');
        }
      }

      // Fallback to offline if online failed or offline
      if (newDetails.length === 0) {
        newDetails = await menuOfflineAPI.fetchMultipleFoodDetails(idsToFetch);
      }

      // Update cache
      newDetails.forEach(detail => {
        this.detailsCache[detail.id] = detail;
      });

      return [...cachedDetails, ...newDetails];
    } catch (error) {
      console.error('[MenuService] Failed to fetch multiple food details:', error);
      throw error;
    }
  }

  /**
   * Search menu items
   */
  async searchMenuItems(query: string): Promise<FoodItem[]> {
    try {
      const isOnline = await this.checkNetwork();

      // Try online first
      if (isOnline) {
        try {
          return await menuOnlineAPI.searchMenuItems(query);
        } catch (error) {
          console.warn('[MenuService] Online search failed, falling back to offline');
        }
      }

      // Fallback to offline search
      return await menuOfflineAPI.searchMenuItems(query);
    } catch (error) {
      console.error('[MenuService] Failed to search menu items:', error);
      throw error;
    }
  }

  /**
   * Get menu by category
   */
  async fetchMenuByCategory(category: string): Promise<FoodItem[]> {
    try {
      const isOnline = await this.checkNetwork();

      // Try online first
      if (isOnline) {
        try {
          return await menuOnlineAPI.fetchMenuByCategory(category);
        } catch (error) {
          console.warn('[MenuService] Online fetch failed, falling back to offline');
        }
      }

      // Fallback to offline
      return await menuOfflineAPI.fetchMenuByCategory(category);
    } catch (error) {
      console.error('[MenuService] Failed to fetch menu by category:', error);
      throw error;
    }
  }

  /**
   * Get nutritional summary
   */
  async getNutritionalSummary(ids: string[]) {
    try {
      const isOnline = await this.checkNetwork();

      // Try online first
      if (isOnline) {
        try {
          return await menuOnlineAPI.getNutritionalSummary(ids);
        } catch (error) {
          console.warn('[MenuService] Online calculation failed, falling back to offline');
        }
      }

      // Fallback to offline
      return await menuOfflineAPI.getNutritionalSummary(ids);
    } catch (error) {
      console.error('[MenuService] Failed to calculate nutrition:', error);
      throw error;
    }
  }

  /**
   * Get recommended items
   */
  async getRecommendedItems(nutritionGoals?: {
    maxCalories?: number;
    minProtein?: number;
    maxCarbs?: number;
  }): Promise<FoodItem[]> {
    try {
      const isOnline = await this.checkNetwork();

      // Try online first
      if (isOnline) {
        try {
          return await menuOnlineAPI.getRecommendedItems(nutritionGoals);
        } catch (error) {
          console.warn('[MenuService] Online recommendations failed, falling back to offline');
        }
      }

      // Fallback to offline
      return await menuOfflineAPI.getRecommendedItems(nutritionGoals);
    } catch (error) {
      console.error('[MenuService] Failed to get recommendations:', error);
      throw error;
    }
  }

  /**
   * Sync menu with server
   */
  async syncMenu(forceRefresh: boolean = false): Promise<boolean> {
    try {
      const isOnline = await this.checkNetwork();

      if (!isOnline) {
        console.warn('[MenuService] Cannot sync - device is offline');
        return false;
      }

      return await triggerMenuSync(forceRefresh);
    } catch (error) {
      console.error('[MenuService] Failed to sync menu:', error);
      return false;
    }
  }

  /**
   * Sync in background (non-blocking)
   */
  private syncInBackground(): void {
    this.syncMenu(false).catch(error => {
      console.error('[MenuService] Background sync failed:', error);
    });
  }

  /**
   * Clear memory cache
   */
  clearCache(): void {
    this.detailsCache = {};
    console.log('[MenuService] Memory cache cleared');
  }

  /**
   * Clear all local storage cache
   */
  async clearAllCache(): Promise<void> {
    this.detailsCache = {};
    await menuOfflineAPI.clearCache();
    console.log('[MenuService] All cache cleared');
  }

  /**
   * Get cached detail from memory
   */
  getCachedDetail(id: string): FoodItemDetail | undefined {
    return this.detailsCache[id];
  }

  /**
   * Get cache info
   */
  async getCacheInfo() {
    const offlineInfo = await menuOfflineAPI.getCacheInfo();
    
    return {
      ...offlineInfo,
      memoryCacheSize: Object.keys(this.detailsCache).length,
    };
  }

  /**
   * Update config
   */
  setConfig(config: Partial<MenuServiceConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('[MenuService] Config updated:', this.config);
  }

  /**
   * Get current config
   */
  getConfig(): MenuServiceConfig {
    return { ...this.config };
  }
}

// ---------------------------------------------------------------------------
// Singleton Instance
// ---------------------------------------------------------------------------

const menuService = new MenuService();

export default menuService;