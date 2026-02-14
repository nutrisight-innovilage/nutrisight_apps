/**
 * syncManager.ts
 * ---------------------------------------------------------------------------
 * Universal sync engine untuk semua sync operations.
 * Menggunakan Strategy Pattern untuk handle berbagai jenis sync.
 * 
 * Features:
 * • Strategy-based sync untuk extensibility
 * • Automatic retry dengan exponential backoff
 * • Priority queue management
 * • Network detectiona
 * • Batch processing
 * • Global sync status
 * ---------------------------------------------------------------------------
 */

import NetInfo from '@react-native-community/netinfo';
import { SyncQueue, SyncType, SyncPayload, QueueStats } from '@/app/services/sync/syncQueue';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Strategy interface yang harus diimplement semua sync strategies
 */
export interface SyncStrategy {
  /**
   * Prepare data sebelum upload
   */
  prepare(data: any): Promise<SyncPayload>;

  /**
   * Upload data ke server
   */
  upload(payload: SyncPayload): Promise<any>;

  /**
   * Handler ketika upload berhasil
   */
  onSuccess(result: any, payload: SyncPayload): Promise<void>;

  /**
   * Handler ketika upload gagal
   */
  onFailure(error: Error, payload: SyncPayload): Promise<void>;

  /**
   * Validate data sebelum sync
   */
  validate(data: any): boolean;

  /**
   * Get priority untuk jenis data ini (1=highest, 5=lowest)
   */
  getPriority(): number;

  /**
   * Get max retries untuk jenis data ini
   */
  getMaxRetries(): number;
}

/**
 * Global sync status
 */
export interface GlobalSyncStatus {
  isOnline: boolean;
  isProcessing: boolean;
  lastSyncTime: string | null;
  queueStats: QueueStats;
  activeStrategy: SyncType | null;
}

/**
 * Sync result
 */
export interface SyncResult {
  success: boolean;
  processedCount: number;
  failedCount: number;
  errors: Array<{ id: string; error: string }>;
}

// ---------------------------------------------------------------------------
// SyncManager Class
// ---------------------------------------------------------------------------

export class SyncManager {
  private strategies: Map<SyncType, SyncStrategy> = new Map();
  private queue: SyncQueue;
  private isProcessing = false;
  private isOnline = false;
  private lastSyncTime: string | null = null;
  private activeStrategy: SyncType | null = null;
  private networkUnsubscribe: (() => void) | null = null;

  constructor(queue: SyncQueue) {
    this.queue = queue;
    this.setupNetworkListener();
  }

