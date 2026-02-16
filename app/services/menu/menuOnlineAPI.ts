/**
 * menuOnlineAPI.ts (APPWRITE VERSION)
 * ---------------------------------------------------------------------------
 * Online API service untuk food menu items menggunakan Appwrite Databases.
 * 
 * Changes from original:
 * • ✅ Replaced fetch() dengan Appwrite Databases queries
 * • ✅ Efficient batch queries
 * • ✅ Built-in pagination
 * • ✅ Real-time updates capability (optional)
 * 
 * Features:
 * • Menu CRUD operations via Appwrite Databases
 * • Search & filter menggunakan Appwrite queries
 * • Incremental sync dengan timestamps
 * • Category management
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

// ---------------------------------------------------------------------------
// Type Conversions
// ---------------------------------------------------------------------------


/**
 * Extended Appwrite Document type for Food Item (basic info)
 */
export interface FoodItemDocument extends Models.Document {
  foodName: string;
  description: string;
  imageUrl: string;
  category: string;
}

/**
 * Extended Appwrite Document type for Food Item Detail (complete info)
 */
export interface FoodItemDetailDocument extends Models.Document {
  foodName: string;
  description: string;
  imageUrl: string;
  category: string;
  // Nutrition fields
  protein: number;
  fat: number;
  carbs: number;
  calories: number;
  vitamins: string[];
  // Recipe
  recipe: string;
}

/**
 * Convert Appwrite Document to FoodItem
 */
const convertToFoodItem = (doc: Models.Document): FoodItem => {
  const data = doc as FoodItemDocument;
  return {
    id: data.$id,
    foodName: data.foodName,
    description: data.description,
    imageUrl: data.imageUrl,
    category: data.category,
  };
};

/**
 * Convert Appwrite Document to FoodItemDetail
 */
const convertToFoodItemDetail = (doc: Models.Document): FoodItemDetail => {
  const data = doc as FoodItemDetailDocument;
  return {
    id: data.$id,
    foodName: data.foodName,
    description: data.description,
    imageUrl: data.imageUrl,
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
// Menu Online API (Appwrite)
// ---------------------------------------------------------------------------

export const menuOnlineAPI = {
  /**
   * Fetch all menu items (basic info only)
   */
  fetchMenuItems: async (): Promise<FoodItem[]> => {
    try {
      console.log('[menuOnlineAPI] Fetching all menu items...');

      // Fetch all documents from menu_items collection
      // Use pagination for large datasets
      let allItems: FoodItem[] = [];
      let lastId: string | null = null;
      const pageSize = 100;

      while (true) {
        const queries = [
          QueryHelpers.limit(pageSize),
          QueryHelpers.orderAsc('foodName'),
        ];

        if (lastId) {
          // Pagination using cursor
          queries.push(QueryHelpers.greaterThan('$id', lastId));
        }

        const response = await databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.MENU_ITEMS,
          queries
        );

        const items = response.documents.map(convertToFoodItem);
        allItems = [...allItems, ...items];

        // Check if we got all items
        if (response.documents.length < pageSize) {
          break;
        }

        lastId = response.documents[response.documents.length - 1].$id;
      }

      console.log(`[menuOnlineAPI] ✅ Fetched ${allItems.length} menu items`);
      return allItems;
    } catch (error) {
      console.error('[menuOnlineAPI] Error fetching menu items:', error);
      throw handleAppwriteError(error);
    }
  },

  /**
   * Fetch detailed food item by ID
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
   * Fetch multiple detailed food items by IDs
   */
  fetchMultipleFoodDetails: async (ids: string[]): Promise<FoodItemDetail[]> => {
    try {
      console.log('[menuOnlineAPI] Fetching multiple food details:', ids.length);

      if (ids.length === 0) {
        return [];
      }

      // Appwrite doesn't have direct "IN" query for multiple IDs
      // We need to fetch them one by one or use multiple queries
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

      // Filter out nulls
      const validDetails = details.filter((d): d is FoodItemDetail => d !== null);

      console.log(`[menuOnlineAPI] ✅ Fetched ${validDetails.length}/${ids.length} food details`);
      return validDetails;
    } catch (error) {
      console.error('[menuOnlineAPI] Error fetching multiple food details:', error);
      throw handleAppwriteError(error);
    }
  },

  /**
   * Search menu items
   */
  searchMenuItems: async (query: string): Promise<FoodItem[]> => {
    try {
      console.log('[menuOnlineAPI] Searching menu items:', query);

      // Use Appwrite's search query
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
   * Get menu items by category
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
   * Get nutritional summary for multiple items
   */
  getNutritionalSummary: async (ids: string[]) => {
    try {
      console.log('[menuOnlineAPI] Calculating nutritional summary for', ids.length, 'items');

      // Fetch all items
      const items = await menuOnlineAPI.fetchMultipleFoodDetails(ids);

      // Calculate totals
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
   * Get recommended items based on nutritional needs
   */
  getRecommendedItems: async (nutritionGoals?: {
    maxCalories?: number;
    minProtein?: number;
    maxCarbs?: number;
  }): Promise<FoodItem[]> => {
    try {
      console.log('[menuOnlineAPI] Getting recommended items:', nutritionGoals);

      // Build queries based on goals
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

      // Order by popularity
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
   * Sync local menu cache with server
   * Using incremental sync with timestamps
   */
  syncMenuCache: async (lastSyncTime?: string): Promise<{
    updated: FoodItem[];
    deleted: string[];
    timestamp: string;
  }> => {
    try {
      console.log('[menuOnlineAPI] Syncing menu cache, lastSync:', lastSyncTime);

      const queries: string[] = [QueryHelpers.limit(100)];

      // If lastSyncTime provided, only get items updated after that time
      if (lastSyncTime) {
        queries.push(QueryHelpers.greaterThan('$updatedAt', lastSyncTime));
      }

      queries.push(QueryHelpers.orderDesc('$updatedAt'));

      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.MENU_ITEMS,
        queries
      );

      const updated = response.documents.map(convertToFoodItem);

      // Note: Appwrite doesn't have built-in "deleted items" tracking
      // You would need to implement this with a separate "deleted_items" collection
      // or use a soft-delete approach with an "isDeleted" flag

      const result = {
        updated,
        deleted: [] as string[], // Would need custom implementation
        timestamp: new Date().toISOString(),
      };

      console.log(`[menuOnlineAPI] ✅ Sync complete - ${updated.length} updates`);
      return result;
    } catch (error) {
      console.error('[menuOnlineAPI] Error syncing menu cache:', error);
      throw handleAppwriteError(error);
    }
  },

  /**
   * Get all categories
   */
  getCategories: async (): Promise<string[]> => {
    try {
      console.log('[menuOnlineAPI] Fetching categories...');

      // Get distinct categories
      // Note: Appwrite doesn't have direct "distinct" query
      // We fetch all items and extract unique categories
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