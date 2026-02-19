/**
 * menuContext.tsx (FIXED - Sync Listener Integration)
 * ---------------------------------------------------------------------------
 * FIXES:
 * • ✅ FIX #1: Subscribe to menuService.addSyncListener()
 *   → Auto-refresh UI when background sync completes
 * • ✅ FIX #2: Removed race-prone mock detection + forced sync
 *   → Background sync + listener handles this automatically
 * • ✅ FIX #3: Simplified initialization — no more setTimeout hacks
 * 
 * NEW FLOW:
 * 1. Mount → fetchMenu() → gets whatever is in cache (mock or real)
 * 2. menuService auto-queues background sync if needed
 * 3. Background sync completes → menuService notifies listener
 * 4. Listener fires → re-fetch from cache → get real data → UI updates
 * ---------------------------------------------------------------------------
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, ReactNode } from 'react';
import { FoodItem, FoodItemDetail } from '@/app/types/food';
import menuService from '@/app/services/menu/menuService';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MenuContextType {
  // Data
  menuData: FoodItem[];
  categories: string[];
  
  // States
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  
  // Actions
  refreshMenu: () => Promise<void>;
  fetchMenu: () => Promise<void>;
  
  // Detail operations
  getFoodDetail: (id: string) => Promise<FoodItemDetail>;
  getMultipleFoodDetails: (ids: string[]) => Promise<FoodItemDetail[]>;
  getCachedFoodDetail: (id: string) => FoodItemDetail | undefined;
  clearDetailCache: () => void;
  
  // Search & Filter
  searchMenu: (query: string) => Promise<FoodItem[]>;
  getMenuByCategory: (category: string) => Promise<FoodItem[]>;
  
  // Nutrition
  calculateNutritionSummary: (ids: string[]) => Promise<{
    protein: number;
    fat: number;
    carbs: number;
    calories: number;
    vitamins: string[];
  }>;
  
  // Sync
  syncMenu: (forceRefresh?: boolean) => Promise<boolean>;
  getCacheInfo: () => Promise<any>;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const MenuContext = createContext<MenuContextType | undefined>(undefined);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface MenuProviderProps {
  children: ReactNode;
}

export const MenuProvider: React.FC<MenuProviderProps> = ({ children }) => {
  // State
  const [menuData, setMenuData] = useState<FoodItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ref to track if component is still mounted (avoid setState on unmount)
  const mountedRef = useRef(true);

  // Derived state - categories
  const categories = useMemo(() => {
    const uniqueCategories = Array.from(
      new Set(menuData.map(item => item.category).filter(Boolean))
    ) as string[];
    return ['Semua', ...uniqueCategories];
  }, [menuData]);

  // ---------------------------------------------------------------------------
  // Actions - delegated to service
  // ---------------------------------------------------------------------------

  const fetchMenu = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const data = await menuService.fetchMenuItems();
      if (mountedRef.current) {
        setMenuData(data);
      }
    } catch (err) {
      if (mountedRef.current) {
        const errorMessage = err instanceof Error ? err.message : 'Gagal memuat data menu';
        setError(errorMessage);
        console.error('[MenuContext] Error fetching menu:', err);
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const refreshMenu = useCallback(async () => {
    try {
      setIsRefreshing(true);
      setError(null);

      const data = await menuService.fetchMenuItems();
      if (mountedRef.current) {
        setMenuData(data);
      }
    } catch (err) {
      if (mountedRef.current) {
        const errorMessage = err instanceof Error ? err.message : 'Gagal memuat data menu';
        setError(errorMessage);
        console.error('[MenuContext] Error refreshing menu:', err);
      }
    } finally {
      if (mountedRef.current) {
        setIsRefreshing(false);
      }
    }
  }, []);

  const getFoodDetail = useCallback(async (id: string): Promise<FoodItemDetail> => {
    try {
      return await menuService.fetchFoodItemDetail(id);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Gagal memuat detail menu';
      throw new Error(errorMessage);
    }
  }, []);

  const getMultipleFoodDetails = useCallback(async (ids: string[]): Promise<FoodItemDetail[]> => {
    try {
      return await menuService.fetchMultipleFoodDetails(ids);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Gagal memuat detail menu';
      throw new Error(errorMessage);
    }
  }, []);

  const getCachedFoodDetail = useCallback((id: string): FoodItemDetail | undefined => {
    return menuService.getCachedDetail(id);
  }, []);

  const clearDetailCache = useCallback(() => {
    menuService.clearCache();
  }, []);

  const searchMenu = useCallback(async (query: string): Promise<FoodItem[]> => {
    try {
      setError(null);
      return await menuService.searchMenuItems(query);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Gagal mencari menu';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const getMenuByCategory = useCallback(async (category: string): Promise<FoodItem[]> => {
    try {
      setError(null);
      return await menuService.fetchMenuByCategory(category);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Gagal memuat kategori';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const calculateNutritionSummary = useCallback(async (ids: string[]) => {
    try {
      return await menuService.getNutritionalSummary(ids);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Gagal menghitung nutrisi';
      throw new Error(errorMessage);
    }
  }, []);

  const syncMenu = useCallback(async (forceRefresh: boolean = false): Promise<boolean> => {
    try {
      const success = await menuService.syncMenu(forceRefresh);
      
      console.log(`[MenuContext] Sync ${success ? 'succeeded' : 'failed'}. Force refresh: ${forceRefresh}`);
      
      // Note: No need to manually fetchMenu() here anymore.
      // The sync listener (below) handles UI refresh automatically.
      // But we keep it as a safety net for manual syncMenu calls
      // where the caller expects data to be fresh after await.
      if (success && mountedRef.current) {
        const data = await menuService.fetchMenuItems();
        setMenuData(data);
      }
      
      return success;
    } catch (err) {
      console.error('[MenuContext] Error syncing menu:', err);
      return false;
    }
  }, []);

  const getCacheInfo = useCallback(async () => {
    try {
      return await menuService.getCacheInfo();
    } catch (err) {
      console.error('[MenuContext] Error getting cache info:', err);
      return null;
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  /**
   * ✅ FIX #1: Subscribe to sync completion events from menuService.
   * When background sync finishes (whether triggered by menuService init,
   * network restore, or SyncManager auto-sync), we re-fetch from cache
   * and update the UI.
   */
  useEffect(() => {
    const unsubscribe = menuService.addSyncListener(async (success: boolean) => {
      if (!mountedRef.current) return;

      if (success) {
        console.log('[MenuContext] 🔄 Sync completed, refreshing menu data from cache...');
        try {
          const data = await menuService.fetchMenuItems();
          if (mountedRef.current) {
            setMenuData(data);
            console.log(`[MenuContext] ✅ UI updated with ${data.length} items`);
          }
        } catch (err) {
          console.error('[MenuContext] Failed to refresh after sync:', err);
        }
      } else {
        console.log('[MenuContext] ⚠️ Sync completed with failure, keeping current data');
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  /**
   * ✅ FIX #2 & #3: Simplified initialization.
   * 
   * Just fetch from cache. That's it.
   * - If cache has real data → shows real data immediately.
   * - If cache is empty → shows fallback/mock data.
   * - menuService will auto-queue background sync if needed.
   * - When sync completes → listener above fires → UI updates with real data.
   * 
   * No more:
   * - setTimeout hacks
   * - Mock data detection
   * - Forced sync that races with background sync
   */
  useEffect(() => {
    console.log('[MenuContext] 🚀 Initializing menu...');
    fetchMenu();
  }, [fetchMenu]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Context Value
  // ---------------------------------------------------------------------------

  const value: MenuContextType = {
    menuData,
    categories,
    isLoading,
    isRefreshing,
    error,
    refreshMenu,
    fetchMenu,
    getFoodDetail,
    getMultipleFoodDetails,
    getCachedFoodDetail,
    clearDetailCache,
    searchMenu,
    getMenuByCategory,
    calculateNutritionSummary,
    syncMenu,
    getCacheInfo,
  };

  return <MenuContext.Provider value={value}>{children}</MenuContext.Provider>;
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export const useMenu = (): MenuContextType => {
  const context = useContext(MenuContext);
  if (context === undefined) {
    throw new Error('useMenu must be used within a MenuProvider');
  }
  return context;
};