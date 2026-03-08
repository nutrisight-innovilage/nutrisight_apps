/**
 * menuContext.tsx (FIXED - Sync Listener + Offline Handling)
 * ---------------------------------------------------------------------------
 * FIXES:
 * • ✅ FIX #1: Subscribe to menuService.addSyncListener()
 * • ✅ FIX #2: Removed race-prone mock detection + forced sync
 * • ✅ FIX #3: Simplified initialization
 * • ✅ FIX #4: Offline-aware error messages
 * ---------------------------------------------------------------------------
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, ReactNode } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { FoodItem, FoodItemDetail } from '@/app/types/food';
import menuService from '@/app/services/menu/menuService';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MenuContextType {
  menuData: FoodItem[];
  categories: string[];
  isLoading: boolean;
  isRefreshing: boolean;
  isOffline: boolean;
  error: string | null;
  refreshMenu: () => Promise<void>;
  fetchMenu: () => Promise<void>;
  getFoodDetail: (id: string) => Promise<FoodItemDetail>;
  getMultipleFoodDetails: (ids: string[]) => Promise<FoodItemDetail[]>;
  getCachedFoodDetail: (id: string) => FoodItemDetail | undefined;
  clearDetailCache: () => void;
  searchMenu: (query: string) => Promise<FoodItem[]>;
  getMenuByCategory: (category: string) => Promise<FoodItem[]>;
  calculateNutritionSummary: (ids: string[]) => Promise<{
    protein: number;
    fat: number;
    carbs: number;
    calories: number;
    vitamins: string[];
  }>;
  syncMenu: (forceRefresh?: boolean) => Promise<boolean>;
  getCacheInfo: () => Promise<any>;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const MenuContext = createContext<MenuContextType | undefined>(undefined);

// ---------------------------------------------------------------------------
// Offline message helper
// ---------------------------------------------------------------------------

const OFFLINE_MSG = 'Tidak ada koneksi internet. Data ditampilkan dari cache.';

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface MenuProviderProps {
  children: ReactNode;
}

export const MenuProvider: React.FC<MenuProviderProps> = ({ children }) => {
  const [menuData, setMenuData] = useState<FoodItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);

  const categories = useMemo(() => {
    const uniqueCategories = Array.from(
      new Set(menuData.map(item => item.category).filter(Boolean))
    ) as string[];
    return ['Semua', ...uniqueCategories];
  }, [menuData]);

  // ---------------------------------------------------------------------------
  // Network listener
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const offline = !(state.isConnected ?? true);
      if (mountedRef.current) {
        setIsOffline(offline);

        // Clear offline error when back online
        if (!offline) {
          setError(prev => prev === OFFLINE_MSG ? null : prev);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const fetchMenu = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const data = await menuService.fetchMenuItems();
      if (mountedRef.current) {
        setMenuData(data);

        // If offline and no data, show offline message
        if (data.length === 0) {
          const netState = await NetInfo.fetch();
          if (!netState.isConnected) {
            setError(OFFLINE_MSG);
          }
        }
      }
    } catch (err) {
      if (mountedRef.current) {
        const netState = await NetInfo.fetch();
        if (!netState.isConnected) {
          setError(OFFLINE_MSG);
        } else {
          setError(err instanceof Error ? err.message : 'Gagal memuat data menu');
        }
        console.error('[MenuContext] Error fetching menu:', err);
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const refreshMenu = useCallback(async () => {
    // Check network first for refresh (pull-to-refresh)
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      if (mountedRef.current) {
        setError(OFFLINE_MSG);
      }
      return;
    }

    try {
      setIsRefreshing(true);
      setError(null);

      const data = await menuService.fetchMenuItems();
      if (mountedRef.current) {
        setMenuData(data);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Gagal memuat data menu');
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
      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        throw new Error('Tidak ada koneksi internet. Detail menu tidak tersedia offline.');
      }
      throw new Error(err instanceof Error ? err.message : 'Gagal memuat detail menu');
    }
  }, []);

  const getMultipleFoodDetails = useCallback(async (ids: string[]): Promise<FoodItemDetail[]> => {
    try {
      return await menuService.fetchMultipleFoodDetails(ids);
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Gagal memuat detail menu');
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
      throw new Error(err instanceof Error ? err.message : 'Gagal menghitung nutrisi');
    }
  }, []);

  const syncMenu = useCallback(async (forceRefresh: boolean = false): Promise<boolean> => {
    // Check network before sync
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      if (mountedRef.current) {
        setError(OFFLINE_MSG);
      }
      return false;
    }

    try {
      const success = await menuService.syncMenu(forceRefresh);

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

  // Sync listener
  useEffect(() => {
    const unsubscribe = menuService.addSyncListener(async (success: boolean) => {
      if (!mountedRef.current) return;

      if (success) {
        console.log('[MenuContext] 🔄 Sync completed, refreshing menu data from cache...');
        try {
          const data = await menuService.fetchMenuItems();
          if (mountedRef.current) {
            setMenuData(data);
            setError(null);
            console.log(`[MenuContext] ✅ UI updated with ${data.length} items`);
          }
        } catch (err) {
          console.error('[MenuContext] Failed to refresh after sync:', err);
        }
      } else {
        console.log('[MenuContext] ⚠️ Sync completed with failure, keeping current data');
      }
    });

    return () => unsubscribe();
  }, []);

  // Initial fetch
  useEffect(() => {
    console.log('[MenuContext] 🚀 Initializing menu...');
    fetchMenu();
  }, [fetchMenu]);

  // Cleanup
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
    isOffline,
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