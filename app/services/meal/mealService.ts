/**
 * mealService.ts (v2.2 - WeeklyInsight DB Save + Scheduled Sync)
 * ---------------------------------------------------------------------------
 * TRUE OFFLINE-FIRST - STRICTLY following meal.ts types.
 * 
 * v2.2 Changes:
 * • ✅ Weekly insights saved to Appwrite via SyncManager
 * • ✅ Scheduled weekly insight save (every Sunday / end of week)
 * • ✅ saveWeeklyInsight() queues data for sync
 * • ✅ Weekly insight also saved on each meal submission
 * ---------------------------------------------------------------------------
 */

import NetInfo from '@react-native-community/netinfo';
import { CartItem } from '@/app/types/food';
import {
  MealMetadata,
  NutritionAnalysisPayload,
  NutritionScan,
  MealSummary,
  DateRangeFilter,
  ScanSortOption,
  WeeklyInsight,
  NutritionGoals,
  AnalyzeMealResponse,
} from '@/app/types/meal';

import { MealOfflineAPI, LocalNutritionScan } from '@/app/services/meal/mealOfflineAPI';
import { MealOnlineAPI, PersonalizedThresholds } from '@/app/services/meal/mealOnlineAPI';
import { getSyncManager } from '@/app/services/sync/syncManager';
import authService from '@/app/services/auth/authService';
import { isMealBalanced } from '@/app/utils/nutritionUtils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MealServiceConfig {
  autoSync: boolean;
  syncOnSubmit: boolean;
  offlineCalculation: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Get start of current week (Monday 00:00:00)
 */
function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get end of current week (Sunday 23:59:59)
 */
