/**
 * mealOfflineAPI.ts (v2.0 COMPLETE)
 * ---------------------------------------------------------------------------
 * Service layer untuk semua operasi OFFLINE meal & nutrition.
 * 
 * v2.0 Features:
 * • ✅ Historical data sync support
 * • ✅ Photo analysis offline tracking
 * • ✅ Batch sync methods
 * • ✅ Sync diagnostics
 * ---------------------------------------------------------------------------
 */

if (typeof window === 'undefined') {
  // @ts-ignore
  global.window = global;
}

import { CartItem } from '@/app/types/food';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  MealMetadata,
  NutritionAnalysisPayload,
  AnalyzeMealRequest,
  RICE_PORTIONS,
  MealSummary,
  NutritionScan,
  DateRangeFilter,
  ScanSortOption,
  WeeklyInsight,
  NutritionGoals,
  PendingScan,
  PendingPhoto,
  PendingAdvice,
} from '@/app/types/meal';
import { PersonalizedThresholds } from './mealOnlineAPI';

// ---------------------------------------------------------------------------
// Local Types
// ---------------------------------------------------------------------------

export interface LocalNutritionScan extends NutritionScan {
  localId: string;
  serverId?: string;
  isSynced: boolean;
  syncedAt?: string;
  lastModified: string;
}

interface SyncStatus {
  lastSyncTime: string | null;
  pendingScansCount: number;
  pendingPhotosCount: number;
  PendingAdviceCount: number;
}

interface FoodNutritionData {
  id: string;
  name: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatsPer100g: number;
  servingSize: number;
}

// ---------------------------------------------------------------------------
// Storage Keys
// ---------------------------------------------------------------------------

const STORAGE_KEYS = {
  // Current meal
  CART_ITEMS: '@nutrition_analysis:cart_items',
  RICE_PORTION: '@nutrition_analysis:rice_portion',
  MEAL_METADATA: '@nutrition_analysis:meal_metadata',
  
  // Pending queue
  PENDING_SCANS: '@nutrition_analysis:pending_scans',
  PENDING_PHOTOS: '@nutrition_analysis:pending_photos',
  PENDING_FEEDBACK: '@nutrition_analysis:pending_feedback',
  
  // Completed scans
  COMPLETED_SCANS: '@nutrition_analysis:completed_scans',
  SCANS_INDEX: '@nutrition_analysis:scans_index',
  
  // Local nutrition data
  FOOD_NUTRITION_DB: '@nutrition_analysis:food_nutrition_db',
  NUTRITION_GOALS_PREFIX: '@nutrition_analysis:goals_',
  THRESHOLDS_PREFIX: '@nutrition_analysis:thresholds_',
  
  // Sync status
  LAST_SYNC_TIME: '@nutrition_analysis:last_sync_time',
  SYNC_STATUS: '@nutrition_analysis:sync_status',
} as const;

// ---------------------------------------------------------------------------
// In-memory Cache
// ---------------------------------------------------------------------------

let cartCache: CartItem[] = [];
let mealMetadataCache: MealMetadata | null = null;
let completedScansCache: LocalNutritionScan[] = [];

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

