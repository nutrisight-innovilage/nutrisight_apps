/**
 * mealOnlineAPI.ts
 * ---------------------------------------------------------------------------
 * Service layer untuk semua operasi ONLINE meal & nutrition.
 * Menangani komunikasi dengan backend server.
 * 
 * TIDAK mengirim user profile (dikirim oleh service terpisah).
 * Hanya MENERIMA personalized thresholds dari server.
 * ---------------------------------------------------------------------------
 */

import {
  NutritionScan,
  AnalyzeMealRequest,
  WeeklyInsight,
  NutritionGoals,
} from '@/app/types/meal';

// API Base URL - ganti dengan URL server yang sebenarnya
const API_BASE_URL = 'https://api.example.com/nutrition';

/**
 * Response dari YOLO food detection
 */
interface YOLODetectionResponse {
  success: boolean;
  detectedFoods: DetectedFood[];
  confidence: number;
  processingTime: number;
  imageId?: string;
}

interface DetectedFood {
  name: string;
  quantity: number;
  unit: string;
  confidence: number;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * Personalized thresholds from server
 */
interface PersonalizedThresholds {
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
 * Historical data payload
 */
interface HistoricalDataPayload {
  scans: NutritionScan[];
  dateRange: {
    startDate: string;
    endDate: string;
  };
  totalScans: number;
}

/**
 * User feedback payload
 */
interface UserFeedbackPayload {
  scanId: string;
  rating: number; // 1-5
  accuracyFeedback: {
    caloriesAccurate: boolean;
    proteinAccurate: boolean;
    carbsAccurate: boolean;
    fatsAccurate: boolean;
  };
  corrections?: Partial<NutritionScan>;
  comments?: string;
}

// ---------------------------------------------------------------------------
// API Service untuk Online Operations
// ---------------------------------------------------------------------------

export class MealOnlineAPI {
  // -------------------------------------------------------------------------
  // Photo Analysis (YOLO)
  // -------------------------------------------------------------------------

  /**
   * Analyze food dari foto menggunakan YOLO
   * 
   * @param imageUri - URI atau base64 dari foto makanan
   * @returns Detected foods dengan confidence scores
   */
  static async analyzeFoodFromPhoto(imageUri: string): Promise<YOLODetectionResponse> {
    try {
      const formData = new FormData();
      formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'food.jpg',
      } as any);

      const response = await fetch(`${API_BASE_URL}/analyze/photo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
          // Add authorization jika diperlukan
          // 'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to analyze food photo');
      }

      const data: YOLODetectionResponse = await response.json();
      return data;
    } catch (error) {
      console.error('[MealOnlineAPI] Error analyzing food photo:', error);
      throw error;
    }
  }

  /**
   * Batch upload multiple photos
   * Untuk efisiensi ketika user upload beberapa foto sekaligus
   */
  static async analyzeFoodFromPhotos(imageUris: string[]): Promise<YOLODetectionResponse[]> {
    try {
      const formData = new FormData();
      
      imageUris.forEach((uri, index) => {
        formData.append('images', {
          uri: uri,
          type: 'image/jpeg',
          name: `food_${index}.jpg`,
        } as any);
      });

      const response = await fetch(`${API_BASE_URL}/analyze/photos/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to analyze food photos');
      }

      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error('[MealOnlineAPI] Error analyzing food photos:', error);
      throw error;
    }
  }

  // -------------------------------------------------------------------------
  // Meal Analysis & Nutrition Calculation
  // -------------------------------------------------------------------------

  /**
   * Submit meal untuk analisis nutrisi ke server.
   * Server akan return NutritionScan result.
   * 
   * @param request - Meal data (items, rice portion, metadata)
   * @returns NutritionScan result dari server
   */
  static async analyzeMeal(request: AnalyzeMealRequest): Promise<NutritionScan> {
    try {
      const response = await fetch(`${API_BASE_URL}/analyze/meal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze meal');
      }

      const data = await response.json();
      return data.scan;
    } catch (error) {
      console.error('[MealOnlineAPI] Error analyzing meal:', error);
      throw error;
    }
  }

  // -------------------------------------------------------------------------
  // Historical Data Sync
  // -------------------------------------------------------------------------

  /**
   * Kirim historical data ke server untuk analytics & ML training.
   * Server menggunakan data ini untuk improve model & personalization.
   * 
   * @param payload - Historical scans data
   */
  static async sendHistoricalData(payload: HistoricalDataPayload): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/data/historical`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to send historical data');
      }

      console.log('[MealOnlineAPI] Historical data sent successfully');
    } catch (error) {
      console.error('[MealOnlineAPI] Error sending historical data:', error);
      throw error;
    }
  }

