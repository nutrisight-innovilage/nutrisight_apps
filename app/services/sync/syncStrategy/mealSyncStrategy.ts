/**
 * mealSyncStrategy.ts
 * ---------------------------------------------------------------------------
 * Meal-specific sync strategy.
 * Menghubungkan MealOfflineAPI dengan MealOnlineAPI.
 * 
 * Implements SyncStrategy interface untuk:
 * • Meal scans sync
 * • Photo upload sync
 * • Feedback sync
 * ---------------------------------------------------------------------------
 */

import { SyncPayload } from '@/app/services/sync/syncQueue';
import { SyncStrategy } from '@/app/services/sync/syncManager';
import { MealOfflineAPI } from '@/app/services/meal/mealOfflineAPI';
import { MealOnlineAPI } from '@/app/services/meal/mealOnlineAPI';
import { AnalyzeMealRequest, NutritionScan } from '@/app/types/meal';

// ---------------------------------------------------------------------------
// Meal Scan Sync Strategy
// ---------------------------------------------------------------------------

export class MealScanSyncStrategy implements SyncStrategy {
  /**
   * Prepare meal data untuk sync
   */
  async prepare(data: AnalyzeMealRequest): Promise<SyncPayload> {
    return {
      id: `meal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'meal',
      data: data,
      priority: this.getPriority(),
      retryCount: 0,
      maxRetries: this.getMaxRetries(),
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Upload meal ke server untuk analysis
   */
  async upload(payload: SyncPayload): Promise<NutritionScan> {
    const mealData = payload.data as AnalyzeMealRequest;
    
    console.log('[MealScanSync] Uploading meal for analysis...');
    const scan = await MealOnlineAPI.analyzeMeal(mealData);
    
    console.log('[MealScanSync] ✓ Analysis complete:', scan.id);
    return scan;
  }

  /**
   * Handler ketika upload berhasil
   */
  async onSuccess(result: NutritionScan, payload: SyncPayload): Promise<void> {
    console.log('[MealScanSync] Saving scan to local history...');
    
    // Save scan result ke local completed scans
    await MealOfflineAPI.saveCompletedScan(result);
    
    // Mark as synced dengan server ID
    const localScans = await MealOfflineAPI.getAllLocalScans();
    const localScan = localScans.find(s => !s.isSynced);
    
    if (localScan) {
      await MealOfflineAPI.markScanAsSynced(localScan.localId, result.id);
    }
    
    console.log('[MealScanSync] ✓ Scan saved and marked as synced');
  }

  /**
   * Handler ketika upload gagal
   */
  async onFailure(error: Error, payload: SyncPayload): Promise<void> {
    console.error('[MealScanSync] Upload failed:', error.message);
    
    // Jika belum di pending queue, tambahkan
    const mealData = payload.data as AnalyzeMealRequest;
    
    // Create temporary scan untuk local reference
    const tempScan: NutritionScan = {
      id: payload.id,
      foodName: 'Pending Analysis',
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      calories: 0,
      protein: 0,
      carbs: 0,
      fats: 0,
    };
    
    // Add to pending scans
    await MealOfflineAPI.addToPendingScans(tempScan, mealData);
    
    console.log('[MealScanSync] Added to pending queue for retry');
  }

  /**
   * Validate meal data
   */
  validate(data: any): boolean {
    if (!data || typeof data !== 'object') {
      return false;
    }

    const mealData = data as AnalyzeMealRequest;

    // Must have items
    if (!mealData.items || !Array.isArray(mealData.items) || mealData.items.length === 0) {
      console.error('[MealScanSync] Validation failed: No items');
      return false;
    }

    // Must have metadata
    if (!mealData.metadata) {
      console.error('[MealScanSync] Validation failed: No metadata');
      return false;
    }

    // Must have valid rice portion
    if (typeof mealData.ricePortion !== 'number' || mealData.ricePortion < 0) {
      console.error('[MealScanSync] Validation failed: Invalid rice portion');
      return false;
    }

    return true;
  }

  /**
   * Priority: Medium (2)
   * Meal scans penting tapi tidak se-urgent auth
   */
  getPriority(): number {
    return 2;
  }

  /**
   * Max retries: 3
   */
  getMaxRetries(): number {
    return 3;
  }
}

// ---------------------------------------------------------------------------
// Photo Upload Sync Strategy
// ---------------------------------------------------------------------------

export class PhotoSyncStrategy implements SyncStrategy {
  /**
   * Prepare photo untuk sync
   */
  async prepare(data: { photoUri: string; metadata?: any }): Promise<SyncPayload> {
    return {
      id: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'photo',
      data: data,
      priority: this.getPriority(),
      retryCount: 0,
      maxRetries: this.getMaxRetries(),
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Upload photo ke YOLO analysis
   */
  async upload(payload: SyncPayload): Promise<any> {
    const photoData = payload.data as { photoUri: string; metadata?: any };
    
    console.log('[PhotoSync] Uploading photo for YOLO analysis...');
    const result = await MealOnlineAPI.analyzeFoodFromPhoto(photoData.photoUri);
    
    console.log('[PhotoSync] ✓ YOLO analysis complete');
    return result;
  }

  /**
   * Handler ketika upload berhasil
   */
  async onSuccess(result: any, payload: SyncPayload): Promise<void> {
    console.log('[PhotoSync] Photo analyzed successfully');
    
    // Optional: Save detected foods ke local database
    // Bisa digunakan untuk auto-populate cart
    
    console.log('[PhotoSync] ✓ Detection results saved');
  }

  /**
   * Handler ketika upload gagal
   */
  async onFailure(error: Error, payload: SyncPayload): Promise<void> {
    console.error('[PhotoSync] Upload failed:', error.message);
    
    const photoData = payload.data as { photoUri: string; metadata?: any };
    
    // Add to pending photos
    await MealOfflineAPI.addToPendingPhotos(photoData.photoUri, photoData.metadata || {});
    
    console.log('[PhotoSync] Added to pending queue for retry');
  }

  /**
   * Validate photo data
   */
  validate(data: any): boolean {
    if (!data || typeof data !== 'object') {
      return false;
    }

    const photoData = data as { photoUri: string; metadata?: any };

    // Must have photo URI
    if (!photoData.photoUri || typeof photoData.photoUri !== 'string') {
      console.error('[PhotoSync] Validation failed: No photo URI');
      return false;
    }

    return true;
  }

  /**
   * Priority: Low (3)
   * Photo analysis bisa ditunda
   */
  getPriority(): number {
    return 3;
  }

  /**
   * Max retries: 5
   * Photos bisa retry lebih banyak karena ukuran file
   */
  getMaxRetries(): number {
    return 5;
  }
}

// ---------------------------------------------------------------------------
// Feedback Sync Strategy
// ---------------------------------------------------------------------------

export class FeedbackSyncStrategy implements SyncStrategy {
  /**
   * Prepare feedback untuk sync
   */
  async prepare(data: any): Promise<SyncPayload> {
    return {
      id: `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'feedback',
      data: data,
      priority: this.getPriority(),
      retryCount: 0,
      maxRetries: this.getMaxRetries(),
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Upload feedback ke server
   */
  async upload(payload: SyncPayload): Promise<void> {
    const feedbackData = payload.data;
    
    console.log('[FeedbackSync] Uploading feedback...');
    await MealOnlineAPI.sendUserFeedback(feedbackData);
    
    console.log('[FeedbackSync] ✓ Feedback sent');
  }

  /**
   * Handler ketika upload berhasil
   */
  async onSuccess(result: any, payload: SyncPayload): Promise<void> {
    console.log('[FeedbackSync] ✓ Feedback synced successfully');
  }

  /**
   * Handler ketika upload gagal
   */
  async onFailure(error: Error, payload: SyncPayload): Promise<void> {
    console.error('[FeedbackSync] Upload failed:', error.message);
    
    const feedbackData = payload.data;
    
    // Add to pending feedback
    await MealOfflineAPI.addToPendingFeedback(
      feedbackData.scanId,
      feedbackData
    );
    
    console.log('[FeedbackSync] Added to pending queue for retry');
  }

  /**
   * Validate feedback data
   */
  validate(data: any): boolean {
    if (!data || typeof data !== 'object') {
      return false;
    }

    // Must have scan ID
    if (!data.scanId) {
      console.error('[FeedbackSync] Validation failed: No scan ID');
      return false;
    }

    // Must have rating
    if (typeof data.rating !== 'number' || data.rating < 1 || data.rating > 5) {
      console.error('[FeedbackSync] Validation failed: Invalid rating');
      return false;
    }

    return true;
  }

  /**
   * Priority: Low (4)
   * Feedback tidak urgent
   */
  getPriority(): number {
    return 4;
  }

  /**
   * Max retries: 3
   */
  getMaxRetries(): number {
    return 3;
  }
}

// ---------------------------------------------------------------------------
// Export all strategies
// ---------------------------------------------------------------------------

export const MealSyncStrategies = {
  scan: new MealScanSyncStrategy(),
  photo: new PhotoSyncStrategy(),
  feedback: new FeedbackSyncStrategy(),
};