/**
 * mealOnlineAPI.ts (v2.1 - balancedMealsCount + No Mock Data)
 * ---------------------------------------------------------------------------
 * Service layer untuk ONLINE meal & nutrition operations.
 * 
 * v2.1 Changes:
 * • ✅ WeeklyInsight now includes balancedMealsCount
 * • ✅ Removed all hardcoded/mock menu item references
 * • ✅ All nutrition data comes from Appwrite menu_items collection
 * ---------------------------------------------------------------------------
 */

import {
  databases,
  DATABASE_ID,
  COLLECTIONS,
  generateId,
  QueryHelpers,
  handleAppwriteError,
} from '@/app/config/appwriteConfig';
import {
  NutritionScan,
  AnalyzeMealRequest,
  AnalyzeMealResponse,
  WeeklyInsight,
  NutritionGoals,
  BulkSyncResult,
} from '@/app/types/meal';
import { CartItem } from '@/app/types/food';
import { Models, Query } from 'appwrite';
import { isMealBalanced } from '@/app/utils/nutritionUtils';

// ---------------------------------------------------------------------------
// Raw Types (from Appwrite Database)
// ---------------------------------------------------------------------------

interface NutritionScanDocumentRaw extends Models.Document {
  userId: string;
  date: string;
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  items: string;
  ricePortion: number;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFats: number;
  notes?: string;
}

interface NutritionGoalsDocumentRaw extends Models.Document {
  userId: string;
  calories: string;
  protein: string;
  carbs: string;
  fats: string;
}

interface MenuItemNutrition {
  id: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BATCH_SIZE = 15;
const DELAY_BETWEEN_BATCHES = 1000;
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ---------------------------------------------------------------------------
// Type Conversions
// ---------------------------------------------------------------------------

const convertToNutritionScan = (doc: NutritionScanDocumentRaw): NutritionScan => {
  const date = new Date(doc.date);
  
  return {
    id: doc.$id,
    userId: doc.userId,
    foodName: doc.mealType 
      ? `${doc.mealType.charAt(0).toUpperCase() + doc.mealType.slice(1)}`
      : 'My Meal',
    date: date.toLocaleDateString('en-US', { 
      month: 'short', day: 'numeric', year: 'numeric',
    }),
    time: date.toLocaleTimeString('en-US', { 
      hour: '2-digit', minute: '2-digit',
    }),
    calories: doc.totalCalories,
    protein: doc.totalProtein,
    carbs: doc.totalCarbs,
    fats: doc.totalFats,
  };
};

const convertToNutritionGoals = (doc: NutritionGoalsDocumentRaw): NutritionGoals => {
  try {
    return {
      calories: JSON.parse(doc.calories),
      protein: JSON.parse(doc.protein),
      carbs: JSON.parse(doc.carbs),
      fats: JSON.parse(doc.fats),
    };
  } catch (error) {
    console.error('[MealOnlineAPI] Failed to parse nutrition goals:', error);
    return {
      calories: { min: 1800, max: 2200 },
      protein: { min: 50, max: 100, label: 'Moderate' },
      carbs: { min: 200, max: 300, label: 'Moderate' },
      fats: { min: 50, max: 80, label: 'Moderate' },
    };
  }
};

// ---------------------------------------------------------------------------
// Meal Online API (v2.1)
// ---------------------------------------------------------------------------

export class MealOnlineAPI {

  // =========================================================================
  // MEAL ANALYSIS - fetches nutrition from Appwrite menu_items
  // =========================================================================

