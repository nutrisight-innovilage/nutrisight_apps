/**
 * mealOnlineAPI.ts (CLEANED - APPWRITE VERSION)
 * ---------------------------------------------------------------------------
 * Service layer untuk ONLINE meal & nutrition operations - STRICTLY following meal.ts types.
 * 
 * REMOVED BLOAT:
 * • ❌ YOLO photo analysis (not in types, no UI)
 * • ❌ Monthly trends (not in types)
 * • ❌ LLM features (not in types)
 * • ❌ Historical data sync (not in types)
 * • ❌ User feedback (not in types)
 * • ❌ Natural language parsing (not in types)
 * 
 * KEPT ONLY:
 * • ✅ analyzeMeal - Core nutrition calculation
 * • ✅ getWeeklyInsights - Matches WeeklyInsight type
 * • ✅ getNutritionGoals - Matches NutritionGoals type
 * • ✅ getPersonalizedThresholds - Used by mealService
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
// Types (STRICTLY from meal.ts + Appwrite extensions)
// ---------------------------------------------------------------------------

/**
 * PersonalizedThresholds - Used by mealService
 */
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

/**
 * Appwrite Document extension for NutritionScan
 */
interface NutritionScanDocument extends Models.Document {
  userId: string;
  date: string;
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  items: CartItem[];
  ricePortion: number;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFats: number;
  notes?: string;
}

/**
 * Appwrite Document extension for NutritionGoals
 */
interface NutritionGoalsDocument extends Models.Document {
  calories: { min: number; max: number };
  protein: { min: number; max: number; label: string };
  carbs: { min: number; max: number; label: string };
  fats: { min: number; max: number; label: string };
  userId: string;
}

// ---------------------------------------------------------------------------
// Type Conversions
// ---------------------------------------------------------------------------

/**
 * Convert Appwrite document to NutritionScan
 */