function getWeekEnd(date: Date = new Date()): Date {
  const start = getWeekStart(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

// ---------------------------------------------------------------------------
// Meal Service Class (v2.2)
// ---------------------------------------------------------------------------

class MealService {
  private config: MealServiceConfig = {
    autoSync: true,
    syncOnSubmit: true,
    offlineCalculation: true,
  };

  private isOnline: boolean = false;
  private weeklyInsightTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.setupNetworkListener();
    this.initializeService();
  }

  private setupNetworkListener(): void {
    NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected ?? false;
      
      console.log(`[MealService] Network: ${this.isOnline ? 'ONLINE' : 'OFFLINE'}`);
      
      if (wasOffline && this.isOnline) {
        console.log('[MealService] Back online - SyncManager will handle sync');
      }
    });
  }

  private async initializeService(): Promise<void> {
    try {
      await MealOfflineAPI.initializeOfflineAPI();
      console.log('[MealService] ✅ Service initialized');

      // ✅ v2.2: Start weekly insight scheduler
      this.startWeeklyInsightScheduler();
    } catch (error) {
      console.error('[MealService] Initialization failed:', error);
    }
  }

  private async getCurrentUserId(): Promise<string> {
    const authData = await authService.getCurrentUser();
    if (!authData?.user?.id) {
      throw new Error('User not authenticated');
    }
    return authData.user.id;
  }

  private async checkNetwork(): Promise<boolean> {
    const state = await NetInfo.fetch();
    this.isOnline = state.isConnected ?? false;
    return this.isOnline;
  }

  // ===========================================================================
  // ✅ v2.2: WEEKLY INSIGHT SCHEDULER
  // ===========================================================================

  /**
   * Start periodic check to save weekly insight.
   * Checks every 6 hours if it's time to save (end of week).
   */
  private startWeeklyInsightScheduler(): void {
    // Check immediately on startup
    this.checkAndSaveWeeklyInsight().catch(err => {
      console.warn('[MealService] Initial weekly insight check failed:', err);
    });

    // Then check every 6 hours
    this.weeklyInsightTimer = setInterval(() => {
      this.checkAndSaveWeeklyInsight().catch(err => {
        console.warn('[MealService] Scheduled weekly insight check failed:', err);
      });
    }, 6 * 60 * 60 * 1000); // 6 hours

    console.log('[MealService] 📅 Weekly insight scheduler started (checks every 6h)');
  }

  /**
   * Stop the weekly insight scheduler
   */
  private stopWeeklyInsightScheduler(): void {
    if (this.weeklyInsightTimer) {
      clearInterval(this.weeklyInsightTimer);
      this.weeklyInsightTimer = null;
    }
  }

  /**
   * Check if we need to save weekly insight and do so if needed.
   * 
   * Logic:
   * - Get the PREVIOUS week's date range (Mon-Sun)
   * - Check if we already saved insight for that range (via local cache)
   * - If not saved yet → calculate & queue for sync
   */
  private async checkAndSaveWeeklyInsight(): Promise<void> {
    try {
      const userId = await this.getCurrentUserId();

      // Get PREVIOUS week range
      const now = new Date();
      const thisWeekStart = getWeekStart(now);
      
      // Previous week = 7 days before this week's start
      const prevWeekStart = new Date(thisWeekStart);
      prevWeekStart.setDate(prevWeekStart.getDate() - 7);
      const prevWeekEnd = new Date(thisWeekStart);
      prevWeekEnd.setDate(prevWeekEnd.getDate() - 1);
      prevWeekEnd.setHours(23, 59, 59, 999);

      const startDateStr = prevWeekStart.toISOString();
      const endDateStr = prevWeekEnd.toISOString();

      // Check if already saved for this week
      const alreadySaved = await MealOfflineAPI.isWeeklyInsightSaved(userId, startDateStr);
      if (alreadySaved) {
        console.log('[MealService] 📅 Weekly insight already saved for previous week');
        return;
      }

      // Calculate insight for previous week
      const insight = await MealOfflineAPI.getWeeklyInsights(userId, startDateStr, endDateStr);

      // Only save if there were meals
      if (insight.mealsCount === 0) {
        console.log('[MealService] 📅 No meals in previous week, skipping insight save');
        return;
      }

      // Save & queue for sync
      await this.saveWeeklyInsightToDb(userId, startDateStr, insight);

      console.log(`[MealService] 📅 ✅ Weekly insight saved for ${startDateStr.split('T')[0]}`);
    } catch (error) {
      // Don't throw — this is a background task
      // "User not authenticated" is expected when not logged in
      if (error instanceof Error && error.message === 'User not authenticated') {
        return; // silently skip
      }
      console.warn('[MealService] Weekly insight check error:', error);
    }
  }

  /**
   * Save weekly insight to local cache and queue for Appwrite sync.
   */
  private async saveWeeklyInsightToDb(
    userId: string,
    startDate: string,
    insight: WeeklyInsight
  ): Promise<void> {
    // 1. Save locally
    await MealOfflineAPI.saveWeeklyInsightCache(userId, startDate, insight);

    // 2. Queue for sync to Appwrite
    try {
      const syncManager = getSyncManager();
      await syncManager.sync('meal', {
        action: 'saveWeeklyInsight',
        userId,
        startDate,
        insight,
      });
      console.log('[MealService] 📋 Weekly insight queued for sync');
    } catch (syncErr) {
      console.warn('[MealService] Failed to queue weekly insight sync:', syncErr);
    }
  }

  /**
   * ✅ Public: Force save current week's insight (manual trigger)
   */
  async saveCurrentWeekInsight(): Promise<{ success: boolean; message: string }> {
    try {
      const userId = await this.getCurrentUserId();
      
      const weekStart = getWeekStart();
      const weekEnd = getWeekEnd();
      const startDateStr = weekStart.toISOString();
      const endDateStr = weekEnd.toISOString();

      const insight = await MealOfflineAPI.getWeeklyInsights(userId, startDateStr, endDateStr);

      if (insight.mealsCount === 0) {
        return { success: false, message: 'Tidak ada data makanan minggu ini' };
      }

      await this.saveWeeklyInsightToDb(userId, startDateStr, insight);

      return {
        success: true,
        message: `Insight minggu ini tersimpan (${insight.mealsCount} makanan)`,
      };
    } catch (error) {
      console.error('[MealService] Save current week insight failed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Gagal menyimpan insight',
      };
    }
  }

  // ===========================================================================
  // CART OPERATIONS (OFFLINE-FIRST)
  // ===========================================================================

  async getCart(): Promise<CartItem[]> {
    try {
      return await MealOfflineAPI.getCart();
    } catch (error) {
      console.error('[MealService] Failed to get cart:', error);
      return [];
    }
  }

  async addToCart(id: string, qty: number = 1): Promise<CartItem[]> {
    try {
      const updatedCart = await MealOfflineAPI.addToCart(id, qty);
      console.log('[MealService] ✅ Item added to cart locally');
      return updatedCart;
    } catch (error) {
      console.error('[MealService] Failed to add to cart:', error);
      throw error;
    }
  }

  async updateCartItem(id: string, quantity: number): Promise<CartItem[]> {
    try {
      const updatedCart = await MealOfflineAPI.updateCartItem(id, quantity);
      console.log('[MealService] ✅ Cart item updated locally');
      return updatedCart;
    } catch (error) {
      console.error('[MealService] Failed to update cart item:', error);
      throw error;
    }
  }

  async removeFromCart(id: string): Promise<CartItem[]> {
    try {
      const updatedCart = await MealOfflineAPI.removeFromCart(id);
      console.log('[MealService] ✅ Item removed from cart locally');
      return updatedCart;
    } catch (error) {
      console.error('[MealService] Failed to remove from cart:', error);
      throw error;
    }
  }

  async clearCart(): Promise<CartItem[]> {
    try {
      const emptyCart = await MealOfflineAPI.clearCart();
      console.log('[MealService] ✅ Cart cleared locally');
      return emptyCart;
    } catch (error) {
      console.error('[MealService] Failed to clear cart:', error);
      throw error;
    }
  }

  // ===========================================================================
  // MEAL METADATA OPERATIONS
  // ===========================================================================

  async getRicePortion(): Promise<number> {
    try {
      return await MealOfflineAPI.getRicePortion();
    } catch (error) {
      console.error('[MealService] Failed to get rice portion:', error);
      return 1;
    }
  }

  async updateRicePortion(portion: number): Promise<void> {
    try {
      await MealOfflineAPI.updateRicePortion(portion);
      console.log('[MealService] ✅ Rice portion updated locally');
    } catch (error) {
      console.error('[MealService] Failed to update rice portion:', error);
      throw error;
    }
  }

  async getMealMetadata(): Promise<MealMetadata> {
    try {
      return await MealOfflineAPI.getMealMetadata();
    } catch (error) {
      console.error('[MealService] Failed to get meal metadata:', error);
      throw error;
    }
  }

  async updateMealMetadata(
    updates: Partial<Omit<MealMetadata, 'createdAt' | 'updatedAt'>>
  ): Promise<MealMetadata> {
    try {
      const updated = await MealOfflineAPI.updateMealMetadata(updates);
      console.log('[MealService] ✅ Meal metadata updated locally');
      return updated;
    } catch (error) {
      console.error('[MealService] Failed to update meal metadata:', error);
      throw error;
    }
  }

  async getMealSummary(): Promise<MealSummary> {
    try {
      return await MealOfflineAPI.getMealSummary();
    } catch (error) {
      console.error('[MealService] Failed to get meal summary:', error);
      throw error;
    }
  }

  // ===========================================================================
  // MEAL ANALYSIS & SUBMISSION
  // ===========================================================================

  async submitAnalysis(): Promise<AnalyzeMealResponse> {
    try {
      const userId = await this.getCurrentUserId();
      const mealData = await MealOfflineAPI.prepareScanForSync();

      if (!mealData) {
        return { success: false, message: 'Data tidak valid untuk dianalisis' };
      }

      mealData.metadata.userId = userId;

      // Calculate nutrition OFFLINE
      const nutrition = this.config.offlineCalculation
        ? await MealOfflineAPI.calculateMealNutrition(mealData.items, mealData.ricePortion)
        : { calories: 0, protein: 0, carbs: 0, fats: 0 };

      // Create local scan
      const localScan: NutritionScan = {
        id: `local_${Date.now()}`,
        userId,
        foodName: mealData.metadata.mealType 
          ? `${mealData.metadata.mealType.charAt(0).toUpperCase() + mealData.metadata.mealType.slice(1)}`
          : 'My Meal',
        date: new Date().toLocaleDateString('en-US', { 
          month: 'short', day: 'numeric', year: 'numeric',
        }),
        time: new Date().toLocaleTimeString('en-US', { 
          hour: '2-digit', minute: '2-digit',
        }),
        calories: nutrition.calories,
        protein: nutrition.protein,
        carbs: nutrition.carbs,
        fats: nutrition.fats,
      };

      await MealOfflineAPI.saveCompletedScan(localScan);
      console.log('[MealService] ✅ Scan saved locally');

      // Queue for sync
      if (this.config.syncOnSubmit) {
        try {
          const syncManager = getSyncManager();
          await syncManager.sync('meal', {
            action: 'submitAnalysis',
            mealData,
            localScanId: localScan.id,
          });
          console.log('[MealService] 📋 Meal analysis queued for sync');
        } catch (syncErr) {
          console.warn('[MealService] Failed to queue for sync:', syncErr);
        }
      }

      await MealOfflineAPI.clearCart();
      console.log('[MealService] ✅ Cart cleared after submission');

      // ✅ v2.2: Also trigger weekly insight update after submission
      this.checkAndSaveWeeklyInsight().catch(err => {
        console.warn('[MealService] Post-submit weekly insight update failed:', err);
      });

      return {
        success: true,
        scan: localScan,
        analysisId: localScan.id,
        message: this.config.offlineCalculation 
          ? 'Analisis berhasil (offline calculation)' 
          : 'Analisis tersimpan (akan dikalkulasi saat sync)',
      };
    } catch (error) {
      console.error('[MealService] Submit analysis failed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Gagal submit analisis',
      };
    }
  }

  async getAnalysisPayload(): Promise<NutritionAnalysisPayload> {
    try {
      return await MealOfflineAPI.prepareNutritionAnalysisPayload();
    } catch (error) {
      console.error('[MealService] Failed to get analysis payload:', error);
      throw error;
    }
  }

  async estimateCalories(): Promise<number> {
    try {
      const cart = await this.getCart();
      const ricePortion = await this.getRicePortion();
      return await MealOfflineAPI.estimateCalories(cart, ricePortion);
    } catch (error) {
      console.error('[MealService] Failed to estimate calories:', error);
      return 0;
    }
  }

  // ===========================================================================
  // SCANS HISTORY
  // ===========================================================================

  async getAllScans(sortBy?: ScanSortOption, limit?: number): Promise<NutritionScan[]> {
    try {
      const scans = await MealOfflineAPI.getAllLocalScans(sortBy, limit);
      return scans as NutritionScan[];
    } catch (error) {
      console.error('[MealService] Failed to get scans:', error);
      return [];
    }
  }

  async getScanById(id: string): Promise<NutritionScan | null> {
    try {
      const scan = await MealOfflineAPI.getLocalScanById(id);
      return scan as NutritionScan | null;
    } catch (error) {
      console.error('[MealService] Failed to get scan by ID:', error);
      return null;
    }
  }

  async getScansByDateRange(filter: DateRangeFilter): Promise<NutritionScan[]> {
    try {
      const scans = await MealOfflineAPI.getLocalScansByDateRange(filter);
      return scans as NutritionScan[];
    } catch (error) {
      console.error('[MealService] Failed to get scans by date range:', error);
      return [];
    }
  }

  async getTodayScans(): Promise<NutritionScan[]> {
    try {
      const scans = await MealOfflineAPI.getTodayLocalScans();
      return scans as NutritionScan[];
    } catch (error) {
      console.error('[MealService] Failed to get today scans:', error);
      return [];
    }
  }

  async updateScan(id: string, updates: Partial<NutritionScan>): Promise<void> {
    try {
      await MealOfflineAPI.updateLocalScan(id, updates);
      console.log('[MealService] ✅ Scan updated locally');

      if (this.config.autoSync) {
        try {
          const syncManager = getSyncManager();
          await syncManager.sync('meal', {
            action: 'updateScan', scanId: id, updates,
          });
          console.log('[MealService] 📋 Scan update queued for sync');
        } catch (syncErr) {
          console.warn('[MealService] Failed to queue sync:', syncErr);
        }
      }
    } catch (error) {
      console.error('[MealService] Failed to update scan:', error);
      throw error;
    }
  }

  async deleteScan(id: string): Promise<void> {
    try {
      await MealOfflineAPI.deleteLocalScan(id);
      console.log('[MealService] ✅ Scan deleted locally');

      if (this.config.autoSync) {
        try {
          const syncManager = getSyncManager();
          await syncManager.sync('meal', {
            action: 'deleteScan', scanId: id,
          });
          console.log('[MealService] 📋 Scan deletion queued for sync');
        } catch (syncErr) {
          console.warn('[MealService] Failed to queue deletion sync:', syncErr);
        }
      }
    } catch (error) {
      console.error('[MealService] Failed to delete scan:', error);
      throw error;
    }
  }

  // ===========================================================================
  // INSIGHTS & ANALYTICS (v2.2 - with DB save)
  // ===========================================================================

  /**
   * ✅ v2.2: Get weekly insights (unchanged read behavior)
   */
  async getWeeklyInsights(
    startDate?: string,
    endDate?: string
  ): Promise<WeeklyInsight> {
    try {
      const userId = await this.getCurrentUserId();

      // Try online first
      if (this.isOnline) {
        try {
          const insights = await MealOnlineAPI.getWeeklyInsights(userId, startDate, endDate);
          console.log('[MealService] ✅ Weekly insights from server');
          return insights;
        } catch (onlineError) {
          console.warn('[MealService] Online insights failed, using local:', onlineError);
        }
      }

      // Fallback to local
      const insights = await MealOfflineAPI.getWeeklyInsights(userId, startDate, endDate);
      console.log('[MealService] ✅ Weekly insights calculated locally');
      return insights;
    } catch (error) {
      console.error('[MealService] Failed to get weekly insights:', error);
      throw error;
    }
  }

  async getPersonalizedThresholds(): Promise<PersonalizedThresholds | null> {
    try {
      const userId = await this.getCurrentUserId();

      if (this.isOnline) {
        try {
          const thresholds = await MealOnlineAPI.getPersonalizedThresholds(userId);
          if (thresholds) {
            await MealOfflineAPI.savePersonalizedThresholds(userId, thresholds);
          }
          return thresholds;
        } catch (onlineError) {
          console.warn('[MealService] Online thresholds failed:', onlineError);
        }
      }

      return await MealOfflineAPI.getPersonalizedThresholds(userId);
    } catch (error) {
      console.error('[MealService] Failed to get personalized thresholds:', error);
      return null;
    }
  }

  async getNutritionGoals(): Promise<NutritionGoals | null> {
    try {
      const userId = await this.getCurrentUserId();

      if (this.isOnline) {
        try {
          const goals = await MealOnlineAPI.getNutritionGoals(userId);
          if (goals) {
            await MealOfflineAPI.saveNutritionGoals(userId, goals);
          }
          return goals;
        } catch (onlineError) {
          console.warn('[MealService] Online goals failed:', onlineError);
        }
      }

      return await MealOfflineAPI.getNutritionGoals(userId);
    } catch (error) {
      console.error('[MealService] Failed to get nutrition goals:', error);
      return null;
    }
  }

  // ===========================================================================
  // SYNC OPERATIONS
  // ===========================================================================

  async syncPendingData(): Promise<{
    success: boolean;
    syncedCount: number;
    errors: string[];
  }> {
    try {
      const isOnline = await this.checkNetwork();
      if (!isOnline) {
        return { success: false, syncedCount: 0, errors: ['Device is offline'] };
      }

      const syncManager = getSyncManager();
      const result = await syncManager.syncType('meal');

      return {
        success: result.success,
        syncedCount: result.processedCount,
        errors: result.errors.map(e => e.error),
      };
    } catch (error) {
      console.error('[MealService] Failed to sync pending data:', error);
      return {
        success: false, syncedCount: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  async getPendingCount(): Promise<number> {
    try {
      const syncManager = getSyncManager();
      return await syncManager.getPendingCount('meal');
    } catch (error) {
      console.error('[MealService] Failed to get pending count:', error);
      return 0;
    }
  }

  async forceSyncAll(): Promise<{ success: boolean; message: string }> {
    try {
      const isOnline = await this.checkNetwork();
      if (!isOnline) {
        return { success: false, message: 'Device is offline' };
      }

      const syncManager = getSyncManager();
      const result = await syncManager.syncType('meal');

      return {
        success: result.success,
        message: result.success
          ? `Successfully synced ${result.processedCount} items`
          : `Sync completed with ${result.failedCount} errors`,
      };
    } catch (error) {
      console.error('[MealService] Force sync failed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ===========================================================================
  // STATUS & DIAGNOSTICS
  // ===========================================================================

  async getSyncStatus(): Promise<{
    isOnline: boolean;
    pendingCount: number;
    unsyncedScans: number;
    syncManagerStatus: any;
  }> {
    const isOnline = await this.checkNetwork();
    const pendingCount = await this.getPendingCount();
    const unsyncedScans = await MealOfflineAPI.getUnsyncedScansCount();

    let syncManagerStatus = null;
    try {
      const syncManager = getSyncManager();
      syncManagerStatus = await syncManager.getStatus();
    } catch (error) {
      console.warn('[MealService] Could not get SyncManager status:', error);
    }

    return { isOnline, pendingCount, unsyncedScans, syncManagerStatus };
  }

  pauseSync(): void {
    try {
      const syncManager = getSyncManager();
      syncManager.pauseSync();
    } catch (error) {
      console.error('[MealService] Failed to pause sync:', error);
    }
  }

  resumeSync(): void {
    try {
      const syncManager = getSyncManager();
      syncManager.resumeSync();
    } catch (error) {
      console.error('[MealService] Failed to resume sync:', error);
    }
  }

  // ===========================================================================
  // CONFIGURATION
  // ===========================================================================

  setConfig(config: Partial<MealServiceConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('[MealService] Config updated:', this.config);
  }

  getConfig(): MealServiceConfig {
    return { ...this.config };
  }

  async clearAllData(): Promise<void> {
    await MealOfflineAPI.clearCart();
    console.log('[MealService] Cart data cleared');
  }

  clearCache(): void {
    MealOfflineAPI.clearCache();
    console.log('[MealService] Cache cleared');
  }

  /**
   * ✅ v2.2: Cleanup — also stops scheduler
   */
  destroy(): void {
    this.stopWeeklyInsightScheduler();
    console.log('[MealService] Destroyed (scheduler stopped)');
  }

  // ===========================================================================
  // HISTORICAL SYNC
  // ===========================================================================

  async syncHistoricalData(options?: {
    maxScans?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<{
    success: boolean; syncedCount: number; failedCount: number; message: string;
  }> {
    try {
      const isOnline = await this.checkNetwork();
      if (!isOnline) {
        return { success: false, syncedCount: 0, failedCount: 0, message: 'Device is offline' };
      }

      let scans = await MealOfflineAPI.getUnsyncedScans(options?.maxScans);
      
      if (options?.startDate && options?.endDate) {
        scans = await MealOfflineAPI.getScansByDateRange(options.startDate, options.endDate);
        scans = scans.filter(s => !s.isSynced);
      }
      
      if (scans.length === 0) {
        return { success: true, syncedCount: 0, failedCount: 0, message: 'No scans to sync' };
      }

      const syncManager = getSyncManager();
      await syncManager.sync('meal', { action: 'sendHistoricalData', scans });

      return {
        success: true, syncedCount: 0, failedCount: 0,
        message: `Syncing ${scans.length} scans in background...`,
      };
    } catch (error) {
      console.error('[MealService] Historical sync failed:', error);
      return {
        success: false, syncedCount: 0, failedCount: 0,
        message: error instanceof Error ? error.message : 'Sync failed',
      };
    }
  }

  async getHistoricalSyncStatus(): Promise<{
    totalScans: number; unsyncedScans: number; lastSyncTime: string | null; canSync: boolean;
  }> {
    try {
      const status = await MealOfflineAPI.getHistoricalSyncStatus();
      const isOnline = await this.checkNetwork();
      return {
        totalScans: status.totalScans,
        unsyncedScans: status.unsyncedScans,
        lastSyncTime: status.lastSyncTime,
        canSync: isOnline && status.unsyncedScans > 0,
      };
    } catch (error) {
      console.error('[MealService] Failed to get historical sync status:', error);
      return { totalScans: 0, unsyncedScans: 0, lastSyncTime: null, canSync: false };
    }
  }

  async getSyncDiagnostics(): Promise<any> {
    try {
      const offlineDiagnostics = await MealOfflineAPI.getSyncDiagnostics();
      const syncManager = getSyncManager();
      const syncManagerStatus = await syncManager.getStatus();
      
      return {
        offline: offlineDiagnostics,
        syncManager: {
          isOnline: syncManagerStatus.isOnline,
          isProcessing: syncManagerStatus.isProcessing,
          queueStats: syncManagerStatus.queueStats,
        },
        summary: {
          totalScans: offlineDiagnostics.totalScans,
          syncedScans: offlineDiagnostics.syncedScans,
          unsyncedScans: offlineDiagnostics.unsyncedScans,
          pendingInQueue: syncManagerStatus.queueStats.byType.meal || 0,
          healthStatus: 
            offlineDiagnostics.unsyncedScans > 50 ? 'critical' : 
            offlineDiagnostics.unsyncedScans > 10 ? 'warning' : 'healthy',
        },
      };
    } catch (error) {
      console.error('[MealService] Failed to get sync diagnostics:', error);
      return null;
    }
  }

  async cleanupOldSyncedScans(daysOld: number = 30): Promise<{
    success: boolean; removedCount: number; message: string;
  }> {
    try {
      const removedCount = await MealOfflineAPI.clearOldSyncedScans(daysOld);
      return {
        success: true, removedCount,
        message: `Removed ${removedCount} old synced scans`,
      };
    } catch (error) {
      console.error('[MealService] Cleanup failed:', error);
      return {
        success: false, removedCount: 0,
        message: error instanceof Error ? error.message : 'Cleanup failed',
      };
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

const mealService = new MealService();
export default mealService;