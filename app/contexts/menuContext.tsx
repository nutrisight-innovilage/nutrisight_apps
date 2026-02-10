/**
 * menuContext.tsx
 * ---------------------------------------------------------------------------
 * Slim context wrapper untuk menu data.
 * Business logic ada di menuService.
 * 
 * Context hanya:
 * • Menyimpan state
 * • Provide data ke children
 * • Wrapper untuk service calls
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
      
      // Refresh menu data after successful sync
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
  // Lifecycle
  // ---------------------------------------------------------------------------

  // Initial load
  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

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