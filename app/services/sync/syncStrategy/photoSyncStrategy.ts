/**
 * photoSyncStrategy.ts (v2.1 - Direct OpenRouter Integration)
 * ---------------------------------------------------------------------------
 * Photo-specific sync strategy with DIRECT OpenRouter GPT-4 Vision calls.
 * 
 * Flow:
 * 1. User takes photo → saved locally (instant)
 * 2. Photo queued for sync
 * 3. When online:
 *    a. Upload photo to Appwrite Storage
 *    b. Call OpenRouter GPT-4 Vision directly
 *    c. Parse AI response
 *    d. Save to photo_analysis collection
 *    e. Update local scan with nutrition data
 * ---------------------------------------------------------------------------
 */

import { SyncPayload } from '@/app/services/sync/syncQueue';
import { SyncStrategy } from '@/app/services/sync/syncManager';
import { MealOfflineAPI } from '@/app/services/meal/mealOfflineAPI';
import PhotoUploadService from '@/app/services/camera/photoUploadService';
import authService from '@/app/services/auth/authService';
import {
  databases,
  generateId,
  DATABASE_ID,
  COLLECTIONS,
  handleAppwriteError,
} from '@/app/config/appwriteConfig';
import EnvConfig from '@/app/utils/env';

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

interface AIAnalysisResult {
  foods: Array<{
    name: string;
    portionSize: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    confidence: number;
  }>;
  totalNutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
  confidence: number;
}

// ---------------------------------------------------------------------------
// OpenRouter Configuration
// ---------------------------------------------------------------------------

const OPENROUTER_API_KEY = EnvConfig.openrouter?.apiKey || '';
const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'openai/gpt-4-vision-preview';

// GPT-4 Vision Prompt for Food Analysis
const FOOD_ANALYSIS_PROMPT = `Analyze this food image and provide detailed nutritional information.

Instructions:
1. Identify all food items visible in the image
2. Estimate portion sizes (in grams or common serving sizes)
3. Calculate nutritional information per item
4. Provide confidence scores (0-1) for each detection

Return your analysis in this EXACT JSON format:
{
  "foods": [
    {
      "name": "food name",
      "portionSize": "description (e.g. '1 medium piece, ~150g')",
      "calories": number,
      "protein": number,
      "carbs": number,
      "fats": number,
      "confidence": 0.XX
    }
  ],
  "totalNutrition": {
    "calories": number,
    "protein": number,
    "carbs": number,
    "fats": number
  },
  "confidence": 0.XX
}

Be as accurate as possible. If unsure, indicate lower confidence. Round nutrition values to 1 decimal place.`;

// ---------------------------------------------------------------------------
// Photo Sync Strategy (v2.1)
// ---------------------------------------------------------------------------

