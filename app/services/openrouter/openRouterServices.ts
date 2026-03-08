/**
 * openRouterService.ts (v3.0 - Single OpenRouter Gateway)
 * ---------------------------------------------------------------------------
 * THE ONLY service that calls OpenRouter API directly.
 *
 * v3.0 Changes:
 * ✅ Single gateway — all OpenRouter calls go through this service
 * ✅ detectFoodCategories() — used by photoSyncStrategy (replaces direct API call)
 * ✅ Non-food detection — returns isFood: false when image isn't food
 * ✅ Weekly summary — educational/analytical tone (from updated prompts)
 * ✅ All prompts imported from openRouterConfig.ts (single source of truth)
 *
 * Consumers:
 * • photoSyncStrategy.ts → calls detectFoodCategories()
 * • weeklyInsight logic   → calls generateWeeklySummary()
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
import { WeeklyInsight } from '@/app/types/meal';

// ---------------------------------------------------------------------------
// Types — Food Detection (used by photoSyncStrategy)
// ---------------------------------------------------------------------------

/**
 * AI detection result: either food detected or not-food.
 */
export interface FoodDetectionResult {
  /** Whether the image contains food */
  isFood: boolean;
  /** If isFood=false, reason why (e.g., "Image shows a cat") */
  notFoodReason?: string;
  /** Detected food items (only present when isFood=true) */
  foods: Array<{
    category: string;
    portionGrams: number;
    confidenceCategory: number;
    confidencePortion: number;
  }>;
}

// ---------------------------------------------------------------------------
// Types — Weekly Summary
// ---------------------------------------------------------------------------

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
    case 'heic': return 'image/heic';
    default: return 'image/jpeg';
  }
}

/**
 * Extract JSON from AI response (handles markdown code blocks)
 */
function extractJSON(content: string): string {
  // Try markdown code block first
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch) return jsonMatch[1];

  // Try raw JSON object
  const objMatch = content.match(/\{[\s\S]*\}/);
  if (objMatch) return objMatch[0];

  return content;
}

