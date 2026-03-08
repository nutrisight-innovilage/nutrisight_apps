/**
 * photoSyncStrategy.ts (v5.1 - Delete non-food photos from bucket)
 * ---------------------------------------------------------------------------
 * Photo-specific sync strategy.
 *
 * v5.1 Changes:
 * ✅ Delete photo from Appwrite bucket when detected as NOT food
 * ✅ Pass photoFileId through result for cleanup
 * ✅ Delete from bucket AFTER saving analysis log (for audit trail)
 *
 * Flow:
 * 1. User takes photo → saved locally (instant)
 * 2. Photo queued for sync
 * 3. When online:
 *    a. Upload photo to Appwrite Storage
 *    b. openRouterService.detectFoodCategories() → isFood check + categories
 *    c. If NOT food → save log → DELETE from bucket → mark scan "Bukan Makanan"
 *    d. If food → NutritionCalculator computes nutrition
 *    e. Save to photo_analysis collection
 *    f. Update local scan with nutrition data
 * ---------------------------------------------------------------------------
 */

import { SyncPayload } from '@/app/services/sync/syncQueue';
import { SyncStrategy } from '@/app/services/sync/syncManager';
import { MealOfflineAPI } from '@/app/services/meal/mealOfflineAPI';
import PhotoUploadService from '@/app/services/camera/photoUploadService';
import authService from '@/app/services/auth/authService';
import openRouterService, { FoodDetectionResult } from '@/app/services/openrouter/openRouterServices';
import {
  NutritionCalculator,
  DetectedFoodItem,
  MealNutritionResult,
} from '@/app/services/meal/nutritionCalculator';
import {
  databases,
  generateId,
  DATABASE_ID,
  COLLECTIONS,
  handleAppwriteError,
} from '@/app/config/appwriteConfig';
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

interface PhotoAnalysisResult {
  photoAnalysisId: string;
  photoUrl: string;
  photoFileId?: string;
  isFood: boolean;
  notFoodReason?: string;
  nutritionResult?: MealNutritionResult;
}

