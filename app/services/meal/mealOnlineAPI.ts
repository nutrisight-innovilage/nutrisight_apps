/**
 * mealOnlineAPI.ts (FIXED - APPWRITE VERSION)
 * ---------------------------------------------------------------------------
 * Service layer untuk ONLINE meal & nutrition operations.
 * 
 * FIXES APPLIED:
 * • ✅ JSON.stringify for items array (Appwrite limitation)
 * • ✅ JSON.parse for goals nested objects
 * • ✅ Proper type definitions (Raw vs Application types)
 * • ✅ Real nutrition calculations from menu_items
 * • ✅ Error handling improvements
 * ---------------------------------------------------------------------------
 */

import {
  databases,
  DATABASE_ID,
  COLLECTIONS,
  generateId,
  QueryHelpers,
  handleAppwriteError,
} from '@/app/services/appwriteConfig';
import {
  NutritionScan,
  AnalyzeMealRequest,
  AnalyzeMealResponse,
  WeeklyInsight,
  NutritionGoals,
} from '@/app/types/meal';
import { CartItem } from '@/app/types/food';
import { Models, Query } from 'appwrite';

// ---------------------------------------------------------------------------
// RAW Types (from Appwrite Database)
// ---------------------------------------------------------------------------

/**
 * Raw Appwrite Document for NutritionScan
 * items stored as JSON string (Appwrite limitation)
 */
interface NutritionScanDocumentRaw extends Models.Document {
  userId: string;
  date: string;
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  items: string; // ✅ JSON string in database
  ricePortion: number;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFats: number;
  notes?: string;
}

/**
 * Raw Appwrite Document for NutritionGoals
 * All nested objects stored as JSON strings
 */
interface NutritionGoalsDocumentRaw extends Models.Document {
  userId: string;
  calories: string; // ✅ JSON string: { min, max }
  protein: string;  // ✅ JSON string: { min, max, label }
  carbs: string;    // ✅ JSON string: { min, max, label }
  fats: string;     // ✅ JSON string: { min, max, label }
}

/**
 * Menu item nutrition data (from menu_items collection)
 */
interface MenuItemNutrition {
  id: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

// ---------------------------------------------------------------------------
// Type Conversions
// ---------------------------------------------------------------------------

/**
 * Convert Raw Appwrite Document to NutritionScan
 */
const convertToNutritionScan = (doc: NutritionScanDocumentRaw): NutritionScan => {
  const date = new Date(doc.date);
  
  return {
    id: doc.$id,
    userId: doc.userId,
    foodName: doc.mealType 
      ? `${doc.mealType.charAt(0).toUpperCase() + doc.mealType.slice(1)}`
      : 'My Meal',
    date: date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    }),
    time: date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    }),
    calories: doc.totalCalories,
    protein: doc.totalProtein,
    carbs: doc.totalCarbs,
    fats: doc.totalFats,
  };
};

/**
 * Convert Raw NutritionGoals Document to NutritionGoals
 * Parse all JSON strings
 */
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
    // Return default structure if parsing fails
    return {
      calories: { min: 1800, max: 2200 },
      protein: { min: 50, max: 100, label: 'Moderate' },
      carbs: { min: 200, max: 300, label: 'Moderate' },
      fats: { min: 50, max: 80, label: 'Moderate' },
    };
  }
};

// ---------------------------------------------------------------------------
// Meal Online API (FIXED)
// ---------------------------------------------------------------------------

export class MealOnlineAPI {
  // -------------------------------------------------------------------------
  // Core Meal Analysis (FIXED)
  // -------------------------------------------------------------------------

