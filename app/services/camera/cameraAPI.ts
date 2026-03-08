/**
 * cameraService.ts (v3.1 - No Alert.alert)
 * ---------------------------------------------------------------------------
 * Camera service with offline-first + PhotoUploadService + photoSyncStrategy.
 *
 * v3.1 Changes:
 * ✅ REMOVED all Alert.alert() — service should not touch UI
 * ✅ Returns status/error info, let component handle UI (toast, etc.)
 * ---------------------------------------------------------------------------
 */

import * as ImagePicker from 'expo-image-picker';
import { CameraView } from 'expo-camera';
import NetInfo from '@react-native-community/netinfo';
import type { CapturedPhoto, PhotoOptions, PickImageOptions } from '@/app/types/camera';
import { getSyncManager } from '@/app/services/sync/syncManager';
import { MealOfflineAPI } from '@/app/services/meal/mealOfflineAPI';
import PhotoUploadService from '@/app/services/camera/photoUploadService';
import { NutritionScan } from '@/app/types/meal';
import authService from '@/app/services/auth/authService';

export class CameraService {
  /**
   * Check if device is online (non-blocking, for UI hints only)
   */
  static async isOnline(): Promise<boolean> {
    try {
      const netInfoState = await NetInfo.fetch();
      return netInfoState.isConnected === true && netInfoState.isInternetReachable === true;
    } catch (error) {
      console.error('Error checking network status:', error);
      return false;
    }
  }

  /**
   * Request camera permission
   * Returns boolean — caller handles UI if false
   */
  static async requestCameraPermission(): Promise<boolean> {
    try {
      const { Camera } = await import('expo-camera');
      const { status } = await Camera.requestCameraPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      return false;
    }
  }

