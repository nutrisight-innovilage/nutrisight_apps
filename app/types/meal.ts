/**
 * meal.ts
 * ---------------------------------------------------------------------------
 * Unified types untuk meal input dan nutrition output.
 * Menghubungkan mealInputAPI (cart/meal creation) dengan mealOutputAPI (nutrition scans).
 * ---------------------------------------------------------------------------
 */

import { CartItem } from './food';

// ---------------------------------------------------------------------------
// Meal Input Types (dari mealInputAPI.ts)
// ---------------------------------------------------------------------------

/**
 * Metadata meal yang akan disimpan bersama cart
 * untuk keperluan analisis nutrisi
 */
export interface MealMetadata {
  userId?: string;
  /** Porsi nasi dalam satuan piring (0, 0.25, 0.5, 1, 1.5, 2, 3) */
  ricePortion: number;
  /** Timestamp meal dibuat */
  createdAt: string;
  /** Timestamp terakhir diupdate */
  updatedAt: string;
  /** Optional: meal type (breakfast, lunch, dinner, snack) */
  mealType?: MealType;
  /** Optional: catatan user */
  notes?: string;
}

/**
 * Data lengkap untuk analysis submission
 */
export interface NutritionAnalysisPayload {
  items: CartItem[];
  ricePortion: number;
  metadata: MealMetadata;
}

/**
 * Rice portion definition dengan gram conversion
 */
export interface RicePortion {
  value: number;
  label: string;
  grams: number;
}

export const RICE_PORTIONS: RicePortion[] = [
  { value: 0, label: '0 Piring', grams: 0 },
  { value: 0.25, label: '¼ Piring', grams: 50 },
  { value: 0.5, label: '½ Piring', grams: 100 },
  { value: 1, label: '1 Piring', grams: 200 },
  { value: 1.5, label: '1½ Piring', grams: 300 },
  { value: 2, label: '2 Piring', grams: 400 },
  { value: 3, label: '>2 Piring', grams: 500 },
];

// ---------------------------------------------------------------------------
// Meal Output Types (dari mealOutputAPI.ts)
// ---------------------------------------------------------------------------

/**
 * Hasil scan nutrisi yang sudah dianalisis
 * Ini adalah output dari nutrition analysis API
 */
export interface NutritionScan {
  userId?: string;
  id: string;
  foodName: string;
  date: string;
  time: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

/**
 * Extended nutrition scan dengan meal metadata
 * Menghubungkan input (meal items) dengan output (nutrition result)
 */


/**
 * Breakdown nutrisi per item makanan
 */

// ---------------------------------------------------------------------------
// Analysis & Goals Types
// ---------------------------------------------------------------------------

/**
 * Target nutrisi harian user
 */
export interface NutritionGoals {
  calories: { min: number; max: number }; 
  protein: { min: number; max: number; label: string };
  carbs: { min: number; max: number; label: string };
  fats: { min: number; max: number; label: string };
}

/**
 * Insights mingguan dari nutrition scans
 */
export interface WeeklyInsight {
  totalCalories: number;
  avgCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFats: number;
  mealsCount: number;
}

/**
 * Data point untuk charting
 */
export interface ChartDataPoint {
  x: string;
  y: number;
  color: string;
}

// ---------------------------------------------------------------------------
// API Request/Response Types
// ---------------------------------------------------------------------------

/**
 * Request body untuk submit meal analysis
 * Dikirim dari mealInputAPI ke backend
 */
export interface AnalyzeMealRequest {
  items: CartItem[];
  ricePortion: number;
  riceGrams: number;
  metadata: MealMetadata;
}

/**
 * Response dari meal analysis API
 */
export interface AnalyzeMealResponse {
  success: boolean;
  scan?: NutritionScan;
  analysisId?: string;
  message: string;
}

/**
 * Response untuk get scans dengan filters
 */
export interface GetScansResponse {
  scans: NutritionScan[];
  totalCount: number;
  page?: number;
  pageSize?: number;
}

// ---------------------------------------------------------------------------
// Display Types (untuk UI components)
// ---------------------------------------------------------------------------

/**
 * Extended cart item untuk display dengan food details
 */
export interface CartDisplayItem extends CartItem {
  foodName: string;
  description: string;
  imageUrl: string;
  category: string;
}

/**
 * Meal summary untuk display di UI
 */
export interface MealSummary {
  itemCount: number;
  totalQuantity: number;
  ricePortion: number;
  riceGrams: number;
  estimatedCalories?: number;
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  createdAt: string;
}


// ---------------------------------------------------------------------------
// Utility Types
// ---------------------------------------------------------------------------

/**
 * Meal type enum
 */
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

/**
 * Analysis status
 */
export type AnalysisStatus = 'pending' | 'analyzing' | 'completed' | 'failed';

/**
 * Date range filter
 */
export interface DateRangeFilter {
  startDate: string;
  endDate: string;
}

/**
 * Sorting options untuk scans
 */
export type ScanSortOption = 'date-desc' | 'date-asc' | 'calories-desc' | 'calories-asc' | "manual-asc" | "manual-desc";