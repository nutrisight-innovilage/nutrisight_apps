/**
 * menuOnlineAPI.ts
 * ---------------------------------------------------------------------------
 * Online API service untuk food menu items.
 * 
 * Features:
 * • Real API calls ke backend server
 * • Network timeout handling
 * • Error handling dengan proper HTTP status
 * • Batch operations untuk efficiency
 * ---------------------------------------------------------------------------
 */

import { FoodItem, FoodItemDetail } from '@/app/types/food';

// ---------------------------------------------------------------------------
// API Configuration
// ---------------------------------------------------------------------------

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
const API_TIMEOUT = 10000; // 10 seconds

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

/**
 * Fetch with timeout
 */
const fetchWithTimeout = async (url: string, options: RequestInit = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

/**
 * Handle API response
 */
const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.message || `HTTP error! status: ${response.status}`
    );
  }
  return response.json();
};

// ---------------------------------------------------------------------------
// Menu Online API
// ---------------------------------------------------------------------------

export const menuOnlineAPI = {
  /**
   * Fetch all menu items (basic info only)
   */
  fetchMenuItems: async (): Promise<FoodItem[]> => {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/menu`);
      const data = await handleResponse(response);
      return data;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout - silakan coba lagi');
        }
        throw new Error(`Gagal memuat menu: ${error.message}`);
      }
      throw new Error('Gagal memuat menu');
    }
  },

  /**
   * Fetch detailed food item by ID
   */
  fetchFoodItemDetail: async (id: string): Promise<FoodItemDetail> => {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/menu/${id}`);
      const data = await handleResponse(response);
      return data;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout - silakan coba lagi');
        }
        throw new Error(`Gagal memuat detail menu: ${error.message}`);
      }
      throw new Error('Gagal memuat detail menu');
    }
  },

  /**
   * Fetch multiple detailed food items by IDs
   */
  fetchMultipleFoodDetails: async (ids: string[]): Promise<FoodItemDetail[]> => {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/menu/batch?ids=${ids.join(',')}`
      );
      const data = await handleResponse(response);
      return data;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout - silakan coba lagi');
        }
        throw new Error(`Gagal memuat detail menu: ${error.message}`);
      }
      throw new Error('Gagal memuat detail menu');
    }
  },

  /**
   * Search menu items
   */
  searchMenuItems: async (query: string): Promise<FoodItem[]> => {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/menu/search?q=${encodeURIComponent(query)}`
      );
      const data = await handleResponse(response);
      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Gagal mencari menu: ${error.message}`);
      }
      throw new Error('Gagal mencari menu');
    }
  },

  /**
   * Get menu items by category
   */
  fetchMenuByCategory: async (category: string): Promise<FoodItem[]> => {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/menu/category/${encodeURIComponent(category)}`
      );
      const data = await handleResponse(response);
      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Gagal memuat kategori: ${error.message}`);
      }
      throw new Error('Gagal memuat kategori');
    }
  },

  /**
   * Get nutritional summary for multiple items
   */
  getNutritionalSummary: async (ids: string[]) => {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/menu/nutrition/summary`,
        {
          method: 'POST',
          body: JSON.stringify({ ids }),
        }
      );
      const data = await handleResponse(response);
      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Gagal menghitung nutrisi: ${error.message}`);
      }
      throw new Error('Gagal menghitung nutrisi');
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
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/menu/recommendations`,
        {
          method: 'POST',
          body: JSON.stringify({ nutritionGoals }),
        }
      );
      const data = await handleResponse(response);
      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Gagal mendapatkan rekomendasi: ${error.message}`);
      }
      throw new Error('Gagal mendapatkan rekomendasi');
    }
  },

  /**
   * Sync local menu cache with server
   */
  syncMenuCache: async (lastSyncTime?: string): Promise<{
    updated: FoodItem[];
    deleted: string[];
    timestamp: string;
  }> => {
    try {
      const url = lastSyncTime
        ? `${API_BASE_URL}/menu/sync?since=${encodeURIComponent(lastSyncTime)}`
        : `${API_BASE_URL}/menu/sync`;

      const response = await fetchWithTimeout(url);
      const data = await handleResponse(response);
      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Gagal sync menu: ${error.message}`);
      }
      throw new Error('Gagal sync menu');
    }
  },
};

export default menuOnlineAPI;