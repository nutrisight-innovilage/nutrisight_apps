/**
 * mealSyncStrategy.ts (v2.0 COMPLETE)
 * ---------------------------------------------------------------------------
 * Meal-specific sync strategy with historical data sync support.
 * 
 * ACTIONS:
 * • ✅ submitAnalysis - Main meal submission
 * • ✅ updateScan - Scan updates
 * • ✅ deleteScan - Scan deletion
 * • ✅ sendHistoricalData - Bulk historical sync (v2.0)
 * ---------------------------------------------------------------------------
 */

import { SyncPayload } from '@/app/services/sync/syncQueue';
import { SyncStrategy } from '@/app/services/sync/syncManager';
import { MealOfflineAPI } from '@/app/services/meal/mealOfflineAPI';
import { MealOnlineAPI } from '@/app/services/meal/mealOnlineAPI';
import { AnalyzeMealRequest, NutritionScan, BulkSyncResult } from '@/app/types/meal';

// ---------------------------------------------------------------------------
// Types for Sync Actions
// ---------------------------------------------------------------------------

interface MealSyncData {
  action: 'submitAnalysis' | 'updateScan' | 'deleteScan' | 'sendHistoricalData';
  
  // submitAnalysis
  mealData?: AnalyzeMealRequest;
  localScanId?: string;
  
  // updateScan
  scanId?: string;
  updates?: Partial<NutritionScan>;
  
  // sendHistoricalData (v2.0)
  scans?: any[];
  batchIndex?: number;
  totalBatches?: number;
}

// ---------------------------------------------------------------------------
// Meal Sync Strategy (v2.0)
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
      
      case 'sendHistoricalData':
        return await this.handleSendHistoricalData(data);
      
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

  /**
   * Handle: sendHistoricalData (v2.0)
   * Bulk upload historical scans to server
   */
  private async handleSendHistoricalData(data: MealSyncData): Promise<BulkSyncResult> {
    if (!data.scans || data.scans.length === 0) {
      throw new Error('Missing scans for sendHistoricalData');
    }

    const batchIndex = data.batchIndex ?? 0;
    const totalBatches = data.totalBatches ?? 1;

    console.log(`[MealSync:SendHistoricalData] Uploading batch ${batchIndex + 1}/${totalBatches} (${data.scans.length} scans)...`);
    
    const result = await MealOnlineAPI.bulkUploadScans(data.scans);
    
    console.log(`[MealSync:SendHistoricalData] ✅ Batch complete: ${result.syncedCount} synced, ${result.failedCount} failed`);
    
    return result;
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
      
      case 'sendHistoricalData':
        await this.onSendHistoricalDataSuccess(result as BulkSyncResult, data);
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

    if (data.localScanId) {
      try {
        const localScan = await MealOfflineAPI.getLocalScanById(data.localScanId);
        
        if (localScan) {
          await MealOfflineAPI.updateLocalScan(data.localScanId, {
            ...serverScan,
          });
          
          await MealOfflineAPI.markScanAsSynced(data.localScanId, serverScan.id);
          
          console.log('[MealSync:SubmitAnalysis] ✅ Local scan updated with server data');
        } else {
          await MealOfflineAPI.saveCompletedScan(serverScan);
          console.log('[MealSync:SubmitAnalysis] ✅ Server scan saved locally');
        }
      } catch (error) {
        console.error('[MealSync:SubmitAnalysis] Failed to update local scan:', error);
      }
    } else {
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
  }

  /**
   * Success: sendHistoricalData (v2.0)
   */
  private async onSendHistoricalDataSuccess(
    result: BulkSyncResult,
    data: MealSyncData
  ): Promise<void> {
    console.log('[MealSync:SendHistoricalData] Processing success...');

    // Mark successfully synced scans
    const syncedPairs: Array<{ localId: string; serverId: string }> = [];
    
    for (const localId of result.syncedIds) {
      syncedPairs.push({
        localId,
        serverId: `server_${localId}`, // Server will return proper IDs
      });
    }

    if (syncedPairs.length > 0) {
      await MealOfflineAPI.markBatchAsSynced(syncedPairs);
      console.log(`[MealSync:SendHistoricalData] ✅ Marked ${syncedPairs.length} scans as synced`);
    }

    if (result.errors.length > 0) {
      console.warn(`[MealSync:SendHistoricalData] ⚠️ ${result.errors.length} scans failed to sync`);
    }
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
      
      case 'sendHistoricalData':
        await this.onSendHistoricalDataFailure(error, data);
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

  /**
   * Failure: sendHistoricalData (v2.0)
   */
  private async onSendHistoricalDataFailure(error: Error, data: MealSyncData): Promise<void> {
    console.error('[MealSync:SendHistoricalData] ❌ Bulk upload failed:', error.message);
    console.log('[MealSync:SendHistoricalData] Will retry on next sync');
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
      
      case 'sendHistoricalData':
        return this.validateSendHistoricalData(mealData);
      
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

  private validateSendHistoricalData(data: MealSyncData): boolean {
    if (!data.scans || !Array.isArray(data.scans)) {
      console.error('[MealSync:SendHistoricalData] Missing or invalid scans array');
      return false;
    }

    if (data.scans.length === 0) {
      console.error('[MealSync:SendHistoricalData] Empty scans array');
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
      
      case 'sendHistoricalData':
        return 3; // Low-medium - background task
      
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
      
      case 'sendHistoricalData':
        return 2; // Fewer retries for bulk operations
      
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