  /**
   * Kirim user feedback tentang akurasi nutrition analysis.
   * Membantu improve model accuracy.
   */
  static async sendUserFeedback(feedback: UserFeedbackPayload): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(feedback),
      });

      if (!response.ok) {
        throw new Error('Failed to send feedback');
      }

      console.log('[MealOnlineAPI] Feedback sent successfully');
    } catch (error) {
      console.error('[MealOnlineAPI] Error sending feedback:', error);
      throw error;
    }
  }

  // -------------------------------------------------------------------------
  // Personalized Thresholds (RECEIVE ONLY)
  // -------------------------------------------------------------------------

  /**
   * MENERIMA personalized thresholds dari server.
   * Server menghitung berdasarkan user profile yang sudah dikirim service lain.
   * 
   * TIDAK mengirim user profile di sini.
   * 
   * @returns Personalized nutrition thresholds
   */
  static async getPersonalizedThresholds(): Promise<PersonalizedThresholds> {
    try {
      const response = await fetch(`${API_BASE_URL}/thresholds/personalized`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // Authorization header akan include user ID
        },
      });

      if (!response.ok) {
        throw new Error('Failed to get personalized thresholds');
      }

      const data = await response.json();
      return data.thresholds;
    } catch (error) {
      console.error('[MealOnlineAPI] Error getting personalized thresholds:', error);
      throw error;
    }
  }

  // -------------------------------------------------------------------------
  // Insights & Analytics
  // -------------------------------------------------------------------------

  /**
   * Get weekly insights dari server.
   * Server menghitung dari data yang sudah ter-sync.
   * 
   * @param startDate - Start date ISO string (optional)
   * @param endDate - End date ISO string (optional)
   * @param includeAdvice - Include LLM-generated advice
   */
  static async getWeeklyInsights(
    startDate?: string,
    endDate?: string,
    includeAdvice: boolean = false
  ): Promise<WeeklyInsight & { advice?: string }> {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (includeAdvice) params.append('includeAdvice', 'true');

      const response = await fetch(`${API_BASE_URL}/insights/weekly?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch weekly insights');
      }

      const data = await response.json();
      return data.insights;
    } catch (error) {
      console.error('[MealOnlineAPI] Error fetching weekly insights:', error);
      throw error;
    }
  }

  /**
   * Get monthly summary & trends
   */
  static async getMonthlyTrends(month: string, year: number): Promise<any> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/insights/monthly?month=${month}&year=${year}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch monthly trends');
      }

      const data = await response.json();
      return data.trends;
    } catch (error) {
      console.error('[MealOnlineAPI] Error fetching monthly trends:', error);
      throw error;
    }
  }

  // -------------------------------------------------------------------------
  // Nutrition Goals
  // -------------------------------------------------------------------------

  /**
   * Get nutrition goals dari server
   */
  static async getNutritionGoals(): Promise<NutritionGoals> {
    try {
      const response = await fetch(`${API_BASE_URL}/goals`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch nutrition goals');
      }

      const data = await response.json();
      return data.goals;
    } catch (error) {
      console.error('[MealOnlineAPI] Error fetching nutrition goals:', error);
      throw error;
    }
  }

  /**
   * Update nutrition goals
   */
  static async updateNutritionGoals(goals: NutritionGoals): Promise<NutritionGoals> {
    try {
      const response = await fetch(`${API_BASE_URL}/goals`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(goals),
      });

      if (!response.ok) {
        throw new Error('Failed to update nutrition goals');
      }

      const data = await response.json();
      return data.goals;
    } catch (error) {
      console.error('[MealOnlineAPI] Error updating nutrition goals:', error);
      throw error;
    }
  }

  // -------------------------------------------------------------------------
  // LLM-Powered Features
  // -------------------------------------------------------------------------

  /**
   * Parse natural language input menjadi structured meal data.
   * Contoh: "saya makan nasi goreng satu piring dan ayam goreng 2 potong"
   * 
   * @param text - User's natural language input
   * @returns Structured meal data
   */
  static async parseNaturalLanguageInput(text: string): Promise<{
    items: Array<{ name: string; quantity: number; unit: string }>;
    ricePortion: number;
    confidence: number;
  }> {
    try {
      const response = await fetch(`${API_BASE_URL}/parse/natural-language`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error('Failed to parse natural language input');
      }

      const data = await response.json();
      return data.parsed;
    } catch (error) {
      console.error('[MealOnlineAPI] Error parsing natural language:', error);
      throw error;
    }
  }

  /**
   * Get custom nutrition advice dari LLM.
   * LLM memberikan advice berdasarkan user's nutrition history & goals.
   * 
   * @param context - Context untuk LLM (recent scans, goals)
   */
  static async getCustomNutritionAdvice(context: {
    recentScans: NutritionScan[];
    goals: NutritionGoals;
    specificQuestion?: string;
  }): Promise<{
    advice: string;
    recommendations: string[];
    warnings: string[];
    tips: string[];
  }> {
    try {
      const response = await fetch(`${API_BASE_URL}/advice/custom`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(context),
      });

      if (!response.ok) {
        throw new Error('Failed to get custom nutrition advice');
      }

      const data = await response.json();
      return data.advice;
    } catch (error) {
      console.error('[MealOnlineAPI] Error getting custom advice:', error);
      throw error;
    }
  }

  // -------------------------------------------------------------------------
  // Health Check & Connectivity
  // -------------------------------------------------------------------------

  /**
   * Check API health & connectivity
   */
  static async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      return response.ok;
    } catch (error) {
      console.error('[MealOnlineAPI] Health check failed:', error);
      return false;
    }
  }
}

// Export types untuk digunakan di tempat lain
export type {
  YOLODetectionResponse,
  DetectedFood,
  PersonalizedThresholds,
  HistoricalDataPayload,
  UserFeedbackPayload,
};