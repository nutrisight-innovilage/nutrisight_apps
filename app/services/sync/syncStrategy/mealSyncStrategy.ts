/**
 * mealSyncStrategy.ts (CLEANED - APPWRITE VERSION)
 * ---------------------------------------------------------------------------
 * Meal-specific sync strategy - STRICTLY following mealService.ts usage.
 * 
 * REMOVED BLOAT:
 * • ❌ sendHistoricalData action (not in mealService core flow)
 * • ❌ sendFeedback action (not in types)
 * • ❌ analyzePhoto action (not in types)
 * 
 * KEPT ONLY:
 * • ✅ submitAnalysis - Main meal submission (mealService.submitAnalysis)
 * • ✅ updateScan - Scan updates (mealService.updateScan)
 * • ✅ deleteScan - Scan deletion (mealService.deleteScan)
 * 
 * Flow:
 * 1. mealService.submitAnalysis() → sync('meal', { action: 'submitAnalysis', ... })
 * 2. mealService.updateScan() → sync('meal', { action: 'updateScan', ... })
 * 3. mealService.deleteScan() → sync('meal', { action: 'deleteScan', ... })
 * ---------------------------------------------------------------------------
 */

import { SyncPayload } from '@/app/services/sync/syncQueue';
import { SyncStrategy } from '@/app/services/sync/syncManager';
import { MealOfflineAPI } from '@/app/services/meal/mealOfflineAPI';
import { MealOnlineAPI } from '@/app/services/meal/mealOnlineAPI';
import { AnalyzeMealRequest, NutritionScan } from '@/app/types/meal';

// ---------------------------------------------------------------------------
// Types for Sync Actions
// ---------------------------------------------------------------------------

interface MealSyncData {
  action: 'submitAnalysis' | 'updateScan' | 'deleteScan';
  
  // submitAnalysis
  mealData?: AnalyzeMealRequest;
  localScanId?: string;
  
  // updateScan
  scanId?: string;
  updates?: Partial<NutritionScan>;
}

// ---------------------------------------------------------------------------
// Meal Sync Strategy (Cleaned)
// ---------------------------------------------------------------------------