  static async analyzeMeal(request: AnalyzeMealRequest): Promise<AnalyzeMealResponse> {
    try {
      console.log('[MealOnlineAPI] Analyzing meal...');

      // Fetch nutrition data from Appwrite menu_items
      const itemIds = request.items.map(item => item.id);
      
      const nutritionData = await Promise.all(
        itemIds.map(async (id) => {
          try {
            const doc = await databases.getDocument(
              DATABASE_ID,
              COLLECTIONS.MENU_ITEMS,
              id
            );
            return {
              id: doc.$id,
              calories: doc.calories || 0,
              protein: doc.protein || 0,
              carbs: doc.carbs || 0,
              fat: doc.fat || 0,
            } as MenuItemNutrition;
          } catch (error) {
            console.error(`[MealOnlineAPI] Failed to fetch nutrition for ${id}:`, error);
            return null;
          }
        })
      );

      // Create nutrition map
      const nutritionMap: Record<string, MenuItemNutrition> = {};
      nutritionData.forEach(data => {
        if (data) nutritionMap[data.id] = data;
      });

      // Calculate totals
      let totalCalories = 0;
      let totalProtein = 0;
      let totalCarbs = 0;
      let totalFats = 0;

      request.items.forEach(item => {
        const nutrition = nutritionMap[item.id];
        if (nutrition) {
          totalCalories += nutrition.calories * item.quantity;
          totalProtein += nutrition.protein * item.quantity;
          totalCarbs += nutrition.carbs * item.quantity;
          totalFats += nutrition.fat * item.quantity;
        }
      });

      // Add rice nutrition
      const riceCalories = request.riceGrams * 1.3;
      const riceProtein = request.riceGrams * 0.027;
      const riceCarbs = request.riceGrams * 0.28;
      const riceFats = request.riceGrams * 0.003;

      totalCalories += riceCalories;
      totalProtein += riceProtein;
      totalCarbs += riceCarbs;
      totalFats += riceFats;

      // Create scan document in Appwrite
      const scanDoc = await databases.createDocument<NutritionScanDocumentRaw>(
        DATABASE_ID,
        COLLECTIONS.NUTRITION_SCANS,
        generateId(),
        {
          userId: request.metadata.userId || 'unknown',
          date: new Date().toISOString(),
          mealType: request.metadata.mealType,
          items: JSON.stringify(request.items),
          ricePortion: request.ricePortion,
          totalCalories: Math.round(totalCalories),
          totalProtein: Math.round(totalProtein),
          totalCarbs: Math.round(totalCarbs),
          totalFats: Math.round(totalFats),
          notes: request.metadata.notes,
        }
      );

      const scan = convertToNutritionScan(scanDoc);

      console.log('[MealOnlineAPI] ✅ Meal analyzed and saved');
      return {
        success: true,
        scan,
        analysisId: scan.id,
        message: 'Meal analyzed successfully',
      };
    } catch (error) {
      console.error('[MealOnlineAPI] Error analyzing meal:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Analysis failed',
      };
    }
  }

  // =========================================================================
  // BULK UPLOAD
  // =========================================================================

  static async bulkUploadScans(scans: any[]): Promise<BulkSyncResult> {
    console.log(`[MealOnlineAPI:BulkUpload] Starting bulk upload of ${scans.length} scans...`);

    const syncedIds: string[] = [];
    const errors: Array<{ localId: string; error: string }> = [];

    try {
      const batches: any[][] = [];
      for (let i = 0; i < scans.length; i += BATCH_SIZE) {
        batches.push(scans.slice(i, i + BATCH_SIZE));
      }

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const batchResult = await this.processScanBatch(batch);
        syncedIds.push(...batchResult.syncedIds);
        errors.push(...batchResult.errors);

        if (i < batches.length - 1) await delay(DELAY_BETWEEN_BATCHES);
      }

      return {
        success: syncedIds.length > 0,
        syncedCount: syncedIds.length,
        failedCount: errors.length,
        syncedIds,
        errors,
      };
    } catch (error) {
      console.error('[MealOnlineAPI:BulkUpload] Fatal error:', error);
      return {
        success: false,
        syncedCount: syncedIds.length,
        failedCount: scans.length - syncedIds.length,
        syncedIds,
        errors: [...errors, {
          localId: 'bulk_fatal',
          error: error instanceof Error ? error.message : 'Unknown error',
        }],
      };
    }
  }