  /**
   * Analyze meal and calculate nutrition
   * FIXED: Real nutrition calculations from menu_items
   */
  static async analyzeMeal(request: AnalyzeMealRequest): Promise<AnalyzeMealResponse> {
    try {
      console.log('[MealOnlineAPI] Analyzing meal...');

      // ========================================================================
      // STEP 1: Fetch REAL nutrition data from menu_items
      // ========================================================================
      
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

      // ========================================================================
      // STEP 2: Create nutrition map for quick lookup
      // ========================================================================
      
      const nutritionMap: Record<string, MenuItemNutrition> = {};
      nutritionData.forEach(data => {
        if (data) {
          nutritionMap[data.id] = data;
        }
      });

      // ========================================================================
      // STEP 3: Calculate totals with REAL data
      // ========================================================================
      
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
        } else {
          console.warn(`[MealOnlineAPI] No nutrition data found for item: ${item.id}`);
        }
      });

      // ========================================================================
      // STEP 4: Add rice nutrition (based on grams)
      // ========================================================================
      
      const riceCalories = request.riceGrams * 1.3; // ~130 cal per 100g
      const riceProtein = request.riceGrams * 0.027; // ~2.7g per 100g
      const riceCarbs = request.riceGrams * 0.28; // ~28g per 100g
      const riceFats = request.riceGrams * 0.003; // ~0.3g per 100g

      totalCalories += riceCalories;
      totalProtein += riceProtein;
      totalCarbs += riceCarbs;
      totalFats += riceFats;

      // ========================================================================
      // STEP 5: Create scan document in Appwrite
      // ========================================================================
      
      const scanDoc = await databases.createDocument<NutritionScanDocumentRaw>(
        DATABASE_ID,
        COLLECTIONS.NUTRITION_SCANS,
        generateId(),
        {
          userId: request.metadata.userId || 'unknown',
          date: new Date().toISOString(),
          mealType: request.metadata.mealType,
          items: JSON.stringify(request.items), // ✅ FIXED: Convert to JSON string
          ricePortion: request.ricePortion,
          totalCalories: Math.round(totalCalories),
          totalProtein: Math.round(totalProtein),
          totalCarbs: Math.round(totalCarbs),
          totalFats: Math.round(totalFats),
          notes: request.metadata.notes,
        }
      );

      // ========================================================================
      // STEP 6: Convert to application type
      // ========================================================================
      
      const scan = convertToNutritionScan(scanDoc);

      console.log('[MealOnlineAPI] ✅ Meal analyzed and saved');

      return {
        success: true,
        scan: scan,
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

  // -------------------------------------------------------------------------
  // Personalized Thresholds
  // -------------------------------------------------------------------------

  /**
   * Get personalized nutrition thresholds
   * TODO: Implement calculation based on user profile (age, weight, height, activity)
   */
  static async getPersonalizedThresholds(userId?: string): Promise<PersonalizedThresholds | null> {
    try {
      console.log('[MealOnlineAPI] Getting personalized thresholds...');

      // TODO: Fetch user profile and calculate based on:
      // - BMR (Basal Metabolic Rate)
      // - Activity level
      // - Age, weight, height
      // - Goal (lose weight, maintain, gain weight)

      // For now, return sensible defaults
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

      console.log('[MealOnlineAPI] ✅ Personalized thresholds returned (defaults)');
      return thresholds;
    } catch (error) {
      console.error('[MealOnlineAPI] Error getting personalized thresholds:', error);
      return null;
    }
  }

  // -------------------------------------------------------------------------
  // Weekly Insights
  // -------------------------------------------------------------------------

  /**
   * Get weekly insights from nutrition scans
   */
  static async getWeeklyInsights(
    userId: string,
    startDate?: string,
    endDate?: string
  ): Promise<WeeklyInsight> {
    try {
      console.log('[MealOnlineAPI] Fetching weekly insights...');

      // Calculate date range (default to last 7 days)
      const end = endDate ? new Date(endDate) : new Date();
      const start = startDate ? new Date(startDate) : new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Fetch scans in date range for this user
      const response = await databases.listDocuments<NutritionScanDocumentRaw>(
        DATABASE_ID,
        COLLECTIONS.NUTRITION_SCANS,
        [
          Query.equal('userId', userId),
          Query.greaterThan('date', start.toISOString()),
          Query.lessThan('date', end.toISOString()),
          Query.orderDesc('date'),
          Query.limit(100), // Max 100 scans
        ]
      );

      const scans = response.documents;

      // Calculate insights
      const totalCalories = scans.reduce((sum, s) => sum + s.totalCalories, 0);
      const totalProtein = scans.reduce((sum, s) => sum + s.totalProtein, 0);
      const totalCarbs = scans.reduce((sum, s) => sum + s.totalCarbs, 0);
      const totalFats = scans.reduce((sum, s) => sum + s.totalFats, 0);
      const mealsCount = scans.length;

      const insights: WeeklyInsight = {
        totalCalories,
        avgCalories: mealsCount > 0 ? Math.round(totalCalories / mealsCount) : 0,
        totalProtein,
        totalCarbs,
        totalFats,
        mealsCount,
      };

      console.log('[MealOnlineAPI] ✅ Weekly insights calculated');
      return insights;
    } catch (error) {
      console.error('[MealOnlineAPI] Error fetching weekly insights:', error);
      throw handleAppwriteError(error);
    }
  }

  // -------------------------------------------------------------------------
  // Nutrition Goals (FIXED)
  // -------------------------------------------------------------------------

  /**
   * Get nutrition goals
   * FIXED: Parse JSON strings from Appwrite
   */
  static async getNutritionGoals(userId: string): Promise<NutritionGoals | null> {
    try {
      console.log('[MealOnlineAPI] Fetching nutrition goals...');

      // Fetch latest goals for user
      const response = await databases.listDocuments<NutritionGoalsDocumentRaw>(
        DATABASE_ID,
        COLLECTIONS.NUTRITION_GOALS,
        [
          Query.equal('userId', userId),
          Query.orderDesc('$createdAt'),
          Query.limit(1),
        ]
      );

      if (response.documents.length === 0) {
        console.log('[MealOnlineAPI] No nutrition goals found');
        return null;
      }

      const goals = convertToNutritionGoals(response.documents[0]);
      
      console.log('[MealOnlineAPI] ✅ Nutrition goals fetched');
      return goals;
    } catch (error) {
      console.error('[MealOnlineAPI] Error fetching nutrition goals:', error);
      return null;
    }
  }

  /**
   * Save/Update nutrition goals
   * FIXED: Stringify nested objects before saving
   */
  static async saveNutritionGoals(userId: string, goals: NutritionGoals): Promise<boolean> {
    try {
      console.log('[MealOnlineAPI] Saving nutrition goals...');

      // Check if goals already exist
      const existingGoals = await databases.listDocuments<NutritionGoalsDocumentRaw>(
        DATABASE_ID,
        COLLECTIONS.NUTRITION_GOALS,
        [
          Query.equal('userId', userId),
          Query.limit(1),
        ]
      );

      const goalsData = {
        userId,
        calories: JSON.stringify(goals.calories), // ✅ FIXED: Stringify
        protein: JSON.stringify(goals.protein),   // ✅ FIXED: Stringify
        carbs: JSON.stringify(goals.carbs),       // ✅ FIXED: Stringify
        fats: JSON.stringify(goals.fats),         // ✅ FIXED: Stringify
      };

      if (existingGoals.documents.length > 0) {
        // Update existing
        await databases.updateDocument(
          DATABASE_ID,
          COLLECTIONS.NUTRITION_GOALS,
          existingGoals.documents[0].$id,
          goalsData
        );
      } else {
        // Create new
        await databases.createDocument(
          DATABASE_ID,
          COLLECTIONS.NUTRITION_GOALS,
          generateId(),
          goalsData
        );
      }

      console.log('[MealOnlineAPI] ✅ Nutrition goals saved');
      return true;
    } catch (error) {
      console.error('[MealOnlineAPI] Error saving nutrition goals:', error);
      return false;
    }
  }

  // -------------------------------------------------------------------------
  // Scan Management
  // -------------------------------------------------------------------------

  /**
   * Get scan by ID
   */
  static async getScanById(scanId: string): Promise<NutritionScan | null> {
    try {
      const doc = await databases.getDocument<NutritionScanDocumentRaw>(
        DATABASE_ID,
        COLLECTIONS.NUTRITION_SCANS,
        scanId
      );

      return convertToNutritionScan(doc);
    } catch (error) {
      console.error('[MealOnlineAPI] Error fetching scan:', error);
      return null;
    }
  }

  /**
   * Update scan
   */
  static async updateScan(
    scanId: string, 
    updates: Partial<Omit<NutritionScan, 'id' | 'userId'>>
  ): Promise<boolean> {
    try {
      console.log('[MealOnlineAPI] Updating scan...');

      // Note: Only update fields that are in Appwrite schema
      const updateData: any = {};

      if (updates.calories !== undefined) updateData.totalCalories = updates.calories;
      if (updates.protein !== undefined) updateData.totalProtein = updates.protein;
      if (updates.carbs !== undefined) updateData.totalCarbs = updates.carbs;
      if (updates.fats !== undefined) updateData.totalFats = updates.fats;

      await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.NUTRITION_SCANS,
        scanId,
        updateData
      );

      console.log('[MealOnlineAPI] ✅ Scan updated');
      return true;
    } catch (error) {
      console.error('[MealOnlineAPI] Error updating scan:', error);
      return false;
    }
  }

  /**
   * Delete scan
   */
  static async deleteScan(scanId: string): Promise<boolean> {
    try {
      console.log('[MealOnlineAPI] Deleting scan...');

      await databases.deleteDocument(
        DATABASE_ID,
        COLLECTIONS.NUTRITION_SCANS,
        scanId
      );

      console.log('[MealOnlineAPI] ✅ Scan deleted');
      return true;
    } catch (error) {
      console.error('[MealOnlineAPI] Error deleting scan:', error);
      return false;
    }
  }

  // -------------------------------------------------------------------------
  // Health Check
  // -------------------------------------------------------------------------

  /**
   * Check API health & connectivity
   */
  static async healthCheck(): Promise<boolean> {
    try {
      await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.NUTRITION_SCANS,
        [Query.limit(1)]
      );
      return true;
    } catch (error) {
      console.error('[MealOnlineAPI] Health check failed:', error);
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