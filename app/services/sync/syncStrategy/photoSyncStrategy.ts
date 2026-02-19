/**
 * photoSyncStrategy.ts (v4.0 - Fixed Food Categories + NutritionCalculator)
 * ---------------------------------------------------------------------------
 * Photo-specific sync strategy with DIRECT OpenRouter GPT-4.1 calls.
 * 
 * KEY CHANGES from v3.0:
 * • AI ONLY detects food category from fixed list + portion in grams
 * • Nutrition calculation done by NutritionCalculator (fixed formulas)
 * • Vitamin/mineral info included (non-calculated, informational)
 * 
 * Fixed Food Categories:
 * [ayam, ikan, nasi, tempe, telur, tahu, sambal, sayur, kuah, other]
 * 
 * Flow:
 * 1. User takes photo → saved locally (instant)
 * 2. Photo queued for sync
 * 3. When online:
 *    a. Upload photo to Appwrite Storage
 *    b. Call OpenRouter GPT-4.1 (detect category + portion grams ONLY)
 *    c. Parse AI response → DetectedFoodItem[]
 *    d. Call NutritionCalculator to compute nutrition per food
 *    e. Save to photo_analysis collection
 *    f. Update local scan with nutrition data
 * ---------------------------------------------------------------------------
 */

import { SyncPayload } from '@/app/services/sync/syncQueue';
import { SyncStrategy } from '@/app/services/sync/syncManager';
import { MealOfflineAPI } from '@/app/services/meal/mealOfflineAPI';
import PhotoUploadService from '@/app/services/camera/photoUploadService';
import authService from '@/app/services/auth/authService';
import {
  NutritionCalculator,
  DetectedFoodItem,
  MealNutritionResult,
  FoodCategory,
  ALL_FOOD_CATEGORIES,
} from '@/app/services/meal/nutritionCalculator';
import {
  databases,
  generateId,
  DATABASE_ID,
  COLLECTIONS,
  handleAppwriteError,
} from '@/app/config/appwriteConfig';
import EnvConfig from '@/app/utils/env';
import { Permission, Role } from 'appwrite';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PhotoSyncData {
  action: 'analyzePhoto';
  photoUri: string;
  localScanId: string;
  metadata: {
    userId?: string;
    mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    notes?: string;
  };
}

