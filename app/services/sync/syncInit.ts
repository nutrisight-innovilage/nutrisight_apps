/**
 * syncInit.ts
 * ---------------------------------------------------------------------------
 * ✅ Module-level SyncManager initialization.
 * 
 * WHY THIS FILE EXISTS:
 * MenuService is a singleton created at import time (module-level).
 * Its constructor calls getSyncManager(). If SyncManager doesn't exist yet,
 * it throws. ES module imports are hoisted, so we can't initialize
 * SyncManager "before" other imports in the same file.
 * 
 * SOLUTION: This file creates & configures SyncManager at module scope.
 * By importing this file FIRST in _layout.tsx, it executes before
 * menuContext.tsx (which triggers menuService.ts → new MenuService()).
 * 
 * USAGE in _layout.tsx:
 *   import '@/app/services/sync/syncInit';       // ← MUST be first
 *   import { MenuProvider } from '...';           // ← now safe
 * 
 * WHAT'S SYNC vs ASYNC:
 * • Synchronous (runs here): Create SyncQueue, create SyncManager, register strategies
 * • Async (runs later in SyncInitializer component): syncQueue.initialize() 
 *   (loads persisted queue from AsyncStorage), initial batch processing
 * ---------------------------------------------------------------------------
 */

import { getSyncManager } from '@/app/services/sync/syncManager';
import { getSyncQueue } from '@/app/services/sync/syncQueue';
import authSyncStrategy from '@/app/services/auth/authSyncStrategy'
import { mealSyncStrategy } from '@/app/services/meal/mealSyncStrategy';
import menuSyncStrategy from '@/app/services/menu/menuSyncStrategy';
import { photoSyncStrategy } from '@/app/services/camera/photoSyncStrategy';

// ---------------------------------------------------------------------------
// Create instances (synchronous — no AsyncStorage access yet)
// ---------------------------------------------------------------------------

const syncQueue = getSyncQueue();
const syncManager = getSyncManager(syncQueue);

// ---------------------------------------------------------------------------
// Register all strategies immediately
// ---------------------------------------------------------------------------

syncManager.registerStrategy('auth', authSyncStrategy);
syncManager.registerStrategy('meal', mealSyncStrategy);
syncManager.registerStrategy('menu', menuSyncStrategy);
syncManager.registerStrategy('photo', photoSyncStrategy);

console.log('[syncInit] ✓ SyncManager created & strategies registered');

// ---------------------------------------------------------------------------
// Export for use in _layout.tsx SyncInitializer
// ---------------------------------------------------------------------------

export { syncQueue, syncManager };