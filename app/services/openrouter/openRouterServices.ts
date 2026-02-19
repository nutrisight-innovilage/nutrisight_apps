/**
 * openRouterService.ts
 * ---------------------------------------------------------------------------
 * Service for OpenRouter AI interactions.
 * 
 * Features:
 * • ✅ Photo analysis (food identification from base64 images)
 * • ✅ Weekly nutrition summary generation
 * • ✅ Retry logic with exponential backoff
 * • ✅ Offline-safe (returns null when not configured / no network)
 * ---------------------------------------------------------------------------
 */

import * as FileSystem from 'expo-file-system/legacy';
import openRouterConfig, {
  getOpenRouterHeaders,
  getOpenRouterChatURL,
  isOpenRouterConfigured,
  PHOTO_ANALYSIS_CONFIG,
  WEEKLY_SUMMARY_CONFIG,
  PROMPTS,
} from '@/app/config/openRouterConfig';
import { NutritionScan, WeeklyInsight } from '@/app/types/meal';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PhotoAnalysisResult {
  success: boolean;
  foods: DetectedFood[];
  totalNutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
  mealDescription: string;
  error?: string;
}

export interface DetectedFood {
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

export interface WeeklySummaryResult {
  success: boolean;
  summary: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;
const REQUEST_TIMEOUT_MS = 30000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Convert image URI to base64 string
 */
async function imageUriToBase64(uri: string): Promise<string> {
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return base64;
  } catch (error) {
    console.error('[OpenRouterService] Failed to convert image to base64:', error);
    throw new Error('Gagal memproses gambar');
  }
}

/**
 * Detect MIME type from URI
 */
function getMimeType(uri: string): string {
  const ext = uri.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'png': return 'image/png';
    case 'gif': return 'image/gif';
    case 'webp': return 'image/webp';
    default: return 'image/jpeg';
  }
}

/**
 * Make API call to OpenRouter with retry
 */
