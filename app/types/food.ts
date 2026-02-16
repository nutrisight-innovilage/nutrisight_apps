// ---------------------------------------------------------------------------
// food.types.ts - Type definitions untuk menu system
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Basic FoodItem interface – untuk list / menu
// ---------------------------------------------------------------------------
export interface FoodItem {
  id: string;
  foodName: string;
  description: string;
  imageUrl: string;
  category: string;
}

// ---------------------------------------------------------------------------
// Nutrition interface
// ---------------------------------------------------------------------------
export interface Nutrition {
  protein: number;
  fat: number;
  carbs: number;
  calories: number;
  vitamins: string[];
}

// ---------------------------------------------------------------------------
// Detailed FoodItem interface – untuk detail page
// ---------------------------------------------------------------------------
export interface FoodItemDetail extends FoodItem {
  nutrition: Nutrition;
  recipe: string;
}

// ---------------------------------------------------------------------------
// Cart item interface – lightweight, hanya id + qty.
// Price di-resolve dari FoodItem saat dibutuhkan.
// ---------------------------------------------------------------------------
export interface CartItem {
  id: string;
  quantity: number;
}

// ---------------------------------------------------------------------------
// Sort options
// ---------------------------------------------------------------------------
export type SortOption = 'name-asc' | 'name-desc';

// ---------------------------------------------------------------------------
// Sync-related types
// ---------------------------------------------------------------------------

/**
 * Sync result dari Appwrite
 */
export interface MenuSyncResult {
  updated: FoodItemDetail[];
  deleted: string[];
  timestamp: string;
}

/**
 * Menu details map - untuk efficient lookup
 */
export type MenuDetailsMap = Record<string, FoodItemDetail>;

/**
 * Sync status response
 */
export interface MenuSyncStatus {
  hasCachedData: boolean;
  lastSync: string | null;
  cacheAge: number | null; // in hours
  needsSync: boolean;
  strategy: 'offline-first-appwrite';
}

/**
 * Sync statistics
 */
export interface SyncStats {
  totalItems: number;
  updated: number;
  deleted: number;
  timestamp: string;
}

/**
 * Failure log untuk debugging
 */
export interface SyncFailureLog {
  timestamp: string;
  payloadId: string;
  error: string;
  retryCount: number;
  silent: boolean;
}

// ---------------------------------------------------------------------------
// API Response types (untuk Appwrite)
// ---------------------------------------------------------------------------

/**
 * Appwrite document response
 */
export interface AppwriteDocument {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  $permissions: string[];
  $collectionId: string;
  $databaseId: string;
}

/**
 * Menu item dari Appwrite (extends AppwriteDocument)
 */
export interface AppwriteMenuItem extends AppwriteDocument {
  foodName: string;
  description: string;
  imageUrl: string;
  category: string;
  nutrition: Nutrition;
  recipe: string;
}

/**
 * Appwrite list response
 */
export interface AppwriteListResponse<T> {
  total: number;
  documents: T[];
}

// ---------------------------------------------------------------------------
// Helper type guards
// ---------------------------------------------------------------------------

/**
 * Check if object is a valid FoodItem
 */
export function isFoodItem(obj: unknown): obj is FoodItem {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'foodName' in obj &&
    'description' in obj &&
    'imageUrl' in obj &&
    'category' in obj &&
    typeof (obj as FoodItem).id === 'string' &&
    typeof (obj as FoodItem).foodName === 'string' &&
    typeof (obj as FoodItem).description === 'string' &&
    typeof (obj as FoodItem).imageUrl === 'string' &&
    typeof (obj as FoodItem).category === 'string'
  );
}

/**
 * Check if object is a valid FoodItemDetail
 */
export function isFoodItemDetail(obj: unknown): obj is FoodItemDetail {
  return (
    isFoodItem(obj) &&
    'nutrition' in obj &&
    'recipe' in obj &&
    typeof (obj as FoodItemDetail).recipe === 'string' &&
    isNutrition((obj as FoodItemDetail).nutrition)
  );
}

/**
 * Check if object is a valid Nutrition
 */
export function isNutrition(obj: unknown): obj is Nutrition {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'protein' in obj &&
    'fat' in obj &&
    'carbs' in obj &&
    'calories' in obj &&
    'vitamins' in obj &&
    typeof (obj as Nutrition).protein === 'number' &&
    typeof (obj as Nutrition).fat === 'number' &&
    typeof (obj as Nutrition).carbs === 'number' &&
    typeof (obj as Nutrition).calories === 'number' &&
    Array.isArray((obj as Nutrition).vitamins) &&
    (obj as Nutrition).vitamins.every((v) => typeof v === 'string')
  );
}

/**
 * Check if object is a valid MenuSyncResult
 */
export function isMenuSyncResult(obj: unknown): obj is MenuSyncResult {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'updated' in obj &&
    'deleted' in obj &&
    'timestamp' in obj &&
    Array.isArray((obj as MenuSyncResult).updated) &&
    (obj as MenuSyncResult).updated.every(isFoodItemDetail) &&
    Array.isArray((obj as MenuSyncResult).deleted) &&
    (obj as MenuSyncResult).deleted.every((id) => typeof id === 'string') &&
    typeof (obj as MenuSyncResult).timestamp === 'string'
  );
}

// ---------------------------------------------------------------------------
// Transformation helpers
// ---------------------------------------------------------------------------

/**
 * Convert AppwriteMenuItem to FoodItemDetail
 */
export function appwriteToFoodItemDetail(
  doc: AppwriteMenuItem
): FoodItemDetail {
  return {
    id: doc.$id,
    foodName: doc.foodName,
    description: doc.description,
    imageUrl: doc.imageUrl,
    category: doc.category,
    nutrition: doc.nutrition,
    recipe: doc.recipe,
  };
}

/**
 * Convert FoodItemDetail to FoodItem (strip detail info)
 */
export function foodItemDetailToFoodItem(detail: FoodItemDetail): FoodItem {
  return {
    id: detail.id,
    foodName: detail.foodName,
    description: detail.description,
    imageUrl: detail.imageUrl,
    category: detail.category,
  };
}

/**
 * Create MenuDetailsMap from array of FoodItemDetail
 */
export function createDetailsMap(
  details: FoodItemDetail[]
): MenuDetailsMap {
  return details.reduce<MenuDetailsMap>((map, detail) => {
    map[detail.id] = detail;
    return map;
  }, {});
}

/**
 * Extract FoodItems from MenuDetailsMap
 */
export function extractFoodItems(detailsMap: MenuDetailsMap): FoodItem[] {
  return Object.values(detailsMap).map(foodItemDetailToFoodItem);
}