const delay = (ms = 300) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const generateLocalId = (): string => {
  return `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const getCurrentTimestamp = (): string => {
  return new Date().toISOString();
};

const getRiceGrams = (portion: number): number => {
  const riceData = RICE_PORTIONS.find((r) => r.value === portion);
  return riceData ? riceData.grams : 200;
};

// ---------------------------------------------------------------------------
// Storage Helpers
// ---------------------------------------------------------------------------

const loadFromStorage = async <T>(key: string): Promise<T | null> => {
  try {
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    if (error instanceof Error) {
      console.error(`[MealOfflineAPI] Failed to load ${key}:`, error.message);
    } else {
      console.error(`[MealOfflineAPI] Failed to load ${key}:`, error);
    }
    return null;
  }
};

const saveToStorage = async <T>(key: string, data: T): Promise<void> => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`[MealOfflineAPI] Failed to save ${key}:`, error);
  }
};

const removeFromStorage = async (key: string): Promise<void> => {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error(`[MealOfflineAPI] Failed to remove ${key}:`, error);
  }
};

// ---------------------------------------------------------------------------
// Meal Metadata Helpers
// ---------------------------------------------------------------------------

const initializeMealMetadata = (): MealMetadata => {
  const now = getCurrentTimestamp();
  return {
    ricePortion: 1,
    createdAt: now,
    updatedAt: now,
  };
};

// ---------------------------------------------------------------------------
// PUBLIC API - Meal Offline Operations
// ---------------------------------------------------------------------------

export class MealOfflineAPI {
  // =========================================================================
  // CART MANAGEMENT
  // =========================================================================

  static async getCart(): Promise<CartItem[]> {
    await delay(100);
    
    if (cartCache.length === 0) {
      const stored = await loadFromStorage<CartItem[]>(STORAGE_KEYS.CART_ITEMS);
      cartCache = stored || [];
    }
    
    return [...cartCache];
  }

  static async addToCart(id: string, qty: number = 1): Promise<CartItem[]> {
    await delay(100);

    const existing = cartCache.find((item) => item.id === id);

    if (existing) {
      existing.quantity += qty;
    } else {
      cartCache.push({ id, quantity: qty });
    }

    if (!mealMetadataCache) {
      mealMetadataCache = initializeMealMetadata();
    } else {
      mealMetadataCache.updatedAt = getCurrentTimestamp();
    }

    await saveToStorage(STORAGE_KEYS.CART_ITEMS, cartCache);
    await saveToStorage(STORAGE_KEYS.MEAL_METADATA, mealMetadataCache);

    return [...cartCache];
  }

  static async updateCartItem(id: string, quantity: number): Promise<CartItem[]> {
    await delay(100);

    if (quantity <= 0) {
      cartCache = cartCache.filter((item) => item.id !== id);
    } else {
      const existing = cartCache.find((item) => item.id === id);
      if (existing) {
        existing.quantity = quantity;
      } else {
        cartCache.push({ id, quantity });
      }
    }

    if (mealMetadataCache) {
      mealMetadataCache.updatedAt = getCurrentTimestamp();
      await saveToStorage(STORAGE_KEYS.MEAL_METADATA, mealMetadataCache);
    }

    await saveToStorage(STORAGE_KEYS.CART_ITEMS, cartCache);
    return [...cartCache];
  }

  static async removeFromCart(id: string): Promise<CartItem[]> {
    await delay(100);
    cartCache = cartCache.filter((item) => item.id !== id);

    if (mealMetadataCache) {
      mealMetadataCache.updatedAt = getCurrentTimestamp();
      await saveToStorage(STORAGE_KEYS.MEAL_METADATA, mealMetadataCache);
    }

    await saveToStorage(STORAGE_KEYS.CART_ITEMS, cartCache);
    return [...cartCache];
  }

  static async clearCart(): Promise<CartItem[]> {
    cartCache = [];
    mealMetadataCache = null;

    await Promise.allSettled([
      removeFromStorage(STORAGE_KEYS.CART_ITEMS),
      removeFromStorage(STORAGE_KEYS.MEAL_METADATA),
      removeFromStorage(STORAGE_KEYS.RICE_PORTION),
    ]);

    return [];
  }

  // =========================================================================
  // RICE PORTION & MEAL METADATA
  // =========================================================================

  static async updateRicePortion(portion: number): Promise<void> {
    await delay(50);

    if (!mealMetadataCache) {
      mealMetadataCache = initializeMealMetadata();
    }

    mealMetadataCache.ricePortion = portion;
    mealMetadataCache.updatedAt = getCurrentTimestamp();

    await saveToStorage(STORAGE_KEYS.MEAL_METADATA, mealMetadataCache);
    await AsyncStorage.setItem(STORAGE_KEYS.RICE_PORTION, portion.toString());
  }

  static async getRicePortion(): Promise<number> {
    await delay(50);

    if (!mealMetadataCache) {
      mealMetadataCache = await loadFromStorage<MealMetadata>(STORAGE_KEYS.MEAL_METADATA);
    }

    if (mealMetadataCache) {
      return mealMetadataCache.ricePortion;
    }

    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.RICE_PORTION);
      return stored ? parseFloat(stored) : 1;
    } catch {
      return 1;
    }
  }

  static async updateMealMetadata(
    updates: Partial<Omit<MealMetadata, 'createdAt' | 'updatedAt'>>
  ): Promise<MealMetadata> {
    await delay(50);

    if (!mealMetadataCache) {
      mealMetadataCache = initializeMealMetadata();
    }

    mealMetadataCache = {
      ...mealMetadataCache,
      ...updates,
      updatedAt: getCurrentTimestamp(),
    };

    await saveToStorage(STORAGE_KEYS.MEAL_METADATA, mealMetadataCache);
    return { ...mealMetadataCache };
  }

  static async getMealMetadata(): Promise<MealMetadata> {
    await delay(50);

    if (!mealMetadataCache) {
      mealMetadataCache = await loadFromStorage<MealMetadata>(STORAGE_KEYS.MEAL_METADATA);
    }

    if (!mealMetadataCache) {
      mealMetadataCache = initializeMealMetadata();
      await saveToStorage(STORAGE_KEYS.MEAL_METADATA, mealMetadataCache);
    }

    return { ...mealMetadataCache };
  }

  static async getMealSummary(): Promise<MealSummary> {
    await delay(50);

    const items = await this.getCart();
    const metadata = await this.getMealMetadata();
    const riceGrams = getRiceGrams(metadata.ricePortion);
    const estimatedCalories = await this.estimateCalories(items, metadata.ricePortion);
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

    return {
      itemCount: items.length,
      totalQuantity,
      ricePortion: metadata.ricePortion,
      riceGrams,
      estimatedCalories,
      mealType: metadata.mealType,
      createdAt: metadata.createdAt,
    };
  }

  // =========================================================================
  // NUTRITION GOALS & THRESHOLDS (v2.0)
  // =========================================================================

  static async getNutritionGoals(userId: string): Promise<NutritionGoals | null> {
    const key = `${STORAGE_KEYS.NUTRITION_GOALS_PREFIX}${userId}`;
    const goals = await loadFromStorage<NutritionGoals>(key);
    return goals;
  }

  static async saveNutritionGoals(userId: string, goals: NutritionGoals): Promise<void> {
    const key = `${STORAGE_KEYS.NUTRITION_GOALS_PREFIX}${userId}`;
    await saveToStorage(key, goals);
    console.log('[MealOfflineAPI] Nutrition goals saved offline');
  }

  static async getWeeklyInsights(
    userId: string,
    startDate?: string,
    endDate?: string
  ): Promise<WeeklyInsight> {
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate 
      ? new Date(startDate) 
      : new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);

    const allScans = await this.getAllLocalScans();
    const scans = allScans.filter(scan => {
      const scanDate = new Date(scan.date);
      return scanDate >= start && scanDate <= end && scan.userId === userId;
    });

    const totalCalories = scans.reduce((sum, s) => sum + s.calories, 0);
    const totalProtein = scans.reduce((sum, s) => sum + s.protein, 0);
    const totalCarbs = scans.reduce((sum, s) => sum + s.carbs, 0);
    const totalFats = scans.reduce((sum, s) => sum + s.fats, 0);
    const mealsCount = scans.length;

    return {
      totalCalories,
      avgCalories: mealsCount > 0 ? Math.round(totalCalories / mealsCount) : 0,
      totalProtein,
      totalCarbs,
      totalFats,
      mealsCount,
    };
  }

  static async getPersonalizedThresholds(userId: string): Promise<PersonalizedThresholds | null> {
    const key = `${STORAGE_KEYS.THRESHOLDS_PREFIX}${userId}`;
    const cached = await loadFromStorage<PersonalizedThresholds>(key);
    
    if (cached) {
      return cached;
    }

    const thresholds: PersonalizedThresholds = {
      calories: { min: 1800, max: 2200 },
      protein: { min: 50, max: 100 },
      carbs: { min: 200, max: 300 },
      fats: { min: 50, max: 80 },
      calculatedAt: new Date().toISOString(),
      basedOn: {
        activityLevel: 'moderate',
        goal: 'maintain',
      },
    };

    await saveToStorage(key, thresholds);
    return thresholds;
  }

  static async savePersonalizedThresholds(
    userId: string, 
    thresholds: PersonalizedThresholds
  ): Promise<void> {
    const key = `${STORAGE_KEYS.THRESHOLDS_PREFIX}${userId}`;
    await saveToStorage(key, thresholds);
  }

  // =========================================================================
  // DATA PREPARATION
  // =========================================================================

  static async prepareNutritionAnalysisPayload(): Promise<NutritionAnalysisPayload> {
    await delay(100);

    const items = await this.getCart();
    const metadata = await this.getMealMetadata();

    return {
      items,
      ricePortion: metadata.ricePortion,
      metadata,
    };
  }

  static async prepareAnalyzeMealRequest(): Promise<AnalyzeMealRequest> {
    const items = await this.getCart();
    const metadata = await this.getMealMetadata();
    const riceGrams = getRiceGrams(metadata.ricePortion);

    return {
      items,
      ricePortion: metadata.ricePortion,
      riceGrams,
      metadata,
    };
  }

  // =========================================================================
  // PENDING QUEUE MANAGEMENT
  // =========================================================================

  static async addToPendingScans(scanData: NutritionScan, mealData: AnalyzeMealRequest): Promise<void> {
    const pending = await loadFromStorage<PendingScan[]>(STORAGE_KEYS.PENDING_SCANS) || [];
    
    pending.push({
      localId: generateLocalId(),
      scanData,
      mealData,
      createdAt: getCurrentTimestamp(),
      attempts: 0,
    });

    await saveToStorage(STORAGE_KEYS.PENDING_SCANS, pending);
  }

  static async getPendingScans(): Promise<PendingScan[]> {
    return await loadFromStorage<PendingScan[]>(STORAGE_KEYS.PENDING_SCANS) || [];
  }

  static async removePendingScan(localId: string): Promise<void> {
    const pending = await this.getPendingScans();
    const filtered = pending.filter(scan => scan.localId !== localId);
    await saveToStorage(STORAGE_KEYS.PENDING_SCANS, filtered);
  }

  static async getPendingPhotos(): Promise<PendingPhoto[]> {
    return await loadFromStorage<PendingPhoto[]>(STORAGE_KEYS.PENDING_PHOTOS) || [];
  }

  static async getPendingAdvice(): Promise<PendingAdvice[]> {
    return await loadFromStorage<PendingAdvice[]>(STORAGE_KEYS.PENDING_FEEDBACK) || [];
  }

  // =========================================================================
  // LOCAL NUTRITION CALCULATION
  // =========================================================================

  static async calculateMealNutrition(items: CartItem[], ricePortion: number): Promise<{
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  }> {
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFats = 0;

    for (const item of items) {
      const nutritionData = await this.getFoodNutritionData(item.id);
      
      if (nutritionData) {
        const servings = item.quantity;
        const gramsPerServing = nutritionData.servingSize;
        
        totalCalories += (nutritionData.caloriesPer100g * gramsPerServing * servings) / 100;
        totalProtein += (nutritionData.proteinPer100g * gramsPerServing * servings) / 100;
        totalCarbs += (nutritionData.carbsPer100g * gramsPerServing * servings) / 100;
        totalFats += (nutritionData.fatsPer100g * gramsPerServing * servings) / 100;
      }
    }

    const riceGrams = getRiceGrams(ricePortion);
    if (riceGrams > 0) {
      totalCalories += (130 * riceGrams) / 100;
      totalProtein += (2.7 * riceGrams) / 100;
      totalCarbs += (28 * riceGrams) / 100;
      totalFats += (0.3 * riceGrams) / 100;
    }

    return {
      calories: Math.round(totalCalories),
      protein: Math.round(totalProtein * 10) / 10,
      carbs: Math.round(totalCarbs * 10) / 10,
      fats: Math.round(totalFats * 10) / 10,
    };
  }

  static async getFoodNutritionData(foodId: string): Promise<FoodNutritionData | null> {
    const db = await loadFromStorage<Record<string, FoodNutritionData>>(STORAGE_KEYS.FOOD_NUTRITION_DB);
    return db ? db[foodId] || null : null;
  }

  static async estimateCalories(items: CartItem[], ricePortion: number): Promise<number> {
    const nutrition = await this.calculateMealNutrition(items, ricePortion);
    return nutrition.calories;
  }

  // =========================================================================
  // LOCAL SCANS HISTORY
  // =========================================================================

  static async saveCompletedScan(scan: NutritionScan): Promise<void> {
    if (completedScansCache.length === 0) {
      const stored = await loadFromStorage<LocalNutritionScan[]>(STORAGE_KEYS.COMPLETED_SCANS);
      completedScansCache = stored || [];
    }

    const localScan: LocalNutritionScan = {
      ...scan,
      localId: generateLocalId(),
      isSynced: false,
      lastModified: getCurrentTimestamp(),
    };

    completedScansCache.unshift(localScan);
    await saveToStorage(STORAGE_KEYS.COMPLETED_SCANS, completedScansCache);
    await this.updateScansIndex();
  }

  static async getAllLocalScans(sortBy?: ScanSortOption, limit?: number): Promise<LocalNutritionScan[]> {
    if (completedScansCache.length === 0) {
      const stored = await loadFromStorage<LocalNutritionScan[]>(STORAGE_KEYS.COMPLETED_SCANS);
      completedScansCache = stored || [];
    }

    let scans = [...completedScansCache];

    if (sortBy === 'date-desc') {
      scans.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());
    } else if (sortBy === 'date-asc') {
      scans.sort((a, b) => new Date(a.lastModified).getTime() - new Date(b.lastModified).getTime());
    } else if (sortBy === 'calories-desc') {
      scans.sort((a, b) => b.calories - a.calories);
    } else if (sortBy === 'calories-asc') {
      scans.sort((a, b) => a.calories - b.calories);
    }

    if (limit && limit > 0) {
      scans = scans.slice(0, limit);
    }

    return scans;
  }

  static async getLocalScanById(id: string): Promise<LocalNutritionScan | null> {
    const scans = await this.getAllLocalScans();
    return scans.find(scan => scan.id === id || scan.localId === id) || null;
  }

  static async getLocalScansByDateRange(filter: DateRangeFilter): Promise<LocalNutritionScan[]> {
    const scans = await this.getAllLocalScans();
    const startDate = new Date(filter.startDate);
    const endDate = new Date(filter.endDate);

    return scans.filter(scan => {
      const scanDate = new Date(scan.date);
      return scanDate >= startDate && scanDate <= endDate;
    });
  }

  static async getTodayLocalScans(): Promise<LocalNutritionScan[]> {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
    const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

    return this.getLocalScansByDateRange({
      startDate: startOfDay,
      endDate: endOfDay,
    });
  }

  static async updateLocalScan(id: string, updates: Partial<NutritionScan>): Promise<void> {
    const scans = await this.getAllLocalScans();
    const scan = scans.find(s => s.id === id || s.localId === id);

    if (scan) {
      Object.assign(scan, updates);
      scan.lastModified = getCurrentTimestamp();
      await saveToStorage(STORAGE_KEYS.COMPLETED_SCANS, scans);
      completedScansCache = scans;
    }
  }

  static async deleteLocalScan(id: string): Promise<void> {
    const scans = await this.getAllLocalScans();
    const filtered = scans.filter(s => s.id !== id && s.localId !== id);
    
    await saveToStorage(STORAGE_KEYS.COMPLETED_SCANS, filtered);
    completedScansCache = filtered;
    await this.updateScansIndex();
  }

  // =========================================================================
  // SYNC STATUS TRACKING
  // =========================================================================

  static async markScanAsSynced(localId: string, serverId: string): Promise<void> {
    const scans = await this.getAllLocalScans();
    const scan = scans.find(s => s.localId === localId);

    if (scan) {
      scan.serverId = serverId;
      scan.isSynced = true;
      scan.syncedAt = getCurrentTimestamp();
      
      await saveToStorage(STORAGE_KEYS.COMPLETED_SCANS, scans);
      completedScansCache = scans;
    }

    await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC_TIME, getCurrentTimestamp());
  }

  static async getSyncStatus(): Promise<SyncStatus> {
    const pendingScans = await this.getPendingScans();
    const pendingPhotos = await this.getPendingPhotos();
    const PendingAdvice = await this.getPendingAdvice();
    const lastSyncTime = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC_TIME);

    return {
      lastSyncTime,
      pendingScansCount: pendingScans.length,
      pendingPhotosCount: pendingPhotos.length,
      PendingAdviceCount: PendingAdvice.length,
    };
  }

  static async getUnsyncedScansCount(): Promise<number> {
    const scans = await this.getAllLocalScans();
    return scans.filter(scan => !scan.isSynced).length;
  }

  // =========================================================================
  // HISTORICAL SYNC METHODS (v2.0)
  // =========================================================================

  static async getUnsyncedScans(limit?: number): Promise<LocalNutritionScan[]> {
    try {
      const allScans = await this.getAllLocalScans();
      const unsyncedScans = allScans.filter(scan => !scan.isSynced);
      
      unsyncedScans.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateA - dateB;
      });
      
      if (limit && limit > 0) {
        return unsyncedScans.slice(0, limit);
      }
      
      return unsyncedScans;
    } catch (error) {
      console.error('[MealOfflineAPI] Failed to get unsynced scans:', error);
      return [];
    }
  }

  static async markBatchAsSynced(
    syncedScans: Array<{ localId: string; serverId: string }>
  ): Promise<void> {
    try {
      const scans = await this.getAllLocalScans();
      
      for (const { localId, serverId } of syncedScans) {
        const scan = scans.find(s => s.localId === localId || s.id === localId);
        
        if (scan) {
          scan.serverId = serverId;
          scan.isSynced = true;
          scan.syncedAt = getCurrentTimestamp();
          scan.lastModified = getCurrentTimestamp();
        }
      }
      
      await saveToStorage(STORAGE_KEYS.COMPLETED_SCANS, scans);
      completedScansCache = scans;
      
      await AsyncStorage.setItem(
        STORAGE_KEYS.LAST_SYNC_TIME,
        getCurrentTimestamp()
      );
      
      console.log(`[MealOfflineAPI] ✅ Marked ${syncedScans.length} scans as synced`);
    } catch (error) {
      console.error('[MealOfflineAPI] Failed to mark batch as synced:', error);
      throw error;
    }
  }

  static async getHistoricalSyncStatus(): Promise<{
    totalScans: number;
    unsyncedScans: number;
    lastSyncTime: string | null;
    lastBatchSize: number;
  }> {
    try {
      const allScans = await this.getAllLocalScans();
      const unsyncedScans = allScans.filter(scan => !scan.isSynced);
      const lastSyncTime = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC_TIME);
      const pendingScans = await this.getPendingScans();
      
      return {
        totalScans: allScans.length,
        unsyncedScans: unsyncedScans.length,
        lastSyncTime,
        lastBatchSize: pendingScans.length,
      };
    } catch (error) {
      console.error('[MealOfflineAPI] Failed to get historical sync status:', error);
      return {
        totalScans: 0,
        unsyncedScans: 0,
        lastSyncTime: null,
        lastBatchSize: 0,
      };
    }
  }

  static async getScansByDateRange(
    startDate: string,
    endDate: string
  ): Promise<LocalNutritionScan[]> {
    try {
      const allScans = await this.getAllLocalScans();
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      return allScans.filter(scan => {
        const scanDate = new Date(scan.date);
        return scanDate >= start && scanDate <= end;
      });
    } catch (error) {
      console.error('[MealOfflineAPI] Failed to get scans by date range:', error);
      return [];
    }
  }

  static async clearOldSyncedScans(daysOld: number = 30): Promise<number> {
    try {
      const allScans = await this.getAllLocalScans();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      
      const toKeep = allScans.filter(scan => {
        if (!scan.isSynced) return true;
        const scanDate = new Date(scan.date);
        return scanDate > cutoffDate;
      });
      
      const removedCount = allScans.length - toKeep.length;
      
      if (removedCount > 0) {
        await saveToStorage(STORAGE_KEYS.COMPLETED_SCANS, toKeep);
        completedScansCache = toKeep;
        console.log(`[MealOfflineAPI] ✅ Cleared ${removedCount} old synced scans`);
      }
      
      return removedCount;
    } catch (error) {
      console.error('[MealOfflineAPI] Failed to clear old scans:', error);
      return 0;
    }
  }

  static async getSyncDiagnostics(): Promise<{
    totalScans: number;
    syncedScans: number;
    unsyncedScans: number;
    pendingScans: number;
    pendingPhotos: number;
    oldestUnsyncedDate: string | null;
    newestUnsyncedDate: string | null;
  }> {
    try {
      const allScans = await this.getAllLocalScans();
      const unsyncedScans = allScans.filter(s => !s.isSynced);
      const pendingScans = await this.getPendingScans();
      const pendingPhotos = await this.getPendingPhotos();
      
      let oldestDate: string | null = null;
      let newestDate: string | null = null;
      
      if (unsyncedScans.length > 0) {
        const dates = unsyncedScans
          .map(s => new Date(s.date).getTime())
          .sort((a, b) => a - b);
        
        oldestDate = new Date(dates[0]).toISOString();
        newestDate = new Date(dates[dates.length - 1]).toISOString();
      }
      
      return {
        totalScans: allScans.length,
        syncedScans: allScans.filter(s => s.isSynced).length,
        unsyncedScans: unsyncedScans.length,
        pendingScans: pendingScans.length,
        pendingPhotos: pendingPhotos.length,
        oldestUnsyncedDate: oldestDate,
        newestUnsyncedDate: newestDate,
      };
    } catch (error) {
      console.error('[MealOfflineAPI] Failed to get sync diagnostics:', error);
      return {
        totalScans: 0,
        syncedScans: 0,
        unsyncedScans: 0,
        pendingScans: 0,
        pendingPhotos: 0,
        oldestUnsyncedDate: null,
        newestUnsyncedDate: null,
      };
    }
  }

  // =========================================================================
  // DATA VALIDATION
  // =========================================================================

  static validateMealData(items: CartItem[], metadata: MealMetadata): boolean {
    if (!items || items.length === 0) {
      return false;
    }

    if (!metadata || typeof metadata.ricePortion !== 'number') {
      return false;
    }

    return true;
  }

  static async prepareScanForSync(): Promise<AnalyzeMealRequest | null> {
    const request = await this.prepareAnalyzeMealRequest();
    
    if (!this.validateMealData(request.items, request.metadata)) {
      return null;
    }

    return request;
  }

  // =========================================================================
  // UTILITIES
  // =========================================================================

  private static async updateScansIndex(): Promise<void> {
    const scans = completedScansCache.length > 0 
      ? completedScansCache 
      : await loadFromStorage<LocalNutritionScan[]>(STORAGE_KEYS.COMPLETED_SCANS) || [];

    const index = {
      count: scans.length,
      lastId: scans[0]?.localId || null,
      lastSync: await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC_TIME),
      lastModified: getCurrentTimestamp(),
    };

    await saveToStorage(STORAGE_KEYS.SCANS_INDEX, index);
  }

  static async initializeOfflineAPI(): Promise<void> {
    cartCache = await loadFromStorage<CartItem[]>(STORAGE_KEYS.CART_ITEMS) || [];
    mealMetadataCache = await loadFromStorage<MealMetadata>(STORAGE_KEYS.MEAL_METADATA);
    completedScansCache = await loadFromStorage<LocalNutritionScan[]>(STORAGE_KEYS.COMPLETED_SCANS) || [];

    if (!mealMetadataCache && cartCache.length > 0) {
      mealMetadataCache = initializeMealMetadata();
      await saveToStorage(STORAGE_KEYS.MEAL_METADATA, mealMetadataCache);
    }
  }

  static clearCache(): void {
    cartCache = [];
    mealMetadataCache = null;
    completedScansCache = [];
  }
}

// Export types
export type {
  SyncStatus,
  FoodNutritionData,
};