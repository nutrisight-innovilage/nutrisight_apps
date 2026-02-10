/**
 * cartContext.tsx
 * ---------------------------------------------------------------------------
 * Global cart state via React Context.
 * 
 * REFACTORED: Thin wrapper around MealOfflineAPI & SyncManager
 * • Prioritas: MealOfflineAPI (offline-first)
 * • Sync: Melalui SyncManager
 * • Backward compatible dengan semua function names yang sudah dipakai
 * ---------------------------------------------------------------------------
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CartItem } from '@/app/types/food';
import {
  MealMetadata,
  NutritionAnalysisPayload,
  AnalyzeMealResponse,
  NutritionScan,
  MealSummary,
} from '@/app/types/meal';

// Import OFFLINE API (primary)
import { MealOfflineAPI, LocalNutritionScan } from '@/app/services/meal/mealOfflineAPI';

// Import SYNC (untuk submit analysis)
import { getSyncManager } from '@/app/services/sync/syncManager';

// ---------------------------------------------------------------------------
// Context Type - TIDAK ADA PERUBAHAN (backward compatible)
// ---------------------------------------------------------------------------
interface CartContextType {
  // ========== Core Cart State ==========
  cart: CartItem[];
  totalItems: number;
  isLoading: boolean;
  error: string | null;

  // ========== Nutrition Analysis Extensions ==========
  ricePortion: number;
  mealMetadata: MealMetadata | null;
  mealSummary: MealSummary | null;
  isEmpty: boolean;

  // ========== Nutrition Scans ==========
  recentScans: NutritionScan[];
  todayScans: NutritionScan[];
  isLoadingScans: boolean;
  lastSubmittedScan: NutritionScan | null;

  // ========== Core Cart Actions (TIDAK BERUBAH) ==========
  addToCart: (id: string, qty?: number) => Promise<void>;
  updateQuantity: (id: string, qty: number) => Promise<void>;
  removeFromCart: (id: string) => Promise<void>;
  clearCart: () => Promise<void>;

  // ========== Nutrition Analysis Actions (TIDAK BERUBAH) ==========
  setRicePortion: (portion: number) => Promise<void>;
  updateMetadata: (updates: Partial<Omit<MealMetadata, 'createdAt' | 'updatedAt'>>) => Promise<void>;
  refreshMealSummary: () => Promise<void>;
  getAnalysisPayload: () => Promise<NutritionAnalysisPayload>;
  submitAnalysis: () => Promise<AnalyzeMealResponse>;

  // ========== Nutrition Scans Actions (TIDAK BERUBAH) ==========
  refreshScans: () => Promise<void>;
  refreshTodayScans: () => Promise<void>;
  getScanById: (id: string) => Promise<NutritionScan | null>;
  deleteScan: (id: string) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Context instance
// ---------------------------------------------------------------------------
const CartContext = createContext<CartContextType | undefined>(undefined);

// ---------------------------------------------------------------------------
// Provider - REFACTORED sebagai thin wrapper
// ---------------------------------------------------------------------------
export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // ========== State ==========
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [ricePortion, setRicePortionState] = useState<number>(1);
  const [mealMetadata, setMealMetadata] = useState<MealMetadata | null>(null);
  const [mealSummary, setMealSummary] = useState<MealSummary | null>(null);

  const [recentScans, setRecentScans] = useState<NutritionScan[]>([]);
  const [todayScans, setTodayScans] = useState<NutritionScan[]>([]);
  const [isLoadingScans, setIsLoadingScans] = useState(false);
  const [lastSubmittedScan, setLastSubmittedScan] = useState<NutritionScan | null>(null);

  // ========== INITIALIZATION - Load from MealOfflineAPI ==========
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        // Initialize offline API
        await MealOfflineAPI.initializeOfflineAPI();

        // Load cart items
        const cartData = await MealOfflineAPI.getCart();
        setCart(cartData);

        // Load rice portion
        const portion = await MealOfflineAPI.getRicePortion();
        setRicePortionState(portion);

        // Load meal metadata
        const metadata = await MealOfflineAPI.getMealMetadata();
        setMealMetadata(metadata);

        // Load meal summary
        const summary = await MealOfflineAPI.getMealSummary();
        setMealSummary(summary);

        // Load scans in background (non-blocking)
        loadScansInBackground();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Gagal memuat data');
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  // ========== HELPER: Load Scans from Local Storage ==========
  const loadScansInBackground = async () => {
    try {
      setIsLoadingScans(true);

      // Load dari MealOfflineAPI (local storage)
      const [recent, today] = await Promise.all([
        MealOfflineAPI.getAllLocalScans('date-desc', 10),
        MealOfflineAPI.getTodayLocalScans(),
      ]);

      setRecentScans(recent as NutritionScan[]);
      setTodayScans(today as NutritionScan[]);
    } catch (err) {
      console.error('[CartContext] Failed to load scans:', err);
    } finally {
      setIsLoadingScans(false);
    }
  };

  // ========== HELPER: Run Cart Operation ==========
  const runCartOp = useCallback(async (fn: () => Promise<CartItem[]>) => {
    setIsLoading(true);
    setError(null);
    try {
      const updated = await fn();
      setCart(updated);

      // Reload metadata dan summary
      const [metadata, summary] = await Promise.all([
        MealOfflineAPI.getMealMetadata(),
        MealOfflineAPI.getMealSummary(),
      ]);
      setMealMetadata(metadata);
      setMealSummary(summary);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Operasi cart gagal';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ========== CART ACTIONS - Wrapper MealOfflineAPI ==========
  
  /**
   * ✅ UNCHANGED: addToCart
   * Calls: MealOfflineAPI.addToCart
   */
  const addToCart = useCallback(
    (id: string, qty: number = 1) => runCartOp(() => MealOfflineAPI.addToCart(id, qty)),
    [runCartOp]
  );

  /**
   * ✅ UNCHANGED: updateQuantity
   * Calls: MealOfflineAPI.updateCartItem
   */
  const updateQuantity = useCallback(
    (id: string, qty: number) => runCartOp(() => MealOfflineAPI.updateCartItem(id, qty)),
    [runCartOp]
  );

  /**
   * ✅ UNCHANGED: removeFromCart
   * Calls: MealOfflineAPI.removeFromCart
   */
  const removeFromCart = useCallback(
    (id: string) => runCartOp(() => MealOfflineAPI.removeFromCart(id)),
    [runCartOp]
  );

  /**
   * ✅ UNCHANGED: clearCart
   * Calls: MealOfflineAPI.clearCart
   */
  const clearCart = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Call offline API
      await MealOfflineAPI.clearCart();

      // Clear state
      React.startTransition(() => {
        setCart([]);
        setRicePortionState(1);
        setMealMetadata(null);
        setMealSummary(null);
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal mengosongkan cart';
      setError(msg);

      // Rollback
      try {
        const [cartData, portion, metadata, summary] = await Promise.all([
          MealOfflineAPI.getCart(),
          MealOfflineAPI.getRicePortion(),
          MealOfflineAPI.getMealMetadata(),
          MealOfflineAPI.getMealSummary(),
        ]);

        React.startTransition(() => {
          setCart(cartData);
          setRicePortionState(portion);
          setMealMetadata(metadata);
          setMealSummary(summary);
        });
      } catch (rollbackErr) {
        console.error('[CartContext] Rollback failed:', rollbackErr);
      }

      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ========== NUTRITION ANALYSIS ACTIONS ==========

  /**
   * ✅ UNCHANGED: setRicePortion
   * Calls: MealOfflineAPI.updateRicePortion
   */
  const setRicePortion = useCallback(async (portion: number) => {
    setIsLoading(true);
    setError(null);
    try {
      await MealOfflineAPI.updateRicePortion(portion);
      setRicePortionState(portion);

      // Reload metadata dan summary
      const [metadata, summary] = await Promise.all([
        MealOfflineAPI.getMealMetadata(),
        MealOfflineAPI.getMealSummary(),
      ]);
      setMealMetadata(metadata);
      setMealSummary(summary);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal update porsi nasi';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * ✅ UNCHANGED: updateMetadata
   * Calls: MealOfflineAPI.updateMealMetadata
   */
  const updateMetadata = useCallback(
    async (updates: Partial<Omit<MealMetadata, 'createdAt' | 'updatedAt'>>) => {
      setIsLoading(true);
      setError(null);
      try {
        const updated = await MealOfflineAPI.updateMealMetadata(updates);
        setMealMetadata(updated);

        // Refresh summary
        const summary = await MealOfflineAPI.getMealSummary();
        setMealSummary(summary);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Gagal update metadata';
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * ✅ UNCHANGED: refreshMealSummary
   * Calls: MealOfflineAPI.getMealSummary
   */
  const refreshMealSummary = useCallback(async () => {
    try {
      const summary = await MealOfflineAPI.getMealSummary();
      setMealSummary(summary);
    } catch (err) {
      console.error('[CartContext] Failed to refresh meal summary:', err);
    }
  }, []);

  /**
   * ✅ UNCHANGED: getAnalysisPayload
   * Calls: MealOfflineAPI.prepareNutritionAnalysisPayload
   */
  const getAnalysisPayload = useCallback(async (): Promise<NutritionAnalysisPayload> => {
    return await MealOfflineAPI.prepareNutritionAnalysisPayload();
  }, []);

  /**
   * ✅ UNCHANGED: submitAnalysis
   * 🔄 CHANGED: Now uses SyncManager instead of direct API call
   * 
   * Flow:
   * 1. Validate meal data
   * 2. Calculate nutrition offline (instant feedback)
   * 3. Create local scan
   * 4. Queue untuk sync via SyncManager
   * 5. Clear cart
   */
  const submitAnalysis = useCallback(async (): Promise<AnalyzeMealResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Prepare & validate data
      const mealData = await MealOfflineAPI.prepareScanForSync();

      if (!mealData) {
        return {
          success: false,
          message: 'Data tidak valid untuk dianalisis',
        };
      }

      // 2. Calculate nutrition OFFLINE (instant result)
      const nutrition = await MealOfflineAPI.calculateMealNutrition(
        mealData.items,
        mealData.ricePortion
      );

      // 3. Create local scan (available immediately)
      const localScan: NutritionScan = {
        id: `local_${Date.now()}`,
        foodName: mealData.metadata.mealType 
          ? `${mealData.metadata.mealType.charAt(0).toUpperCase() + mealData.metadata.mealType.slice(1)}`
          : 'My Meal',
        date: new Date().toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          year: 'numeric' 
        }),
        time: new Date().toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        calories: nutrition.calories,
        protein: nutrition.protein,
        carbs: nutrition.carbs,
        fats: nutrition.fats,
      };

      // Save to local history
      await MealOfflineAPI.saveCompletedScan(localScan);

      // 4. Queue untuk sync dengan server (background)
      try {
        const syncManager = getSyncManager();
        await syncManager.sync('meal', mealData);
        console.log('[CartContext] Meal queued for server sync');
      } catch (syncErr) {
        console.warn('[CartContext] Failed to queue for sync, will retry later:', syncErr);
        // Tidak throw error, karena local scan sudah tersimpan
      }

      // 5. Save as last submitted scan
      setLastSubmittedScan(localScan);

      // 6. Clear cart state
      React.startTransition(() => {
        setCart([]);
        setRicePortionState(1);
        setMealMetadata(null);
        setMealSummary(null);
      });

      // 7. Clear cart storage
      await MealOfflineAPI.clearCart();

      // 8. Refresh scans in background
      loadScansInBackground();

      return {
        success: true,
        scan: localScan,
        analysisId: localScan.id,
        message: 'Analisis berhasil (offline)',
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal submit analisis';
      setError(msg);
      return {
        success: false,
        message: msg,
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ========== NUTRITION SCANS ACTIONS ==========

  /**
   * ✅ UNCHANGED: refreshScans
   * 🔄 CHANGED: Now uses MealOfflineAPI.getAllLocalScans
   */
  const refreshScans = useCallback(async () => {
    setIsLoadingScans(true);
    try {
      const scans = await MealOfflineAPI.getAllLocalScans('date-desc', 10);
      setRecentScans(scans as NutritionScan[]);
    } catch (err) {
      console.error('[CartContext] Failed to refresh scans:', err);
      setError(err instanceof Error ? err.message : 'Gagal refresh scans');
    } finally {
      setIsLoadingScans(false);
    }
  }, []);

  /**
   * ✅ UNCHANGED: refreshTodayScans
   * 🔄 CHANGED: Now uses MealOfflineAPI.getTodayLocalScans
   */
  const refreshTodayScans = useCallback(async () => {
    setIsLoadingScans(true);
    try {
      const scans = await MealOfflineAPI.getTodayLocalScans();
      setTodayScans(scans as NutritionScan[]);
    } catch (err) {
      console.error('[CartContext] Failed to refresh today scans:', err);
      setError(err instanceof Error ? err.message : 'Gagal refresh today scans');
    } finally {
      setIsLoadingScans(false);
    }
  }, []);

  /**
   * ✅ UNCHANGED: getScanById
   * 🔄 CHANGED: Now uses MealOfflineAPI.getLocalScanById
   */
  const getScanById = useCallback(async (id: string): Promise<NutritionScan | null> => {
    setIsLoadingScans(true);
    try {
      const scan = await MealOfflineAPI.getLocalScanById(id);
      return scan as NutritionScan | null;
    } catch (err) {
      console.error('[CartContext] Failed to get scan:', err);
      setError(err instanceof Error ? err.message : 'Gagal get scan');
      return null;
    } finally {
      setIsLoadingScans(false);
    }
  }, []);

  /**
   * ✅ UNCHANGED: deleteScan
   * 🔄 CHANGED: Now uses MealOfflineAPI.deleteLocalScan
   */
  const deleteScan = useCallback(async (id: string) => {
    setIsLoadingScans(true);
    try {
      await MealOfflineAPI.deleteLocalScan(id);

      // Update local state
      setRecentScans(prev => prev.filter(s => s.id !== id));
      setTodayScans(prev => prev.filter(s => s.id !== id));

      if (lastSubmittedScan?.id === id) {
        setLastSubmittedScan(null);
      }
    } catch (err) {
      console.error('[CartContext] Failed to delete scan:', err);
      setError(err instanceof Error ? err.message : 'Gagal delete scan');
      throw err;
    } finally {
      setIsLoadingScans(false);
    }
  }, [lastSubmittedScan]);

  // ========== DERIVED VALUES ==========
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const isEmpty = cart.length === 0;

  // ========== RENDER - TIDAK ADA PERUBAHAN ==========
  return (
    <CartContext.Provider
      value={{
        // Core state
        cart,
        totalItems,
        isLoading,
        error,

        // Extended state
        ricePortion,
        mealMetadata,
        mealSummary,
        isEmpty,

        // Nutrition scans state
        recentScans,
        todayScans,
        isLoadingScans,
        lastSubmittedScan,

        // Core actions
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,

        // Extended actions
        setRicePortion,
        updateMetadata,
        refreshMealSummary,
        getAnalysisPayload,
        submitAnalysis,

        // Nutrition scans actions
        refreshScans,
        refreshTodayScans,
        getScanById,
        deleteScan,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

// ---------------------------------------------------------------------------
// Hook - TIDAK ADA PERUBAHAN
// ---------------------------------------------------------------------------
export const useCart = (): CartContextType => {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart() harus dipakai di dalam <CartProvider>');
  }
  return ctx;
};