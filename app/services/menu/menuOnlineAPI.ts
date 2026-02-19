/**
 * menuOnlineAPI.ts (FIXED - Pagination in syncMenuCache)
 * ---------------------------------------------------------------------------
 * FIXES:
 * • ✅ FIX #1: syncMenuCache() now has pagination loop (was limited to 100)
 * • ✅ FIX #2: full_sync mode fetches ALL items with pagination
 * • ✅ FIX #3: Incremental sync also paginates (>100 updates possible)
 * ---------------------------------------------------------------------------
 */

import { 
  databases, 
  DATABASE_ID, 
  COLLECTIONS,
  QueryHelpers,
  handleAppwriteError,
} from '@/app/config/appwriteConfig';
import { FoodItem, FoodItemDetail } from '@/app/types/food';
import { Models } from 'appwrite';
import { getR2ImageUrl } from '@/app/config/r2Config';

// ---------------------------------------------------------------------------
// Type Conversions (unchanged)
// ---------------------------------------------------------------------------

export interface FoodItemDocument extends Models.Document {
  foodName: string;
  description: string;
  imageUrl: string;
  category: string;
}

export interface FoodItemDetailDocument extends Models.Document {
  foodName: string;
  description: string;
  imageUrl: string;
  category: string;
  protein: number;
  fat: number;
  carbs: number;
  calories: number;
  vitamins: string[];
  recipe: string;
}

const convertToFoodItem = (doc: Models.Document): FoodItem => {
  const data = doc as FoodItemDocument;
  return {
    id: data.$id,
    foodName: data.foodName,
    description: data.description,
    imageUrl: getR2ImageUrl(data.imageUrl),
    category: data.category,
  };
};

const convertToFoodItemDetail = (doc: Models.Document): FoodItemDetail => {
  const data = doc as FoodItemDetailDocument;
  return {
    id: data.$id,
    foodName: data.foodName,
    description: data.description,
    imageUrl: getR2ImageUrl(data.imageUrl),
    category: data.category,
    nutrition: {
      protein: data.protein,
      fat: data.fat,
      carbs: data.carbs,
      calories: data.calories,
      vitamins: data.vitamins || [],
    },
    recipe: data.recipe,
  };
};

// ---------------------------------------------------------------------------
// Menu Online API (Appwrite) - FIXED
// ---------------------------------------------------------------------------