async function callOpenRouter(
  messages: Array<{ role: string; content: any }>,
  config: { model: string; temperature: number; max_tokens: number; top_p: number },
  retries: number = 0
): Promise<any> {
  if (!isOpenRouterConfigured()) {
    throw new Error('OpenRouter API key not configured');
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const response = await fetch(getOpenRouterChatURL(), {
      method: 'POST',
      headers: getOpenRouterHeaders(),
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: config.temperature,
        max_tokens: config.max_tokens,
        top_p: config.top_p,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[OpenRouterService] API error ${response.status}:`, errorBody);
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error('Request timed out');
    }

    if (retries < MAX_RETRIES) {
      console.warn(`[OpenRouterService] Retry ${retries + 1}/${MAX_RETRIES}...`);
      await delay(RETRY_DELAY_MS * Math.pow(2, retries));
      return callOpenRouter(messages, config, retries + 1);
    }

    throw error;
  }
}

// ---------------------------------------------------------------------------
// OpenRouter Service Class
// ---------------------------------------------------------------------------

class OpenRouterService {

  // =========================================================================
  // PHOTO ANALYSIS
  // =========================================================================

  /**
   * Analyze a food photo using GPT-4.1 vision.
   * 
   * @param photoUri - Local file URI of the photo
   * @returns PhotoAnalysisResult with detected foods and nutrition
   */
  async analyzePhoto(photoUri: string): Promise<PhotoAnalysisResult> {
    try {
      console.log('[OpenRouterService] Starting photo analysis...');

      if (!isOpenRouterConfigured()) {
        console.warn('[OpenRouterService] API not configured, using fallback');
        return this.getFallbackPhotoAnalysis();
      }

      // Convert to base64
      const base64Image = await imageUriToBase64(photoUri);
      const mimeType = getMimeType(photoUri);

      // Build messages with vision
      const messages = [
        {
          role: 'system',
          content: PROMPTS.PHOTO_ANALYSIS_SYSTEM,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: PROMPTS.PHOTO_ANALYSIS_USER,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
              },
            },
          ],
        },
      ];

      const response = await callOpenRouter(messages, PHOTO_ANALYSIS_CONFIG);
      const content = response.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('Empty response from AI');
      }

      // Parse JSON response
      const parsed = this.parsePhotoAnalysisResponse(content);
      console.log('[OpenRouterService] ✅ Photo analysis complete');
      return parsed;
    } catch (error) {
      console.error('[OpenRouterService] Photo analysis failed:', error);
      return {
        success: false,
        foods: [],
        totalNutrition: { calories: 0, protein: 0, carbs: 0, fats: 0 },
        mealDescription: '',
        error: error instanceof Error ? error.message : 'Analisis gagal',
      };
    }
  }

  /**
   * Parse the AI response into structured PhotoAnalysisResult
   */
  private parsePhotoAnalysisResponse(content: string): PhotoAnalysisResult {
    try {
      // Try to extract JSON from response (AI sometimes wraps in markdown)
      let jsonStr = content;
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      } else {
        // Try to find JSON object directly
        const objMatch = content.match(/\{[\s\S]*\}/);
        if (objMatch) {
          jsonStr = objMatch[0];
        }
      }

      const parsed = JSON.parse(jsonStr);

      if (!parsed.success && parsed.error) {
        return {
          success: false,
          foods: [],
          totalNutrition: { calories: 0, protein: 0, carbs: 0, fats: 0 },
          mealDescription: '',
          error: parsed.error,
        };
      }

      return {
        success: true,
        foods: (parsed.foods || []).map((f: any) => ({
          name: f.name || 'Unknown',
          estimatedGrams: f.estimatedGrams || 0,
          confidence: f.confidence || 0.5,
          nutrition: {
            calories: Math.round(f.nutrition?.calories || 0),
            protein: Math.round(f.nutrition?.protein || 0),
            carbs: Math.round(f.nutrition?.carbs || 0),
            fats: Math.round(f.nutrition?.fats || 0),
          },
        })),
        totalNutrition: {
          calories: Math.round(parsed.totalNutrition?.calories || 0),
          protein: Math.round(parsed.totalNutrition?.protein || 0),
          carbs: Math.round(parsed.totalNutrition?.carbs || 0),
          fats: Math.round(parsed.totalNutrition?.fats || 0),
        },
        mealDescription: parsed.mealDescription || '',
      };
    } catch (error) {
      console.error('[OpenRouterService] Failed to parse photo analysis:', error);
      return {
        success: false,
        foods: [],
        totalNutrition: { calories: 0, protein: 0, carbs: 0, fats: 0 },
        mealDescription: '',
        error: 'Gagal memparse hasil analisis',
      };
    }
  }

  /**
   * Fallback when API is not configured
   */
  private getFallbackPhotoAnalysis(): PhotoAnalysisResult {
    return {
      success: false,
      foods: [],
      totalNutrition: { calories: 0, protein: 0, carbs: 0, fats: 0 },
      mealDescription: '',
      error: 'OpenRouter API belum dikonfigurasi. Silakan tambahkan API key di config.',
    };
  }

  // =========================================================================
  // WEEKLY SUMMARY
  // =========================================================================

  /**
   * Generate a one-sentence AI summary of weekly nutrition data.
   * 
   * @param insight - WeeklyInsight data
   * @returns One-liner summary in Indonesian
   */
  async generateWeeklySummary(insight: WeeklyInsight): Promise<WeeklySummaryResult> {
    try {
      console.log('[OpenRouterService] Generating weekly summary...');

      if (!isOpenRouterConfigured()) {
        console.warn('[OpenRouterService] API not configured, using fallback');
        return this.getFallbackWeeklySummary(insight);
      }

      if (insight.mealsCount === 0) {
        return {
          success: true,
          summary: 'Belum ada data minggu ini. Yuk mulai catat makananmu! 📝',
        };
      }

      const userPrompt = PROMPTS.WEEKLY_SUMMARY_USER({
        mealsCount: insight.mealsCount,
        totalCalories: insight.totalCalories,
        avgCalories: insight.avgCalories,
        totalProtein: insight.totalProtein,
        totalCarbs: insight.totalCarbs,
        totalFats: insight.totalFats,
        balancedMealsCount: insight.balancedMealsCount ?? 0,
      });

      const messages = [
        { role: 'system', content: PROMPTS.WEEKLY_SUMMARY_SYSTEM },
        { role: 'user', content: userPrompt },
      ];

      const response = await callOpenRouter(messages, WEEKLY_SUMMARY_CONFIG);
      const content = response.choices?.[0]?.message?.content?.trim();

      if (!content) {
        throw new Error('Empty response');
      }

      // Ensure it's a single sentence (trim to first sentence if needed)
      const summary = content.split('\n')[0].trim();

      console.log('[OpenRouterService] ✅ Weekly summary generated');
      return { success: true, summary };
    } catch (error) {
      console.error('[OpenRouterService] Weekly summary failed:', error);
      return this.getFallbackWeeklySummary(insight);
    }
  }

  /**
   * Fallback summary when API is unavailable
   */
  private getFallbackWeeklySummary(insight: WeeklyInsight): WeeklySummaryResult {
    const balancedPct = insight.mealsCount > 0
      ? Math.round(((insight.balancedMealsCount ?? 0) / insight.mealsCount) * 100)
      : 0;

    let summary: string;

    if (insight.mealsCount === 0) {
      summary = 'Belum ada data minggu ini 📝';
    } else if (balancedPct >= 70) {
      summary = `Luar biasa! ${balancedPct}% makanan seimbang minggu ini ⭐`;
    } else if (balancedPct >= 40) {
      summary = `${balancedPct}% makanan seimbang, terus tingkatkan! 💪`;
    } else if (insight.avgCalories > 600) {
      summary = 'Kalori agak tinggi minggu ini, yuk dijaga 🍽️';
    } else {
      summary = `${insight.mealsCount} makanan tercatat, ayo perbaiki keseimbangan! 🎯`;
    }

    return { success: true, summary };
  }

  // =========================================================================
  // UTILITY
  // =========================================================================

  /**
   * Check if the OpenRouter API is available and configured
   */
  isAvailable(): boolean {
    return isOpenRouterConfigured();
  }

  /**
   * Health check - test API connectivity
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (!isOpenRouterConfigured()) return false;

      const response = await fetch(getOpenRouterChatURL(), {
        method: 'POST',
        headers: getOpenRouterHeaders(),
        body: JSON.stringify({
          model: WEEKLY_SUMMARY_CONFIG.model,
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 5,
        }),
      });

      return response.ok;
    } catch {
      return false;
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

const openRouterService = new OpenRouterService();
export default openRouterService;