  /**
   * Setup network status listener
   */
  private setupNetworkListener(): void {
    this.networkUnsubscribe = NetInfo.addEventListener(state => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected ?? false;

      console.log(`[SyncManager] Network status: ${this.isOnline ? 'ONLINE' : 'OFFLINE'}`);

      // Jika baru online, trigger sync
      if (!wasOnline && this.isOnline) {
        console.log('[SyncManager] Connection restored, starting sync...');
        this.syncAll().catch(err => {
          console.error('[SyncManager] Auto-sync failed:', err);
        });
      }
    });
  }

  /**
   * Register strategy untuk sync type tertentu
   */
  registerStrategy(type: SyncType, strategy: SyncStrategy): void {
    this.strategies.set(type, strategy);
    console.log(`[SyncManager] Registered strategy for ${type}`);
  }

  /**
   * Unregister strategy
   */
  unregisterStrategy(type: SyncType): void {
    this.strategies.delete(type);
    console.log(`[SyncManager] Unregistered strategy for ${type}`);
  }

  /**
   * Check if strategy registered
   */
  hasStrategy(type: SyncType): boolean {
    return this.strategies.has(type);
  }

  /**
   * Sync single item
   */
  async sync(type: SyncType, data: any): Promise<boolean> {
    const strategy = this.strategies.get(type);
    
    if (!strategy) {
      console.error(`[SyncManager] No strategy registered for ${type}`);
      return false;
    }

    // Validate data
    if (!strategy.validate(data)) {
      console.error(`[SyncManager] Invalid data for ${type}`);
      return false;
    }

    // Prepare payload
    const payload = await strategy.prepare(data);

    // Add to queue
    await this.queue.add(
      type,
      data,
      strategy.getPriority(),
      strategy.getMaxRetries()
    );

    console.log(`[SyncManager] Added ${type} to sync queue`);

    // Jika online, langsung process
    if (this.isOnline) {
      await this.processQueue();
    }

    return true;
  }

  /**
   * Process queue (process semua pending items)
   */
  async processQueue(): Promise<SyncResult> {
    if (this.isProcessing) {
      console.log('[SyncManager] Already processing queue, skipping...');
      return {
        success: false,
        processedCount: 0,
        failedCount: 0,
        errors: [{ id: 'PROCESSING', error: 'Already processing' }],
      };
    }

    if (!this.isOnline) {
      console.log('[SyncManager] Offline, skipping queue processing');
      return {
        success: false,
        processedCount: 0,
        failedCount: 0,
        errors: [{ id: 'OFFLINE', error: 'No network connection' }],
      };
    }

    this.isProcessing = true;
    const result: SyncResult = {
      success: true,
      processedCount: 0,
      failedCount: 0,
      errors: [],
    };

    try {
      console.log('[SyncManager] Starting queue processing...');

      const ready = await this.queue.getReady();
      console.log(`[SyncManager] ${ready.length} items ready for processing`);

      for (const payload of ready) {
        await this.processItem(payload, result);
      }

      this.lastSyncTime = new Date().toISOString();
      console.log(
        `[SyncManager] Queue processing complete. ` +
        `Processed: ${result.processedCount}, Failed: ${result.failedCount}`
      );

    } catch (error) {
      console.error('[SyncManager] Queue processing error:', error);
      result.success = false;
    } finally {
      this.isProcessing = false;
      this.activeStrategy = null;
    }

    return result;
  }

  /**
   * Process single queue item
   */
  private async processItem(payload: SyncPayload, result: SyncResult): Promise<void> {
    const strategy = this.strategies.get(payload.type);

    if (!strategy) {
      console.error(`[SyncManager] No strategy for ${payload.type}, removing from queue`);
      await this.queue.remove(payload.id);
      result.failedCount += 1;
      result.errors.push({ id: payload.id, error: 'No strategy found' });
      return;
    }

    this.activeStrategy = payload.type;

    try {
      console.log(`[SyncManager] Processing ${payload.type} item ${payload.id}...`);

      // Upload data
      const uploadResult = await strategy.upload(payload);

      // On success
      await strategy.onSuccess(uploadResult, payload);
      await this.queue.remove(payload.id);

      result.processedCount += 1;
      console.log(`[SyncManager] ✓ Successfully processed ${payload.type} item ${payload.id}`);

    } catch (error) {
      console.error(`[SyncManager] ✗ Failed to process ${payload.type} item ${payload.id}:`, error);

      // On failure
      await strategy.onFailure(error as Error, payload);
      await this.queue.markFailed(payload.id, (error as Error).message);

      result.failedCount += 1;
      result.errors.push({
        id: payload.id,
        error: (error as Error).message,
      });
    }
  }

  /**
   * Sync all pending items
   */
  async syncAll(): Promise<SyncResult> {
    return await this.processQueue();
  }

  /**
   * Sync specific type only
   */
  async syncType(type: SyncType): Promise<SyncResult> {
    if (!this.strategies.has(type)) {
      console.error(`[SyncManager] No strategy for ${type}`);
      return {
        success: false,
        processedCount: 0,
        failedCount: 0,
        errors: [{ id: type, error: 'No strategy found' }],
      };
    }

    const items = await this.queue.getByType(type);
    console.log(`[SyncManager] Syncing ${items.length} ${type} items...`);

    const result: SyncResult = {
      success: true,
      processedCount: 0,
      failedCount: 0,
      errors: [],
    };

    for (const item of items) {
      await this.processItem(item, result);
    }

    return result;
  }

  /**
   * Batch sync dengan limit
   */
  async syncBatch(batchSize: number = 5): Promise<SyncResult> {
    if (!this.isOnline) {
      return {
        success: false,
        processedCount: 0,
        failedCount: 0,
        errors: [{ id: 'OFFLINE', error: 'No network connection' }],
      };
    }

    const batch = await this.queue.getBatch(batchSize);
    console.log(`[SyncManager] Processing batch of ${batch.length} items...`);

    const result: SyncResult = {
      success: true,
      processedCount: 0,
      failedCount: 0,
      errors: [],
    };

    for (const item of batch) {
      await this.processItem(item, result);
    }

    return result;
  }

  /**
   * Get global sync status
   */
  async getStatus(): Promise<GlobalSyncStatus> {
    const stats = await this.queue.getStats();

    return {
      isOnline: this.isOnline,
      isProcessing: this.isProcessing,
      lastSyncTime: this.lastSyncTime,
      queueStats: stats,
      activeStrategy: this.activeStrategy,
    };
  }

  /**
   * Get pending count untuk specific type
   */
  async getPendingCount(type: SyncType): Promise<number> {
    return await this.queue.getPendingCount(type);
  }

  /**
   * Check if currently syncing
   */
  isSyncing(): boolean {
    return this.isProcessing;
  }

  /**
   * Pause all sync operations
   */
  pauseSync(): void {
    this.isProcessing = true; // Block processing
    console.log('[SyncManager] Sync paused');
  }

  /**
   * Resume sync operations
   */
  resumeSync(): void {
    this.isProcessing = false;
    console.log('[SyncManager] Sync resumed');

    // Trigger sync if online
    if (this.isOnline) {
      this.syncAll().catch(err => {
        console.error('[SyncManager] Resume sync failed:', err);
      });
    }
  }

  /**
   * Force sync (ignore online status check)
   */
  async forceSync(): Promise<SyncResult> {
    const wasOnline = this.isOnline;
    this.isOnline = true; // Temporarily set online
    
    const result = await this.processQueue();
    
    this.isOnline = wasOnline; // Restore status
    return result;
  }

  /**
   * Clear all pending items
   */
  async clearAll(): Promise<void> {
    await this.queue.clear();
    console.log('[SyncManager] All pending items cleared');
  }

  /**
   * Clear pending items untuk specific type
   */
  async clearType(type: SyncType): Promise<void> {
    await this.queue.clearByType(type);
    console.log(`[SyncManager] Cleared all ${type} items`);
  }

  /**
   * Remove failed items (exceeded max retries)
   */
  async removeFailed(): Promise<number> {
    const removed = await this.queue.removeFailed();
    console.log(`[SyncManager] Removed ${removed} failed items`);
    return removed;
  }

  /**
   * Retry failed item
   */
  async retryFailed(id: string): Promise<void> {
    await this.queue.resetRetries(id);
    console.log(`[SyncManager] Reset retries for item ${id}`);

    if (this.isOnline) {
      await this.processQueue();
    }
  }

  /**
   * Set priority untuk specific type
   */
  setPriorityForType(type: SyncType, priority: number): void {
    const strategy = this.strategies.get(type);
    if (strategy) {
      // Note: Strategy getPriority() should be updated if needed
      console.log(`[SyncManager] Priority for ${type} set to ${priority}`);
    }
  }

  /**
   * Cleanup - remove network listener
   */
  cleanup(): void {
    if (this.networkUnsubscribe) {
      this.networkUnsubscribe();
      this.networkUnsubscribe = null;
    }
    console.log('[SyncManager] Cleanup complete');
  }

  /**
   * Export diagnostic info
   */
  async exportDiagnostics(): Promise<{
    status: GlobalSyncStatus;
    queue: string;
    strategies: string[];
  }> {
    const status = await this.getStatus();
    const queueExport = await this.queue.export();
    const strategies = Array.from(this.strategies.keys());

    return {
      status,
      queue: queueExport,
      strategies,
    };
  }
}

// ---------------------------------------------------------------------------
// Singleton Instance
// ---------------------------------------------------------------------------

let syncManagerInstance: SyncManager | null = null;

export const getSyncManager = (queue?: SyncQueue): SyncManager => {
  if (!syncManagerInstance && queue) {
    syncManagerInstance = new SyncManager(queue);
  }
  
  if (!syncManagerInstance) {
    throw new Error('SyncManager not initialized. Provide SyncQueue instance.');
  }
  
  return syncManagerInstance;
};

// Export for direct use
export default getSyncManager;