export class PhotoSyncStrategy implements SyncStrategy {
  /**
   * Prepare photo data untuk sync
   */
  async prepare(data: PhotoSyncData): Promise<SyncPayload> {
    return {
      id: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'photo',
      data: data,
      priority: 2, // High priority
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
   * Upload foto → Call GPT-4 Vision → Parse result → Save to DB → Update local
   */
  private async handleAnalyzePhoto(data: PhotoSyncData): Promise<{
    photoAnalysisId: string;
    photoUrl: string;
    aiResult: AIAnalysisResult;
  }> {
    console.log('[PhotoSync:AnalyzePhoto] Starting photo analysis flow...');

    // ========================================================================
    // STEP 1: Get userId
    // ========================================================================
    
    let userId: string;
    try {
      const authData = await authService.getCurrentUser();
      userId = authData?.user.id || data.metadata.userId || 'unknown';
    } catch (error) {
      console.error('[PhotoSync] Failed to get user ID:', error);
      userId = data.metadata.userId || 'unknown';
    }

    // ========================================================================
    // STEP 2: Upload foto ke Appwrite Storage
    // ========================================================================
    
    console.log('[PhotoSync:AnalyzePhoto] Uploading photo to storage...');
    
    const uploadResult = await PhotoUploadService.uploadPhoto(
      data.photoUri,
      userId
    );

    if (!uploadResult.success || !uploadResult.fileUrl) {
      throw new Error(uploadResult.error || 'Photo upload failed');
    }

    console.log('[PhotoSync:AnalyzePhoto] ✅ Photo uploaded:', uploadResult.fileId);

    // ========================================================================
    // STEP 3: Call OpenRouter GPT-4 Vision
    // ========================================================================
    
    console.log('[PhotoSync:AnalyzePhoto] Calling GPT-4 Vision...');
    
    const startTime = Date.now();
    const aiResult = await this.callOpenRouterVision(uploadResult.fileUrl);
    const processingTime = Date.now() - startTime;

    console.log('[PhotoSync:AnalyzePhoto] ✅ AI analysis complete:', {
      foods: aiResult.foods.length,
      confidence: aiResult.confidence,
      processingTime: `${processingTime}ms`,
    });

    // ========================================================================
    // STEP 4: Save analysis log to Appwrite
    // ========================================================================
    
    console.log('[PhotoSync:AnalyzePhoto] Saving analysis log...');
    
    const photoAnalysisId = await this.saveAnalysisLog({
      userId,
      photoUrl: uploadResult.fileUrl,
      photoFileId: uploadResult.fileId,
      scanId: data.localScanId,
      aiResult,
      processingTime,
    });

    console.log('[PhotoSync:AnalyzePhoto] ✅ Analysis log saved:', photoAnalysisId);

    return {
      photoAnalysisId,
      photoUrl: uploadResult.fileUrl,
      aiResult,
    };
  }

  /**
   * Call OpenRouter GPT-4 Vision API
   */
  private async callOpenRouterVision(imageUrl: string): Promise<AIAnalysisResult> {
    try {
      if (!OPENROUTER_API_KEY) {
        throw new Error('OpenRouter API key not configured');
      }

      console.log('[PhotoSync] Calling OpenRouter API...');

      const response = await fetch(OPENROUTER_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://your-app-domain.com', // Optional: Your app domain
          'X-Title': 'NutriTrack App', // Optional: Your app name
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: FOOD_ANALYSIS_PROMPT,
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
          max_tokens: 1000,
          temperature: 0.2, // Lower temperature for more consistent results
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

      // Extract JSON from response (handle markdown code blocks)
      let jsonContent = aiContent;
      const jsonMatch = aiContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonContent = jsonMatch[1];
      }

      const parsed: AIAnalysisResult = JSON.parse(jsonContent);

      // Validate parsed data
      if (!parsed.foods || !parsed.totalNutrition) {
        throw new Error('Invalid AI response format');
      }

      console.log('[PhotoSync] ✅ AI response parsed successfully');

      return parsed;
    } catch (error) {
      console.error('[PhotoSync] OpenRouter API error:', error);
      throw error instanceof Error ? error : new Error('AI analysis failed');
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
    aiResult: AIAnalysisResult;
    processingTime: number;
  }): Promise<string> {
    try {
      const doc = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.PHOTO_ANALYSIS,
        generateId(),
        {
          userId: data.userId,
          photoUrl: data.photoUrl,
          photoFileId: data.photoFileId || '',
          scanId: data.scanId,
          aiProvider: 'openrouter-gpt4v',
          aiResponse: JSON.stringify(data.aiResult),
          extractedFoods: JSON.stringify(data.aiResult.foods.map(f => f.name)),
          confidence: data.aiResult.confidence,
          processingTime: data.processingTime,
          status: 'completed',
          createdAt: new Date().toISOString(),
        }
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

  /**
   * Handler ketika upload berhasil
   * Update local scan dengan AI results
   */
  async onSuccess(result: any, payload: SyncPayload): Promise<void> {
    const data = payload.data as PhotoSyncData;

    console.log('[PhotoSync] ✅ Success for photo analysis');

    await this.onAnalyzePhotoSuccess(result, data);
  }

  /**
   * Success: analyzePhoto
   * Update local scan dengan AI nutrition data
   */
  private async onAnalyzePhotoSuccess(
    result: {
      photoAnalysisId: string;
      photoUrl: string;
      aiResult: AIAnalysisResult;
    },
    data: PhotoSyncData
  ): Promise<void> {
    console.log('[PhotoSync:AnalyzePhoto] Processing success...');

    try {
      // Get local scan
      const localScan = await MealOfflineAPI.getLocalScanById(data.localScanId);
      
      if (!localScan) {
        console.warn('[PhotoSync:AnalyzePhoto] Local scan not found:', data.localScanId);
        return;
      }

      // Extract food names
      const foodNames = result.aiResult.foods.map(f => f.name);
      const foodName = foodNames.length > 0
        ? foodNames.join(', ')
        : 'Detected Food';

      // Update local scan dengan AI results
      const nutrition = result.aiResult.totalNutrition;
      
      await MealOfflineAPI.updateLocalScan(data.localScanId, {
        foodName,
        calories: Math.round(nutrition.calories),
        protein: Math.round(nutrition.protein * 10) / 10,
        carbs: Math.round(nutrition.carbs * 10) / 10,
        fats: Math.round(nutrition.fats * 10) / 10,
      });

      // Mark as synced
      await MealOfflineAPI.markScanAsSynced(data.localScanId, result.photoAnalysisId);

      console.log('[PhotoSync:AnalyzePhoto] ✅ Local scan updated with AI results');
    } catch (error) {
      console.error('[PhotoSync:AnalyzePhoto] Failed to update local scan:', error);
      // Non-critical error, don't throw
    }
  }

  // ===========================================================================
  // FAILURE HANDLER
  // ===========================================================================

  /**
   * Handler ketika upload gagal
   */
  async onFailure(error: Error, payload: SyncPayload): Promise<void> {
    const data = payload.data as PhotoSyncData;

    console.error('[PhotoSync] ❌ Failure for photo analysis:', error.message);

    await this.onAnalyzePhotoFailure(error, data);
  }

  /**
   * Failure: analyzePhoto
   */
  private async onAnalyzePhotoFailure(error: Error, data: PhotoSyncData): Promise<void> {
    console.error('[PhotoSync:AnalyzePhoto] ❌ Photo analysis failed:', error.message);

    try {
      // Update local scan dengan error status
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

  /**
   * Validate photo sync data
   */
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
  // PRIORITY & RETRY CONFIGURATION
  // ===========================================================================

  /**
   * Get priority
   */
  getPriority(): number {
    return 2; // High priority (after auth)
  }

  /**
   * Get max retries
   */
  getMaxRetries(): number {
    return 3; // Photo analysis expensive, limit retries
  }
}

// ---------------------------------------------------------------------------
// Export Strategy Instance
// ---------------------------------------------------------------------------

export const photoSyncStrategy = new PhotoSyncStrategy();