export const menuOnlineAPI = {
  /**
   * Fetch all menu items (basic info only) - WITH PAGINATION
   */
  fetchMenuItems: async (): Promise<FoodItem[]> => {
    try {
      console.log('[menuOnlineAPI] Fetching all menu items...');

      let allItems: FoodItem[] = [];
      let lastId: string | null = null;
      const pageSize = 100;

      while (true) {
        const queries = [
          QueryHelpers.limit(pageSize),
          QueryHelpers.orderAsc('foodName'),
        ];

        if (lastId) {
          queries.push(QueryHelpers.greaterThan('$id', lastId));
        }

        const response = await databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.MENU_ITEMS,
          queries
        );

        const items = response.documents.map(convertToFoodItem);
        allItems = [...allItems, ...items];

        console.log(`[menuOnlineAPI] Fetched page: ${items.length} items (total so far: ${allItems.length})`);

        if (response.documents.length < pageSize) {
          break;
        }

        lastId = response.documents[response.documents.length - 1].$id;
      }

      console.log(`[menuOnlineAPI] ✅ Fetched ${allItems.length} total menu items`);
      return allItems;
    } catch (error) {
      console.error('[menuOnlineAPI] Error fetching menu items:', error);
      throw handleAppwriteError(error);
    }
  },

  /**
   * Fetch detailed food item by ID (unchanged)
   */
  fetchFoodItemDetail: async (id: string): Promise<FoodItemDetail> => {
    try {
      console.log('[menuOnlineAPI] Fetching food item detail:', id);

      const doc = await databases.getDocument(
        DATABASE_ID,
        COLLECTIONS.MENU_ITEMS,
        id
      );

      const detail = convertToFoodItemDetail(doc);
      console.log('[menuOnlineAPI] ✅ Fetched food item detail');
      return detail;
    } catch (error) {
      console.error('[menuOnlineAPI] Error fetching food item detail:', error);
      throw handleAppwriteError(error);
    }
  },

  /**
   * Fetch multiple detailed food items by IDs (unchanged)
   */
  fetchMultipleFoodDetails: async (ids: string[]): Promise<FoodItemDetail[]> => {
    try {
      console.log('[menuOnlineAPI] Fetching multiple food details:', ids.length);

      if (ids.length === 0) {
        return [];
      }

      const details = await Promise.all(
        ids.map(async (id) => {
          try {
            const doc = await databases.getDocument(
              DATABASE_ID,
              COLLECTIONS.MENU_ITEMS,
              id
            );
            return convertToFoodItemDetail(doc);
          } catch (error) {
            console.error(`[menuOnlineAPI] Failed to fetch item ${id}:`, error);
            return null;
          }
        })
      );

      const validDetails = details.filter((d): d is FoodItemDetail => d !== null);

      console.log(`[menuOnlineAPI] ✅ Fetched ${validDetails.length}/${ids.length} food details`);
      return validDetails;
    } catch (error) {
      console.error('[menuOnlineAPI] Error fetching multiple food details:', error);
      throw handleAppwriteError(error);
    }
  },

  /**
   * Search menu items (unchanged)
   */
  searchMenuItems: async (query: string): Promise<FoodItem[]> => {
    try {
      console.log('[menuOnlineAPI] Searching menu items:', query);

      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.MENU_ITEMS,
        [
          QueryHelpers.search('foodName', query),
          QueryHelpers.limit(50),
        ]
      );

      const items = response.documents.map(convertToFoodItem);
      console.log(`[menuOnlineAPI] ✅ Found ${items.length} items`);
      return items;
    } catch (error) {
      console.error('[menuOnlineAPI] Error searching menu items:', error);
      throw handleAppwriteError(error);
    }
  },

  /**
   * Get menu items by category (unchanged)
   */
  fetchMenuByCategory: async (category: string): Promise<FoodItem[]> => {
    try {
      console.log('[menuOnlineAPI] Fetching menu by category:', category);

      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.MENU_ITEMS,
        [
          QueryHelpers.equal('category', category),
          QueryHelpers.orderAsc('foodName'),
          QueryHelpers.limit(100),
        ]
      );

      const items = response.documents.map(convertToFoodItem);
      console.log(`[menuOnlineAPI] ✅ Found ${items.length} items in category`);
      return items;
    } catch (error) {
      console.error('[menuOnlineAPI] Error fetching menu by category:', error);
      throw handleAppwriteError(error);
    }
  },

  /**
   * Get nutritional summary for multiple items (unchanged)
   */
  getNutritionalSummary: async (ids: string[]) => {
    try {
      console.log('[menuOnlineAPI] Calculating nutritional summary for', ids.length, 'items');

      const items = await menuOnlineAPI.fetchMultipleFoodDetails(ids);

      const summary = {
        totalCalories: 0,
        totalProtein: 0,
        totalCarbs: 0,
        totalFats: 0,
        itemCount: items.length,
      };

      items.forEach(item => {
        summary.totalCalories += item.nutrition.calories;
        summary.totalProtein += item.nutrition.protein;
        summary.totalCarbs += item.nutrition.carbs;
        summary.totalFats += item.nutrition.fat;
      });

      console.log('[menuOnlineAPI] ✅ Nutritional summary calculated');
      return summary;
    } catch (error) {
      console.error('[menuOnlineAPI] Error calculating nutritional summary:', error);
      throw handleAppwriteError(error);
    }
  },

  /**
   * Get recommended items (unchanged)
   */
  getRecommendedItems: async (nutritionGoals?: {
    maxCalories?: number;
    minProtein?: number;
    maxCarbs?: number;
  }): Promise<FoodItem[]> => {
    try {
      console.log('[menuOnlineAPI] Getting recommended items:', nutritionGoals);

      const queries: string[] = [QueryHelpers.limit(20)];

      if (nutritionGoals?.maxCalories) {
        queries.push(QueryHelpers.lessThan('calories', nutritionGoals.maxCalories));
      }
      if (nutritionGoals?.minProtein) {
        queries.push(QueryHelpers.greaterThan('protein', nutritionGoals.minProtein));
      }
      if (nutritionGoals?.maxCarbs) {
        queries.push(QueryHelpers.lessThan('carbs', nutritionGoals.maxCarbs));
      }

      queries.push(QueryHelpers.orderDesc('popularity'));

      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.MENU_ITEMS,
        queries
      );

      const items = response.documents.map(convertToFoodItem);
      console.log(`[menuOnlineAPI] ✅ Found ${items.length} recommended items`);
      return items;
    } catch (error) {
      console.error('[menuOnlineAPI] Error getting recommended items:', error);
      throw handleAppwriteError(error);
    }
  },

  /**
   * ✅ FIXED: Sync local menu cache with server
   * 
   * SEBELUM (BUG):
   *   - Cuma fetch 1 page (limit 100), TANPA pagination loop
   *   - Ribuan menu di DB, cuma 100 yang ke-sync
   * 
   * SESUDAH (FIX):
   *   - Pagination loop sama kayak fetchMenuItems()
   *   - Full sync: fetch SEMUA items dengan pagination
   *   - Incremental sync: fetch semua UPDATED items dengan pagination
   */
  syncMenuCache: async (lastSyncTime?: string): Promise<{
    updated: FoodItemDetail[];
    deleted: string[];
    timestamp: string;
  }> => {
    try {
      console.log('[menuOnlineAPI] Syncing menu cache, lastSync:', lastSyncTime);

      let allUpdated: FoodItemDetail[] = [];
      let lastId: string | null = null;
      const pageSize = 100;

      while (true) {
        const queries: string[] = [
          QueryHelpers.limit(pageSize),
          QueryHelpers.orderAsc('$id'), // Consistent ordering for cursor pagination
        ];

        // Incremental sync: only items updated after lastSyncTime
        if (lastSyncTime) {
          queries.push(QueryHelpers.greaterThan('$updatedAt', lastSyncTime));
        }

        // Cursor-based pagination
        if (lastId) {
          queries.push(QueryHelpers.greaterThan('$id', lastId));
        }

        const response = await databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.MENU_ITEMS,
          queries
        );

        const updated = response.documents.map(convertToFoodItemDetail);
        allUpdated = [...allUpdated, ...updated];

        console.log(
          `[menuOnlineAPI] Sync page: ${updated.length} items ` +
          `(total so far: ${allUpdated.length})`
        );

        // No more pages
        if (response.documents.length < pageSize) {
          break;
        }

        lastId = response.documents[response.documents.length - 1].$id;
      }

      const result = {
        updated: allUpdated,
        deleted: [] as string[], // Would need custom implementation
        timestamp: new Date().toISOString(),
      };

      console.log(`[menuOnlineAPI] ✅ Sync complete - ${allUpdated.length} total updates`);
      return result;
    } catch (error) {
      console.error('[menuOnlineAPI] Error syncing menu cache:', error);
      throw handleAppwriteError(error);
    }
  },

  /**
   * Get all categories (unchanged)
   */
  getCategories: async (): Promise<string[]> => {
    try {
      console.log('[menuOnlineAPI] Fetching categories...');

      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.MENU_ITEMS,
        [QueryHelpers.limit(1000)]
      );

      const categories = [...new Set(response.documents.map(doc => doc.category))];
      
      console.log(`[menuOnlineAPI] ✅ Found ${categories.length} categories`);
      return categories;
    } catch (error) {
      console.error('[menuOnlineAPI] Error fetching categories:', error);
      throw handleAppwriteError(error);
    }
  },
};

export default menuOnlineAPI;