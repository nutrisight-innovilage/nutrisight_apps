/**
 * mealOfflineAPI.ts
 * ---------------------------------------------------------------------------
 * Service layer untuk semua operasi OFFLINE meal & nutrition.
 * Menangani local storage, cache, dan offline calculations.
 * 
 * Refactored dari mealInputAPI.ts dengan tambahan:
 * • Pending queue management
 * • Local nutrition calculation
 * • Local scans history
 * • Sync status tracking
 * ---------------------------------------------------------------------------
 */

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
} from '@/app/types/meal';

// ---------------------------------------------------------------------------
// Types untuk Offline Layer
// ---------------------------------------------------------------------------

/**
 * Pending scan yang belum ter-sync
 */
interface PendingScan {
  localId: string;
  scanData: NutritionScan;
  mealData: AnalyzeMealRequest;
  createdAt: string;
  attempts: number;
  lastAttempt?: string;
}

/**
 * Pending photo yang belum di-upload
 */
interface PendingPhoto {
  localId: string;
  photoUri: string;
  metadata: {
    mealType?: string;
    timestamp: string;
  };
  attempts: number;
}

/**
 * Pending feedback yang belum terkirim
 */
interface PendingFeedback {
  localId: string;
  scanId: string;
  feedbackData: any;
  createdAt: string;
  attempts: number;
}

/**
 * Local scan dengan sync info
 */
interface LocalNutritionScan extends NutritionScan {
  localId: string;
  serverId?: string;
  isSynced: boolean;
  syncedAt?: string;
  lastModified: string;
}

/**
 * Sync status
 */
interface SyncStatus {
  lastSyncTime: string | null;
  pendingScansCount: number;
  pendingPhotosCount: number;
  pendingFeedbackCount: number;
}

/**
 * Food nutrition data (untuk local calculation)
 */
interface FoodNutritionData {
  id: string;
  name: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatsPer100g: number;
  servingSize: number; // default serving size in grams
}