  private static async processScanBatch(batch: any[]): Promise<{
    syncedIds: string[];
    errors: Array<{ localId: string; error: string }>;
  }> {
    const syncedIds: string[] = [];
    const errors: Array<{ localId: string; error: string }> = [];

    for (const scan of batch) {
      try {
        if (!scan.userId || scan.calories === undefined) {
          throw new Error('Invalid scan data');
        }

        await databases.createDocument(
          DATABASE_ID,
          COLLECTIONS.NUTRITION_SCANS,
          generateId(),
          {
            userId: scan.userId,
            date: scan.date || scan.lastModified || new Date().toISOString(),
            mealType: scan.mealType,
            items: JSON.stringify(scan.items || []),
            ricePortion: scan.ricePortion || 1,
            totalCalories: Math.round(scan.calories),
            totalProtein: Math.round(scan.protein || 0),
            totalCarbs: Math.round(scan.carbs || 0),
            totalFats: Math.round(scan.fats || 0),
            notes: scan.notes || '',
          }
        );

        syncedIds.push(scan.localId || scan.id);
      } catch (error) {
        errors.push({
          localId: scan.localId || scan.id,
          error: error instanceof Error ? error.message : 'Upload failed',
        });
      }
    }

    return { syncedIds, errors };
  }

  // =========================================================================
  // PERSONALIZED THRESHOLDS
  // =========================================================================

  static async getPersonalizedThresholds(userId?: string): Promise<PersonalizedThresholds | null> {
    try {
      // TODO: Fetch from user profile when personalization is implemented
      const thresholds: PersonalizedThresholds = {
        calories: { min: 1800, max: 2200 },
        protein: { min: 50, max: 100 },
        carbs: { min: 200, max: 300 },
        fats: { min: 50, max: 80 },
        calculatedAt: new Date().toISOString(),
        basedOn: { activityLevel: 'moderate', goal: 'maintain' },
      };
      return thresholds;
    } catch (error) {
      console.error('[MealOnlineAPI] Error getting personalized thresholds:', error);
      return null;
    }
  }

  // =========================================================================
  // WEEKLY INSIGHTS (v2.1 - with balancedMealsCount)
  // =========================================================================

