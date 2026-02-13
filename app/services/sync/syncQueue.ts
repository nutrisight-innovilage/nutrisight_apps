/**
 * syncQueue.ts
 * ---------------------------------------------------------------------------
 * Universal queue management untuk sync operations.
 * 
 * Features:
 * • Priority-based queue
 * • Retry logic dengan exponential backoff
 * • Persistent storage
 * • Batch processing
 * • Queue statistics
 * ---------------------------------------------------------------------------
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SyncType = 'meal' | 'photo' | 'feedback' | 'auth' | 'profile' | 'other' | 'menu';

export interface SyncPayload {
  id: string;
  type: SyncType;
  data: any;
  priority: number; // 1=highest, 5=lowest
  retryCount: number;
  maxRetries: number;
  createdAt: string;
  lastAttempt?: string;
  nextRetryAt?: string;
  error?: string;
}

export interface QueueStats {
  totalItems: number;
  byType: Record<SyncType, number>;
  byPriority: Record<number, number>;
  failedItems: number;
  avgRetries: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = '@sync:queue';
const MAX_RETRIES_DEFAULT = 3;
const RETRY_DELAYS = [1000, 5000, 15000, 60000]; // Exponential backoff: 1s, 5s, 15s, 1min

// ---------------------------------------------------------------------------
// SyncQueue Class
// ---------------------------------------------------------------------------

export class SyncQueue {
  private queue: SyncPayload[] = [];
  private isInitialized = false;

  /**
   * Initialize queue dari storage
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
        console.log(`[SyncQueue] Initialized with ${this.queue.length} items`);
      }
      this.isInitialized = true;
    } catch (error) {
      console.error('[SyncQueue] Failed to initialize:', error);
      this.queue = [];
      this.isInitialized = true;
    }
  }

  /**
   * Persist queue ke storage
   */
  private async persist(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('[SyncQueue] Failed to persist queue:', error);
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Add item ke queue
   */
  async add(
    type: SyncType,
    data: any,
    priority: number = 3,
    maxRetries: number = MAX_RETRIES_DEFAULT
  ): Promise<string> {
    await this.initialize();

    const payload: SyncPayload = {
      id: this.generateId(),
      type,
      data,
      priority: Math.max(1, Math.min(5, priority)), // Clamp 1-5
      retryCount: 0,
      maxRetries,
      createdAt: new Date().toISOString(),
    };

    this.queue.push(payload);
    await this.sortByPriority();
    await this.persist();

    console.log(`[SyncQueue] Added ${type} item (priority: ${priority})`);
    return payload.id;
  }

  /**
   * Get all items
   */
  async getAll(): Promise<SyncPayload[]> {
    await this.initialize();
    return [...this.queue];
  }

  /**
   * Get items by type
   */
  async getByType(type: SyncType): Promise<SyncPayload[]> {
    await this.initialize();
    return this.queue.filter(item => item.type === type);
  }

  /**
   * Get items ready for processing (respect retry delay)
   */
  async getReady(): Promise<SyncPayload[]> {
    await this.initialize();
    const now = new Date().getTime();

    return this.queue.filter(item => {
      // Skip if max retries exceeded
      if (item.retryCount >= item.maxRetries) {
        return false;
      }

      // If no retry scheduled, it's ready
      if (!item.nextRetryAt) {
        return true;
      }

      // Check if retry time has passed
      const nextRetry = new Date(item.nextRetryAt).getTime();
      return now >= nextRetry;
    });
  }

  /**
   * Get next item to process (highest priority, ready)
   */
  async getNext(): Promise<SyncPayload | null> {
    const ready = await this.getReady();
    return ready.length > 0 ? ready[0] : null;
  }

  /**
   * Remove item dari queue
   */
  async remove(id: string): Promise<boolean> {
    await this.initialize();
    const initialLength = this.queue.length;
    this.queue = this.queue.filter(item => item.id !== id);
    
    if (this.queue.length < initialLength) {
      await this.persist();
      console.log(`[SyncQueue] Removed item ${id}`);
      return true;
    }
    
    return false;
  }

  /**
   * Mark item sebagai failed & schedule retry
   */
  async markFailed(id: string, error?: string): Promise<void> {
    await this.initialize();
    const item = this.queue.find(i => i.id === id);

    if (!item) return;

    item.retryCount += 1;
    item.lastAttempt = new Date().toISOString();
    item.error = error;

    // Calculate next retry time dengan exponential backoff
    if (item.retryCount < item.maxRetries) {
      const delayIndex = Math.min(item.retryCount - 1, RETRY_DELAYS.length - 1);
      const delay = RETRY_DELAYS[delayIndex];
      item.nextRetryAt = new Date(Date.now() + delay).toISOString();
      
      console.log(
        `[SyncQueue] Item ${id} failed (attempt ${item.retryCount}/${item.maxRetries}). ` +
        `Retry in ${delay}ms`
      );
    } else {
      console.log(`[SyncQueue] Item ${id} exceeded max retries (${item.maxRetries})`);
    }

    await this.persist();
  }

  /**
   * Clear semua items (untuk testing/debugging)
   */
  async clear(): Promise<void> {
    await this.initialize();
    this.queue = [];
    await this.persist();
    console.log('[SyncQueue] Queue cleared');
  }

  /**
   * Clear items by type
   */
  async clearByType(type: SyncType): Promise<void> {
    await this.initialize();
    const before = this.queue.length;
    this.queue = this.queue.filter(item => item.type !== type);
    await this.persist();
    console.log(`[SyncQueue] Cleared ${before - this.queue.length} ${type} items`);
  }

  /**
   * Remove failed items (exceeded max retries)
   */
  async removeFailed(): Promise<number> {
    await this.initialize();
    const before = this.queue.length;
    this.queue = this.queue.filter(item => item.retryCount < item.maxRetries);
    await this.persist();
    
    const removed = before - this.queue.length;
    console.log(`[SyncQueue] Removed ${removed} failed items`);
    return removed;
  }

  /**
   * Reset retry count untuk item tertentu
   */
  async resetRetries(id: string): Promise<void> {
    await this.initialize();
    const item = this.queue.find(i => i.id === id);

    if (item) {
      item.retryCount = 0;
      item.nextRetryAt = undefined;
      item.error = undefined;
      await this.persist();
      console.log(`[SyncQueue] Reset retries for item ${id}`);
    }
  }

  /**
   * Sort queue by priority (1=highest, 5=lowest)
   */
  private async sortByPriority(): Promise<void> {
    this.queue.sort((a, b) => {
      // First by priority
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      // Then by creation time (FIFO within same priority)
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<QueueStats> {
    await this.initialize();

    const stats: QueueStats = {
      totalItems: this.queue.length,
      byType: { meal: 0, photo: 0, feedback: 0, auth: 0, profile: 0, other: 0, menu: 0 },
      byPriority: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      failedItems: 0,
      avgRetries: 0,
    };

    let totalRetries = 0;

    for (const item of this.queue) {
      // Count by type
      stats.byType[item.type] = (stats.byType[item.type] || 0) + 1;
      
      // Count by priority
      stats.byPriority[item.priority] = (stats.byPriority[item.priority] || 0) + 1;
      
      // Count failed
      if (item.retryCount >= item.maxRetries) {
        stats.failedItems += 1;
      }
      
      // Sum retries
      totalRetries += item.retryCount;
    }

    // Calculate average retries
    stats.avgRetries = this.queue.length > 0 
      ? Math.round((totalRetries / this.queue.length) * 10) / 10 
      : 0;

    return stats;
  }

  /**
   * Get size of queue
   */
  async size(): Promise<number> {
    await this.initialize();
    return this.queue.length;
  }

  /**
   * Check if queue is empty
   */
  async isEmpty(): Promise<boolean> {
    const size = await this.size();
    return size === 0;
  }

  /**
   * Get pending count by type
   */
  async getPendingCount(type: SyncType): Promise<number> {
    const items = await this.getByType(type);
    return items.filter(item => item.retryCount < item.maxRetries).length;
  }

  /**
   * Batch processing - get multiple items
   */
  async getBatch(batchSize: number = 5): Promise<SyncPayload[]> {
    const ready = await this.getReady();
    return ready.slice(0, batchSize);
  }

  /**
   * Update priority untuk item tertentu
   */
  async updatePriority(id: string, newPriority: number): Promise<void> {
    await this.initialize();
    const item = this.queue.find(i => i.id === id);

    if (item) {
      item.priority = Math.max(1, Math.min(5, newPriority));
      await this.sortByPriority();
      await this.persist();
      console.log(`[SyncQueue] Updated priority for ${id} to ${newPriority}`);
    }
  }

  /**
   * Get oldest item in queue
   */
  async getOldest(): Promise<SyncPayload | null> {
    await this.initialize();
    if (this.queue.length === 0) return null;

    return this.queue.reduce((oldest, current) => {
      return new Date(current.createdAt) < new Date(oldest.createdAt) ? current : oldest;
    });
  }

  /**
   * Get items older than specified time
   */
  async getOlderThan(hours: number): Promise<SyncPayload[]> {
    await this.initialize();
    const threshold = Date.now() - (hours * 60 * 60 * 1000);

    return this.queue.filter(item => {
      return new Date(item.createdAt).getTime() < threshold;
    });
  }

  /**
   * Export queue untuk debugging
   */
  async export(): Promise<string> {
    await this.initialize();
    return JSON.stringify(this.queue, null, 2);
  }

  /**
   * Import queue (untuk testing/restore)
   */
  async import(queueData: string): Promise<void> {
    try {
      this.queue = JSON.parse(queueData);
      await this.persist();
      console.log(`[SyncQueue] Imported ${this.queue.length} items`);
    } catch (error) {
      console.error('[SyncQueue] Failed to import queue:', error);
      throw error;
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton Instance
// ---------------------------------------------------------------------------

let queueInstance: SyncQueue | null = null;

export const getSyncQueue = (): SyncQueue => {
  if (!queueInstance) {
    queueInstance = new SyncQueue();
  }
  return queueInstance;
};

// Export default instance
export default getSyncQueue();