  /**
   * Request gallery/media library permission
   * Returns boolean — caller handles UI if false
   */
  static async requestGalleryPermission(): Promise<boolean> {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting gallery permission:', error);
      return false;
    }
  }

  /**
   * Take a photo using the camera
   * Returns null on failure — caller handles UI
   */
  static async takePhoto(
    cameraRef: CameraView | null,
    options: PhotoOptions = {}
  ): Promise<CapturedPhoto | null> {
    if (!cameraRef) {
      console.error('Camera ref is null');
      return null;
    }

    try {
      const photo = await cameraRef.takePictureAsync({
        quality: options.quality ?? 0.8,
        base64: options.base64 ?? false,
      });

      if (!photo) return null;

      const capturedPhoto: CapturedPhoto = {
        uri: photo.uri,
        width: photo.width,
        height: photo.height,
        base64: photo.base64,
      };

      console.log('[CameraService] Photo captured:', capturedPhoto.uri);
      return capturedPhoto;
    } catch (error) {
      console.error('[CameraService] Error taking photo:', error);
      return null;
    }
  }

  /**
   * Pick an image from the gallery
   * Returns null on failure/cancel — caller handles UI
   */
  static async pickImageFromGallery(
    options: PickImageOptions = {}
  ): Promise<CapturedPhoto | null> {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: options.allowsEditing ?? true,
        aspect: options.aspect ?? [3, 4],
        quality: options.quality ?? 0.8,
      });

      if (result.canceled || !result.assets[0]) {
        return null;
      }

      const asset = result.assets[0];
      const capturedPhoto: CapturedPhoto = {
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
      };

      console.log('[CameraService] Image picked:', capturedPhoto.uri);
      return capturedPhoto;
    } catch (error) {
      console.error('[CameraService] Error picking image:', error);
      return null;
    }
  }

  /**
   * Analyze food from photo (offline-first)
   *
   * Flow:
   * 1. Save photo locally (instant, works offline)
   * 2. Create local placeholder scan (instant feedback)
   * 3. Queue for background AI analysis via photoSyncStrategy
   * 4. Return local scan immediately
   *
   * NO Alert.alert() — returns result object, caller shows toast/UI.
   */
  static async analyzeFood(
    photoUri: string,
    metadata?: {
      mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
      notes?: string;
    }
  ): Promise<{
    success: boolean;
    scan?: NutritionScan;
    localPhotoUri?: string;
    isOnline: boolean;
    message: string;
  }> {
    try {
      console.log('[CameraService] Starting food analysis flow...');

      // STEP 1: Get user ID
      let userId: string;
      try {
        const authData = await authService.getCurrentUser();
        userId = authData?.user.id || 'unknown';
      } catch (error) {
        console.error('[CameraService] Failed to get user ID:', error);
        userId = 'unknown';
      }

      // STEP 2: Save photo locally
      console.log('[CameraService] Saving photo locally...');

      const saveResult = await PhotoUploadService.savePhotoLocally(photoUri);

      if (!saveResult.success || !saveResult.localUri) {
        console.error('[CameraService] Failed to save photo locally:', saveResult.error);
        return {
          success: false,
          isOnline: false,
          message: saveResult.error || 'Gagal menyimpan foto lokal',
        };
      }

      console.log('[CameraService] ✅ Photo saved locally:', saveResult.localUri);

      // STEP 3: Create local placeholder scan
      const localScanId = `photo_local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const localScan: NutritionScan = {
        id: localScanId,
        userId,
        foodName: 'Menganalisis...',
        date: new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        time: new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        calories: 0,
        protein: 0,
        carbs: 0,
        fats: 0,
      };

      // STEP 4: Save placeholder scan locally
      try {
        await MealOfflineAPI.saveCompletedScan(localScan);
        console.log('[CameraService] ✅ Placeholder scan saved locally');
      } catch (saveError) {
        console.error('[CameraService] Failed to save local scan:', saveError);
        return {
          success: false,
          isOnline: false,
          message: 'Gagal menyimpan data lokal',
        };
      }

      // STEP 5: Queue for background AI analysis
      try {
        const syncManager = getSyncManager();

        await syncManager.sync('photo', {
          action: 'analyzePhoto',
          photoUri: saveResult.localUri,
          localScanId: localScanId,
          metadata: {
            userId,
            mealType: metadata?.mealType,
            notes: metadata?.notes,
          },
        });

        console.log('[CameraService] 📋 Photo queued for AI analysis');
      } catch (syncError) {
        console.warn('[CameraService] Failed to queue for sync, will retry later:', syncError);
      }

      // STEP 6: Return result — caller decides how to show UI
      const online = await this.isOnline();

      const message = online
        ? 'Foto sedang dianalisis. Hasil akan muncul sebentar lagi.'
        : 'Foto tersimpan. Akan dianalisis saat terhubung ke internet.';

      return {
        success: true,
        scan: localScan,
        localPhotoUri: saveResult.localUri,
        isOnline: online,
        message,
      };
    } catch (error) {
      console.error('[CameraService] Error in analyzeFood:', error);

      return {
        success: false,
        isOnline: false,
        message: error instanceof Error ? error.message : 'Gagal menganalisis foto',
      };
    }
  }

  /**
   * Get analysis status
   * Check if photo analysis is complete, pending, or not-food
   */
  static async getAnalysisStatus(scanId: string): Promise<{
    isComplete: boolean;
    isPending: boolean;
    isNotFood: boolean;
    scan?: NutritionScan;
  }> {
    try {
      const scan = await MealOfflineAPI.getLocalScanById(scanId);

      if (!scan) {
        return {
          isComplete: false,
          isPending: false,
          isNotFood: false,
        };
      }

      // Check if marked as not-food
      const isNotFood = scan.foodName?.startsWith('Bukan Makanan') || false;

      // Check if analysis is complete (has actual nutrition data)
      const isComplete =
        !isNotFood &&
        scan.calories > 0 &&
        scan.foodName !== 'Menganalisis...' &&
        scan.foodName !== 'Analisis Gagal - Akan Dicoba Ulang';

      return {
        isComplete,
        isPending: !isComplete && !isNotFood,
        isNotFood,
        scan: scan as NutritionScan,
      };
    } catch (error) {
      console.error('[CameraService] Error checking analysis status:', error);
      return {
        isComplete: false,
        isPending: false,
        isNotFood: false,
      };
    }
  }

  /**
   * Retry failed photo analysis
   * Returns boolean — caller handles UI
   */
  static async retryPhotoAnalysis(scanId: string): Promise<boolean> {
    try {
      const syncManager = getSyncManager();

      const scan = await MealOfflineAPI.getLocalScanById(scanId);
      if (!scan) {
        throw new Error('Scan not found');
      }

      await syncManager.retryFailed(scanId);

      console.log('[CameraService] ✅ Photo analysis retry queued');
      return true;
    } catch (error) {
      console.error('[CameraService] Error retrying photo analysis:', error);
      return false;
    }
  }

  /**
   * Get pending photo analyses count
   */
  static async getPendingAnalysesCount(): Promise<number> {
    try {
      const syncManager = getSyncManager();
      return await syncManager.getPendingCount('photo');
    } catch (error) {
      console.error('[CameraService] Error getting pending count:', error);
      return 0;
    }
  }

  /**
   * Clean up old local photos
   */
  static async cleanupOldPhotos(daysOld: number = 7): Promise<{
    success: boolean;
    deletedCount: number;
  }> {
    try {
      const deletedCount = await PhotoUploadService.cleanupOldLocalPhotos(daysOld);

      return {
        success: true,
        deletedCount,
      };
    } catch (error) {
      console.error('[CameraService] Error cleaning up photos:', error);
      return {
        success: false,
        deletedCount: 0,
      };
    }
  }

  /**
   * Get local photos storage size
   */
  static async getLocalPhotosSize(): Promise<number> {
    try {
      return await PhotoUploadService.getLocalPhotosSize();
    } catch (error) {
      console.error('[CameraService] Error getting photos size:', error);
      return 0;
    }
  }
}