const convertToNutritionScan = (doc: NutritionScanDocument): NutritionScan => {
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
 * Convert NutritionGoalsDocument to NutritionGoals
 */
const convertToNutritionGoals = (doc: NutritionGoalsDocument): NutritionGoals => {
  return {
    calories: doc.calories, // Assuming calories stored in carbs field
    protein: doc.protein,
    carbs: doc.carbs,
    fats: doc.fats,
  };
};

// ---------------------------------------------------------------------------
// Meal Online API (Cleaned)
// ---------------------------------------------------------------------------

export class MealOnlineAPI {
  // -------------------------------------------------------------------------
  // Core Meal Analysis
  // -------------------------------------------------------------------------

  /**
   * Analyze meal and calculate nutrition
   * Returns NutritionScan matching meal.ts types
   */
  static async analyzeMeal(request: AnalyzeMealRequest): Promise<AnalyzeMealResponse> {
    try {
      console.log('[MealOnlineAPI] Analyzing meal...');

      // Calculate nutrition totals
      const totalCalories = request.items.reduce((sum, item) => {
        // TODO: Get actual nutrition data from food database
        return sum + (item.quantity * 100); // Placeholder calculation
      }, 0);

      const totalProtein = request.items.reduce((sum, item) => {
        return sum + (item.quantity * 10); // Placeholder
      }, 0);

      const totalCarbs = request.items.reduce((sum, item) => {
        return sum + (item.quantity * 20); // Placeholder
      }, 0);

      const totalFats = request.items.reduce((sum, item) => {
        return sum + (item.quantity * 5); // Placeholder
      }, 0);

      // Add rice nutrition
      const riceCalories = request.riceGrams * 1.3; // ~130 cal per 100g
      const riceProtein = request.riceGrams * 0.027; // ~2.7g per 100g
      const riceCarbs = request.riceGrams * 0.28; // ~28g per 100g
      const riceFats = request.riceGrams * 0.003; // ~0.3g per 100g

      // Create scan document
      const scanDoc = await databases.createDocument<NutritionScanDocument>(
        DATABASE_ID,
        COLLECTIONS.NUTRITION_SCANS,
        generateId(),
        {
          userId: request.metadata.userId || 'unknown',
          date: new Date().toISOString(),
          mealType: request.metadata.mealType,
          items: request.items,
          ricePortion: request.ricePortion,
          totalCalories: totalCalories + riceCalories,
          totalProtein: totalProtein + riceProtein,
          totalCarbs: totalCarbs + riceCarbs,
          totalFats: totalFats + riceFats,
          notes: request.metadata.notes,
        }
      );

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
  // Personalized Thresholds (Used by mealService)
  // -------------------------------------------------------------------------

  /**
   * Get personalized nutrition thresholds
   * Used by mealService.getPersonalizedThresholds()
   */
  static async getPersonalizedThresholds(): Promise<PersonalizedThresholds | null> {
    try {
      console.log('[MealOnlineAPI] Getting personalized thresholds...');

      // TODO: Implement actual calculation based on user profile
      // For now, return default values
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

      console.log('[MealOnlineAPI] ✅ Personalized thresholds returned');
      return thresholds;
    } catch (error) {
      console.error('[MealOnlineAPI] Error getting personalized thresholds:', error);
      return null;
    }
  }

  // -------------------------------------------------------------------------
  // Weekly Insights (Matches meal.ts WeeklyInsight type)
  // -------------------------------------------------------------------------

  /**
   * Get weekly insights matching WeeklyInsight type from meal.ts
   */
  static async getWeeklyInsights(
    startDate?: string,
    endDate?: string,
    includeAdvice: boolean = false
  ): Promise<WeeklyInsight & { advice?: string }> {
    try {
      console.log('[MealOnlineAPI] Fetching weekly insights...');

      // Calculate date range (default to last 7 days)
      const end = endDate ? new Date(endDate) : new Date();
      const start = startDate ? new Date(startDate) : new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Fetch scans in date range
      const response = await databases.listDocuments<NutritionScanDocument>(
        DATABASE_ID,
        COLLECTIONS.NUTRITION_SCANS,
        [
          Query.greaterThan('date', start.toISOString()),
          Query.lessThan('date', end.toISOString()),
          Query.orderDesc('date'),
        ]
      );

      const scans = response.documents;

      // Calculate insights matching WeeklyInsight type
      const totalCalories = scans.reduce((sum, s) => sum + s.totalCalories, 0);
      const totalProtein = scans.reduce((sum, s) => sum + s.totalProtein, 0);
      const totalCarbs = scans.reduce((sum, s) => sum + s.totalCarbs, 0);
      const totalFats = scans.reduce((sum, s) => sum + s.totalFats, 0);
      const mealsCount = scans.length;

      const insights: WeeklyInsight = {
        totalCalories,
        avgCalories: mealsCount > 0 ? totalCalories / mealsCount : 0,
        totalProtein,
        totalCarbs,
        totalFats,
        mealsCount,
      };

      console.log('[MealOnlineAPI] ✅ Weekly insights calculated');

      // Note: includeAdvice parameter kept for compatibility but not implemented
      // as LLM advice is not in meal.ts types
      return insights;
    } catch (error) {
      console.error('[MealOnlineAPI] Error fetching weekly insights:', error);
      throw handleAppwriteError(error);
    }
  }

  // -------------------------------------------------------------------------
  // Nutrition Goals (Matches meal.ts NutritionGoals type)
  // -------------------------------------------------------------------------

  /**
   * Get nutrition goals matching NutritionGoals type from meal.ts
   */
  static async getNutritionGoals(): Promise<NutritionGoals | null> {
    try {
      console.log('[MealOnlineAPI] Fetching nutrition goals...');

      // Fetch latest goals for current user
      const response = await databases.listDocuments<NutritionGoalsDocument>(
        DATABASE_ID,
        COLLECTIONS.NUTRITION_GOALS,
        [
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

// Export only types that are actually used
export type {
  NutritionScanDocument,
  NutritionGoalsDocument,
};