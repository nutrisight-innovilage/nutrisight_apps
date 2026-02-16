/**
 * cartContext.tsx (REFACTORED - Clean Wrapper)
 * ---------------------------------------------------------------------------
 * Global cart state via React Context.
 * 
 * REFACTORED: Clean wrapper around mealService
 * • ✅ Hanya mengelola React state
 * • ✅ Semua business logic di mealService
 * • ✅ Konsisten dengan pattern authService
 * • ✅ Minimal, readable, maintainable
 * 
 * Pattern:
 * - Context hanya untuk React state management
 * - Service untuk business logic & data operations
 * - Clean separation of concerns
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

// Import MEAL SERVICE (single source of truth)
import mealService from '@/app/services/meal/mealService';

// ---------------------------------------------------------------------------
// Context Type - Interface TIDAK BERUBAH
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

  // ========== Core Cart Actions ==========
  addToCart: (id: string, qty?: number) => Promise<void>;
  updateQuantity: (id: string, qty: number) => Promise<void>;
  removeFromCart: (id: string) => Promise<void>;
  clearCart: () => Promise<void>;

  // ========== Nutrition Analysis Actions ==========
  setRicePortion: (portion: number) => Promise<void>;
  updateMetadata: (updates: Partial<Omit<MealMetadata, 'createdAt' | 'updatedAt'>>) => Promise<void>;
  refreshMealSummary: () => Promise<void>;
  getAnalysisPayload: () => Promise<NutritionAnalysisPayload>;
  submitAnalysis: () => Promise<AnalyzeMealResponse>;

  // ========== Nutrition Scans Actions ==========
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
// Provider - REFACTORED sebagai clean wrapper
// ---------------------------------------------------------------------------
export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // ========== React State (UI layer only) ==========
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [ricePortion, setRicePortionState] = useState<number>(200);
  const [mealMetadata, setMealMetadata] = useState<MealMetadata | null>(null);
  const [mealSummary, setMealSummary] = useState<MealSummary | null>(null);

  const [recentScans, setRecentScans] = useState<NutritionScan[]>([]);
  const [todayScans, setTodayScans] = useState<NutritionScan[]>([]);
  const [isLoadingScans, setIsLoadingScans] = useState(false);
  const [lastSubmittedScan, setLastSubmittedScan] = useState<NutritionScan | null>(null);

  // ========== INITIALIZATION - Load via mealService ==========
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        // Load cart data
        const [cartData, portion, metadata, summary] = await Promise.all([
          mealService.getCart(),
          mealService.getRicePortion(),
          mealService.getMealMetadata(),
          mealService.getMealSummary(),
        ]);

        setCart(cartData);
        setRicePortionState(portion);
        setMealMetadata(metadata);
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

  // ========== HELPER: Load Scans ==========
  const loadScansInBackground = async () => {
    try {
      setIsLoadingScans(true);

      const [recent, today] = await Promise.all([
        mealService.getAllScans('date-desc', 10),
        mealService.getTodayScans(),
      ]);

      setRecentScans(recent);
      setTodayScans(today);
    } catch (err) {
      console.error('[CartContext] Failed to load scans:', err);
    } finally {
      setIsLoadingScans(false);
    }
  };

  
  // ========== HELPER: Refresh UI State ==========
  const refreshUIState = useCallback(async () => {
    try {
      const [metadata, summary] = await Promise.all([
        mealService.getMealMetadata(),
        mealService.getMealSummary(),
      ]);
      setMealMetadata(metadata);
      setMealSummary(summary);
    } catch (err) {
      console.error('[CartContext] Failed to refresh UI state:', err);
    }
  }, []);

  // ===========================================================================
  // CART ACTIONS - Clean wrappers around mealService
  // ===========================================================================

  /**
   * ✅ Add to cart
   * Calls: mealService.addToCart()
   */
  const addToCart = useCallback(async (id: string, qty: number = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const updatedCart = await mealService.addToCart(id, qty);
      setCart(updatedCart);
      await refreshUIState();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menambah item';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [refreshUIState]);

  /**
   * ✅ Update quantity
   * Calls: mealService.updateCartItem()
   */
  const updateQuantity = useCallback(async (id: string, qty: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const updatedCart = await mealService.updateCartItem(id, qty);
      setCart(updatedCart);
      await refreshUIState();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal update quantity';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [refreshUIState]);

  /**
   * ✅ Remove from cart
   * Calls: mealService.removeFromCart()
   */
  const removeFromCart = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const updatedCart = await mealService.removeFromCart(id);
      setCart(updatedCart);
      await refreshUIState();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal hapus item';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [refreshUIState]);

  /**
   * ✅ Clear cart
   * Calls: mealService.clearCart()
   */
  const clearCart = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Call service
      await mealService.clearCart();

      // Update UI state
      React.startTransition(() => {
        setCart([]);
        setRicePortionState(200);
        setMealMetadata(null);
        setMealSummary(null);
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal mengosongkan cart';
      setError(msg);

      // Rollback - reload from service
      try {
        const [cartData, portion, metadata, summary] = await Promise.all([
          mealService.getCart(),
          mealService.getRicePortion(),
          mealService.getMealMetadata(),
          mealService.getMealSummary(),
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

  // ===========================================================================
  // NUTRITION ANALYSIS ACTIONS - Clean wrappers
  // ===========================================================================

  /**
   * ✅ Set rice portion
   * Calls: mealService.updateRicePortion()
   */
  const setRicePortion = useCallback(async (portion: number) => {
    setIsLoading(true);
    setError(null);
    try {
      await mealService.updateRicePortion(portion);
      setRicePortionState(portion);
      await refreshUIState();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal update porsi nasi';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [refreshUIState]);

  /**
   * ✅ Update metadata
   * Calls: mealService.updateMealMetadata()
   */
  const updateMetadata = useCallback(
    async (updates: Partial<Omit<MealMetadata, 'createdAt' | 'updatedAt'>>) => {
      setIsLoading(true);
      setError(null);
      try {
        const updated = await mealService.updateMealMetadata(updates);
        setMealMetadata(updated);

        // Refresh summary
        const summary = await mealService.getMealSummary();
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
   * ✅ Refresh meal summary
   * Calls: mealService.getMealSummary()
   */
  const refreshMealSummary = useCallback(async () => {
    try {
      const summary = await mealService.getMealSummary();
      setMealSummary(summary);
    } catch (err) {
      console.error('[CartContext] Failed to refresh meal summary:', err);
    }
  }, []);

  /**
   * ✅ Get analysis payload
   * Calls: mealService.getAnalysisPayload()
   */
  const getAnalysisPayload = useCallback(async (): Promise<NutritionAnalysisPayload> => {
    return await mealService.getAnalysisPayload();
  }, []);

  /**
   * ✅ Submit analysis
   * Calls: mealService.submitAnalysis()
   * 
   * Clean wrapper - all business logic in service
   */
  const submitAnalysis = useCallback(async (): Promise<AnalyzeMealResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      // Service handles everything: validation, calculation, save, sync, clear
      const response = await mealService.submitAnalysis();

      if (response.success) {
        // Update UI state
        React.startTransition(() => {
          setCart([]);
          setRicePortionState(200);
          setMealMetadata(null);
          setMealSummary(null);
          if (response.scan) {
            setLastSubmittedScan(response.scan);
          }
        });

        // Refresh scans in background
        loadScansInBackground();
      } else {
        setError(response.message || 'Submit failed');
      }

      return response;
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

  // ===========================================================================
  // NUTRITION SCANS ACTIONS - Clean wrappers
  // ===========================================================================

  /**
   * ✅ Refresh scans
   * Calls: mealService.getAllScans()
   */
  const refreshScans = useCallback(async () => {
    setIsLoadingScans(true);
    try {
      const scans = await mealService.getAllScans('date-desc', 10);
      setRecentScans(scans);
    } catch (err) {
      console.error('[CartContext] Failed to refresh scans:', err);
      setError(err instanceof Error ? err.message : 'Gagal refresh scans');
    } finally {
      setIsLoadingScans(false);
    }
  }, []);

  /**
   * ✅ Refresh today scans
   * Calls: mealService.getTodayScans()
   */
  const refreshTodayScans = useCallback(async () => {
    setIsLoadingScans(true);
    try {
      const scans = await mealService.getTodayScans();
      setTodayScans(scans);
    } catch (err) {
      console.error('[CartContext] Failed to refresh today scans:', err);
      setError(err instanceof Error ? err.message : 'Gagal refresh today scans');
    } finally {
      setIsLoadingScans(false);
    }
  }, []);

  /**
   * ✅ Get scan by ID
   * Calls: mealService.getScanById()
   */
  const getScanById = useCallback(async (id: string): Promise<NutritionScan | null> => {
    setIsLoadingScans(true);
    try {
      return await mealService.getScanById(id);
    } catch (err) {
      console.error('[CartContext] Failed to get scan:', err);
      setError(err instanceof Error ? err.message : 'Gagal get scan');
      return null;
    } finally {
      setIsLoadingScans(false);
    }
  }, []);

  /**
   * ✅ Delete scan
   * Calls: mealService.deleteScan()
   */
  const deleteScan = useCallback(async (id: string) => {
    setIsLoadingScans(true);
    try {
      await mealService.deleteScan(id);

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

  // ===========================================================================
  // DERIVED VALUES
  // ===========================================================================
  
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const isEmpty = cart.length === 0;

  // ===========================================================================
  // RENDER - Interface TIDAK BERUBAH
  // ===========================================================================
  
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
// Hook - Interface TIDAK BERUBAH
// ---------------------------------------------------------------------------

/**
 * ✅ Use cart hook
 * 
 * Usage in components:
 * ```tsx
 * const { cart, addToCart, submitAnalysis } = useCart();
 * ```
 */
export const useCart = (): CartContextType => {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart() harus dipakai di dalam <CartProvider>');
  }
  return ctx;
};