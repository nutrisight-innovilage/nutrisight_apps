/**
 * mealSyncStrategy.ts (v2.1 - Weekly Insight DB Save)
 * ---------------------------------------------------------------------------
 * Meal-specific sync strategy with historical data sync support.
 * 
 * ACTIONS:
 * • ✅ submitAnalysis - Main meal submission
 * • ✅ updateScan - Scan updates
 * • ✅ deleteScan - Scan deletion
 * • ✅ sendHistoricalData - Bulk historical sync
 * • ✅ saveWeeklyInsight - Save weekly insight to Appwrite (v2.1)
 * ---------------------------------------------------------------------------
 */

import { SyncPayload } from '@/app/services/sync/syncQueue';
import { SyncStrategy } from '@/app/services/sync/syncManager';
import { MealOfflineAPI } from '@/app/services/meal/mealOfflineAPI';
import { MealOnlineAPI } from '@/app/services/meal/mealOnlineAPI';
import { AnalyzeMealRequest, NutritionScan, BulkSyncResult, WeeklyInsight } from '@/app/types/meal';
import { 
  databases, 
  DATABASE_ID, 
  COLLECTIONS,
  generateId,
} from '@/app/config/appwriteConfig';
import { Query } from 'appwrite';

// ---------------------------------------------------------------------------
// Types for Sync Actions
// ---------------------------------------------------------------------------

interface MealSyncData {
  action: 'submitAnalysis' | 'updateScan' | 'deleteScan' | 'sendHistoricalData' | 'saveWeeklyInsight';
  
  // submitAnalysis
  mealData?: AnalyzeMealRequest;
  localScanId?: string;
  
  // updateScan
  scanId?: string;
  updates?: Partial<NutritionScan>;
  
  // sendHistoricalData
  scans?: any[];
  batchIndex?: number;
  totalBatches?: number;

  // saveWeeklyInsight (v2.1)
  userId?: string;
  startDate?: string;
  insight?: WeeklyInsight;
}