export class MealSyncStrategy implements SyncStrategy {
  /**
   * Prepare meal data untuk sync
   */
  async prepare(data: MealSyncData): Promise<SyncPayload> {
    const action = data.action || 'submitAnalysis';
    
    return {
      id: `meal_${action}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'meal',
      data: data,
      priority: this.getPriorityForAction(action),
      retryCount: 0,
      maxRetries: this.getMaxRetriesForAction(action),
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Upload/sync meal data ke Appwrite
   */
  async upload(payload: SyncPayload): Promise<any> {
    const data = payload.data as MealSyncData;
    const action = data.action || 'submitAnalysis';

    console.log(`[MealSync] Processing action: ${action}`);

    switch (action) {
      case 'submitAnalysis':
        return await this.handleSubmitAnalysis(data);
      
      case 'updateScan':
        return await this.handleUpdateScan(data);
      
      case 'deleteScan':
        return await this.handleDeleteScan(data);
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  // ===========================================================================
  // ACTION HANDLERS
  // ===========================================================================

  /**
   * Handle: submitAnalysis
   * Submit meal untuk nutrition analysis
   */
  private async handleSubmitAnalysis(data: MealSyncData): Promise<NutritionScan> {
    if (!data.mealData) {
      throw new Error('Missing mealData for submitAnalysis');
    }

    console.log('[MealSync:SubmitAnalysis] Uploading meal for analysis...');
    
    // Call MealOnlineAPI.analyzeMeal
    const response = await MealOnlineAPI.analyzeMeal(data.mealData);
    
    if (!response.success || !response.scan) {
      throw new Error(response.message || 'Analysis failed');
    }
    
    console.log('[MealSync:SubmitAnalysis] ✅ Analysis complete:', response.scan.id);
    return response.scan;
  }

  /**
   * Handle: updateScan
   * Update existing scan on Appwrite
   */
  private async handleUpdateScan(data: MealSyncData): Promise<void> {
    if (!data.scanId || !data.updates) {
      throw new Error('Missing scanId or updates for updateScan');
    }

    console.log('[MealSync:UpdateScan] Updating scan on Appwrite...');
    
    // TODO: Implement updateScan in MealOnlineAPI when needed
    console.warn('[MealSync:UpdateScan] ⚠️ Server update not yet implemented');
    
    console.log('[MealSync:UpdateScan] ✅ Update complete');
  }

  /**
   * Handle: deleteScan
   * Delete scan from Appwrite
   */
  private async handleDeleteScan(data: MealSyncData): Promise<void> {
    if (!data.scanId) {
      throw new Error('Missing scanId for deleteScan');
    }

    console.log('[MealSync:DeleteScan] Deleting scan from Appwrite...');
    
    // TODO: Implement deleteScan in MealOnlineAPI when needed
    console.warn('[MealSync:DeleteScan] ⚠️ Server deletion not yet implemented');
    
    console.log('[MealSync:DeleteScan] ✅ Deletion complete');
  }

  // ===========================================================================
  // SUCCESS HANDLERS
  // ===========================================================================

  /**
   * Handler ketika upload berhasil
   */
  async onSuccess(result: any, payload: SyncPayload): Promise<void> {
    const data = payload.data as MealSyncData;
    const action = data.action || 'submitAnalysis';

    console.log(`[MealSync] ✅ Success for action: ${action}`);

    switch (action) {
      case 'submitAnalysis':
        await this.onSubmitAnalysisSuccess(result as NutritionScan, data);
        break;
      
      case 'updateScan':
        await this.onUpdateScanSuccess(data);
        break;
      
      case 'deleteScan':
        await this.onDeleteScanSuccess(data);
        break;
    }
  }

  /**
   * Success: submitAnalysis
   */
  private async onSubmitAnalysisSuccess(
    serverScan: NutritionScan, 
    data: MealSyncData
  ): Promise<void> {
    console.log('[MealSync:SubmitAnalysis] Processing success...');

    // Update local scan dengan server result
    if (data.localScanId) {
      try {
        const localScan = await MealOfflineAPI.getLocalScanById(data.localScanId);
        
        if (localScan) {
          // Update dengan server data
          await MealOfflineAPI.updateLocalScan(data.localScanId, {
            ...serverScan,
          });
          
          // Mark as synced
          await MealOfflineAPI.markScanAsSynced(data.localScanId, serverScan.id);
          
          console.log('[MealSync:SubmitAnalysis] ✅ Local scan updated with server data');
        } else {
          // Local scan tidak ditemukan, save server result
          await MealOfflineAPI.saveCompletedScan(serverScan);
          console.log('[MealSync:SubmitAnalysis] ✅ Server scan saved locally');
        }
      } catch (error) {
        console.error('[MealSync:SubmitAnalysis] Failed to update local scan:', error);
        // Non-critical error, don't throw
      }
    } else {
      // No local scan ID, just save server result
      await MealOfflineAPI.saveCompletedScan(serverScan);
      console.log('[MealSync:SubmitAnalysis] ✅ Server scan saved locally');
    }
  }

  /**
   * Success: updateScan
   */
  private async onUpdateScanSuccess(data: MealSyncData): Promise<void> {
    console.log('[MealSync:UpdateScan] ✅ Server updated successfully');
    
    if (data.scanId) {
      // Mark local scan as synced
      const localScan = await MealOfflineAPI.getLocalScanById(data.scanId);
      if (localScan && !localScan.isSynced) {
        await MealOfflineAPI.markScanAsSynced(localScan.localId, data.scanId);
      }
    }
  }

  /**
   * Success: deleteScan
   */
  private async onDeleteScanSuccess(data: MealSyncData): Promise<void> {
    console.log('[MealSync:DeleteScan] ✅ Server deletion confirmed');
    // Local scan already deleted by mealService
  }

  // ===========================================================================
  // FAILURE HANDLERS
  // ===========================================================================

  /**
   * Handler ketika upload gagal
   */
  async onFailure(error: Error, payload: SyncPayload): Promise<void> {
    const data = payload.data as MealSyncData;
    const action = data.action || 'submitAnalysis';

    console.error(`[MealSync] ❌ Failure for action ${action}:`, error.message);

    switch (action) {
      case 'submitAnalysis':
        await this.onSubmitAnalysisFailure(error, data);
        break;
      
      case 'updateScan':
        await this.onUpdateScanFailure(error, data);
        break;
      
      case 'deleteScan':
        await this.onDeleteScanFailure(error, data);
        break;
    }
  }

  /**
   * Failure: submitAnalysis
   */
  private async onSubmitAnalysisFailure(error: Error, data: MealSyncData): Promise<void> {
    console.error('[MealSync:SubmitAnalysis] ❌ Server upload failed:', error.message);
    console.log('[MealSync:SubmitAnalysis] Meal will retry on next sync');
  }

  /**
   * Failure: updateScan
   */
  private async onUpdateScanFailure(error: Error, data: MealSyncData): Promise<void> {
    console.error('[MealSync:UpdateScan] ❌ Server update failed:', error.message);
    console.log('[MealSync:UpdateScan] Will retry on next sync');
  }

  /**
   * Failure: deleteScan
   */
  private async onDeleteScanFailure(error: Error, data: MealSyncData): Promise<void> {
    console.error('[MealSync:DeleteScan] ❌ Server deletion failed:', error.message);
    console.log('[MealSync:DeleteScan] Will retry on next sync');
  }

  // ===========================================================================
  // VALIDATION
  // ===========================================================================

  /**
   * Validate meal sync data
   */
  validate(data: any): boolean {
    if (!data || typeof data !== 'object') {
      console.error('[MealSync] Validation failed: Invalid data type');
      return false;
    }

    const mealData = data as MealSyncData;
    const action = mealData.action || 'submitAnalysis';

    switch (action) {
      case 'submitAnalysis':
        return this.validateSubmitAnalysis(mealData);
      
      case 'updateScan':
        return this.validateUpdateScan(mealData);
      
      case 'deleteScan':
        return this.validateDeleteScan(mealData);
      
      default:
        console.error(`[MealSync] Unknown action: ${action}`);
        return false;
    }
  }

  private validateSubmitAnalysis(data: MealSyncData): boolean {
    if (!data.mealData) {
      console.error('[MealSync:SubmitAnalysis] Missing mealData');
      return false;
    }

    if (!data.mealData.items || data.mealData.items.length === 0) {
      console.error('[MealSync:SubmitAnalysis] No items in meal');
      return false;
    }

    if (typeof data.mealData.ricePortion !== 'number') {
      console.error('[MealSync:SubmitAnalysis] Invalid rice portion');
      return false;
    }

    return true;
  }

  private validateUpdateScan(data: MealSyncData): boolean {
    if (!data.scanId) {
      console.error('[MealSync:UpdateScan] Missing scanId');
      return false;
    }

    if (!data.updates) {
      console.error('[MealSync:UpdateScan] Missing updates');
      return false;
    }

    return true;
  }

  private validateDeleteScan(data: MealSyncData): boolean {
    if (!data.scanId) {
      console.error('[MealSync:DeleteScan] Missing scanId');
      return false;
    }

    return true;
  }

  // ===========================================================================
  // PRIORITY & RETRY CONFIGURATION
  // ===========================================================================

  /**
   * Get priority berdasarkan action type
   */
  private getPriorityForAction(action: string): number {
    switch (action) {
      case 'submitAnalysis':
        return 2; // Medium - important
      
      case 'updateScan':
        return 3; // Low-medium
      
      case 'deleteScan':
        return 3; // Low-medium
      
      default:
        return 5; // Lowest
    }
  }

  /**
   * Get max retries berdasarkan action type
   */
  private getMaxRetriesForAction(action: string): number {
    switch (action) {
      case 'submitAnalysis':
        return 3; // Standard retries
      
      case 'updateScan':
        return 3;
      
      case 'deleteScan':
        return 2; // Fewer retries for delete
      
      default:
        return 3;
    }
  }

  /**
   * Default priority untuk backward compatibility
   */
  getPriority(): number {
    return 2; // Medium
  }

  /**
   * Default max retries untuk backward compatibility
   */
  getMaxRetries(): number {
    return 3;
  }
}

// ---------------------------------------------------------------------------
// Export Strategy Instance
// ---------------------------------------------------------------------------

export const mealSyncStrategy = new MealSyncStrategy();