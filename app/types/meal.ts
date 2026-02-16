/**
 * meal.ts (v2.0 COMPLETE)
 * ---------------------------------------------------------------------------
 * Unified types untuk meal input dan nutrition output.
 * 
 * v2.0 Features:
 * • ✅ Photo analysis types
 * • ✅ Historical sync types
 * • ✅ Bulk sync result types
 * ---------------------------------------------------------------------------
 */

import { CartItem } from './food';

// ---------------------------------------------------------------------------
// Meal Input Types
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
// Meal Output Types
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

// ---------------------------------------------------------------------------
// Photo Analysis Types (v2.0)
// ---------------------------------------------------------------------------

/**
 * Status photo analysis
 */
export type PhotoAnalysisStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * Detected item dari AI
 */
export interface DetectedItem {
  name: string;
  confidence: number;        // 0-1
  quantity: number;
  estimatedGrams: number;
}

/**
 * Photo analysis result
 */
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

/**
 * Photo analysis request
 */
export interface AnalyzePhotoRequest {
  photoUri: string;
  metadata?: {
    mealType?: MealType;
    notes?: string;
  };
}

/**
 * Photo analysis response
 */
export interface AnalyzePhotoResponse {
  success: boolean;
  scan?: NutritionScan;
  photoAnalysisId?: string;
  message: string;
}

// ---------------------------------------------------------------------------
// Historical Sync Types (v2.0)
// ---------------------------------------------------------------------------

/**
 * Bulk sync result
 */
export interface BulkSyncResult {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  syncedIds: string[];
  errors: Array<{ localId: string; error: string }>;
}

/**
 * Historical data sync progress
 */
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

/**
 * Pending scan yang belum ter-sync
 */
export interface PendingScan {
  localId: string;
  scanData: NutritionScan;
  mealData: AnalyzeMealRequest;
  createdAt: string;
  attempts: number;
  lastAttempt?: string;
}

/**
 * Pending photo yang belum di-upload (v2.0)
 */
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

/**
 * Pending advice yang belum terkirim (v2.0)
 */
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
  mealType?: MealType;
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
export type ScanSortOption = 'date-desc' | 'date-asc' | 'calories-desc' | 'calories-asc' | 'manual-asc' | 'manual-desc';