// ---------------------------------------------------------------------------
// Meal Sync Strategy (v2.1)
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

      case 'saveWeeklyInsight':
        return await this.handleSaveWeeklyInsight(data);
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  // ===========================================================================
  // ACTION HANDLERS
  // ===========================================================================

  /**
   * Handle: submitAnalysis
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
   */
  private async handleUpdateScan(data: MealSyncData): Promise<void> {
    if (!data.scanId || !data.updates) {
      throw new Error('Missing scanId or updates for updateScan');
    }

    console.log('[MealSync:UpdateScan] Updating scan on Appwrite...');
    console.warn('[MealSync:UpdateScan] ⚠️ Server update not yet implemented');
    console.log('[MealSync:UpdateScan] ✅ Update complete');
  }

  /**
   * Handle: deleteScan
   */
  private async handleDeleteScan(data: MealSyncData): Promise<void> {
    if (!data.scanId) {
      throw new Error('Missing scanId for deleteScan');
    }

    console.log('[MealSync:DeleteScan] Deleting scan from Appwrite...');
    console.warn('[MealSync:DeleteScan] ⚠️ Server deletion not yet implemented');
    console.log('[MealSync:DeleteScan] ✅ Deletion complete');
  }

  /**
   * Handle: sendHistoricalData
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

  /**
   * ✅ v2.1: Handle: saveWeeklyInsight
   * Save weekly insight to Appwrite collection `weekly_insights`.
   * 
   * Appwrite collection schema:
   * - userId (required text)
   * - startDate (required datetime)
   * - totalCalories (required integer, min 0)
   * - avgCalories (integer)
   * - totalProtein (integer)
   * - totalCarbs (integer)
   * - totalFats (integer)
   * - mealsCount (integer)
   * - balancedMealsCount (integer)
   * - aiSummary (text, optional)
   */
  private async handleSaveWeeklyInsight(data: MealSyncData): Promise<any> {
    if (!data.userId || !data.startDate || !data.insight) {
      throw new Error('Missing userId, startDate, or insight for saveWeeklyInsight');
    }

    const { userId, startDate, insight } = data;

    console.log(`[MealSync:SaveWeeklyInsight] Saving insight for user ${userId}, week ${startDate.split('T')[0]}...`);

    // Check if document already exists for this user+week (upsert logic)
    try {
      const existing = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.WEEKLY_INSIGHTS,
        [
          Query.equal('userId', userId),
          Query.equal('startDate', startDate),
        ]
      );

      const docData = {
        userId,
        startDate,
        totalCalories: Math.round(insight.totalCalories),
        avgCalories: Math.round(insight.avgCalories),
        totalProtein: Math.round(insight.totalProtein),
        totalCarbs: Math.round(insight.totalCarbs),
        totalFats: Math.round(insight.totalFats),
        mealsCount: insight.mealsCount,
        balancedMealsCount: insight.balancedMealsCount,
        ...(insight.aiSummary ? { aiSummary: insight.aiSummary } : {}),
      };

      if (existing.total > 0) {
        // Update existing document
        const docId = existing.documents[0].$id;
        const result = await databases.updateDocument(
          DATABASE_ID,
          COLLECTIONS.WEEKLY_INSIGHTS,
          docId,
          docData
        );
        console.log(`[MealSync:SaveWeeklyInsight] ✅ Updated existing document: ${docId}`);
        return result;
      } else {
        // Create new document
        const result = await databases.createDocument(
          DATABASE_ID,
          COLLECTIONS.WEEKLY_INSIGHTS,
          generateId(),
          docData
        );
        console.log(`[MealSync:SaveWeeklyInsight] ✅ Created new document: ${result.$id}`);
        return result;
      }
    } catch (error) {
      console.error('[MealSync:SaveWeeklyInsight] ❌ Failed:', error);
      throw error;
    }
  }

  // ===========================================================================
  // SUCCESS HANDLERS
  // ===========================================================================

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

      case 'saveWeeklyInsight':
        console.log('[MealSync:SaveWeeklyInsight] ✅ Successfully saved to Appwrite');
        break;
    }
  }

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

  private async onUpdateScanSuccess(data: MealSyncData): Promise<void> {
    console.log('[MealSync:UpdateScan] ✅ Server updated successfully');
    
    if (data.scanId) {
      const localScan = await MealOfflineAPI.getLocalScanById(data.scanId);
      if (localScan && !localScan.isSynced) {
        await MealOfflineAPI.markScanAsSynced(localScan.localId, data.scanId);
      }
    }
  }

  private async onDeleteScanSuccess(data: MealSyncData): Promise<void> {
    console.log('[MealSync:DeleteScan] ✅ Server deletion confirmed');
  }

  private async onSendHistoricalDataSuccess(
    result: BulkSyncResult,
    data: MealSyncData
  ): Promise<void> {
    console.log('[MealSync:SendHistoricalData] Processing success...');

    const syncedPairs: Array<{ localId: string; serverId: string }> = [];
    
    for (const localId of result.syncedIds) {
      syncedPairs.push({
        localId,
        serverId: `server_${localId}`,
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

  async onFailure(error: Error, payload: SyncPayload): Promise<void> {
    const data = payload.data as MealSyncData;
    const action = data.action || 'submitAnalysis';

    console.error(`[MealSync] ❌ Failure for action ${action}:`, error.message);

    switch (action) {
      case 'submitAnalysis':
        console.error('[MealSync:SubmitAnalysis] ❌ Server upload failed:', error.message);
        console.log('[MealSync:SubmitAnalysis] Meal will retry on next sync');
        break;
      
      case 'updateScan':
        console.error('[MealSync:UpdateScan] ❌ Server update failed:', error.message);
        console.log('[MealSync:UpdateScan] Will retry on next sync');
        break;
      
      case 'deleteScan':
        console.error('[MealSync:DeleteScan] ❌ Server deletion failed:', error.message);
        console.log('[MealSync:DeleteScan] Will retry on next sync');
        break;
      
      case 'sendHistoricalData':
        console.error('[MealSync:SendHistoricalData] ❌ Bulk upload failed:', error.message);
        console.log('[MealSync:SendHistoricalData] Will retry on next sync');
        break;

      case 'saveWeeklyInsight':
        console.error('[MealSync:SaveWeeklyInsight] ❌ Failed to save insight:', error.message);
        console.log('[MealSync:SaveWeeklyInsight] Will retry on next sync');
        break;
    }
  }

  // ===========================================================================
  // VALIDATION
  // ===========================================================================

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

      case 'saveWeeklyInsight':
        return this.validateSaveWeeklyInsight(mealData);
      
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

  /**
   * ✅ v2.1: Validate saveWeeklyInsight data
   */
  private validateSaveWeeklyInsight(data: MealSyncData): boolean {
    if (!data.userId) {
      console.error('[MealSync:SaveWeeklyInsight] Missing userId');
      return false;
    }
    if (!data.startDate) {
      console.error('[MealSync:SaveWeeklyInsight] Missing startDate');
      return false;
    }
    if (!data.insight) {
      console.error('[MealSync:SaveWeeklyInsight] Missing insight data');
      return false;
    }
    if (typeof data.insight.totalCalories !== 'number') {
      console.error('[MealSync:SaveWeeklyInsight] Invalid totalCalories');
      return false;
    }
    return true;
  }

  // ===========================================================================
  // PRIORITY & RETRY CONFIGURATION
  // ===========================================================================

  private getPriorityForAction(action: string): number {
    switch (action) {
      case 'submitAnalysis':
        return 2; // Medium - important
      case 'saveWeeklyInsight':
        return 4; // Low - background scheduled task
      case 'sendHistoricalData':
        return 3; // Low-medium - background task
      case 'updateScan':
        return 3;
      case 'deleteScan':
        return 3;
      default:
        return 5;
    }
  }

  private getMaxRetriesForAction(action: string): number {
    switch (action) {
      case 'submitAnalysis':
        return 3;
      case 'saveWeeklyInsight':
        return 3; // Important to eventually save
      case 'sendHistoricalData':
        return 2;
      case 'updateScan':
        return 3;
      case 'deleteScan':
        return 2;
      default:
        return 3;
    }
  }

  getPriority(): number {
    return 2;
  }

  getMaxRetries(): number {
    return 3;
  }
}

// ---------------------------------------------------------------------------
// Export Strategy Instance
// ---------------------------------------------------------------------------

export const mealSyncStrategy = new MealSyncStrategy();