/**
 * Core API call with retry + timeout
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
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[OpenRouterService] API error ${response.status}:`, errorBody);
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
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
  // FOOD CATEGORY DETECTION (used by photoSyncStrategy)
  // =========================================================================

  /**
   * Detect food categories + portions from a photo.
   * Also detects if the image is NOT food.
   *
   * This is the PRIMARY method used by photoSyncStrategy.
   *
   * @param imageSource - Either a remote URL (https://) or a local file URI (file://)
   * @returns FoodDetectionResult with isFood flag and detected items
   */
  async detectFoodCategories(imageSource: string): Promise<FoodDetectionResult> {
    try {
      console.log('[OpenRouterService] Starting food category detection...');

      if (!isOpenRouterConfigured()) {
        throw new Error('OpenRouter API key not configured');
      }

      // Build image content — base64 for local files, URL for remote
      let imageContent: { type: string; image_url: { url: string } };

      if (imageSource.startsWith('http://') || imageSource.startsWith('https://')) {
        // Remote URL — pass directly
        imageContent = {
          type: 'image_url',
          image_url: { url: imageSource },
        };
      } else {
        // Local file — convert to base64
        const base64Image = await imageUriToBase64(imageSource);
        const mimeType = getMimeType(imageSource);
        imageContent = {
          type: 'image_url',
          image_url: { url: `data:${mimeType};base64,${base64Image}` },
        };
      }

      const messages = [
        {
          role: 'user',
          content: [
            { type: 'text', text: PROMPTS.FOOD_DETECTION },
            imageContent,
          ],
        },
      ];

      const response = await callOpenRouter(messages, PHOTO_ANALYSIS_CONFIG);
      const content = response.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('Empty response from AI');
      }

      console.log('[OpenRouterService] Raw AI response:', content);

      // Parse response
      const jsonContent = extractJSON(content);
      const parsed = JSON.parse(jsonContent);

      // ── NON-FOOD CHECK ──────────────────────────────────────────────
      if (parsed.isFood === false) {
        console.log('[OpenRouterService] ⚠️ Not food:', parsed.reason);
        return {
          isFood: false,
          notFoodReason: parsed.reason || 'Gambar bukan makanan',
          foods: [],
        };
      }

      // ── FOOD DETECTED — validate items ──────────────────────────────
      if (!parsed.foods || !Array.isArray(parsed.foods)) {
        throw new Error('Invalid AI response: missing foods array');
      }

      const foods = parsed.foods.map((food: any) => ({
        category: food.category || 'other',
        portionGrams: typeof food.portionGrams === 'number' ? food.portionGrams : 0,
        confidenceCategory: food.confidenceCategory ?? 0.5,
        confidencePortion: food.confidencePortion ?? 0.5,
      }));

      console.log('[OpenRouterService] ✅ Food detection complete:', foods.length, 'items');

      return {
        isFood: true,
        foods,
      };
    } catch (error) {
      console.error('[OpenRouterService] Food detection failed:', error);
      throw error instanceof Error ? error : new Error('Food detection failed');
    }
  }

  // =========================================================================
  // WEEKLY SUMMARY
  // =========================================================================

  /**
   * Generate an educational/analytical summary of weekly nutrition data.
   *
   * @param insight - WeeklyInsight data
   * @returns 2-3 sentence evaluation in Indonesian
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
          summary: 'Belum ada data makanan yang tercatat minggu ini. Tanpa data, kondisi gizi tidak bisa dievaluasi.',
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
        daysTracked: (insight as any).daysTracked,
      });

      const messages = [
        { role: 'system', content: PROMPTS.WEEKLY_SUMMARY_SYSTEM },
        { role: 'user', content: userPrompt },
      ];

      // Weekly summary doesn't need json_object format — override
      const config = { ...WEEKLY_SUMMARY_CONFIG };
      const response = await this.callOpenRouterText(messages, config);
      const content = response.choices?.[0]?.message?.content?.trim();

      if (!content) {
        throw new Error('Empty response');
      }

      console.log('[OpenRouterService] ✅ Weekly summary generated');
      return { success: true, summary: content };
    } catch (error) {
      console.error('[OpenRouterService] Weekly summary failed:', error);
      return this.getFallbackWeeklySummary(insight);
    }
  }

  /**
   * Fallback summary when API is unavailable — educational tone
   */
  private getFallbackWeeklySummary(insight: WeeklyInsight): WeeklySummaryResult {
    if (insight.mealsCount === 0) {
      return {
        success: true,
        summary: 'Belum ada data makanan yang tercatat minggu ini.',
      };
    }

    const days = (insight as any).daysTracked || 7;
    const dailyCalories = Math.round(insight.totalCalories / days);
    const dailyProtein = Math.round(insight.totalProtein / days);
    const balancedPct = Math.round(
      ((insight.balancedMealsCount ?? 0) / insight.mealsCount) * 100
    );

    const issues: string[] = [];

    // Check daily calories
    if (dailyCalories < 1200) {
      issues.push(`Kalori harian sangat rendah (${dailyCalories} kkal/hari) — di bawah kebutuhan minimum`);
    } else if (dailyCalories > 2500) {
      issues.push(`Kalori harian berlebihan (${dailyCalories} kkal/hari) — di atas batas rekomendasi`);
    }

    // Check protein
    if (dailyProtein < 40) {
      issues.push(`Protein kurang (${dailyProtein}g/hari vs rekomendasi 50-65g)`);
    }

    // Check balance
    if (balancedPct < 30) {
      issues.push(`Hanya ${balancedPct}% porsi yang seimbang — pola makan perlu diperbaiki`);
    }

    let summary: string;
    if (issues.length === 0) {
      summary = `Asupan gizi minggu ini dalam rentang normal (${dailyCalories} kkal/hari, protein ${dailyProtein}g/hari). Pertahankan pola makan ini.`;
    } else {
      summary = issues.join('. ') + '.';
    }

    return { success: true, summary };
  }

  // =========================================================================
  // INTERNAL: Text-only call (no json_object format)
  // =========================================================================

  /**
   * Call OpenRouter for text responses (e.g., weekly summary).
   * Unlike callOpenRouter(), this does NOT set response_format: json_object.
   */
  private async callOpenRouterText(
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
          // NO response_format here — free text
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`[OpenRouterService] API error ${response.status}:`, errorBody);
        throw new Error(`API error: ${response.status}`);
      }

      return await response.json();
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error('Request timed out');
      }

      if (retries < MAX_RETRIES) {
        console.warn(`[OpenRouterService] Retry ${retries + 1}/${MAX_RETRIES}...`);
        await delay(RETRY_DELAY_MS * Math.pow(2, retries));
        return this.callOpenRouterText(messages, config, retries + 1);
      }

      throw error;
    }
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