interface OpenRouterResponse {
  id: string;
  choices: Array<{
    message: {
      content: string;
      role: string;
    };
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Raw AI Detection Result (from GPT-4.1)
 * Only category + portion grams — NO nutrition data
 */
interface AIDetectionResponse {
  foods: Array<{
    category: string;         // Must be one of FoodCategory
    portionGrams: number;     // Always in grams
    confidenceCategory: number;
    confidencePortion: number;
  }>;
}

// ---------------------------------------------------------------------------
// OpenRouter Configuration
// ---------------------------------------------------------------------------

const OPENROUTER_API_KEY = EnvConfig.openrouter?.apiKey || '';
const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'openai/gpt-4.1';

// ---------------------------------------------------------------------------
// GPT-4.1 Prompt — Fixed Categories Only
// ---------------------------------------------------------------------------

const FOOD_DETECTION_PROMPT = `You are a food detection AI for Indonesian meals. Analyze the food image and classify each visible food item into one of these EXACT categories:

ALLOWED CATEGORIES (use ONLY these values):
- "ayam" → Chicken (any preparation: goreng, bakar, rebus, etc.)
- "ikan" → Fish (any type: goreng, bakar, pindang, etc.)
- "nasi" → Rice (putih, goreng, uduk, etc.)
- "tempe" → Tempeh (goreng, bacem, mendoan, etc.)
- "telur" → Egg (goreng, rebus, dadar, etc.)
- "tahu" → Tofu (goreng, bacem, etc.)
- "sambal" → Chili sauce/paste (any type)
- "sayur" → Vegetables (any: kangkung, bayam, lalapan, capcay, etc.)
- "kuah" → Broth/soup liquid (soto, sup, rawon broth, etc.)
- "other" → Anything else not in above categories

IMPORTANT RULES:
1. ONLY use categories from the list above. No other values allowed.
2. portionGrams MUST be in GRAMS only (not ml, not pieces, not servings).
3. For "kuah" (broth), estimate the liquid volume in grams (1ml ≈ 1g).
4. If same category appears multiple times (e.g., 2 types of sayur), combine into one entry.
5. Respond with VALID JSON only. No text before or after.

OUTPUT FORMAT (STRICT):
{
  "foods": [
    {
      "category": "<one of the allowed categories>",
      "portionGrams": <number in grams>,
      "confidenceCategory": <0.00 to 1.00>,
      "confidencePortion": <0.00 to 1.00>
    }
  ]
}

EXAMPLE 1 — Nasi padang plate:
{
  "foods": [
    { "category": "nasi", "portionGrams": 200, "confidenceCategory": 0.95, "confidencePortion": 0.85 },
    { "category": "ayam", "portionGrams": 120, "confidenceCategory": 0.92, "confidencePortion": 0.80 },
    { "category": "sayur", "portionGrams": 80, "confidenceCategory": 0.88, "confidencePortion": 0.75 },
    { "category": "sambal", "portionGrams": 25, "confidenceCategory": 0.90, "confidencePortion": 0.70 },
    { "category": "telur", "portionGrams": 55, "confidenceCategory": 0.94, "confidencePortion": 0.88 }
  ]
}

EXAMPLE 2 — Soto ayam:
{
  "foods": [
    { "category": "kuah", "portionGrams": 250, "confidenceCategory": 0.90, "confidencePortion": 0.72 },
    { "category": "ayam", "portionGrams": 80, "confidenceCategory": 0.88, "confidencePortion": 0.78 },
    { "category": "nasi", "portionGrams": 180, "confidenceCategory": 0.95, "confidencePortion": 0.82 },
    { "category": "telur", "portionGrams": 50, "confidenceCategory": 0.92, "confidencePortion": 0.90 }
  ]
}

Now analyze the provided food image:`;

// ---------------------------------------------------------------------------
// Photo Sync Strategy (v4.0)
// ---------------------------------------------------------------------------

export class PhotoSyncStrategy implements SyncStrategy {
  /**
   * Prepare photo data for sync
   */
  async prepare(data: PhotoSyncData): Promise<SyncPayload> {
    return {
      id: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'photo',
      data: data,
      priority: 2,
      retryCount: 0,
      maxRetries: 3,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Upload photo & run AI analysis
   */
  async upload(payload: SyncPayload): Promise<any> {
    const data = payload.data as PhotoSyncData;

    console.log('[PhotoSync] Processing photo analysis...');

    if (data.action !== 'analyzePhoto') {
      throw new Error(`Unknown action: ${data.action}`);
    }

    return await this.handleAnalyzePhoto(data);
  }

  // ===========================================================================
  // ACTION HANDLER
  // ===========================================================================

  /**
   * Handle: analyzePhoto
   * Upload → GPT-4.1 detect categories → NutritionCalculator → Save
   */
  private async handleAnalyzePhoto(data: PhotoSyncData): Promise<{
    photoAnalysisId: string;
    photoUrl: string;
    nutritionResult: MealNutritionResult;
  }> {
    console.log('[PhotoSync:AnalyzePhoto] Starting photo analysis flow...');

    // STEP 1: Get userId
    let userId: string;
    try {
      const authData = await authService.getCurrentUser();
      userId = authData?.user.id || data.metadata.userId || 'unknown';
    } catch (error) {
      console.error('[PhotoSync] Failed to get user ID:', error);
      userId = data.metadata.userId || 'unknown';
    }

    // STEP 2: Upload photo to Appwrite Storage
    console.log('[PhotoSync:AnalyzePhoto] Uploading photo...');
    
    const uploadResult = await PhotoUploadService.uploadPhoto(
      data.photoUri,
      userId
    );

    if (!uploadResult.success || !uploadResult.fileUrl) {
      throw new Error(uploadResult.error || 'Photo upload failed');
    }

    console.log('[PhotoSync:AnalyzePhoto] ✅ Photo uploaded:', uploadResult.fileId);

    // STEP 3: Call GPT-4.1 — detect categories + portions ONLY
    console.log('[PhotoSync:AnalyzePhoto] Calling GPT-4.1 for food detection...');
    
    const startTime = Date.now();
    const aiDetection = await this.callOpenRouterVision(uploadResult.fileUrl);
    const detectionTime = Date.now() - startTime;

    // STEP 4: Parse + validate AI response → DetectedFoodItem[]
    const detectedItems = NutritionCalculator.parseAIDetection(aiDetection);

    console.log('[PhotoSync:AnalyzePhoto] ✅ Detected:', {
      items: detectedItems.length,
      categories: detectedItems.map(i => `${i.category}(${i.portionGrams}g)`),
      detectionTime: `${detectionTime}ms`,
    });

    // STEP 5: Calculate nutrition using NutritionCalculator (fixed formulas)
    const nutritionResult = NutritionCalculator.calculateMeal(detectedItems);

    console.log('[PhotoSync:AnalyzePhoto] ✅ Nutrition calculated:', {
      totalCalories: nutritionResult.totalNutrition.calories,
      totalProtein: nutritionResult.totalNutrition.protein,
      totalCarbs: nutritionResult.totalNutrition.carbs,
      totalFats: nutritionResult.totalNutrition.fats,
      vitamins: nutritionResult.allVitaminsMinerals.vitamins.length,
      minerals: nutritionResult.allVitaminsMinerals.minerals.length,
    });

    // STEP 6: Save analysis log to Appwrite
    console.log('[PhotoSync:AnalyzePhoto] Saving analysis log...');
    
    const photoAnalysisId = await this.saveAnalysisLog({
      userId,
      photoUrl: uploadResult.fileUrl,
      photoFileId: uploadResult.fileId,
      scanId: data.localScanId,
      nutritionResult,
      detectedItems,
      processingTime: detectionTime,
      mealType: data.metadata.mealType,
    });

    console.log('[PhotoSync:AnalyzePhoto] ✅ Analysis saved:', photoAnalysisId);

    return {
      photoAnalysisId,
      photoUrl: uploadResult.fileUrl,
      nutritionResult,
    };
  }

  /**
   * Call OpenRouter GPT-4.1 API — Food Category Detection Only
   */
  private async callOpenRouterVision(imageUrl: string): Promise<AIDetectionResponse> {
    try {
      if (!OPENROUTER_API_KEY) {
        throw new Error('OpenRouter API key not configured');
      }

      console.log('[PhotoSync] Calling OpenRouter GPT-4.1...');

      const response = await fetch(OPENROUTER_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://nutritrack-app.com',
          'X-Title': 'NutriTrack App',
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: FOOD_DETECTION_PROMPT,
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: imageUrl,
                  },
                },
              ],
            },
          ],
          max_tokens: 500, // Smaller — response is simpler now
          temperature: 0.1,
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `OpenRouter API error: ${response.status} - ${errorData.error?.message || response.statusText}`
        );
      }

