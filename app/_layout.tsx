import "./globals.css"
import 'react-native-gesture-handler';
import 'react-native-svg';
import { Slot } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated';

// Providers
import { AuthProvider } from '@/app/contexts/authContext';
import { MenuProvider } from './contexts/menuContext';
import { CartProvider } from './contexts/cartContext';

// Sync System
import { getSyncManager } from '@/app/services/sync/syncManager';
import { getSyncQueue } from '@/app/services/sync/syncQueue';
import authSyncStrategy from '@/app/services/sync/syncStrategy/authSyncStrategy';
import { mealSyncStrategy } from '@/app/services/sync/syncStrategy/mealSyncStrategy';
import menuSyncStrategy from '@/app/services/sync/syncStrategy/menuSyncStrategy';

// ============================================================================
// Sync Initialization Component
// ============================================================================

function SyncInitializer({ onReady }: { onReady: () => void }) {
  const [initStatus, setInitStatus] = useState<{
    step: string;
    error?: string;
  }>({
    step: 'Initializing sync system...',
  });

  const progress = useSharedValue(0);
  const rotation = useSharedValue(0);

  useEffect(() => {
    // Spinner animation
    rotation.value = withRepeat(
      withTiming(360, { duration: 1000 }),
      -1,
      false
    );
  }, []);

  useEffect(() => {
    const initializeSync = async () => {
      try {
        console.log('[App] Starting sync initialization...');
        setInitStatus({ step: 'Initializing sync queue...' });
        progress.value = withSpring(0.3);

        const syncQueue = getSyncQueue();
        await syncQueue.initialize();
        console.log('[App] ✓ SyncQueue initialized');

        setInitStatus({ step: 'Initializing sync manager...' });
        progress.value = withSpring(0.6);

        const syncManager = getSyncManager(syncQueue);
        console.log('[App] ✓ SyncManager initialized');

        setInitStatus({ step: 'Registering sync strategies...' });
        progress.value = withSpring(0.8);

        syncManager.registerStrategy('auth', authSyncStrategy);
        syncManager.registerStrategy('meal', mealSyncStrategy);
        syncManager.registerStrategy('menu', menuSyncStrategy);
        console.log('[App] ✓ Registered all syncStrategy');

        setInitStatus({ step: 'Checking queue...' });
        progress.value = withSpring(0.9);

        const status = await syncManager.getStatus();
        console.log('[App] Queue status:', {
          total: status.queueStats.totalItems,
          failed: status.queueStats.failedItems,
          online: status.isOnline,
        });

        if (status.isOnline && status.queueStats.totalItems > 0) {
          setInitStatus({ step: `Syncing ${status.queueStats.totalItems} items...` });
          const result = await syncManager.syncBatch(10);
          console.log(
            `[App] Initial sync: ${result.processedCount} synced, ${result.failedCount} failed`
          );
        }

        console.log('[App] ✓ Sync system ready');
        setInitStatus({ step: 'Ready!' });
        progress.value = withSpring(1);
        
        setTimeout(() => onReady(), 500);

      } catch (error) {
        console.error('[App] Sync initialization failed:', error);
        setInitStatus({ 
          step: 'Initialization failed', 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
        
        setTimeout(() => onReady(), 2000);
      }
    };

    initializeSync();
  }, [onReady]);

  const spinnerStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const progressStyle = useAnimatedStyle(() => ({
    width: `${interpolate(progress.value, [0, 1], [0, 100])}%`,
  }));

  return (
    <View className="flex-1 bg-background items-center justify-center px-6">
      <View className="items-center">
        <Animated.View entering={FadeIn.duration(400)}>
          {/* Animated Spinner */}
          <Animated.View style={spinnerStyle}>
            <View className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary" />
          </Animated.View>

          {/* Progress Bar */}
          <View className="w-64 h-2 rounded-full mt-6 overflow-hidden bg-primary/20">
            <Animated.View 
              style={progressStyle}
              className="h-full bg-primary"
            />
          </View>

          {/* Status Text */}
          <View className="mt-4">
            <Text className="text-text-secondary text-center">
              {initStatus.step}
            </Text>
          </View>

          {/* Error Text */}
          {initStatus.error && (
            <View className="mt-2">
              <Animated.View entering={FadeIn.duration(300).delay(200)}>
                <Text className="text-error text-sm text-center">
                  {initStatus.error}
                </Text>
              </Animated.View>
            </View>
          )}
        </Animated.View>
      </View>
    </View>
  );
}

// ============================================================================
// Root Layout - Providers & Sync Init
// ============================================================================

function AppContent() {
  const [syncReady, setSyncReady] = useState(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      try {
        const syncManager = getSyncManager();
        syncManager.cleanup();
        console.log('[App] Sync system cleaned up');
      } catch (err) {
        // Ignore if not initialized
      }
    };
  }, []);

  if (!syncReady) {
    return <SyncInitializer onReady={() => setSyncReady(true)} />;
  }

  // Render child routes
  return <Slot />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <MenuProvider>
        <CartProvider>
          <AppContent />
        </CartProvider>
      </MenuProvider>
    </AuthProvider>
  );
}