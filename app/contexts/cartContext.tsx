/**
 * cartContext.tsx (v2.1 - WeeklyInsight + AI Summary + Photo Analysis)
 * ---------------------------------------------------------------------------
 * Global cart state via React Context.
 * 
 * v2.1 Changes:
 * • ✅ weeklyInsight state with proper balancedMealsCount
 * • ✅ aiSummary from OpenRouter
 * • ✅ todayScans + todayStats
 * • ✅ Photo analysis state (isAnalyzing, analysisResult)
 * • ✅ refreshWeeklyInsight action
 * ---------------------------------------------------------------------------
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { CartItem } from '@/app/types/food';
import {
  MealMetadata,
  NutritionAnalysisPayload,
  AnalyzeMealResponse,
  NutritionScan,
  MealSummary,
  WeeklyInsight,
  TodayStatistics,
  AIPhotoAnalysisResult,
} from '@/app/types/meal';

import mealService from '@/app/services/meal/mealService';
import { calculateWeeklyInsight, calculateTodayStatistics } from '@/app/utils/nutritionUtils';
import openRouterService from '@/app/services/openrouter/openRouterServices';

// ---------------------------------------------------------------------------
// Context Type
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

  // ========== Weekly Insight (v2.1) ==========
  weeklyInsight: WeeklyInsight;
  aiSummary: string | null;
  isSummaryLoading: boolean;

  // ========== Today Statistics (v2.1) ==========
  todayStats: TodayStatistics;

  // ========== Photo Analysis (v2.1) ==========
  isAnalyzing: boolean;
  analysisResult: AIPhotoAnalysisResult | null;

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

  // ========== Weekly Insight Actions (v2.1) ==========
  refreshWeeklyInsight: () => Promise<void>;

  // ========== Photo Analysis Actions (v2.1) ==========
  analyzePhoto: (photoUri: string) => Promise<AIPhotoAnalysisResult>;
  savePhotoAnalysis: (result: AIPhotoAnalysisResult) => Promise<NutritionScan | null>;
  clearAnalysisResult: () => void;
}

// ---------------------------------------------------------------------------
// Default Values
// ---------------------------------------------------------------------------

const DEFAULT_WEEKLY_INSIGHT: WeeklyInsight = {
  totalCalories: 0,
  avgCalories: 0,
  totalProtein: 0,
  totalCarbs: 0,
  totalFats: 0,
  mealsCount: 0,
  balancedMealsCount: 0,
};

const DEFAULT_TODAY_STATS: TodayStatistics = {
  totalCalories: 0,
  totalProtein: 0,
  totalCarbs: 0,
  totalFats: 0,
  mealsCount: 0,
  balancedMealsCount: 0,
  scans: [],
};

// ---------------------------------------------------------------------------
// Context
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

  const lastInsightHash = useRef<string>('');

  const [ricePortion, setRicePortionState] = useState<number>(200);
  const [mealMetadata, setMealMetadata] = useState<MealMetadata | null>(null);
  const [mealSummary, setMealSummary] = useState<MealSummary | null>(null);

  const [recentScans, setRecentScans] = useState<NutritionScan[]>([]);
  const [todayScans, setTodayScans] = useState<NutritionScan[]>([]);
  const [isLoadingScans, setIsLoadingScans] = useState(false);
  const [lastSubmittedScan, setLastSubmittedScan] = useState<NutritionScan | null>(null);

  // ========== v2.1 State ==========
  const [weeklyInsight, setWeeklyInsight] = useState<WeeklyInsight>(DEFAULT_WEEKLY_INSIGHT);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [todayStats, setTodayStats] = useState<TodayStatistics>(DEFAULT_TODAY_STATS);

  // Photo Analysis
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AIPhotoAnalysisResult | null>(null);

  // ========== INITIALIZATION ==========
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
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

        // Load scans + insights in background
        loadScansInBackground();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Gagal memuat data');
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  // ========== HELPER: Load Scans + Calculate Stats ==========
  const loadScansInBackground = async () => {
    try {
      setIsLoadingScans(true);

      const [recent, today] = await Promise.all([
        mealService.getAllScans('date-desc', 10),
        mealService.getTodayScans(),
      ]);

      setRecentScans(recent);
      setTodayScans(today);

      // Calculate weekly insight from recent scans (use all for weekly calc)
      const allScans = await mealService.getAllScans('date-desc', 100);
      const insight = calculateWeeklyInsight(allScans);
      setWeeklyInsight(insight);

      // Calculate today statistics
      const todayStat = calculateTodayStatistics(today);
      setTodayStats(todayStat);

      // Generate AI summary in background (non-blocking)
      generateAISummary(insight);
    } catch (err) {
      console.error('[CartContext] Failed to load scans:', err);
    } finally {
      setIsLoadingScans(false);
    }
  };

  // ========== HELPER: Generate AI Summary ==========
  const generateAISummary = async (insight: WeeklyInsight) => {
  if (insight.mealsCount === 0) {
    setAiSummary(null);
    return;
  }

  // Simple hash to detect data change
  const hash = `${insight.mealsCount}_${insight.totalCalories}_${insight.balancedMealsCount}`;
  
  // Skip if data hasn't changed
  if (hash === lastInsightHash.current && aiSummary) {
    return;
  }

  try {
    setIsSummaryLoading(true);
    const result = await openRouterService.generateWeeklySummary(insight);
    if (result.success) {
      setAiSummary(result.summary);
      lastInsightHash.current = hash;
    }
  } catch (err) {
    console.warn('[CartContext] AI summary failed:', err);
  } finally {
    setIsSummaryLoading(false);
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
  // CART ACTIONS
  // ===========================================================================

  const addToCart = useCallback(async (id: string, qty: number = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const updatedCart = await mealService.addToCart(id, qty);
      setCart(updatedCart);
      await refreshUIState();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menambah item');
    } finally {
      setIsLoading(false);
    }
  }, [refreshUIState]);

  const updateQuantity = useCallback(async (id: string, qty: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const updatedCart = await mealService.updateCartItem(id, qty);
      setCart(updatedCart);
      await refreshUIState();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal update quantity');
    } finally {
      setIsLoading(false);
    }
  }, [refreshUIState]);

  const removeFromCart = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const updatedCart = await mealService.removeFromCart(id);
      setCart(updatedCart);
      await refreshUIState();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal hapus item');
    } finally {
      setIsLoading(false);
    }
  }, [refreshUIState]);

  const clearCart = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await mealService.clearCart();
      React.startTransition(() => {
        setCart([]);
        setRicePortionState(200);
        setMealMetadata(null);
        setMealSummary(null);
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal mengosongkan cart';
      setError(msg);
      // Rollback
      try {
        const [cartData, portion, metadata, summary] = await Promise.all([
          mealService.getCart(), mealService.getRicePortion(),
          mealService.getMealMetadata(), mealService.getMealSummary(),
        ]);
        React.startTransition(() => {
          setCart(cartData); setRicePortionState(portion);
          setMealMetadata(metadata); setMealSummary(summary);
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
  // NUTRITION ANALYSIS ACTIONS
  // ===========================================================================

  const setRicePortion = useCallback(async (portion: number) => {
    setIsLoading(true);
    setError(null);
    try {
      await mealService.updateRicePortion(portion);
      setRicePortionState(portion);
      await refreshUIState();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal update porsi nasi');
    } finally {
      setIsLoading(false);
    }
  }, [refreshUIState]);

  const updateMetadata = useCallback(
    async (updates: Partial<Omit<MealMetadata, 'createdAt' | 'updatedAt'>>) => {
      setIsLoading(true);
      setError(null);
      try {
        const updated = await mealService.updateMealMetadata(updates);
        setMealMetadata(updated);
        const summary = await mealService.getMealSummary();
        setMealSummary(summary);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Gagal update metadata');
      } finally {
        setIsLoading(false);
      }
    }, []
  );

  const refreshMealSummary = useCallback(async () => {
    try {
      const summary = await mealService.getMealSummary();
      setMealSummary(summary);
    } catch (err) {
      console.error('[CartContext] Failed to refresh meal summary:', err);
    }
  }, []);

  const getAnalysisPayload = useCallback(async (): Promise<NutritionAnalysisPayload> => {
    return await mealService.getAnalysisPayload();
  }, []);

  const submitAnalysis = useCallback(async (): Promise<AnalyzeMealResponse> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await mealService.submitAnalysis();
      if (response.success) {
        React.startTransition(() => {
          setCart([]);
          setRicePortionState(200);
          setMealMetadata(null);
          setMealSummary(null);
          if (response.scan) setLastSubmittedScan(response.scan);
        });
        // Refresh all data
        loadScansInBackground();
      } else {
        setError(response.message || 'Submit failed');
      }
      return response;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal submit analisis';
      setError(msg);
      return { success: false, message: msg };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ===========================================================================
  // SCANS ACTIONS
  // ===========================================================================

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

  const refreshTodayScans = useCallback(async () => {
    setIsLoadingScans(true);
    try {
      const scans = await mealService.getTodayScans();
      setTodayScans(scans);
      setTodayStats(calculateTodayStatistics(scans));
    } catch (err) {
      console.error('[CartContext] Failed to refresh today scans:', err);
    } finally {
      setIsLoadingScans(false);
    }
  }, []);

  const getScanById = useCallback(async (id: string): Promise<NutritionScan | null> => {
    setIsLoadingScans(true);
    try {
      return await mealService.getScanById(id);
    } catch (err) {
      console.error('[CartContext] Failed to get scan:', err);
      return null;
    } finally {
      setIsLoadingScans(false);
    }
  }, []);

  const deleteScan = useCallback(async (id: string) => {
    setIsLoadingScans(true);
    try {
      await mealService.deleteScan(id);
      setRecentScans(prev => prev.filter(s => s.id !== id));
      setTodayScans(prev => prev.filter(s => s.id !== id));
      if (lastSubmittedScan?.id === id) setLastSubmittedScan(null);

      // Recalculate stats
      const allScans = await mealService.getAllScans('date-desc', 100);
      setWeeklyInsight(calculateWeeklyInsight(allScans));
      const today = await mealService.getTodayScans();
      setTodayStats(calculateTodayStatistics(today));
    } catch (err) {
      console.error('[CartContext] Failed to delete scan:', err);
      setError(err instanceof Error ? err.message : 'Gagal delete scan');
      throw err;
    } finally {
      setIsLoadingScans(false);
    }
  }, [lastSubmittedScan]);

  // ===========================================================================
  // WEEKLY INSIGHT ACTIONS (v2.1)
  // ===========================================================================

  const refreshWeeklyInsight = useCallback(async () => {
    try {
      setIsLoadingScans(true);
      const allScans = await mealService.getAllScans('date-desc', 100);
      const insight = calculateWeeklyInsight(allScans);
      setWeeklyInsight(insight);

      // Refresh today stats too
      const today = await mealService.getTodayScans();
      setTodayScans(today);
      setTodayStats(calculateTodayStatistics(today));

      // Regenerate AI summary
      generateAISummary(insight);
    } catch (err) {
      console.error('[CartContext] Failed to refresh weekly insight:', err);
    } finally {
      setIsLoadingScans(false);
    }
  }, []);

  // ===========================================================================
  // PHOTO ANALYSIS ACTIONS (v2.1)
  // ===========================================================================

  const analyzePhoto = useCallback(async (photoUri: string): Promise<AIPhotoAnalysisResult> => {
    setIsAnalyzing(true);
    setAnalysisResult(null);
    try {
      const result = await openRouterService.analyzePhoto(photoUri);
      setAnalysisResult(result);
      return result;
    } catch (err) {
      const errorResult: AIPhotoAnalysisResult = {
        success: false,
        foods: [],
        totalNutrition: { calories: 0, protein: 0, carbs: 0, fats: 0 },
        mealDescription: '',
        error: err instanceof Error ? err.message : 'Analisis gagal',
      };
      setAnalysisResult(errorResult);
      return errorResult;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const savePhotoAnalysis = useCallback(async (
    result: AIPhotoAnalysisResult
  ): Promise<NutritionScan | null> => {
    if (!result.success) return null;

    try {
      const scan: NutritionScan = {
        id: `photo_${Date.now()}`,
        foodName: result.mealDescription || result.foods.map(f => f.name).join(', ') || 'Foto Makanan',
        date: new Date().toLocaleDateString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric',
        }),
        time: new Date().toLocaleTimeString('en-US', {
          hour: '2-digit', minute: '2-digit',
        }),
        calories: result.totalNutrition.calories,
        protein: result.totalNutrition.protein,
        carbs: result.totalNutrition.carbs,
        fats: result.totalNutrition.fats,
      };

      // Save via mealService (saves to local + queues sync)
      const { MealOfflineAPI } = await import('@/app/services/meal/mealOfflineAPI');
      await MealOfflineAPI.saveCompletedScan(scan);

      setLastSubmittedScan(scan);

      // Refresh all data
      loadScansInBackground();

      return scan;
    } catch (err) {
      console.error('[CartContext] Failed to save photo analysis:', err);
      return null;
    }
  }, []);

  const clearAnalysisResult = useCallback(() => {
    setAnalysisResult(null);
  }, []);

  // ===========================================================================
  // DERIVED VALUES
  // ===========================================================================
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const isEmpty = cart.length === 0;

  // ===========================================================================
  // RENDER
  // ===========================================================================
  return (
    <CartContext.Provider
      value={{
        // Core state
        cart, totalItems, isLoading, error,

        // Extended state
        ricePortion, mealMetadata, mealSummary, isEmpty,

        // Scans state
        recentScans, todayScans, isLoadingScans, lastSubmittedScan,

        // Weekly Insight (v2.1)
        weeklyInsight, aiSummary, isSummaryLoading,

        // Today Statistics (v2.1)
        todayStats,

        // Photo Analysis (v2.1)
        isAnalyzing, analysisResult,

        // Core actions
        addToCart, updateQuantity, removeFromCart, clearCart,

        // Extended actions
        setRicePortion, updateMetadata, refreshMealSummary,
        getAnalysisPayload, submitAnalysis,

        // Scans actions
        refreshScans, refreshTodayScans, getScanById, deleteScan,

        // Weekly Insight actions (v2.1)
        refreshWeeklyInsight,

        // Photo Analysis actions (v2.1)
        analyzePhoto, savePhotoAnalysis, clearAnalysisResult,
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