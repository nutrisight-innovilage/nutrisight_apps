/**
 * cameraService.ts (FIXED - Offline-First Photo Analysis)
 * ---------------------------------------------------------------------------
 * Camera service with proper offline-first architecture for photo analysis.
 * 
 * FIXES APPLIED:
 * • ✅ Remove blocking online checks - let SyncManager handle it
 * • ✅ Save photo locally first (instant success)
 * • ✅ Queue for background analysis via SyncManager
 * • ✅ Return local placeholder scan immediately
 * • ✅ Non-blocking error handling
 * • ✅ Proper user feedback
 * ---------------------------------------------------------------------------
 */

import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { CameraView } from 'expo-camera';
import NetInfo from '@react-native-community/netinfo';
import type { CapturedPhoto, PhotoOptions, PickImageOptions } from '@/app/types/camera';
import { getSyncManager } from '@/app/services/sync/syncManager';
import { MealOfflineAPI } from '@/app/services/meal/mealOfflineAPI';
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
   */
  static async requestCameraPermission(): Promise<boolean> {
    try {
      const { Camera } = await import('expo-camera');
      const { status } = await Camera.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Izin Diperlukan',
          'Aplikasi membutuhkan akses kamera untuk mengambil foto makanan.'
        );
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      return false;
    }
  }

  /**
   * Request gallery/media library permission
   */
  static async requestGalleryPermission(): Promise<boolean> {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Izin Diperlukan',
          'Aplikasi membutuhkan akses ke galeri untuk memilih foto.'
        );
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error requesting gallery permission:', error);
      return false;
    }
  }

  /**
   * Take a photo using the camera
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
      Alert.alert('Error', 'Gagal mengambil foto. Silakan coba lagi.');
      return null;
    }
  }

  /**
   * Pick an image from the gallery
   */
  static async pickImageFromGallery(
    options: PickImageOptions = {}
  ): Promise<CapturedPhoto | null> {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
      Alert.alert('Error', 'Gagal memilih gambar. Silakan coba lagi.');
      return null;
    }
  }

  /**
   * ✅ FIXED: Analyze food from photo - OFFLINE-FIRST
   * 
   * Flow:
   * 1. Save photo locally (instant)
   * 2. Create local placeholder scan (instant feedback)
   * 3. Queue for background AI analysis via SyncManager
   * 4. Return local scan immediately
   * 
   * When online sync completes:
   * - PhotoSyncStrategy.onSuccess() will update local scan with AI results
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
    message: string;
  }> {
    try {
      console.log('[CameraService] Starting food analysis...');

      // ========================================================================
      // STEP 1: Get user ID
      // ========================================================================
      
      let userId: string;
      try {
        const authData = await authService.getCurrentUser();
        userId = authData?.user.id || 'unknown';
      } catch (error) {
        console.error('[CameraService] Failed to get user ID:', error);
        userId = 'unknown';
      }

      // ========================================================================
      // STEP 2: Create local placeholder scan (instant feedback)
      // ========================================================================
      
      const localScan: NutritionScan = {
        id: `photo_local_${Date.now()}`,
        userId,
        foodName: 'Analyzing...', // Will be updated after AI analysis
        date: new Date().toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          year: 'numeric' 
        }),
        time: new Date().toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        calories: 0,  // Will be updated
        protein: 0,   // Will be updated
        carbs: 0,     // Will be updated
        fats: 0,      // Will be updated
      };

      // ========================================================================
      // STEP 3: Save to local history
      // ========================================================================
      
      try {
        await MealOfflineAPI.saveCompletedScan(localScan);
        console.log('[CameraService] ✅ Placeholder scan saved locally');
      } catch (saveError) {
        console.error('[CameraService] Failed to save local scan:', saveError);
        return {
          success: false,
          message: 'Gagal menyimpan data lokal',
        };
      }

      // ========================================================================
      // STEP 4: Queue for background AI analysis (non-blocking)
      // ========================================================================
      
      try {
        const syncManager = getSyncManager();
        
        await syncManager.sync('photo', {
          action: 'analyzePhoto',
          photoUri,
          localScanId: localScan.id,
          metadata: {
            userId,
            mealType: metadata?.mealType,
            notes: metadata?.notes,
          },
        });
        
        console.log('[CameraService] 📋 Photo analysis queued for background processing');
      } catch (syncError) {
        // Non-blocking error - local scan already saved
        console.warn('[CameraService] Failed to queue for sync, will retry later:', syncError);
      }

      // ========================================================================
      // STEP 5: Check network and inform user
      // ========================================================================
      
      const online = await this.isOnline();
      
      const message = online
        ? 'Foto sedang dianalisis. Hasil akan muncul sebentar lagi.'
        : 'Foto tersimpan. Akan dianalisis saat terhubung ke internet.';

      Alert.alert(
        'Sedang Diproses',
        message,
        [{ text: 'OK', style: 'default' }]
      );

      // ========================================================================
      // STEP 6: Return local scan immediately (instant success)
      // ========================================================================
      
      return {
        success: true,
        scan: localScan,
        message,
      };

    } catch (error) {
      console.error('[CameraService] Error in analyzeFood:', error);
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Gagal menganalisis foto',
      };
    }
  }

  /**
   * ✅ NEW: Get analysis status
   * Check if photo analysis is complete or still pending
   */
  static async getAnalysisStatus(scanId: string): Promise<{
    isComplete: boolean;
    isPending: boolean;
    scan?: NutritionScan;
  }> {
    try {
      const scan = await MealOfflineAPI.getLocalScanById(scanId);
      
      if (!scan) {
        return {
          isComplete: false,
          isPending: false,
        };
      }

      // Check if analysis is complete (has actual nutrition data)
      const isComplete = scan.calories > 0 && scan.foodName !== 'Analyzing...';
      
      return {
        isComplete,
        isPending: !isComplete,
        scan: scan as NutritionScan,
      };
    } catch (error) {
      console.error('[CameraService] Error checking analysis status:', error);
      return {
        isComplete: false,
        isPending: false,
      };
    }
  }

  /**
   * ✅ NEW: Retry failed photo analysis
   */
  static async retryPhotoAnalysis(scanId: string): Promise<boolean> {
    try {
      const syncManager = getSyncManager();
      
      // Get local scan
      const scan = await MealOfflineAPI.getLocalScanById(scanId);
      if (!scan) {
        throw new Error('Scan not found');
      }

      // Retry sync for this specific scan
      await syncManager.retryFailed(scanId);
      
      console.log('[CameraService] ✅ Photo analysis retry queued');
      
      Alert.alert(
        'Retry Dijadwalkan',
        'Analisis foto akan dicoba ulang.',
        [{ text: 'OK', style: 'default' }]
      );
      
      return true;
    } catch (error) {
      console.error('[CameraService] Error retrying photo analysis:', error);
      
      Alert.alert(
        'Error',
        'Gagal menjadwalkan retry. Silakan coba lagi.',
        [{ text: 'OK', style: 'cancel' }]
      );
      
      return false;
    }
  }

  /**
   * ✅ NEW: Get pending photo analyses count
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
}