// ---------------------------------------------------------------------------
// Storage Keys
// ---------------------------------------------------------------------------
const STORAGE_KEYS = {
  // Current meal (work in progress)
  CART_ITEMS: '@nutrition_analysis:cart_items',
  RICE_PORTION: '@nutrition_analysis:rice_portion',
  MEAL_METADATA: '@nutrition_analysis:meal_metadata',
  
  // Pending queue (belum ter-sync)
  PENDING_SCANS: '@nutrition_analysis:pending_scans',
  PENDING_PHOTOS: '@nutrition_analysis:pending_photos',
  PENDING_FEEDBACK: '@nutrition_analysis:pending_feedback',
  
  // Completed scans (local history)
  COMPLETED_SCANS: '@nutrition_analysis:completed_scans',
  SCANS_INDEX: '@nutrition_analysis:scans_index',
  
  // Local nutrition data
  FOOD_NUTRITION_DB: '@nutrition_analysis:food_nutrition_db',
  
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
    console.error(`[MealOfflineAPI] Failed to load ${key}:`, error);
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
// PUBLIC API - Cart Operations
// ---------------------------------------------------------------------------

export class MealOfflineAPI {
  // -------------------------------------------------------------------------
  // Cart Management
  // -------------------------------------------------------------------------

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

  // -------------------------------------------------------------------------
  // Rice Portion & Meal Metadata
  // -------------------------------------------------------------------------

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

  // -------------------------------------------------------------------------
  // Data Preparation for Sync
  // -------------------------------------------------------------------------

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

  // -------------------------------------------------------------------------
  // Pending Queue Management
  // -------------------------------------------------------------------------

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

  static async updatePendingScanAttempts(localId: string): Promise<void> {
    const pending = await this.getPendingScans();
    const scan = pending.find(s => s.localId === localId);
    
    if (scan) {
      scan.attempts += 1;
      scan.lastAttempt = getCurrentTimestamp();
      await saveToStorage(STORAGE_KEYS.PENDING_SCANS, pending);
    }
  }

  static async addToPendingPhotos(photoUri: string, metadata: { mealType?: string }): Promise<void> {
    const pending = await loadFromStorage<PendingPhoto[]>(STORAGE_KEYS.PENDING_PHOTOS) || [];
    
    pending.push({
      localId: generateLocalId(),
      photoUri,
      metadata: {
        ...metadata,
        timestamp: getCurrentTimestamp(),
      },
      attempts: 0,
    });

    await saveToStorage(STORAGE_KEYS.PENDING_PHOTOS, pending);
  }

  static async getPendingPhotos(): Promise<PendingPhoto[]> {
    return await loadFromStorage<PendingPhoto[]>(STORAGE_KEYS.PENDING_PHOTOS) || [];
  }

  static async removePendingPhoto(localId: string): Promise<void> {
    const pending = await this.getPendingPhotos();
    const filtered = pending.filter(photo => photo.localId !== localId);
    await saveToStorage(STORAGE_KEYS.PENDING_PHOTOS, filtered);
  }

  static async addToPendingFeedback(scanId: string, feedbackData: any): Promise<void> {
    const pending = await loadFromStorage<PendingFeedback[]>(STORAGE_KEYS.PENDING_FEEDBACK) || [];
    
    pending.push({
      localId: generateLocalId(),
      scanId,
      feedbackData,
      createdAt: getCurrentTimestamp(),
      attempts: 0,
    });

    await saveToStorage(STORAGE_KEYS.PENDING_FEEDBACK, pending);
  }

  static async getPendingFeedback(): Promise<PendingFeedback[]> {
    return await loadFromStorage<PendingFeedback[]>(STORAGE_KEYS.PENDING_FEEDBACK) || [];
  }

  static async removePendingFeedback(localId: string): Promise<void> {
    const pending = await this.getPendingFeedback();
    const filtered = pending.filter(fb => fb.localId !== localId);
    await saveToStorage(STORAGE_KEYS.PENDING_FEEDBACK, filtered);
  }

  // -------------------------------------------------------------------------
  // Local Nutrition Calculation
  // -------------------------------------------------------------------------

  /**
   * Calculate nutrition OFFLINE menggunakan formula matematika sederhana
   */
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

    // Calculate from cart items
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

    // Add rice nutrition
    const riceGrams = getRiceGrams(ricePortion);
    if (riceGrams > 0) {
      // Rice nutrition per 100g: ~130 cal, 2.7g protein, 28g carbs, 0.3g fats
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

  /**
   * Get food nutrition data dari local database
   */
  static async getFoodNutritionData(foodId: string): Promise<FoodNutritionData | null> {
    const db = await loadFromStorage<Record<string, FoodNutritionData>>(STORAGE_KEYS.FOOD_NUTRITION_DB);
    return db ? db[foodId] || null : null;
  }

  /**
   * Quick calorie estimation untuk preview
   */
  static async estimateCalories(items: CartItem[], ricePortion: number): Promise<number> {
    const nutrition = await this.calculateMealNutrition(items, ricePortion);
    return nutrition.calories;
  }

  // -------------------------------------------------------------------------
  // Local Scans History Management
  // -------------------------------------------------------------------------

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

    // Update index
    await this.updateScansIndex();
  }

  static async getAllLocalScans(sortBy?: ScanSortOption, limit?: number): Promise<LocalNutritionScan[]> {
    if (completedScansCache.length === 0) {
      const stored = await loadFromStorage<LocalNutritionScan[]>(STORAGE_KEYS.COMPLETED_SCANS);
      completedScansCache = stored || [];
    }

    let scans = [...completedScansCache];

    // Sort
    if (sortBy === 'date-desc') {
      scans.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());
    } else if (sortBy === 'date-asc') {
      scans.sort((a, b) => new Date(a.lastModified).getTime() - new Date(b.lastModified).getTime());
    } else if (sortBy === 'calories-desc') {
      scans.sort((a, b) => b.calories - a.calories);
    } else if (sortBy === 'calories-asc') {
      scans.sort((a, b) => a.calories - b.calories);
    }

    // Limit
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

  // -------------------------------------------------------------------------
  // Sync Status Tracking
  // -------------------------------------------------------------------------

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

    // Update last sync time
    await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC_TIME, getCurrentTimestamp());
  }

  static async getSyncStatus(): Promise<SyncStatus> {
    const pendingScans = await this.getPendingScans();
    const pendingPhotos = await this.getPendingPhotos();
    const pendingFeedback = await this.getPendingFeedback();
    const lastSyncTime = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC_TIME);

    return {
      lastSyncTime,
      pendingScansCount: pendingScans.length,
      pendingPhotosCount: pendingPhotos.length,
      pendingFeedbackCount: pendingFeedback.length,
    };
  }

  static async getUnsyncedScansCount(): Promise<number> {
    const scans = await this.getAllLocalScans();
    return scans.filter(scan => !scan.isSynced).length;
  }

  // -------------------------------------------------------------------------
  // Data Validation
  // -------------------------------------------------------------------------

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

  // -------------------------------------------------------------------------
  // Utilities
  // -------------------------------------------------------------------------

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
  PendingScan,
  PendingPhoto,
  PendingFeedback,
  LocalNutritionScan,
  SyncStatus,
  FoodNutritionData,
};