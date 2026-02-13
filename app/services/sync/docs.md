# 📘 SyncManager - Comprehensive Documentation

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
type SyncType = 'auth' | 'meal' | 'profile' | 'settings' | ...;
```

Setiap sync type harus punya strategy tersendiri.

### 3. Sync Payload

```typescript
interface SyncPayload {
  id: string;              // Unique identifier
  type: SyncType;          // Jenis sync
  data: any;               // Data yang akan disync
  priority: number;        // Priority (1-5)
  retries: number;         // Jumlah retry attempts
  maxRetries: number;      // Max retry allowed
  status: 'pending' | 'processing' | 'failed';
  createdAt: string;
  lastAttemptAt: string | null;
  error: string | null;
}
```

### 4. Sync Flow

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
       └─── Failure ───► onFailure() ───► Retry (with backoff)
                                           │
                                           └─► Max retries? ─► Mark failed
```

---

## 📖 API Reference

### Core Methods

#### 1. `registerStrategy(type, strategy)`

Register strategy untuk sync type tertentu.

```typescript
syncManager.registerStrategy('auth', authSyncStrategy);
syncManager.registerStrategy('meal', mealSyncStrategy);
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
//   errors: [...]
// }
```

**Returns:** `Promise<SyncResult>`

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
// {
//   isOnline: true,
//   isProcessing: false,
//   lastSyncTime: '2025-01-15T10:30:00Z',
//   queueStats: {
//     pending: 3,
//     processing: 0,
//     failed: 1,
//     total: 4
//   },
//   activeStrategy: 'auth'
// }
```

**Returns:** `Promise<GlobalSyncStatus>`

---

#### 8. `getPendingCount(type)`

Get jumlah pending items untuk specific type.

```typescript
const count = await syncManager.getPendingCount('auth');
// 3
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
// 2 (jumlah items yang diremove)
```

**Returns:** `Promise<number>`

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
// {
//   status: {...},
//   queue: '...',
//   strategies: ['auth', 'meal']
// }
```

---

#### 18. `cleanup()`

Remove network listener (call on unmount).

```typescript
syncManager.cleanup();
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
  syncManager.sync('auth', {
    action: 'updateProfile',
    data
  }).catch(err => console.warn('Sync queue failed:', err));
  
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
- **1-2**: Critical (auth, payments)
- **3**: Normal (user data, meals)
- **4-5**: Low (analytics, logs)

---

### 4. ✅ DO: Implement Proper Validation

```typescript
class MealSyncStrategy implements SyncStrategy {
  validate(data: any): boolean {
    // Validate before queueing
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
    const status = await syncManager.getStatus();
    const pendingAuth = await syncManager.getPendingCount('auth');
    const pendingMeal = await syncManager.getPendingCount('meal');
    
    setSyncStatus({
      isOnline: status.isOnline,
      isSyncing: status.isProcessing,
      pendingItems: status.queueStats.pending,
      pendingAuth,
      pendingMeal,
    });
  };
  
  checkSync();
  const interval = setInterval(checkSync, 5000);
  return () => clearInterval(interval);
}, []);