  static async getWeeklyInsights(
    userId: string,
    startDate?: string,
    endDate?: string
  ): Promise<WeeklyInsight> {
    try {
      console.log('[MealOnlineAPI] Fetching weekly insights...');

      const end = endDate ? new Date(endDate) : new Date();
      const start = startDate ? new Date(startDate) : new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);

      const response = await databases.listDocuments<NutritionScanDocumentRaw>(
        DATABASE_ID,
        COLLECTIONS.NUTRITION_SCANS,
        [
          Query.equal('userId', userId),
          Query.greaterThan('date', start.toISOString()),
          Query.lessThan('date', end.toISOString()),
          Query.orderDesc('date'),
          Query.limit(100),
        ]
      );

      const scans = response.documents;
      const nutritionScans = scans.map(convertToNutritionScan);

      const totalCalories = scans.reduce((sum, s) => sum + s.totalCalories, 0);
      const totalProtein = scans.reduce((sum, s) => sum + s.totalProtein, 0);
      const totalCarbs = scans.reduce((sum, s) => sum + s.totalCarbs, 0);
      const totalFats = scans.reduce((sum, s) => sum + s.totalFats, 0);
      const mealsCount = scans.length;

      // ✅ v2.1: Count balanced meals
      const balancedMealsCount = nutritionScans.filter(scan => isMealBalanced(scan)).length;

      const insights: WeeklyInsight = {
        totalCalories,
        avgCalories: mealsCount > 0 ? Math.round(totalCalories / mealsCount) : 0,
        totalProtein,
        totalCarbs,
        totalFats,
        mealsCount,
        balancedMealsCount,
      };

      console.log('[MealOnlineAPI] ✅ Weekly insights calculated');
      return insights;
    } catch (error) {
      console.error('[MealOnlineAPI] Error fetching weekly insights:', error);
      throw handleAppwriteError(error);
    }
  }

  // =========================================================================
  // NUTRITION GOALS
  // =========================================================================

  static async getNutritionGoals(userId: string): Promise<NutritionGoals | null> {
    try {
      const response = await databases.listDocuments<NutritionGoalsDocumentRaw>(
        DATABASE_ID,
        COLLECTIONS.NUTRITION_GOALS,
        [
          Query.equal('userId', userId),
          Query.orderDesc('$createdAt'),
          Query.limit(1),
        ]
      );

      if (response.documents.length === 0) return null;
      return convertToNutritionGoals(response.documents[0]);
    } catch (error) {
      console.error('[MealOnlineAPI] Error fetching nutrition goals:', error);
      return null;
    }
  }

  static async saveNutritionGoals(userId: string, goals: NutritionGoals): Promise<boolean> {
    try {
      const existingGoals = await databases.listDocuments<NutritionGoalsDocumentRaw>(
        DATABASE_ID,
        COLLECTIONS.NUTRITION_GOALS,
        [Query.equal('userId', userId), Query.limit(1)]
      );

      const goalsData = {
        userId,
        calories: JSON.stringify(goals.calories),
        protein: JSON.stringify(goals.protein),
        carbs: JSON.stringify(goals.carbs),
        fats: JSON.stringify(goals.fats),
      };

      if (existingGoals.documents.length > 0) {
        await databases.updateDocument(
          DATABASE_ID, COLLECTIONS.NUTRITION_GOALS,
          existingGoals.documents[0].$id, goalsData
        );
      } else {
        await databases.createDocument(
          DATABASE_ID, COLLECTIONS.NUTRITION_GOALS,
          generateId(), goalsData
        );
      }

      return true;
    } catch (error) {
      console.error('[MealOnlineAPI] Error saving nutrition goals:', error);
      return false;
    }
  }

  // =========================================================================
  // SCAN MANAGEMENT
  // =========================================================================

  static async getScanById(scanId: string): Promise<NutritionScan | null> {
    try {
      const doc = await databases.getDocument<NutritionScanDocumentRaw>(
        DATABASE_ID, COLLECTIONS.NUTRITION_SCANS, scanId
      );
      return convertToNutritionScan(doc);
    } catch (error) {
      console.error('[MealOnlineAPI] Error fetching scan:', error);
      return null;
    }
  }

  static async updateScan(
    scanId: string, 
    updates: Partial<Omit<NutritionScan, 'id' | 'userId'>>
  ): Promise<boolean> {
    try {
      const updateData: any = {};
      if (updates.calories !== undefined) updateData.totalCalories = updates.calories;
      if (updates.protein !== undefined) updateData.totalProtein = updates.protein;
      if (updates.carbs !== undefined) updateData.totalCarbs = updates.carbs;
      if (updates.fats !== undefined) updateData.totalFats = updates.fats;

      await databases.updateDocument(
        DATABASE_ID, COLLECTIONS.NUTRITION_SCANS, scanId, updateData
      );
      return true;
    } catch (error) {
      console.error('[MealOnlineAPI] Error updating scan:', error);
      return false;
    }
  }

  static async deleteScan(scanId: string): Promise<boolean> {
    try {
      await databases.deleteDocument(DATABASE_ID, COLLECTIONS.NUTRITION_SCANS, scanId);
      return true;
    } catch (error) {
      console.error('[MealOnlineAPI] Error deleting scan:', error);
      return false;
    }
  }

  // =========================================================================
  // HEALTH CHECK
  // =========================================================================

  static async healthCheck(): Promise<boolean> {
    try {
      await databases.listDocuments(DATABASE_ID, COLLECTIONS.NUTRITION_SCANS, [Query.limit(1)]);
      return true;
    } catch (error) {
      return false;
    }
  }
}

// ---------------------------------------------------------------------------
// Export Types
// ---------------------------------------------------------------------------

export interface PersonalizedThresholds {
  calories: { min: number; max: number };
  protein: { min: number; max: number };
  carbs: { min: number; max: number };
  fats: { min: number; max: number };
  calculatedAt: string;
  basedOn: {
    age?: number;
    weight?: number;
    height?: number;
    activityLevel?: string;
    goal?: string;
  };
}

export type {
  NutritionScanDocumentRaw,
  NutritionGoalsDocumentRaw,
  MenuItemNutrition,
};