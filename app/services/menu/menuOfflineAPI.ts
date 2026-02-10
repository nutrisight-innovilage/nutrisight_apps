/**
 * menuOfflineAPI.ts
 * ---------------------------------------------------------------------------
 * Offline API service untuk food menu items.
 * 
 * Features:
 * • AsyncStorage untuk persistent local cache
 * • Fallback data untuk first-time users
 * • Fast local queries
 * • Cache management
 * ---------------------------------------------------------------------------
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { FoodItem, FoodItemDetail } from '@/app/types/food';

// ---------------------------------------------------------------------------
// Storage Keys
// ---------------------------------------------------------------------------

const STORAGE_KEYS = {
  MENU_ITEMS: '@menu:items',
  MENU_DETAILS: '@menu:details',
  LAST_SYNC: '@menu:lastSync',
  CATEGORIES: '@menu:categories',
};

// ---------------------------------------------------------------------------
// Mock/Fallback Data
// ---------------------------------------------------------------------------

const FALLBACK_MENU_DATA: Record<string, FoodItemDetail> = {
  '1': {
    id: '1',
    foodName: 'Nasi Goreng Spesial',
    category: 'Main Course',
    nutrition: {
      protein: 12,
      fat: 8,
      carbs: 45,
      calories: 320,
      vitamins: ['B1', 'B12', 'C', 'K'],
    },
    recipe: `1. Panaskan minyak di wajan dengan api sedang
2. Tumis bawang putih dan bawang merah hingga harum
3. Masukkan telur, orak-arik hingga matang
4. Tambahkan nasi putih, aduk rata
5. Beri kecap manis, garam, dan merica
6. Masak sambil terus diaduk selama 3-5 menit
7. Sajikan dengan kerupuk dan acar`,
    description: 'Nasi goreng dengan bumbu spesial dan tambahan kerupuk.',
    imageUrl: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400',
  },
  '2': {
    id: '2',
    foodName: 'Ayam Bakar Madu',
    category: 'Main Course',
    nutrition: {
      protein: 28,
      fat: 15,
      carbs: 8,
      calories: 280,
      vitamins: ['B6', 'B12', 'D', 'E'],
    },
    recipe: `1. Bersihkan ayam, lumuri dengan air jeruk nipis
2. Campurkan bumbu: bawang putih, jahe, kecap, madu
3. Marinasi ayam minimal 2 jam di kulkas
4. Panaskan panggangan atau oven 180°C
5. Bakar ayam sambil sesekali diolesi bumbu
6. Balik setiap 10 menit hingga matang merata (30-40 menit)
7. Sajikan dengan sambal dan lalapan`,
    description: 'Ayam bakar yang manis dan lezat dengan bumbu madu.',
    imageUrl: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=400',
  },
  '3': {
    id: '3',
    foodName: 'Gado-Gado',
    category: 'Salad',
    nutrition: {
      protein: 10,
      fat: 12,
      carbs: 25,
      calories: 250,
      vitamins: ['A', 'C', 'E', 'K'],
    },
    recipe: `1. Rebus sayuran: kol, kangkung, tauge, wortel
2. Goreng tempe dan tahu hingga kecokelatan
3. Blender bumbu kacang: kacang tanah, cabai, gula merah, air asam
4. Tata sayuran, tempe, tahu di piring
5. Siram dengan bumbu kacang
6. Tambahkan telur rebus dan kerupuk
7. Sajikan hangat`,
    description: 'Salad sayuran segar dengan bumbu kacang yang kaya rasa.',
    imageUrl: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400',
  },
  '4': {
    id: '4',
    foodName: 'Soto Ayam',
    category: 'Soup',
    nutrition: {
      protein: 18,
      fat: 10,
      carbs: 32,
      calories: 290,
      vitamins: ['B6', 'B12', 'C'],
    },
    recipe: `1. Rebus ayam dengan bumbu hingga empuk
2. Suwir-suwir daging ayam
3. Tumis bumbu halus hingga harum
4. Masukkan ke dalam kaldu ayam
5. Tambahkan serai dan daun jeruk
6. Sajikan dengan nasi, telur, dan koya`,
    description: 'Soto ayam kuah bening dengan bumbu rempah.',
    imageUrl: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400',
  },
  '5': {
    id: '5',
    foodName: 'Rendang Sapi',
    category: 'Main Course',
    nutrition: {
      protein: 26,
      fat: 22,
      carbs: 12,
      calories: 360,
      vitamins: ['B12', 'D', 'E'],
    },
    recipe: `1. Potong daging sapi sesuai selera
2. Tumis bumbu halus hingga harum
3. Masukkan daging, aduk rata
4. Tuang santan, masak dengan api kecil
5. Masak hingga bumbu meresap (2-3 jam)
6. Sajikan dengan nasi putih`,
    description: 'Rendang sapi dengan bumbu rempah yang kaya.',
    imageUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400',
  },
};

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

/**
 * Simulate API delay for consistency
 */
