/**
 * menuContext.tsx (FIXED - Auto-detect mock data and sync)
 * ---------------------------------------------------------------------------
 * ✅ PASTI mendeteksi mock data (id: '1'-'5')
 * ✅ PASTI sync jika online
 * ✅ PASTI refresh UI setelah sync
 * ---------------------------------------------------------------------------
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
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

  /**
   * Fetch menu data
   */
  const fetchMenu = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const data = await menuService.fetchMenuItems();
      setMenuData(data);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Gagal memuat data menu';
      setError(errorMessage);
      console.error('[MenuContext] Error fetching menu:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Refresh menu data
   */
  const refreshMenu = useCallback(async () => {
    try {
      setIsRefreshing(true);
      setError(null);

      const data = await menuService.fetchMenuItems();
      setMenuData(data);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Gagal memuat data menu';
      setError(errorMessage);
      console.error('[MenuContext] Error refreshing menu:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  /**
   * Get food detail
   */
  const getFoodDetail = useCallback(async (id: string): Promise<FoodItemDetail> => {
    try {
      return await menuService.fetchFoodItemDetail(id);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Gagal memuat detail menu';
      throw new Error(errorMessage);
    }
  }, []);

  /**
   * Get multiple food details
   */
  const getMultipleFoodDetails = useCallback(async (ids: string[]): Promise<FoodItemDetail[]> => {
    try {
      return await menuService.fetchMultipleFoodDetails(ids);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Gagal memuat detail menu';
      throw new Error(errorMessage);
    }
  }, []);

  /**
   * Get cached food detail
   */
  const getCachedFoodDetail = useCallback((id: string): FoodItemDetail | undefined => {
    return menuService.getCachedDetail(id);
  }, []);

  /**
   * Clear detail cache
   */
  const clearDetailCache = useCallback(() => {
    menuService.clearCache();
  }, []);

  /**
   * Search menu
   */
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

  /**
   * Get menu by category
   */
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

  /**
   * Calculate nutrition summary
   */
  const calculateNutritionSummary = useCallback(async (ids: string[]) => {
    try {
      return await menuService.getNutritionalSummary(ids);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Gagal menghitung nutrisi';
      throw new Error(errorMessage);
    }
  }, []);

  /**
   * Sync menu
   */
  const syncMenu = useCallback(async (forceRefresh: boolean = false): Promise<boolean> => {
    try {
      const success = await menuService.syncMenu(forceRefresh);
      
      // ✅ PASTI refresh menu data setelah sync berhasil
      if (success) {
        await fetchMenu();
      }
      
      return success;
    } catch (err) {
      console.error('[MenuContext] Error syncing menu:', err);
      return false;
    }
  }, [fetchMenu]);

  /**
   * Get cache info
   */
  const getCacheInfo = useCallback(async () => {
    try {
      return await menuService.getCacheInfo();
    } catch (err) {
      console.error('[MenuContext] Error getting cache info:', err);
      return null;
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Lifecycle - Smart initialization with mock detection
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const initializeMenu = async () => {
      console.log('[MenuContext] 🚀 Initializing menu...');
      
      // STEP 1: Fetch data (bisa mock atau cached real data)
      await fetchMenu();
      
      // Wait for state to update
      await new Promise(resolve => setTimeout(resolve, 100));
    };
    
    initializeMenu();
  }, [fetchMenu]);

  // ✅ SEPARATE EFFECT: Detect mock data setelah menuData ter-update
  useEffect(() => {
    // Skip jika masih loading atau tidak ada data
    if (isLoading || menuData.length === 0) {
      return;
    }

    const checkAndSyncIfMock = async () => {
      // STEP 2: Check if we got mock data
      // Mock data PASTI punya id '1', '2', '3', '4', '5'
      const isMockData = 
        menuData.length === 5 && 
        menuData.every(item => ['1', '2', '3', '4', '5'].includes(item.id));
      
      if (isMockData) {
        console.log('[MenuContext] 🔍 Mock data detected (5 items with ids 1-5)');
        
        // STEP 3: Check if online
        const cacheInfo = await getCacheInfo();
        
        if (cacheInfo?.isOnline) {
          console.log('[MenuContext] 📡 Online detected → Syncing from Appwrite...');
          
          // STEP 4: Force sync from Appwrite (BLOCKING, wait for completion)
          const syncSuccess = await syncMenu(true); // forceRefresh = true
          
          if (syncSuccess) {
            console.log('[MenuContext] ✅ Sync completed successfully');
            console.log('[MenuContext] 🎉 Real data loaded:', menuData.length, 'items');
          } else {
            console.warn('[MenuContext] ⚠️ Sync failed, keeping mock data');
          }
        } else {
          console.log('[MenuContext] 📴 Offline, keeping mock data for now');
        }
      } else {
        console.log('[MenuContext] ✅ Real data already loaded:', menuData.length, 'items');
      }
    };

    checkAndSyncIfMock();
  }, [menuData, isLoading]); // Run when menuData updates

  // ---------------------------------------------------------------------------
  // Context Value
  // ---------------------------------------------------------------------------

  const value: MenuContextType = {
    // Data
    menuData,
    categories,
    
    // States
    isLoading,
    isRefreshing,
    error,
    
    // Actions
    refreshMenu,
    fetchMenu,
    
    // Detail operations
    getFoodDetail,
    getMultipleFoodDetails,
    getCachedFoodDetail,
    clearDetailCache,
    
    // Search & Filter
    searchMenu,
    getMenuByCategory,
    
    // Nutrition
    calculateNutritionSummary,
    
    // Sync
    syncMenu,
    getCacheInfo,
  };

  return <MenuContext.Provider value={value}>{children}</MenuContext.Provider>;
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Custom hook to use menu context
 */
export const useMenu = (): MenuContextType => {
  const context = useContext(MenuContext);
  if (context === undefined) {
    throw new Error('useMenu must be used within a MenuProvider');
  }
  return context;
};