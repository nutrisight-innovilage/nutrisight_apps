/**
 * cartContext.tsx
 * ---------------------------------------------------------------------------
 * Global cart state via React Context.
 *
 * Enhanced untuk mendukung cart sebagai DATA COLLECTION untuk analisis nutrisi:
 * • CartProvider   – wrap di root layout (_layout.tsx)
 * • useCart()      – hook yang dipakai di mana saja untuk akses cart
 * • Menyimpan rice portion sebagai bagian dari meal data
 * • Mendukung meal metadata untuk analisis
 *
 * Tetap backward compatible dengan interface lama.
 * ---------------------------------------------------------------------------
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CartItem } from '@/app/types/food';
import {
  getCart,
  addToCart as apiAddToCart,
  updateCartItem as apiUpdateCartItem,
  removeFromCart as apiRemoveFromCart,
  clearCart as apiClearCart,
  updateRicePortion as apiUpdateRicePortion,
  getRicePortion as apiGetRicePortion,
  getMealMetadata,
  updateMealMetadata,
  prepareNutritionAnalysisPayload,
  submitForNutritionAnalysis,
  initializeCart,
  MealMetadata,
  NutritionAnalysisPayload,
} from '@/app/services/cartApi';

// ---------------------------------------------------------------------------
// Context shape (Extended)
// ---------------------------------------------------------------------------
interface CartContextType {
  // ========== Core Cart State (Backward Compatible) ==========
  /** Array CartItem saat ini */
  cart: CartItem[];
  /** Total jumlah item (sum of quantity) */
  totalItems: number;
  /** true saat ada operasi cart yang sedang jalan */
  isLoading: boolean;
  /** Error terakhir (string | null) */
  error: string | null;

  // ========== Nutrition Analysis Extensions ==========
  /** Porsi nasi dalam satuan piring (0, 0.25, 0.5, 1, 1.5, 2, 3) */
  ricePortion: number;
  /** Meal metadata lengkap */
  mealMetadata: MealMetadata | null;
  /** true jika cart kosong (untuk validasi analysis) */
  isEmpty: boolean;

  // ========== Core Cart Actions (Backward Compatible) ==========
  /** Tambah item ke cart (increment kalau sudah ada) */
  addToCart: (id: string, qty?: number) => Promise<void>;
  /** Set quantity secara eksplisit; qty <= 0 → hapus */
  updateQuantity: (id: string, qty: number) => Promise<void>;
  /** Hapus item tertentu sepenuhnya */
  removeFromCart: (id: string) => Promise<void>;
  /** Kosongkan cart */
  clearCart: () => Promise<void>;

  // ========== Nutrition Analysis Actions ==========
  /** Update porsi nasi */
  setRicePortion: (portion: number) => Promise<void>;
  /** Update meal metadata (meal type, notes, etc.) */
  updateMetadata: (updates: Partial<Omit<MealMetadata, 'createdAt' | 'updatedAt'>>) => Promise<void>;
  /** Get payload lengkap untuk analysis */
  getAnalysisPayload: () => Promise<NutritionAnalysisPayload>;
  /** Submit untuk nutrition analysis */
  submitAnalysis: () => Promise<{ success: boolean; analysisId?: string; message: string }>;
}

// ---------------------------------------------------------------------------
// Context instance
// ---------------------------------------------------------------------------
const CartContext = createContext<CartContextType | undefined>(undefined);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // ========== Core State ==========
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ========== Extended State ==========
  const [ricePortion, setRicePortionState] = useState<number>(1);
  const [mealMetadata, setMealMetadata] = useState<MealMetadata | null>(null);

  // ---------- initial load: ambil cart + metadata dari storage ----------
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        // Initialize cart API (load dari storage)
        await initializeCart();

        // Load cart items
        const cartData = await getCart();
        setCart(cartData);

        // Load rice portion
        const portion = await apiGetRicePortion();
        setRicePortionState(portion);

        // Load meal metadata
        const metadata = await getMealMetadata();
        setMealMetadata(metadata);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Gagal memuat data');
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  // ---------- helpers ----------
  /** Wrapper: jalankan operasi API, update state, tangkap error */
  const runCartOp = useCallback(async (fn: () => Promise<CartItem[]>) => {
    setIsLoading(true);
    setError(null);
    try {
      const updated = await fn();
      setCart(updated);
      
      // Reload metadata setelah cart operation
      const metadata = await getMealMetadata();
      setMealMetadata(metadata);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Operasi cart gagal';
      setError(msg);
      console.error('[CartContext]', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ---------- Core Cart Actions (Backward Compatible) ----------
  const addToCart = useCallback(
    (id: string, qty: number = 1) => runCartOp(() => apiAddToCart(id, qty)),
    [runCartOp]
  );

  const updateQuantity = useCallback(
    (id: string, qty: number) => runCartOp(() => apiUpdateCartItem(id, qty)),
    [runCartOp]
  );

  const removeFromCart = useCallback(
    (id: string) => runCartOp(() => apiRemoveFromCart(id)),
    [runCartOp]
  );

  const clearCart = useCallback(async () => {
    await runCartOp(() => apiClearCart());
    // Reset rice portion ke default
    setRicePortionState(1);
    setMealMetadata(null);
  }, [runCartOp]);

  // ---------- Nutrition Analysis Actions ----------
  const setRicePortion = useCallback(async (portion: number) => {
    setIsLoading(true);
    setError(null);
    try {
      await apiUpdateRicePortion(portion);
      setRicePortionState(portion);
      
      // Reload metadata
      const metadata = await getMealMetadata();
      setMealMetadata(metadata);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal update porsi nasi';
      setError(msg);
      console.error('[CartContext] setRicePortion error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateMetadata = useCallback(
    async (updates: Partial<Omit<MealMetadata, 'createdAt' | 'updatedAt'>>) => {
      setIsLoading(true);
      setError(null);
      try {
        const updated = await updateMealMetadata(updates);
        setMealMetadata(updated);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Gagal update metadata';
        setError(msg);
        console.error('[CartContext] updateMetadata error:', err);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const getAnalysisPayload = useCallback(async (): Promise<NutritionAnalysisPayload> => {
    return await prepareNutritionAnalysisPayload();
  }, []);

  const submitAnalysis = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await submitForNutritionAnalysis();
      
      if (result.success) {
        // Optional: clear cart setelah submit
        // await clearCart();
      }
      
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal submit analisis';
      setError(msg);
      console.error('[CartContext] submitAnalysis error:', err);
      return {
        success: false,
        message: msg,
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ---------- derived values ----------
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const isEmpty = cart.length === 0;

  // ---------- render ----------
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
        isEmpty,
        // Core actions
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        // Extended actions
        setRicePortion,
        updateMetadata,
        getAnalysisPayload,
        submitAnalysis,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export const useCart = (): CartContextType => {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart() harus dipakai di dalam <CartProvider>');
  }
  return ctx;
};