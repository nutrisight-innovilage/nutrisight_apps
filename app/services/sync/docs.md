# 📘 SyncManager - Complete Documentation

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Core Concepts](#core-concepts)
4. [API Reference](#api-reference)
5. [Best Practices](#best-practices)
6. [Usage Examples](#usage-examples)
7. [Integration Guide](#integration-guide)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

**SyncManager** adalah universal sync engine untuk semua operasi sinkronisasi dalam aplikasi. Menggunakan **Strategy Pattern** untuk extensibility dan mendukung offline-first architecture.

### Key Features

✅ **Strategy-based sync** - Extensible untuk berbagai jenis data  
✅ **Automatic retry** - Exponential backoff untuk failed operations  
✅ **Priority queue** - Intelligent task prioritization  
✅ **Network detection** - Auto-sync when connection restored  
✅ **Batch processing** - Efficient bulk operations  
✅ **Global sync status** - Real-time monitoring  

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       SyncManager                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Strategy   │  │   Strategy   │  │   Strategy   │      │
│  │   Registry   │  │   Executor   │  │   Monitor    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ├─── Uses ───┐
                            │             │
                            ▼             ▼
                    ┌──────────────┐  ┌──────────────┐
                    │  SyncQueue   │  │ NetInfo API  │
                    │  (Storage)   │  │  (Network)   │
                    └──────────────┘  └──────────────┘
```

### Components

1. **Strategy Registry**: Menyimpan semua registered sync strategies
2. **Strategy Executor**: Menjalankan sync operations
3. **Strategy Monitor**: Tracking status & diagnostics
4. **SyncQueue**: Persistent queue untuk pending operations
5. **Network Monitor**: Auto-detect connection changes

---

## 💡 Core Concepts

### 1. Sync Strategy

Interface yang harus diimplement untuk setiap jenis sync:

```typescript
interface SyncStrategy {
  // Prepare data sebelum upload
  prepare(data: any): Promise<SyncPayload>;
  
  // Upload data ke server
  upload(payload: SyncPayload): Promise<any>;
  
  // Handler ketika upload berhasil
  onSuccess(result: any, payload: SyncPayload): Promise<void>;
  
  // Handler ketika upload gagal
  onFailure(error: Error, payload: SyncPayload): Promise<void>;
  
  // Validate data sebelum sync
  validate(data: any): boolean;
  
  // Priority (1=highest, 5=lowest)
  getPriority(): number;
  
  // Max retries untuk jenis data ini
  getMaxRetries(): number;
}
```

### 2. Sync Types

```typescript
type SyncType = 'meal' | 'photo' | 'feedback' | 'auth' | 'profile' | 'other' | 'menu';
```

Setiap sync type harus punya strategy tersendiri.

### 3. Sync Payload (ACTUAL IMPLEMENTATION)

```typescript
interface SyncPayload {
  id: string;                    // Unique identifier
  type: SyncType;                // Jenis sync
  data: any;                     // Data yang akan disync
  priority: number;              // Priority (1-5)
  retryCount: number;            // Current retry count
  maxRetries: number;            // Max retry allowed
  createdAt: string;             // ISO timestamp
  lastAttempt?: string;          // Last attempt timestamp
  nextRetryAt?: string;          // Next retry scheduled time
  error?: string;                // Last error message
}
```

### 4. Queue Stats (ACTUAL IMPLEMENTATION)

```typescript
interface QueueStats {
  totalItems: number;                     // Total semua items
  byType: Record<SyncType, number>;      // Count per type
  byPriority: Record<number, number>;    // Count per priority (1-5)
  failedItems: number;                   // Items exceeded max retries
  avgRetries: number;                    // Average retry count
}
```

### 5. Global Sync Status

```typescript
interface GlobalSyncStatus {
  isOnline: boolean;              // Network status
  isProcessing: boolean;          // Currently syncing?
  lastSyncTime: string | null;    // Last successful sync
  queueStats: QueueStats;         // Queue statistics
  activeStrategy: SyncType | null; // Currently active strategy
}
```

### 6. Sync Flow

```
┌─────────────┐
│   Action    │  User melakukan action (update profile, submit meal, etc)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Offline    │  Simpan ke local storage DULU (instant success)
│  Storage    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ SyncManager │  Queue untuk background sync
│   .sync()   │  syncManager.sync('auth', data)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ SyncQueue   │  Data masuk queue dengan priority
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Network    │  Wait for connection (auto-detected)
│  Detection  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Strategy   │  Jalankan strategy.upload()
│  Execution  │
└──────┬──────┘
       │
       ├─── Success ───► onSuccess() ───► Remove from queue
       │
       └─── Failure ───► onFailure() ───► Retry (exponential backoff)
                                           │
                                           └─► Max retries? ─► Mark failed
```

### 7. Retry Delays (Exponential Backoff)

```typescript
const RETRY_DELAYS = [1000, 5000, 15000, 60000]; 
// Attempt 1: 1 second
// Attempt 2: 5 seconds
// Attempt 3: 15 seconds
// Attempt 4+: 60 seconds
```

---

## 📖 API Reference

### SyncManager Methods

#### Core Methods

#### 1. `registerStrategy(type, strategy)`

Register strategy untuk sync type tertentu.

```typescript
syncManager.registerStrategy('auth', authSyncStrategy);
syncManager.registerStrategy('meal', mealSyncStrategy);
syncManager.registerStrategy('menu', menuSyncStrategy);
```

**Parameters:**
- `type: SyncType` - Jenis sync
- `strategy: SyncStrategy` - Strategy implementation

**Returns:** `void`

---

#### 2. `sync(type, data)`

Queue single item untuk sync.

```typescript
await syncManager.sync('auth', {
  action: 'updateProfile',
  userId: '123',
  userData: { name: 'John' },
  token: 'abc...'
});
```

**Parameters:**
- `type: SyncType` - Jenis sync
- `data: any` - Data yang akan disync

**Returns:** `Promise<boolean>` - Success status

**Flow:**
1. Validate data via strategy.validate()
2. Prepare payload via strategy.prepare()
3. Add to queue dengan priority dari strategy
4. Jika online, langsung process queue

---

#### 3. `processQueue()`

Process semua pending items di queue.

```typescript
const result = await syncManager.processQueue();
// {
//   success: true,
//   processedCount: 5,
//   failedCount: 1,
//   errors: [{ id: 'sync_123', error: 'Network timeout' }]
// }
```

**Returns:** `Promise<SyncResult>`

```typescript
interface SyncResult {
  success: boolean;
  processedCount: number;
  failedCount: number;
  errors: Array<{ id: string; error: string }>;
}
```

**Auto-triggered when:**
- Device comes back online
- After new item queued (if online)
- Manual call to syncAll()

---

#### 4. `syncAll()`

Alias untuk `processQueue()`. Sync semua pending items.

```typescript
const result = await syncManager.syncAll();
```

---

#### 5. `syncType(type)`

Sync specific type saja.

```typescript
const result = await syncManager.syncType('auth');
// Hanya sync pending 'auth' items
```

**Use case:**
- Sync specific data type saat user login
- Selective sync based on user action
- Debugging specific type

---

#### 6. `syncBatch(batchSize)`

Sync dengan limit jumlah items.

```typescript
const result = await syncManager.syncBatch(5);
// Sync max 5 items
```

**Parameters:**
- `batchSize: number` - Max items to process (default: 5)

**Use case:**
- Rate limiting
- Memory management
- Progressive sync

---

### Status & Monitoring

#### 7. `getStatus()`

Get global sync status.

```typescript
const status = await syncManager.getStatus();
console.log(status);
```

**Returns:** `Promise<GlobalSyncStatus>`

**Example Output:**
```typescript
{
  isOnline: true,
  isProcessing: false,
  lastSyncTime: '2025-01-15T10:30:00.000Z',
  queueStats: {
    totalItems: 10,
    byType: {
      auth: 3,
      meal: 5,
      menu: 2,
      photo: 0,
      feedback: 0,
      profile: 0,
      other: 0
    },
    byPriority: {
      1: 3,    // High priority
      2: 5,    // Medium priority
      3: 2,    // Low priority
      4: 0,
      5: 0
    },
    failedItems: 1,
    avgRetries: 1.5
  },
  activeStrategy: 'auth'
}
```

---

#### 8. `getPendingCount(type)`

Get jumlah pending items untuk specific type.

```typescript
const count = await syncManager.getPendingCount('auth');
console.log(count); // 3
```

**Use case:**
- Show badge count di UI
- Conditional sync triggers
- Monitoring

---

#### 9. `isSyncing()`

Check if currently syncing.

```typescript
if (syncManager.isSyncing()) {
  console.log('Sync in progress...');
}
```

**Returns:** `boolean`

---

### Control Methods

#### 10. `pauseSync()`

Pause semua sync operations.

```typescript
syncManager.pauseSync();
// Queue masih menerima items, tapi tidak diprocess
```

**Use case:**
- User wants to pause sync
- Low battery mode
- Expensive connection (roaming)

---

#### 11. `resumeSync()`

Resume sync operations.

```typescript
syncManager.resumeSync();
// Auto-trigger sync jika ada pending items
```

---

#### 12. `forceSync()`

Force sync (ignore online status check).

```typescript
const result = await syncManager.forceSync();
// Coba sync walaupun device detected offline
```

**Use case:**
- Debug/testing
- Manual override

⚠️ **Warning:** Bisa fail jika benar-benar offline.

---

### Cleanup Methods

#### 13. `clearAll()`

Clear semua pending items dari queue.

```typescript
await syncManager.clearAll();
```

⚠️ **Destructive:** Data yang belum tersync akan hilang.

---

#### 14. `clearType(type)`

Clear pending items untuk specific type.

```typescript
await syncManager.clearType('auth');
```

---

#### 15. `removeFailed()`

Remove items yang sudah exceed max retries.

```typescript
const removed = await syncManager.removeFailed();
console.log(`Removed ${removed} failed items`);
```

**Returns:** `Promise<number>` - Number of removed items

---

#### 16. `retryFailed(id)`

Reset retries untuk specific item dan retry.

```typescript
await syncManager.retryFailed('sync_123');
```

**Use case:**
- Manual retry dari UI
- After fixing server issues

---

### Advanced Methods

#### 17. `exportDiagnostics()`

Export diagnostic info untuk debugging.

```typescript
const diagnostics = await syncManager.exportDiagnostics();
console.log(JSON.stringify(diagnostics, null, 2));
```

**Returns:**
```typescript
{
  status: GlobalSyncStatus,
  queue: string,              // JSON string of queue
  strategies: string[]        // List of registered strategies
}
```

---

#### 18. `cleanup()`

Remove network listener (call on unmount).

```typescript
syncManager.cleanup();
```

---

#### 19. `hasStrategy(type)`

Check if strategy registered untuk type tertentu.

```typescript
if (syncManager.hasStrategy('auth')) {
  console.log('Auth strategy is registered');
}
```

**Returns:** `boolean`

---

#### 20. `unregisterStrategy(type)`

Unregister strategy (untuk testing/debugging).

```typescript
syncManager.unregisterStrategy('auth');
```

---

### SyncQueue Methods (Advanced)

#### Additional Queue Operations

```typescript
const syncQueue = getSyncQueue();

// Get all items
const all = await syncQueue.getAll();

// Get items ready for processing
const ready = await syncQueue.getReady();

// Get next item
const next = await syncQueue.getNext();

// Get batch
const batch = await syncQueue.getBatch(10);

// Get oldest item
const oldest = await syncQueue.getOldest();

// Get items older than X hours
const old = await syncQueue.getOlderThan(24);

// Update priority
await syncQueue.updatePriority('sync_123', 1);

// Export/Import queue
const exported = await syncQueue.export();
await syncQueue.import(exported);

// Check if empty
const empty = await syncQueue.isEmpty();

// Get size
const size = await syncQueue.size();
```

---

## 🎯 Best Practices

### 1. ✅ DO: Write Local First

```typescript
// ✅ GOOD
async function updateProfile(data) {
  // 1. Save locally (instant success)
  const result = await offlineAPI.updateProfile(data);
  
  // 2. Queue for sync (non-blocking)
  try {
    const syncManager = getSyncManager();
    await syncManager.sync('auth', {
      action: 'updateProfile',
      data
    });
  } catch (err) {
    console.warn('Sync queue failed:', err);
  }
  
  return result; // Return local result immediately
}
```

```typescript
// ❌ BAD
async function updateProfile(data) {
  // Server call first = slow, can fail
  const result = await onlineAPI.updateProfile(data);
  await offlineAPI.updateProfile(data);
  return result;
}
```

---

### 2. ✅ DO: Handle Sync Errors Gracefully

```typescript
// ✅ GOOD
try {
  await syncManager.sync('meal', mealData);
  console.log('Queued for sync');
} catch (err) {
  // Non-blocking - local data already saved
  console.warn('Failed to queue, will retry later:', err);
}
```

```typescript
// ❌ BAD
try {
  await syncManager.sync('meal', mealData);
} catch (err) {
  // Blocking user - bad UX
  throw new Error('Sync failed! Cannot proceed.');
}
```

---

### 3. ✅ DO: Use Appropriate Priority

```typescript
// Strategy implementation
class AuthSyncStrategy implements SyncStrategy {
  getPriority(): number {
    return 1; // High priority - auth is critical
  }
}

class AnalyticsSyncStrategy implements SyncStrategy {
  getPriority(): number {
    return 5; // Low priority - not critical
  }
}
```

**Priority Guide:**
- **1**: Critical (auth, payments)
- **2**: High (user data, meals)
- **3**: Normal (photos, updates)
- **4**: Low (feedback, logs)
- **5**: Lowest (analytics)

---

### 4. ✅ DO: Implement Proper Validation

```typescript
class MealSyncStrategy implements SyncStrategy {
  validate(data: any): boolean {
    if (!data.items || data.items.length === 0) {
      console.error('Invalid meal data: no items');
      return false;
    }
    
    if (!data.ricePortion || data.ricePortion <= 0) {
      console.error('Invalid meal data: invalid rice portion');
      return false;
    }
    
    return true;
  }
}
```

---

### 5. ✅ DO: Show Sync Status to Users

```typescript
// In your component
const [syncStatus, setSyncStatus] = useState(null);

useEffect(() => {
  const checkSync = async () => {
    const syncManager = getSyncManager();
    const status = await syncManager.getStatus();
    
    setSyncStatus({
      isOnline: status.isOnline,
      isSyncing: status.isProcessing,
      totalPending: status.queueStats.totalItems,
      pendingAuth: status.queueStats.byType.auth || 0,
      pendingMeal: status.queueStats.byType.meal || 0,
      failedCount: status.queueStats.failedItems,
    });
  };
  
  checkSync();
  const interval = setInterval(checkSync, 5000);
  return () => clearInterval(interval);
}, []);

// In UI
{syncStatus?.totalPending > 0 && (
  <View style={styles.badge}>
    <Text>{syncStatus.totalPending} pending</Text>
    {syncStatus.isSyncing && <ActivityIndicator />}
  </View>
)}
```

---

### 6. ✅ DO: Handle Network Changes

```typescript
useEffect(() => {
  const unsubscribe = NetInfo.addEventListener(state => {
    if (state.isConnected) {
      showNotification('Back online - syncing data...');
      // SyncManager will auto-sync
    } else {
      showNotification('Offline - changes saved locally');
    }
  });
  
  return () => unsubscribe();
}, []);
```

---

### 7. ✅ DO: Regular Cleanup

```typescript
// Run daily
useEffect(() => {
  const cleanup = async () => {
    const syncManager = getSyncManager();
    const removed = await syncManager.removeFailed();
    console.log(`Cleaned ${removed} failed items`);
  };

  const interval = setInterval(cleanup, 24 * 60 * 60 * 1000);
  return () => clearInterval(interval);
}, []);
```

---

## 📚 Usage Examples

### Example 1: Auth Service Integration

```typescript
class AuthService {
  async updateUser(userId: string, userData: UpdateUserRequest, token: string) {
    // 1. ALWAYS update locally first
    const authData = await authOfflineAPI.updateUser(userId, userData, token);
    
    // 2. Queue for sync
    try {
      const syncManager = getSyncManager();
      await syncManager.sync('auth', {
        action: 'updateProfile',
        userId,
        userData,
        token,
      });
      console.log('Profile update queued for sync');
    } catch (syncErr) {
      console.warn('Failed to queue sync:', syncErr);
    }
    
    // 3. Return local result immediately
    return authData;
  }
  
  async syncPendingUpdates(token: string) {
    const syncManager = getSyncManager();
    const result = await syncManager.syncType('auth');
    
    return {
      success: result.success,
      syncedCount: result.processedCount,
      errors: result.errors.map(e => e.error),
    };
  }
  
  async getPendingUpdatesCount() {
    const syncManager = getSyncManager();
    return await syncManager.getPendingCount('auth');
  }
}
```

---

### Example 2: Meal Submission with Offline Support

```typescript
const submitMeal = async (mealData: AnalyzeMealRequest) => {
  try {
    // 1. Calculate nutrition offline (instant)
    const nutrition = await MealOfflineAPI.calculateMealNutrition(
      mealData.items,
      mealData.ricePortion
    );
    
    // 2. Create local scan
    const localScan: NutritionScan = {
      id: `local_${Date.now()}`,
      localId: `local_${Date.now()}`,
      foodName: 'My Meal',
      calories: nutrition.calories,
      protein: nutrition.protein,
      carbs: nutrition.carbs,
      fat: nutrition.fat,
      fiber: nutrition.fiber,
      sugar: nutrition.sugar,
      // ... other fields
      isSynced: false,
      createdAt: new Date().toISOString(),
    };
    
    // 3. Save to local history
    await MealOfflineAPI.saveCompletedScan(localScan);
    
    // 4. Queue for sync (background)
    try {
      const syncManager = getSyncManager();
      await syncManager.sync('meal', {
        action: 'submitAnalysis',
        mealData,
        localScanId: localScan.localId,
      });
      console.log('Meal queued for server sync');
    } catch (syncErr) {
      console.warn('Failed to queue, will retry later:', syncErr);
    }
    
    // 5. Return immediately with local result
    return {
      success: true,
      scan: localScan,
      message: 'Meal saved (will sync when online)',
    };
  } catch (err) {
    return {
      success: false,
      message: err.message,
    };
  }
};
```

---

### Example 3: Comprehensive Sync Status Display

```typescript
function DetailedSyncStatus() {
  const [status, setStatus] = useState<GlobalSyncStatus | null>(null);

  useEffect(() => {
    const updateStatus = async () => {
      try {
        const syncManager = getSyncManager();
        const currentStatus = await syncManager.getStatus();
        setStatus(currentStatus);
      } catch (err) {
        console.error('Failed to get sync status:', err);
      }
    };

    updateStatus();
    const interval = setInterval(updateStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  if (!status) return null;

  const { queueStats } = status;

  return (
    <View style={styles.container}>
      {/* Connection Status */}
      <View style={styles.header}>
        <View style={[styles.badge, { 
          backgroundColor: status.isOnline ? '#10b981' : '#f59e0b' 
        }]}>
          <Text style={styles.badgeText}>
            {status.isOnline ? '● Online' : '● Offline'}
          </Text>
        </View>
        {status.isProcessing && (
          <ActivityIndicator size="small" color="#10b981" />
        )}
      </View>

      {/* Total Pending */}
      {queueStats.totalItems > 0 && (
        <View style={styles.section}>
          <Text style={styles.total}>
            Total Pending: {queueStats.totalItems}
          </Text>
        </View>
      )}

      {/* By Type */}
      {queueStats.totalItems > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>By Type:</Text>
          {Object.entries(queueStats.byType)
            .filter(([_, count]) => count > 0)
            .map(([type, count]) => (
              <View key={type} style={styles.row}>
                <Text style={styles.label}>{type}:</Text>
                <Text style={styles.value}>{count}</Text>
              </View>
            ))}
        </View>
      )}

      {/* By Priority */}
      {queueStats.totalItems > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>By Priority:</Text>
          {Object.entries(queueStats.byPriority)
            .filter(([_, count]) => count > 0)
            .map(([priority, count]) => (
              <View key={priority} style={styles.row}>
                <Text style={styles.label}>Priority {priority}:</Text>
                <Text style={styles.value}>{count}</Text>
              </View>
            ))}
        </View>
      )}

      {/* Failed Items */}
      {queueStats.failedItems > 0 && (
        <View style={[styles.section, styles.errorSection]}>
          <Text style={styles.errorText}>
            ⚠️ {queueStats.failedItems} failed items
          </Text>
          <Text style={styles.subtext}>
            Avg retries: {queueStats.avgRetries.toFixed(1)}
          </Text>
        </View>
      )}

      {/* Last Sync Time */}
      {status.lastSyncTime && (
        <Text style={styles.timestamp}>
          Last sync: {new Date(status.lastSyncTime).toLocaleTimeString()}
        </Text>
      )}
    </View>
  );
}
```

---

### Example 4: Manual Sync with Progress

```typescript
function SyncButton() {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  
  const handleSync = async () => {
    setLoading(true);
    setProgress('Starting sync...');
    
    try {
      const syncManager = getSyncManager();
      
      // Get initial stats
      const beforeStats = await syncManager.getStatus();
      setProgress(`Syncing ${beforeStats.queueStats.totalItems} items...`);
      
      // Sync all
      const result = await syncManager.syncAll();
      
      if (result.success) {
        setProgress(
          `✓ Synced ${result.processedCount} items successfully`
        );
        setTimeout(() => setProgress(''), 3000);
      } else {
        setProgress(
          `⚠ Completed with ${result.failedCount} errors`
        );
      }
    } catch (err) {
      setProgress(`✗ Sync failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <View>
      <Button 
        onPress={handleSync} 
        loading={loading}
        disabled={loading}
      >
        {loading ? 'Syncing...' : 'Sync Now'}
      </Button>
      {progress && (
        <Text style={styles.progress}>{progress}</Text>
      )}
    </View>
  );
}
```

---

### Example 5: Periodic Background Sync

```typescript
function useBackgroundSync() {
  useEffect(() => {
    const backgroundSync = async () => {
      try {
        const syncManager = getSyncManager();
        const status = await syncManager.getStatus();
        
        // Only sync if online and has pending items
        if (status.isOnline && status.queueStats.totalItems > 0) {
          console.log('[BackgroundSync] Starting...');
          const result = await syncManager.syncBatch(5); // Limit to 5 items
          console.log(
            `[BackgroundSync] Complete: ${result.processedCount} synced, ` +
            `${result.failedCount} failed`
          );
        }
      } catch (err) {
        console.error('[BackgroundSync] Failed:', err);
      }
    };

    // Run every 5 minutes
    const interval = setInterval(backgroundSync, 5 * 60 * 1000);
    
    // Initial sync
    backgroundSync();
    
    return () => clearInterval(interval);
  }, []);
}
```

---

## 🔧 Integration Guide

### Step 1: Create Sync Strategy

```typescript
// strategies/authSyncStrategy.ts
import { SyncStrategy, SyncPayload } from '@/services/sync/syncManager';
import authOnlineAPI from '@/services/auth/authOnlineAPI';
import authOfflineAPI from '@/services/auth/authOfflineAPI';

class AuthSyncStrategy implements SyncStrategy {
  async prepare(data: any): Promise<SyncPayload> {
    return {
      id: `auth_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'auth',
      data,
      priority: 1,
      retryCount: 0,
      maxRetries: 5,
      createdAt: new Date().toISOString(),
    };
  }

  async upload(payload: SyncPayload): Promise<any> {
    const { action, userId, userData, token } = payload.data;
    
    switch (action) {
      case 'register':
        return await authOnlineAPI.register(payload.data.registerData);
      
      case 'updateProfile':
        return await authOnlineAPI.updateUser(userId, userData, token);
      
      case 'changePassword':
        return await authOnlineAPI.changePassword(
          userId,
          payload.data.oldPassword,
          payload.data.newPassword,
          token
        );
      
      default:
        throw new Error(`Unknown auth action: ${action}`);
    }
  }

  async onSuccess(result: any, payload: SyncPayload): Promise<void> {
    console.log(`[AuthSync] ✓ Success: ${payload.data.action}`);
    
    if (result.user) {
      await authOfflineAPI.saveUserFromServer(result.user);
    }
    
    if (payload.data.userId) {
      await authOfflineAPI.clearPendingUpdate(payload.data.userId);
    }
  }

  async onFailure(error: Error, payload: SyncPayload): Promise<void> {
    console.error(`[AuthSync] ✗ Failed: ${payload.data.action}`, error);
    
    if (payload.data.userId && payload.retryCount < payload.maxRetries) {
      await authOfflineAPI.markPendingUpdate(
        payload.data.userId,
        payload.data.userData
      );
    }
  }

  validate(data: any): boolean {
    if (!data.action) return false;
    
    switch (data.action) {
      case 'updateProfile':
        return !!(data.userId && data.userData && data.token);
      case 'changePassword':
        return !!(data.userId && data.oldPassword && data.newPassword && data.token);
      case 'register':
        return !!data.registerData;
      default:
        return false;
    }
  }

  getPriority(): number {
    return 1;
  }

  getMaxRetries(): number {
    return 5;
  }
}

export default new AuthSyncStrategy();
```

---

### Step 2: Initialize in App

```typescript
// App.tsx or _layout.tsx
import { useEffect, useState } from 'react';
import { getSyncManager } from '@/services/sync/syncManager';
import { getSyncQueue } from '@/services/sync/syncQueue';
import authSyncStrategy from '@/services/sync/strategies/authSyncStrategy';
import { mealSyncStrategy } from '@/services/sync/strategies/mealSyncStrategy';
import menuSyncStrategy from '@/services/sync/strategies/menuSyncStrategy';

function App() {
  const [syncReady, setSyncReady] = useState(false);

  useEffect(() => {
    const initSync = async () => {
      try {
        console.log('[App] Initializing sync system...');

        // Get instances
        const syncQueue = getSyncQueue();
        const syncManager = getSyncManager(syncQueue);

        // Register strategies
        syncManager.registerStrategy('auth', authSyncStrategy);
        syncManager.registerStrategy('meal', mealSyncStrategy);
        syncManager.registerStrategy('menu', menuSyncStrategy);

        console.log('[App] ✓ Sync system ready');
        setSyncReady(true);

        // Initial sync if online
        const status = await syncManager.getStatus();
        if (status.isOnline && status.queueStats.totalItems > 0) {
          console.log('[App] Starting initial sync...');
          await syncManager.syncAll();
        }
      } catch (err) {
        console.error('[App] Failed to initialize sync:', err);
        setSyncReady(true); // Continue anyway
      }
    };

    initSync();

    return () => {
      try {
        const syncManager = getSyncManager();
        syncManager.cleanup();
      } catch (err) {}
    };
  }, []);

  if (!syncReady) {
    return <LoadingScreen />;
  }

  return <MainApp />;
}
```

---

### Step 3: Use in Services

```typescript
// services/authService.ts
import { getSyncManager } from '@/services/sync/syncManager';
import authOfflineAPI from './authOfflineAPI';

class AuthService {
  async updateUser(userId: string, userData: any, token: string) {
    // 1. Update locally
    const result = await authOfflineAPI.updateUser(userId, userData, token);
    
    // 2. Queue for sync
    try {
      const syncManager = getSyncManager();
      await syncManager.sync('auth', {
        action: 'updateProfile',
        userId,
        userData,
        token,
      });
    } catch (err) {
      console.warn('Failed to queue sync:', err);
    }
    
    // 3. Return local result
    return result;
  }
}
```

---

## 🐛 Troubleshooting

### Issue 1: Items Not Syncing

**Symptoms:** Items stay in queue, never sync.

**Diagnosis:**
```typescript
const syncManager = getSyncManager();
const status = await syncManager.getStatus();

console.log('Online:', status.isOnline);
console.log('Processing:', status.isProcessing);
console.log('Total items:', status.queueStats.totalItems);
console.log('Failed items:', status.queueStats.failedItems);

// Check specific type
const authPending = await syncManager.getPendingCount('auth');
console.log('Auth pending:', authPending);
```

**Solutions:**
1. Check network: `status.isOnline`
2. Check if strategy registered: `syncManager.hasStrategy('auth')`
3. Check if paused: `syncManager.resumeSync()`
4. Force sync: `await syncManager.forceSync()`
5. Check for failed items: `status.queueStats.failedItems`

---

### Issue 2: Sync Keeps Failing

**Symptoms:** Items retry but always fail.

**Diagnosis:**
```typescript
const syncManager = getSyncManager();
const syncQueue = getSyncQueue();

// Export diagnostics
const diagnostics = await syncManager.exportDiagnostics();
console.log(JSON.parse(diagnostics.queue));

// Check oldest items
const oldest = await syncQueue.getOldest();
console.log('Oldest item:', oldest);

// Check failed items
const stats = await syncQueue.getStats();
console.log('Failed count:', stats.failedItems);
console.log('Avg retries:', stats.avgRetries);
```

**Solutions:**
1. Check validation: Run `strategy.validate(data)`
2. Check server: Test API endpoints directly
3. Check token: May be expired
4. Increase max retries in strategy
5. Check error logs: Look at `payload.error`
6. Clear failed: `await syncManager.removeFailed()`

---

### Issue 3: Memory Issues

**Symptoms:** App slow, high memory usage.

**Solutions:**
```typescript
// Use batch sync instead of syncAll
await syncManager.syncBatch(5);

// Clear old items regularly
const syncQueue = getSyncQueue();
const old = await syncQueue.getOlderThan(24); // 24 hours
console.log(`Found ${old.length} old items`);

// Remove failed items
const removed = await syncManager.removeFailed();
console.log(`Removed ${removed} failed items`);

// Reduce queue size
if (stats.totalItems > 100) {
  console.warn('Queue too large, clearing old items');
  await syncQueue.clearOlderThan(48);
}
```

---

### Issue 4: Duplicate Syncs

**Symptoms:** Same data synced multiple times.

**Solutions:**
1. Check validation prevents duplicates
2. Use unique IDs in prepare()
3. Implement idempotency in server API
4. Clear queue after successful local save
5. Check for race conditions in concurrent syncs

---

### Issue 5: Network Detection Not Working

**Symptoms:** Doesn't auto-sync when coming back online.

**Solutions:**
```typescript
// Manually test network listener
import NetInfo from '@react-native-community/netinfo';

NetInfo.addEventListener(state => {
  console.log('Network state:', state.isConnected);
});

// Force sync manually
const syncManager = getSyncManager();
await syncManager.forceSync();
```

---

## 📊 Performance Tips

### 1. Batch Processing

```typescript
// Instead of processing all at once
await syncManager.syncAll(); // Can be slow

// Use batches
while (true) {
  const result = await syncManager.syncBatch(5);
  if (result.processedCount === 0) break;
  await sleep(1000); // Rate limiting
}
```

---

### 2. Priority Management

```typescript
// Sync high priority first
await syncManager.syncType('auth'); // Priority 1

// Then normal priority
await syncManager.syncType('meal'); // Priority 2

// Finally low priority
await syncManager.syncType('analytics'); // Priority 5
```

---

### 3. Smart Sync Timing

```typescript
// Sync during idle time
import { AppState } from 'react-native';

AppState.addEventListener('change', async (nextAppState) => {
  if (nextAppState === 'background') {
    // App going to background, sync now
    await syncManager.syncBatch(3);
  }
});
```

---

### 4. Periodic Cleanup

```typescript
// Daily cleanup
setInterval(async () => {
  const syncManager = getSyncManager();
  const syncQueue = getSyncQueue();
  
  // Remove failed items
  await syncManager.removeFailed();
  
  // Clear old items (7 days)
  const old = await syncQueue.getOlderThan(7 * 24);
  for (const item of old) {
    await syncQueue.remove(item.id);
  }
}, 24 * 60 * 60 * 1000);
```

---

## 📝 Summary

### ✅ When to Use SyncManager

1. Background sync operations
2. Offline-first data updates
3. Network-dependent operations
4. Retry-able operations
5. Priority-based sync

### ❌ When NOT to Use SyncManager

1. Read operations (use offline API directly)
2. Real-time operations (use WebSocket)
3. One-time critical operations (use direct API)
4. Simple operations without retry needs

### 🎯 Golden Rules

1. **Write local first** - Always save locally before queueing
2. **Non-blocking sync** - Never block user on sync errors
3. **Validate early** - Check data before adding to queue
4. **Handle failures** - Implement proper error handling
5. **Monitor status** - Show sync status to users
6. **Regular cleanup** - Remove old/failed items periodically
7. **Use priorities** - Critical data gets synced first
8. **Batch wisely** - Don't process too many at once

---

## 🔗 Related Files

- `syncManager.ts` - Main sync engine
- `syncQueue.ts` - Queue management
- `authSyncStrategy.ts` - Auth sync implementation
- `mealSyncStrategy.ts` - Meal sync implementation
- `menuSyncStrategy.ts` - Menu sync implementation

---

**Version:** 2.0 (Corrected)  
**Last Updated:** January 2025  
**Maintainer:** Engineering Team