      const data: OpenRouterResponse = await response.json();

      if (!data.choices || data.choices.length === 0) {
        throw new Error('No response from AI');
      }

      // Parse AI response
      const aiContent = data.choices[0].message.content;
      console.log('[PhotoSync] Raw AI response:', aiContent);

      // Extract JSON (handle markdown code blocks if present)
      let jsonContent = aiContent;
      const jsonMatch = aiContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonContent = jsonMatch[1];
      }

      const parsed: AIDetectionResponse = JSON.parse(jsonContent);

      // Validate structure
      if (!parsed.foods || !Array.isArray(parsed.foods)) {
        throw new Error('Invalid AI response: missing foods array');
      }

      // Validate each food item
      for (const food of parsed.foods) {
        if (!food.category || typeof food.portionGrams !== 'number') {
          throw new Error('Invalid food item: missing category or portionGrams');
        }

        // Validate category is in allowed list
        if (!NutritionCalculator.isValidCategory(food.category)) {
          console.warn(`[PhotoSync] Unknown category "${food.category}", will map to "other"`);
          // Don't throw — parseAIDetection will handle this
        }

        // Ensure confidence values exist
        food.confidenceCategory = food.confidenceCategory ?? 0.5;
        food.confidencePortion = food.confidencePortion ?? 0.5;
      }

      console.log('[PhotoSync] ✅ AI detection parsed successfully');
      return parsed;
    } catch (error) {
      console.error('[PhotoSync] OpenRouter API error:', error);
      throw error instanceof Error ? error : new Error('AI detection failed');
    }
  }

  /**
   * Save analysis log to Appwrite photo_analysis collection
   */
  private async saveAnalysisLog(data: {
    userId: string;
    photoUrl: string;
    photoFileId?: string;
    scanId: string;
    nutritionResult: MealNutritionResult;
    detectedItems: DetectedFoodItem[];
    processingTime: number;
    mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  }): Promise<string> {
    try {
      // Build aiResponse JSON — includes nutrition totals inside
      const aiResponseJson = JSON.stringify({
        detectedItems: data.detectedItems,
        nutritionResult: data.nutritionResult,
        // Store totals here so they're queryable from the JSON
        totals: data.nutritionResult.totalNutrition,
        mealType: data.mealType || 'snack',
      });

      // Build extractedFoods JSON — summary of detected items
      const extractedFoodsJson = JSON.stringify(
        data.nutritionResult.foods.map(f => ({
          category: f.category,
          label: f.label,
          portionGrams: f.portionGrams,
          calories: f.calories,
        }))
      );

      // ⚠️ ONLY write attributes that exist in the Appwrite collection schema:
      // userId, photoUrl, photoFileId, scanId, aiProvider, aiResponse,
      // extractedFoods, confidence, processingTime, status, createdAt
      //
      // If you want totalCalories/totalProtein/totalCarbs/totalFats/mealType
      // as separate queryable fields, add them to the collection first:
      //   totalCalories  → Float, required, default 0
      //   totalProtein   → Float, required, default 0
      //   totalCarbs     → Float, required, default 0
      //   totalFats      → Float, required, default 0
      //   mealType       → String (50), optional
      const doc = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.PHOTO_ANALYSIS,
        generateId(),
        {
          userId: data.userId,
          photoUrl: data.photoUrl,
          photoFileId: data.photoFileId || '',
          scanId: data.scanId,
          aiProvider: 'openrouter-gpt4.1',
          aiResponse: aiResponseJson,
          extractedFoods: extractedFoodsJson,
          confidence: data.nutritionResult.confidence,
          processingTime: data.processingTime,
          status: 'completed',
          createdAt: new Date().toISOString(),
        },
        [
          Permission.read(Role.any()),
          Permission.write(Role.any()),
          Permission.update(Role.any()),
          Permission.delete(Role.any()),
        ]
      );

      return doc.$id;
    } catch (error) {
      console.error('[PhotoSync] Failed to save analysis log:', error);
      throw handleAppwriteError(error);
    }
  }

  // ===========================================================================
  // SUCCESS HANDLER
  // ===========================================================================

  async onSuccess(result: any, payload: SyncPayload): Promise<void> {
    const data = payload.data as PhotoSyncData;
    console.log('[PhotoSync] ✅ Success for photo analysis');
    await this.onAnalyzePhotoSuccess(result, data);
  }

  private async onAnalyzePhotoSuccess(
    result: {
      photoAnalysisId: string;
      photoUrl: string;
      nutritionResult: MealNutritionResult;
    },
    data: PhotoSyncData
  ): Promise<void> {
    console.log('[PhotoSync:AnalyzePhoto] Processing success...');

    try {
      const localScan = await MealOfflineAPI.getLocalScanById(data.localScanId);
      
      if (!localScan) {
        console.warn('[PhotoSync:AnalyzePhoto] Local scan not found:', data.localScanId);
        return;
      }

      // Build food name from detected categories
      const foodDescriptions = result.nutritionResult.foods.map(f =>
        `${f.label} (${f.portionGrams}g)`
      );
      const foodName = foodDescriptions.length > 0
        ? foodDescriptions.join(', ')
        : 'Detected Food';

      // Update local scan with calculated nutrition
      const nutrition = result.nutritionResult.totalNutrition;
      
      await MealOfflineAPI.updateLocalScan(data.localScanId, {
        foodName,
        calories: nutrition.calories,
        protein: Math.round(nutrition.protein * 10) / 10,
        carbs: Math.round(nutrition.carbs * 10) / 10,
        fats: Math.round(nutrition.fats * 10) / 10,
      });

      // Mark as synced
      await MealOfflineAPI.markScanAsSynced(data.localScanId, result.photoAnalysisId);

      console.log('[PhotoSync:AnalyzePhoto] ✅ Local scan updated with nutrition results');
    } catch (error) {
      console.error('[PhotoSync:AnalyzePhoto] Failed to update local scan:', error);
    }
  }

  // ===========================================================================
  // FAILURE HANDLER
  // ===========================================================================

  async onFailure(error: Error, payload: SyncPayload): Promise<void> {
    const data = payload.data as PhotoSyncData;
    console.error('[PhotoSync] ❌ Failure for photo analysis:', error.message);
    await this.onAnalyzePhotoFailure(error, data);
  }

  private async onAnalyzePhotoFailure(error: Error, data: PhotoSyncData): Promise<void> {
    console.error('[PhotoSync:AnalyzePhoto] ❌ Photo analysis failed:', error.message);

    try {
      const localScan = await MealOfflineAPI.getLocalScanById(data.localScanId);
      
      if (localScan) {
        await MealOfflineAPI.updateLocalScan(data.localScanId, {
          foodName: 'Analysis Failed - Will Retry',
        });
        console.log('[PhotoSync:AnalyzePhoto] Local scan marked as failed');
      }
    } catch (err) {
      console.error('[PhotoSync:AnalyzePhoto] Failed to update local scan:', err);
    }

    console.log('[PhotoSync:AnalyzePhoto] Photo will retry on next sync');
  }

  // ===========================================================================
  // VALIDATION
  // ===========================================================================

  validate(data: any): boolean {
    if (!data || typeof data !== 'object') {
      console.error('[PhotoSync] Validation failed: Invalid data type');
      return false;
    }

    const photoData = data as PhotoSyncData;

    if (photoData.action !== 'analyzePhoto') {
      console.error('[PhotoSync] Validation failed: Invalid action');
      return false;
    }

    if (!photoData.photoUri) {
      console.error('[PhotoSync] Validation failed: Missing photoUri');
      return false;
    }

    if (!photoData.localScanId) {
      console.error('[PhotoSync] Validation failed: Missing localScanId');
      return false;
    }

    return true;
  }

  // ===========================================================================
  // PRIORITY & RETRY
  // ===========================================================================

  getPriority(): number {
    return 2;
  }

  getMaxRetries(): number {
    return 3;
  }
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const photoSyncStrategy = new PhotoSyncStrategy();