// ---------------------------------------------------------------------------
// Photo Sync Strategy (v5.1)
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
  async upload(payload: SyncPayload): Promise<PhotoAnalysisResult> {
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
   * Upload → openRouterService.detectFoodCategories() → NutritionCalculator → Save
   */
  private async handleAnalyzePhoto(data: PhotoSyncData): Promise<PhotoAnalysisResult> {
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

    // STEP 3: Call openRouterService for food detection
    console.log('[PhotoSync:AnalyzePhoto] Detecting food categories via openRouterService...');

    const startTime = Date.now();
    const detection: FoodDetectionResult = await openRouterService.detectFoodCategories(
      uploadResult.fileUrl
    );
    const detectionTime = Date.now() - startTime;

    // ── STEP 3a: NON-FOOD CHECK ──────────────────────────────────────
    if (!detection.isFood) {
      console.log('[PhotoSync:AnalyzePhoto] ⚠️ Not food:', detection.notFoodReason);

      // Save analysis log first (audit trail)
      const photoAnalysisId = await this.saveAnalysisLog({
        userId,
        photoUrl: uploadResult.fileUrl,
        photoFileId: uploadResult.fileId,
        scanId: data.localScanId,
        isFood: false,
        notFoodReason: detection.notFoodReason,
        processingTime: detectionTime,
        mealType: data.metadata.mealType,
      });

      // ✅ v5.1: Delete non-food photo from bucket to save storage
      if (uploadResult.fileId) {
        console.log('[PhotoSync:AnalyzePhoto] 🗑️ Deleting non-food photo from bucket...');
        const deleted = await PhotoUploadService.deletePhoto(uploadResult.fileId);
        if (deleted) {
          console.log('[PhotoSync:AnalyzePhoto] ✅ Non-food photo deleted from bucket');
        } else {
          console.warn('[PhotoSync:AnalyzePhoto] ⚠️ Failed to delete non-food photo from bucket');
        }
      }

      return {
        photoAnalysisId,
        photoUrl: uploadResult.fileUrl,
        photoFileId: uploadResult.fileId,
        isFood: false,
        notFoodReason: detection.notFoodReason,
      };
    }

    // ── STEP 4: Parse + validate → DetectedFoodItem[] ────────────────
    const detectedItems = NutritionCalculator.parseAIDetection({
      foods: detection.foods,
    });

    console.log('[PhotoSync:AnalyzePhoto] ✅ Detected:', {
      items: detectedItems.length,
      categories: detectedItems.map(i => `${i.category}(${i.portionGrams}g)`),
      detectionTime: `${detectionTime}ms`,
    });

    // STEP 5: Calculate nutrition using NutritionCalculator
    const nutritionResult = NutritionCalculator.calculateMeal(detectedItems);

    console.log('[PhotoSync:AnalyzePhoto] ✅ Nutrition calculated:', {
      totalCalories: nutritionResult.totalNutrition.calories,
      totalProtein: nutritionResult.totalNutrition.protein,
      totalCarbs: nutritionResult.totalNutrition.carbs,
      totalFats: nutritionResult.totalNutrition.fats,
    });

    // STEP 6: Save analysis log to Appwrite
    const photoAnalysisId = await this.saveAnalysisLog({
      userId,
      photoUrl: uploadResult.fileUrl,
      photoFileId: uploadResult.fileId,
      scanId: data.localScanId,
      isFood: true,
      nutritionResult,
      detectedItems,
      processingTime: detectionTime,
      mealType: data.metadata.mealType,
    });

    console.log('[PhotoSync:AnalyzePhoto] ✅ Analysis saved:', photoAnalysisId);

    return {
      photoAnalysisId,
      photoUrl: uploadResult.fileUrl,
      photoFileId: uploadResult.fileId,
      isFood: true,
      nutritionResult,
    };
  }

  /**
   * Save analysis log to Appwrite photo_analysis collection
   */
  private async saveAnalysisLog(data: {
    userId: string;
    photoUrl: string;
    photoFileId?: string;
    scanId: string;
    isFood: boolean;
    notFoodReason?: string;
    nutritionResult?: MealNutritionResult;
    detectedItems?: DetectedFoodItem[];
    processingTime: number;
    mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  }): Promise<string> {
    try {
      const aiResponseJson = data.isFood
        ? JSON.stringify({
            isFood: true,
            detectedItems: data.detectedItems,
            nutritionResult: data.nutritionResult,
            totals: data.nutritionResult?.totalNutrition,
            mealType: data.mealType || 'snack',
          })
        : JSON.stringify({
            isFood: false,
            notFoodReason: data.notFoodReason,
          });

      const extractedFoodsJson = data.isFood && data.nutritionResult
        ? JSON.stringify(
            data.nutritionResult.foods.map(f => ({
              category: f.category,
              label: f.label,
              portionGrams: f.portionGrams,
              calories: f.calories,
            }))
          )
        : '[]';

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
          confidence: data.isFood
            ? (data.nutritionResult?.confidence ?? 0)
            : 0,
          processingTime: data.processingTime,
          status: data.isFood ? 'completed' : 'not_food',
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

  async onSuccess(result: PhotoAnalysisResult, payload: SyncPayload): Promise<void> {
    const data = payload.data as PhotoSyncData;
    console.log('[PhotoSync] ✅ Success for photo analysis');

    if (result.isFood === false) {
      await this.onNotFoodSuccess(result, data);
      return;
    }

    await this.onAnalyzePhotoSuccess(result, data);
  }

  /**
   * Handle success when image is NOT food
   */
  private async onNotFoodSuccess(
    result: PhotoAnalysisResult,
    data: PhotoSyncData
  ): Promise<void> {
    console.log('[PhotoSync:NotFood] Image is not food:', result.notFoodReason);

    try {
      const localScan = await MealOfflineAPI.getLocalScanById(data.localScanId);

      if (!localScan) {
        console.warn('[PhotoSync:NotFood] Local scan not found:', data.localScanId);
        return;
      }

      // Update local scan to indicate it's not food
      await MealOfflineAPI.updateLocalScan(data.localScanId, {
        foodName: `Bukan Makanan${result.notFoodReason ? ` — ${result.notFoodReason}` : ''}`,
        calories: 0,
        protein: 0,
        carbs: 0,
        fats: 0,
      });

      await MealOfflineAPI.markScanAsSynced(data.localScanId, result.photoAnalysisId);

      // ✅ v5.1: Clean up local photo file too (no longer needed)
      try {
        const { photoUri } = data;
        if (photoUri && photoUri.startsWith('file://')) {
          const FileSystem = await import('expo-file-system/legacy');
          const fileInfo = await FileSystem.getInfoAsync(photoUri);
          if (fileInfo.exists) {
            await FileSystem.deleteAsync(photoUri, { idempotent: true });
            console.log('[PhotoSync:NotFood] ✅ Local photo file cleaned up');
          }
        }
      } catch (cleanupErr) {
        // Non-critical, just log
        console.warn('[PhotoSync:NotFood] Local cleanup failed:', cleanupErr);
      }

      console.log('[PhotoSync:NotFood] ✅ Local scan updated as not-food');
    } catch (error) {
      console.error('[PhotoSync:NotFood] Failed to update local scan:', error);
    }
  }

  /**
   * Handle success when food IS detected
   */
  private async onAnalyzePhotoSuccess(
    result: PhotoAnalysisResult,
    data: PhotoSyncData
  ): Promise<void> {
    console.log('[PhotoSync:AnalyzePhoto] Processing success...');

    try {
      const localScan = await MealOfflineAPI.getLocalScanById(data.localScanId);

      if (!localScan) {
        console.warn('[PhotoSync:AnalyzePhoto] Local scan not found:', data.localScanId);
        return;
      }

      if (!result.nutritionResult) {
        console.warn('[PhotoSync:AnalyzePhoto] No nutrition result in success handler');
        return;
      }

      // Build food name from detected categories
      const foodDescriptions = result.nutritionResult.foods.map(
        f => `${f.label} (${f.portionGrams}g)`
      );
      const foodName =
        foodDescriptions.length > 0
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
          foodName: 'Analisis Gagal - Akan Dicoba Ulang',
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