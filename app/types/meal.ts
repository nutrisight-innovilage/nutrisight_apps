/**
 * meal.ts (v2.1 COMPLETE)
 * ---------------------------------------------------------------------------
 * Unified types untuk meal input dan nutrition output.
 * 
 * v2.1 Changes:
 * • ✅ WeeklyInsight: added balancedMealsCount + aiSummary
 * • ✅ PhotoAnalysisAI types for OpenRouter integration
 * • ✅ TodayStatistics type for dashboard
 * ---------------------------------------------------------------------------
 */

import { CartItem } from './food';

// ---------------------------------------------------------------------------
// Meal Input Types
// ---------------------------------------------------------------------------

export interface MealMetadata {
  userId?: string;
  ricePortion: number;
  createdAt: string;
  updatedAt: string;
  mealType?: MealType;
  notes?: string;
}

export interface NutritionAnalysisPayload {
  items: CartItem[];
  ricePortion: number;
  metadata: MealMetadata;
}

export interface RicePortion {
  value: number;
  label: string;
  grams: number;
}

export const RICE_PORTIONS: RicePortion[] = [
  { value: 0, label: '0 Piring', grams: 0 },
  { value: 50, label: '¼ Piring', grams: 50 },
  { value: 100, label: '½ Piring', grams: 100 },
  { value: 200, label: '1 Piring', grams: 200 },
  { value: 300, label: '1½ Piring', grams: 300 },
  { value: 400, label: '2 Piring', grams: 400 },
  { value: 500, label: '>2 Piring', grams: 500 },
];

// ---------------------------------------------------------------------------
// Meal Output Types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Photo Analysis Types (v2.0)
// ---------------------------------------------------------------------------

export type PhotoAnalysisStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface DetectedItem {
  name: string;
  confidence: number;
  quantity: number;
  estimatedGrams: number;
}

export interface PhotoAnalysis {
  id: string;
  userId: string;
  photoUrl: string;
  localScanId?: string;
  status: PhotoAnalysisStatus;
  detectedItems?: DetectedItem[];
  nutrition?: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
  uploadedAt: string;
  analyzedAt?: string;
  error?: string;
}

export interface AnalyzePhotoRequest {
  photoUri: string;
  metadata?: {
    mealType?: MealType;
    notes?: string;
  };
}

export interface AnalyzePhotoResponse {
  success: boolean;
  scan?: NutritionScan;
  photoAnalysisId?: string;
  message: string;
}

// ---------------------------------------------------------------------------
// Photo Analysis AI Types (v2.1 - OpenRouter)
// ---------------------------------------------------------------------------

/**
 * Result from AI photo analysis via OpenRouter
 */
export interface AIPhotoAnalysisResult {
  success: boolean;
  foods: AIDetectedFood[];
  totalNutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
  mealDescription: string;
  error?: string;
}

/**
 * Individual food detected by AI
 */
export interface AIDetectedFood {
  name: string;
  estimatedGrams: number;
  confidence: number;
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
}

// ---------------------------------------------------------------------------
// Historical Sync Types (v2.0)
// ---------------------------------------------------------------------------

export interface BulkSyncResult {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  syncedIds: string[];
  errors: Array<{ localId: string; error: string }>;
}

export interface HistoricalSyncProgress {
  totalBatches: number;
  completedBatches: number;
  totalScans: number;
  syncedScans: number;
  failedScans: number;
  isComplete: boolean;
}

// ---------------------------------------------------------------------------
// Pending Queue Types (v2.0)
// ---------------------------------------------------------------------------

export interface PendingScan {
  localId: string;
  scanData: NutritionScan;
  mealData: AnalyzeMealRequest;
  createdAt: string;
  attempts: number;
  lastAttempt?: string;
}

export interface PendingPhoto {
  localId: string;
  photoUri: string;
  localScanId?: string;
  metadata: {
    mealType?: MealType;
    notes?: string;
    timestamp: string;
    userId?: string;
  };
  attempts: number;
  lastAttempt?: string;
}

export interface PendingAdvice {
  localId: string;
  firstDate: string;
  lastDate: string;
  message: string;
  createdAt: string;
  attempts: number;
  lastAttempt?: string;
}

// ---------------------------------------------------------------------------
// Analysis & Goals Types
// ---------------------------------------------------------------------------

export interface NutritionGoals {
  calories: { min: number; max: number }; 
  protein: { min: number; max: number; label: string };
  carbs: { min: number; max: number; label: string };
  fats: { min: number; max: number; label: string };
}

/**
 * ✅ v2.1 UPDATED: WeeklyInsight with balancedMealsCount + aiSummary
 * 
 * balancedMealsCount: Number of meals where all macros are within goals
 * aiSummary: One-sentence AI-generated summary (from OpenRouter GPT-4.1)
 */
export interface WeeklyInsight {
  totalCalories: number;
  avgCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFats: number;
  mealsCount: number;
  /** Number of meals with balanced nutrition (all macros within goals) */
  balancedMealsCount: number;
  /** AI-generated one-liner summary of the week (optional, loaded async) */
  aiSummary?: string;
}

/**
 * Today's nutrition statistics for the dashboard
 */
export interface TodayStatistics {
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFats: number;
  mealsCount: number;
  balancedMealsCount: number;
  scans: NutritionScan[];
}

export interface ChartDataPoint {
  x: string;
  y: number;
  color: string;
}

// ---------------------------------------------------------------------------
// API Request/Response Types
// ---------------------------------------------------------------------------

export interface AnalyzeMealRequest {
  items: CartItem[];
  ricePortion: number;
  riceGrams: number;
  metadata: MealMetadata;
}

export interface AnalyzeMealResponse {
  success: boolean;
  scan?: NutritionScan;
  analysisId?: string;
  message: string;
}

export interface GetScansResponse {
  scans: NutritionScan[];
  totalCount: number;
  page?: number;
  pageSize?: number;
}

// ---------------------------------------------------------------------------
// Display Types (untuk UI components)
// ---------------------------------------------------------------------------

export interface CartDisplayItem extends CartItem {
  foodName: string;
  description: string;
  imageUrl: string;
  category: string;
}

export interface MealSummary {
  itemCount: number;
  totalQuantity: number;
  ricePortion: number;
  riceGrams: number;
  estimatedCalories?: number;
  mealType?: MealType;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Utility Types
// ---------------------------------------------------------------------------

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type AnalysisStatus = 'idle' | 'pending' | 'analyzing' | 'completed' | 'failed';

export interface DateRangeFilter {
  startDate: string;
  endDate: string;
}

export type ScanSortOption = 'date-desc' | 'date-asc' | 'calories-desc' | 'calories-asc' | 'manual-asc' | 'manual-desc';