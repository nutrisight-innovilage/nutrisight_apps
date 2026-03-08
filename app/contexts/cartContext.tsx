/**
 * cartContext.tsx (v2.4 - No Alert, propagate CameraService message)
 * ---------------------------------------------------------------------------
 * Global cart state via React Context.
 *
 * v2.4 Changes:
 * ✅ analyzePhoto() now returns { scan, message } so component can show toast
 * ✅ No Alert.alert() anywhere — all UI feedback delegated to components
 * ✅ CameraService v3.1 compatible (no Alert in service layer)
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
import NetInfo from '@react-native-community/netinfo';

import mealService from '@/app/services/meal/mealService';
import { calculateWeeklyInsight, calculateTodayStatistics } from '@/app/utils/nutritionUtils';
import openRouterService from '@/app/services/openrouter/openRouterServices';

import PhotoUploadService from '@/app/services/camera/photoUploadService';
import authService from '@/app/services/auth/authService';
import {
  databases,
  generateId,
  DATABASE_ID,
  COLLECTIONS,
  handleAppwriteError,
} from '@/app/config/appwriteConfig';
import { Permission, Role } from 'appwrite';

import { CameraService } from '@/app/services/camera/cameraAPI';

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

  // ========== Weekly Insight ==========
  weeklyInsight: WeeklyInsight;
  aiSummary: string | null;
  isSummaryLoading: boolean;

  // ========== Today Statistics ==========
  todayStats: TodayStatistics;

  // ========== Photo Analysis ==========
  isAnalyzing: boolean;
  analysisResult: NutritionScan | null;

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

  // ========== Weekly Insight Actions ==========
  refreshWeeklyInsight: () => Promise<void>;

  // ========== Photo Analysis Actions ==========
  /**
   * v2.4: Returns { scan, message } so component can show toast with proper feedback.
   * Returns null on failure.
   */
  analyzePhoto: (
    photoUri: string,
    metadata?: { mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack'; notes?: string }
  ) => Promise<{ scan: NutritionScan; message: string } | null>;

  savePhotoAnalysis: (result: AIPhotoAnalysisResult, photoUri?: string) => Promise<NutritionScan | null>;
  clearAnalysisResult: () => void;

  getPhotoAnalysisStatus: (scanId: string) => Promise<{
    isComplete: boolean;
    isPending: boolean;
    isNotFood: boolean;
    scan?: NutritionScan;
  }>;
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

  const [weeklyInsight, setWeeklyInsight] = useState<WeeklyInsight>(DEFAULT_WEEKLY_INSIGHT);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [todayStats, setTodayStats] = useState<TodayStatistics>(DEFAULT_TODAY_STATS);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<NutritionScan | null>(null);

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

      const allScans = await mealService.getAllScans('date-desc', 100);
      const insight = calculateWeeklyInsight(allScans);
      setWeeklyInsight(insight);

      const todayStat = calculateTodayStatistics(today);
      setTodayStats(todayStat);

      generateAISummary(insight);
    } catch (err) {
      console.error('[CartContext] Failed to load scans:', err);
    } finally {
      setIsLoadingScans(false);
    }
  };

  // ========== HELPER: Generate AI Summary ==========
  const generateAISummary = async (insight: WeeklyInsight) => {
    const state = await NetInfo.fetch();
    const isOnline = state.isConnected ?? false;

    if (insight.mealsCount === 0) {
      setAiSummary(null);
      return;
    }
    if (!isOnline) {
      setAiSummary('Ringkasan AI tidak tersedia saat offline');
      return;
    }

    const hash = `${insight.mealsCount}_${insight.totalCalories}_${insight.balancedMealsCount}`;

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
  // WEEKLY INSIGHT ACTIONS
  // ===========================================================================

  const refreshWeeklyInsight = useCallback(async () => {
    try {
      setIsLoadingScans(true);
      const allScans = await mealService.getAllScans('date-desc', 100);
      const insight = calculateWeeklyInsight(allScans);
      setWeeklyInsight(insight);

      const today = await mealService.getTodayScans();
      setTodayScans(today);
      setTodayStats(calculateTodayStatistics(today));

      generateAISummary(insight);
    } catch (err) {
      console.error('[CartContext] Failed to refresh weekly insight:', err);
    } finally {
      setIsLoadingScans(false);
    }
  }, []);

  // ===========================================================================
  // PHOTO ANALYSIS ACTIONS (v2.4)
  // ===========================================================================

  /**
   * v2.4: Returns { scan, message } so component can show toast.
   * Returns null on failure — component shows error toast.
   */
  const analyzePhoto = useCallback(async (
    photoUri: string,
    metadata?: { mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack'; notes?: string },
  ): Promise<{ scan: NutritionScan; message: string } | null> => {
    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      const result = await CameraService.analyzeFood(photoUri, metadata);

      if (!result.success || !result.scan) {
        console.error('[CartContext] CameraService.analyzeFood failed:', result.message);
        return null;
      }

      // Save placeholder scan to state
      setAnalysisResult(result.scan);
      setLastSubmittedScan(result.scan);

      // Update lists immediately for UI
      setTodayScans(prev => [result.scan!, ...prev]);
      setRecentScans(prev => [result.scan!, ...prev.slice(0, 9)]);

      console.log('[CartContext] ✅ analyzePhoto — placeholder scan queued:', result.scan.id);

      return {
        scan: result.scan,
        message: result.message,
      };
    } catch (err) {
      console.error('[CartContext] analyzePhoto error:', err);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  /**
   * savePhotoAnalysis — backward compat for manual flow.
   */
  const savePhotoAnalysis = useCallback(async (
    result: AIPhotoAnalysisResult,
    photoUri?: string,
  ): Promise<NutritionScan | null> => {
    if (!result.success) return null;

    try {
      const scanId = `photo_${Date.now()}`;

      const scan: NutritionScan = {
        id: scanId,
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

      const { MealOfflineAPI } = await import('@/app/services/meal/mealOfflineAPI');
      await MealOfflineAPI.saveCompletedScan(scan);

      if (photoUri) {
        uploadToAppwriteInBackground(scanId, photoUri, result).catch(err => {
          console.warn('[CartContext] Background Appwrite upload failed:', err);
        });
      }

      setLastSubmittedScan(scan);
      loadScansInBackground();

      return scan;
    } catch (err) {
      console.error('[CartContext] Failed to save photo analysis:', err);
      return null;
    }
  }, []);

  const uploadToAppwriteInBackground = async (
    scanId: string,
    photoUri: string,
    result: AIPhotoAnalysisResult,
  ): Promise<void> => {
    try {
      let userId = 'unknown';
      try {
        const authData = await authService.getCurrentUser();
        userId = authData?.user.id || 'unknown';
      } catch {
        console.warn('[CartContext] Could not get userId for upload');
      }

      console.log('[CartContext] Uploading photo to Appwrite Storage...');
      const uploadResult = await PhotoUploadService.uploadPhoto(photoUri, userId);

      if (!uploadResult.success || !uploadResult.fileUrl) {
        console.error('[CartContext] Photo upload failed:', uploadResult.error);
        return;
      }

      console.log('[CartContext] ✅ Photo uploaded:', uploadResult.fileId);

      const aiResponseJson = JSON.stringify({
        foods: result.foods,
        totalNutrition: result.totalNutrition,
        mealDescription: result.mealDescription,
      });

      const extractedFoodsJson = JSON.stringify(
        result.foods.map(f => ({
          name: f.name,
          estimatedGrams: f.estimatedGrams,
          calories: f.nutrition.calories,
        }))
      );

      const avgConfidence = result.foods.length > 0
        ? result.foods.reduce((sum, f) => sum + (f.confidence || 0.5), 0) / result.foods.length
        : 0.5;

      await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.PHOTO_ANALYSIS,
        generateId(),
        {
          userId,
          photoUrl: uploadResult.fileUrl,
          photoFileId: uploadResult.fileId || '',
          scanId,
          aiProvider: 'openrouter-gpt4.1',
          aiResponse: aiResponseJson,
          extractedFoods: extractedFoodsJson,
          confidence: Math.round(avgConfidence * 100) / 100,
          processingTime: 0,
          status: 'completed',
          createdAt: new Date().toISOString(),
        },
        [
          Permission.read(Role.any()),
          Permission.write(Role.any()),
          Permission.update(Role.any()),
          Permission.delete(Role.any()),
        ]
      );

      console.log('[CartContext] ✅ Analysis saved to photo_analysis collection');
    } catch (err) {
      console.error('[CartContext] Failed to upload/save to Appwrite:', err);
    }
  };

  const getPhotoAnalysisStatus = useCallback(async (scanId: string) => {
    return await CameraService.getAnalysisStatus(scanId);
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
        cart, totalItems, isLoading, error,
        ricePortion, mealMetadata, mealSummary, isEmpty,
        recentScans, todayScans, isLoadingScans, lastSubmittedScan,
        weeklyInsight, aiSummary, isSummaryLoading,
        todayStats,
        isAnalyzing, analysisResult,
        addToCart, updateQuantity, removeFromCart, clearCart,
        setRicePortion, updateMetadata, refreshMealSummary,
        getAnalysisPayload, submitAnalysis,
        refreshScans, refreshTodayScans, getScanById, deleteScan,
        refreshWeeklyInsight,
        analyzePhoto, savePhotoAnalysis, clearAnalysisResult, getPhotoAnalysisStatus,
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