// In UI
{syncStatus?.pendingItems > 0 && (
  <Badge count={syncStatus.pendingItems}>
    {syncStatus.isSyncing ? 'Syncing...' : 'Pending sync'}
  </Badge>
)}
```

---

### 6. ✅ DO: Handle Network Changes

SyncManager already handles this automatically, but you can add UI feedback:

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
      // Non-blocking
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

### Example 2: Meal Submission (from cartContext)

```typescript
const submitAnalysis = async () => {
  try {
    // 1. Prepare data
    const mealData = await MealOfflineAPI.prepareScanForSync();
    
    // 2. Calculate nutrition OFFLINE (instant result)
    const nutrition = await MealOfflineAPI.calculateMealNutrition(
      mealData.items,
      mealData.ricePortion
    );
    
    // 3. Create local scan (available immediately)
    const localScan = {
      id: `local_${Date.now()}`,
      foodName: 'My Meal',
      calories: nutrition.calories,
      protein: nutrition.protein,
      // ... other fields
    };
    
    // 4. Save to local history
    await MealOfflineAPI.saveCompletedScan(localScan);
    
    // 5. Queue untuk sync (background)
    try {
      const syncManager = getSyncManager();
      await syncManager.sync('meal', mealData);
      console.log('Meal queued for server sync');
    } catch (syncErr) {
      console.warn('Failed to queue, will retry later:', syncErr);
      // Local scan sudah tersimpan - user can see it
    }
    
    // 6. Clear cart
    await MealOfflineAPI.clearCart();
    
    return {
      success: true,
      scan: localScan,
      message: 'Analisis berhasil (offline)',
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

### Example 3: Sync Status Component

```typescript
function SyncStatusBadge() {
  const [status, setStatus] = useState({
    isOnline: false,
    isSyncing: false,
    pending: 0,
  });
  
  useEffect(() => {
    const updateStatus = async () => {
      try {
        const syncManager = getSyncManager();
        const globalStatus = await syncManager.getStatus();
        
        setStatus({
          isOnline: globalStatus.isOnline,
          isSyncing: globalStatus.isProcessing,
          pending: globalStatus.queueStats.pending,
        });
      } catch (err) {
        console.error('Failed to get sync status:', err);
      }
    };
    
    updateStatus();
    const interval = setInterval(updateStatus, 3000);
    
    return () => clearInterval(interval);
  }, []);
  
  if (!status.isOnline && status.pending === 0) {
    return null; // Nothing to show
  }
  
  return (
    <View style={styles.badge}>
      {!status.isOnline && (
        <Icon name="wifi-off" />
      )}
      
      {status.isSyncing && (
        <ActivityIndicator />
      )}
      
      {status.pending > 0 && (
        <Text>{status.pending} pending</Text>
      )}
    </View>
  );
}
```

---

### Example 4: Manual Sync Trigger

```typescript
function SyncButton() {
  const [loading, setLoading] = useState(false);
  
  const handleSync = async () => {
    setLoading(true);
    try {
      const syncManager = getSyncManager();
      const result = await syncManager.syncAll();
      
      if (result.success) {
        showToast(`Synced ${result.processedCount} items successfully`);
      } else {
        showToast(`Sync completed with ${result.failedCount} errors`);
      }
    } catch (err) {
      showToast('Sync failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Button 
      onPress={handleSync} 
      loading={loading}
      disabled={loading}
    >
      {loading ? 'Syncing...' : 'Sync Now'}
    </Button>
  );
}
```

---

## 🔧 Integration Guide

### Step 1: Create Sync Strategy

```typescript
// authSyncStrategy.ts
import { SyncStrategy, SyncPayload } from '@/services/sync/syncManager';
import authOnlineAPI from '@/services/auth/authOnlineAPI';
import authOfflineAPI from '@/services/auth/authOfflineAPI';

class AuthSyncStrategy implements SyncStrategy {
  async prepare(data: any): Promise<SyncPayload> {
    return {
      id: `auth_${Date.now()}`,
      type: 'auth',
      data,
      priority: 1, // High priority
      retries: 0,
      maxRetries: 5,
      status: 'pending',
      createdAt: new Date().toISOString(),
      lastAttemptAt: null,
      error: null,
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
      
      case 'deleteAccount':
        return await authOnlineAPI.deleteAccount(userId, token);
      
      case 'logout':
        return await authOnlineAPI.logout(token);
      
      default:
        throw new Error(`Unknown auth action: ${action}`);
    }
  }

  async onSuccess(result: any, payload: SyncPayload): Promise<void> {
    console.log(`[AuthSync] ✓ Success: ${payload.data.action}`);
    
    // Update local data dengan server response
    if (result.user) {
      await authOfflineAPI.saveUserFromServer(result.user);
    }
    
    // Clear pending marker jika ada
    if (payload.data.userId) {
      await authOfflineAPI.clearPendingUpdate(payload.data.userId);
    }
  }

  async onFailure(error: Error, payload: SyncPayload): Promise<void> {
    console.error(`[AuthSync] ✗ Failed: ${payload.data.action}`, error);
    
    // Mark as pending jika perlu retry
    if (payload.data.userId && payload.retries < payload.maxRetries) {
      await authOfflineAPI.markPendingUpdate(
        payload.data.userId,
        payload.data.userData
      );
    }
  }

  validate(data: any): boolean {
    if (!data.action) {
      console.error('[AuthSync] Missing action');
      return false;
    }
    
    // Validate based on action
    switch (data.action) {
      case 'updateProfile':
        return !!(data.userId && data.userData && data.token);
      
      case 'changePassword':
        return !!(data.userId && data.oldPassword && data.newPassword && data.token);
      
      case 'deleteAccount':
        return !!(data.userId && data.token);
      
      case 'logout':
        return !!data.token;
      
      case 'register':
        return !!data.registerData;
      
      default:
        return false;
    }
  }

  getPriority(): number {
    return 1; // High priority
  }

  getMaxRetries(): number {
    return 5;
  }
}

export default new AuthSyncStrategy();
```

---

### Step 2: Register Strategy

```typescript
// In app initialization (App.tsx or index.ts)
import { getSyncManager } from '@/services/sync/syncManager';
import { getSyncQueue } from '@/services/sync/syncQueue';
import authSyncStrategy from '@/services/sync/strategies/authSyncStrategy';
import mealSyncStrategy from '@/services/sync/strategies/mealSyncStrategy';

async function initializeSync() {
  try {
    // Get instances
    const syncQueue = getSyncQueue();
    const syncManager = getSyncManager(syncQueue);
    
    // Register strategies
    syncManager.registerStrategy('auth', authSyncStrategy);
    syncManager.registerStrategy('meal', mealSyncStrategy);
    
    console.log('Sync initialized successfully');
  } catch (error) {
    console.error('Failed to initialize sync:', error);
  }
}

// Call during app startup
initializeSync();
```

---

### Step 3: Use in Service

```typescript
// authService.ts
async updateUser(userId: string, userData: UpdateUserRequest, token: string) {
  // 1. Update locally
  const authData = await authOfflineAPI.updateUser(userId, userData, token);
  
  // 2. Queue for sync
  const syncManager = getSyncManager();
  await syncManager.sync('auth', {
    action: 'updateProfile',
    userId,
    userData,
    token,
  });
  
  // 3. Return local result
  return authData;
}
```

---

## 🐛 Troubleshooting

### Issue 1: Items Not Syncing

**Symptoms:** Items stay in queue, never sync.

**Diagnosis:**
```typescript
const status = await syncManager.getStatus();
console.log('Online:', status.isOnline);
console.log('Processing:', status.isProcessing);
console.log('Queue:', status.queueStats);
```

**Solutions:**
- Check network connection
- Check if strategy registered: `syncManager.hasStrategy('auth')`
- Check if paused: `syncManager.resumeSync()`
- Force sync: `syncManager.forceSync()`

---

### Issue 2: Sync Keeps Failing

**Symptoms:** Items retry but always fail.

**Diagnosis:**
```typescript
const diagnostics = await syncManager.exportDiagnostics();
console.log(diagnostics);
```

**Solutions:**
- Check strategy validation: Is data valid?
- Check server: Is API working?
- Check token: Is it expired?
- Increase max retries in strategy
- Check error logs in onFailure()

---

### Issue 3: Memory Issues

**Symptoms:** App slow, high memory usage.

**Solutions:**
- Use batch sync: `syncManager.syncBatch(5)` instead of `syncAll()`
- Clear failed items: `syncManager.removeFailed()`
- Implement pagination in strategy
- Reduce queue size regularly

---

### Issue 4: Duplicate Syncs

**Symptoms:** Same data synced multiple times.

**Solutions:**
- Check validation logic - prevent duplicate adds
- Implement idempotency in server API
- Clear queue after successful sync
- Use unique IDs in prepare()

---

## 📊 Performance Tips

### 1. Batch Processing

```typescript
// Instead of:
for (const item of items) {
  await syncManager.sync('meal', item);
}

// Use:
const batch = items.map(item => ({ type: 'meal', data: item }));
for (const item of batch) {
  syncManager.sync(item.type, item.data);
}
await syncManager.syncBatch(10);
```

---

### 2. Priority Management

```typescript
// High priority items sync first
class CriticalSyncStrategy implements SyncStrategy {
  getPriority(): number {
    return 1; // Will be processed before priority 2-5
  }
}
```

---

### 3. Network-Aware Syncing

```typescript
const status = await syncManager.getStatus();

if (status.isOnline && !status.isProcessing) {
  // Good time to sync
  await syncManager.syncBatch(5);
}
```

---

### 4. Periodic Cleanup

```typescript
// Run daily
setInterval(async () => {
  const removed = await syncManager.removeFailed();
  console.log(`Cleaned ${removed} failed items`);
}, 24 * 60 * 60 * 1000);
```

---

## 📝 Summary

### ✅ When to Use SyncManager

1. **Any background sync operation**
2. **Offline-first data updates**
3. **Network-dependent operations**
4. **Retry-able operations**

### ❌ When NOT to Use SyncManager

1. **Read operations** (use offline API directly)
2. **Real-time operations** (use WebSocket)
3. **One-time critical operations** (use direct API call)

### 🎯 Golden Rules

1. **Write local first** - Always save locally before queueing
2. **Non-blocking sync** - Never block user on sync errors
3. **Validate early** - Check data before adding to queue
4. **Handle failures** - Implement proper error handling
5. **Monitor status** - Show sync status to users

---

## 🔗 Related Documentation

- SyncQueue API
- Strategy Pattern
- Offline-First Architecture
- Network Detection Guide

---

**Version:** 1.0  
**Last Updated:** January 2025  
**Maintainer:** Engineering Team