const delay = (ms: number = 500) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Get fallback menu items
 */
const getFallbackItems = (): FoodItem[] => {
  return Object.values(FALLBACK_MENU_DATA).map(item => ({
    id: item.id,
    foodName: item.foodName,
    description: item.description,
    imageUrl: item.imageUrl,
    category: item.category,
  }));
};

// ---------------------------------------------------------------------------
// Menu Offline API
// ---------------------------------------------------------------------------

export const menuOfflineAPI = {
  /**
   * Fetch all menu items from local storage
   */
  fetchMenuItems: async (): Promise<FoodItem[]> => {
    await delay();

    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.MENU_ITEMS);
      
      if (stored) {
        const items: FoodItem[] = JSON.parse(stored);
        return items;
      }

      // Return fallback data if no cache
      console.log('[menuOfflineAPI] No cache found, using fallback data');
      return getFallbackItems();
    } catch (error) {
      console.error('[menuOfflineAPI] Error fetching items:', error);
      return getFallbackItems();
    }
  },

  /**
   * Fetch detailed food item by ID from local storage
   */
  fetchFoodItemDetail: async (id: string): Promise<FoodItemDetail> => {
    await delay(300);

    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.MENU_DETAILS);
      
      if (stored) {
        const details: Record<string, FoodItemDetail> = JSON.parse(stored);
        const item = details[id];
        
        if (item) {
          return item;
        }
      }

      // Check fallback data
      const fallbackItem = FALLBACK_MENU_DATA[id];
      if (fallbackItem) {
        return fallbackItem;
      }

      throw new Error('Menu tidak ditemukan');
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Gagal memuat detail menu: ${error.message}`);
      }
      throw new Error('Gagal memuat detail menu');
    }
  },

  /**
   * Fetch multiple detailed food items by IDs
   */
  fetchMultipleFoodDetails: async (ids: string[]): Promise<FoodItemDetail[]> => {
    await delay(400);

    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.MENU_DETAILS);
      let detailsMap: Record<string, FoodItemDetail> = {};

      if (stored) {
        detailsMap = JSON.parse(stored);
      } else {
        // Use fallback data
        detailsMap = FALLBACK_MENU_DATA;
      }

      const details = ids
        .map(id => detailsMap[id])
        .filter(item => item !== undefined);

      return details;
    } catch (error) {
      console.error('[menuOfflineAPI] Error fetching multiple details:', error);
      
      // Try fallback
      const details = ids
        .map(id => FALLBACK_MENU_DATA[id])
        .filter(item => item !== undefined);
      
      return details;
    }
  },

  /**
   * Search menu items locally
   */
  searchMenuItems: async (query: string): Promise<FoodItem[]> => {
    await delay(200);

    try {
      const allItems = await menuOfflineAPI.fetchMenuItems();
      const searchTerm = query.toLowerCase();

      return allItems.filter(item =>
        item.foodName.toLowerCase().includes(searchTerm) ||
        item.description.toLowerCase().includes(searchTerm) ||
        item.category.toLowerCase().includes(searchTerm)
      );
    } catch (error) {
      console.error('[menuOfflineAPI] Error searching items:', error);
      return [];
    }
  },

  /**
   * Get menu items by category
   */
  fetchMenuByCategory: async (category: string): Promise<FoodItem[]> => {
    await delay(200);

    try {
      const allItems = await menuOfflineAPI.fetchMenuItems();
      
      if (category === 'Semua' || category === 'All') {
        return allItems;
      }

      return allItems.filter(item => item.category === category);
    } catch (error) {
      console.error('[menuOfflineAPI] Error fetching by category:', error);
      return [];
    }
  },

  /**
   * Get nutritional summary for multiple items
   */
  getNutritionalSummary: async (ids: string[]) => {
    await delay(300);

    try {
      const details = await menuOfflineAPI.fetchMultipleFoodDetails(ids);

      const summary = details.reduce(
        (acc, item) => ({
          protein: acc.protein + item.nutrition.protein,
          fat: acc.fat + item.nutrition.fat,
          carbs: acc.carbs + item.nutrition.carbs,
          calories: acc.calories + item.nutrition.calories,
          vitamins: Array.from(new Set([...acc.vitamins, ...item.nutrition.vitamins])),
        }),
        { protein: 0, fat: 0, carbs: 0, calories: 0, vitamins: [] as string[] }
      );

      return summary;
    } catch (error) {
      throw new Error('Gagal menghitung nutrisi');
    }
  },

  /**
   * Get recommended items (basic implementation)
   */
  getRecommendedItems: async (nutritionGoals?: {
    maxCalories?: number;
    minProtein?: number;
    maxCarbs?: number;
  }): Promise<FoodItem[]> => {
    await delay(300);

    try {
      const allItems = await menuOfflineAPI.fetchMenuItems();
      
      if (!nutritionGoals) {
        // Return first 3 items
        return allItems.slice(0, 3);
      }

      const details = await menuOfflineAPI.fetchMultipleFoodDetails(
        allItems.map(i => i.id)
      );

      let filtered = details;

      if (nutritionGoals.maxCalories) {
        filtered = filtered.filter(
          item => item.nutrition.calories <= nutritionGoals.maxCalories!
        );
      }

      if (nutritionGoals.minProtein) {
        filtered = filtered.filter(
          item => item.nutrition.protein >= nutritionGoals.minProtein!
        );
      }

      if (nutritionGoals.maxCarbs) {
        filtered = filtered.filter(
          item => item.nutrition.carbs <= nutritionGoals.maxCarbs!
        );
      }

      // Convert back to FoodItem[]
      return filtered.map(item => ({
        id: item.id,
        foodName: item.foodName,
        description: item.description,
        imageUrl: item.imageUrl,
        category: item.category,
      }));
    } catch (error) {
      console.error('[menuOfflineAPI] Error getting recommendations:', error);
      return [];
    }
  },

  // ---------------------------------------------------------------------------
  // Cache Management
  // ---------------------------------------------------------------------------

  /**
   * Save menu items to local storage
   */
  saveMenuItems: async (items: FoodItem[]): Promise<void> => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.MENU_ITEMS, JSON.stringify(items));
      console.log(`[menuOfflineAPI] Saved ${items.length} menu items`);
    } catch (error) {
      console.error('[menuOfflineAPI] Error saving menu items:', error);
      throw error;
    }
  },

  /**
   * Save menu details to local storage
   */
  saveMenuDetails: async (details: Record<string, FoodItemDetail>): Promise<void> => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.MENU_DETAILS, JSON.stringify(details));
      console.log(`[menuOfflineAPI] Saved ${Object.keys(details).length} menu details`);
    } catch (error) {
      console.error('[menuOfflineAPI] Error saving menu details:', error);
      throw error;
    }
  },

  /**
   * Update last sync time
   */
  updateLastSync: async (): Promise<void> => {
    try {
      const timestamp = new Date().toISOString();
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, timestamp);
      console.log('[menuOfflineAPI] Updated last sync time');
    } catch (error) {
      console.error('[menuOfflineAPI] Error updating last sync:', error);
    }
  },

  /**
   * Get last sync time
   */
  getLastSync: async (): Promise<string | null> => {
    try {
      const timestamp = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC);
      return timestamp;
    } catch (error) {
      console.error('[menuOfflineAPI] Error getting last sync:', error);
      return null;
    }
  },

  /**
   * Clear all menu cache
   */
  clearCache: async (): Promise<void> => {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.MENU_ITEMS,
        STORAGE_KEYS.MENU_DETAILS,
        STORAGE_KEYS.LAST_SYNC,
        STORAGE_KEYS.CATEGORIES,
      ]);
      console.log('[menuOfflineAPI] Cache cleared');
    } catch (error) {
      console.error('[menuOfflineAPI] Error clearing cache:', error);
      throw error;
    }
  },

  /**
   * Check if cache exists
   */
  hasCachedData: async (): Promise<boolean> => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.MENU_ITEMS);
      return stored !== null;
    } catch (error) {
      return false;
    }
  },

  /**
   * Get cache size info
   */
  getCacheInfo: async (): Promise<{
    itemsCount: number;
    detailsCount: number;
    lastSync: string | null;
  }> => {
    try {
      const itemsData = await AsyncStorage.getItem(STORAGE_KEYS.MENU_ITEMS);
      const detailsData = await AsyncStorage.getItem(STORAGE_KEYS.MENU_DETAILS);
      const lastSync = await menuOfflineAPI.getLastSync();

      const items: FoodItem[] = itemsData ? JSON.parse(itemsData) : [];
      const details: Record<string, FoodItemDetail> = detailsData ? JSON.parse(detailsData) : {};

      return {
        itemsCount: items.length,
        detailsCount: Object.keys(details).length,
        lastSync,
      };
    } catch (error) {
      return {
        itemsCount: 0,
        detailsCount: 0,
        lastSync: null,
      };
    }
  },
};

export default menuOfflineAPI;