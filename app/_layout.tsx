import "./globals.css"
import 'react-native-gesture-handler';
import 'react-native-svg';

// ============================================================================
// ✅ CRITICAL: Import syncInit FIRST — before any provider/context imports.
// This creates SyncManager at module level so MenuService's constructor
// can call getSyncManager() without throwing.
// ============================================================================
import { syncQueue, syncManager } from '@/app/services/sync/syncInit';

import { Slot } from 'expo-router';
import { useEffect, useState, useCallback } from 'react';
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

// Providers (imported AFTER syncInit — MenuService singleton is now safe)
import { AuthProvider } from '@/app/contexts/authContext';
import { MenuProvider } from '@/app/contexts/menuContext';
import { CartProvider } from '@/app/contexts/cartContext';

// ============================================================================
// Sync Initialization Component
// ============================================================================

/**
 * Handles the ASYNC part of sync setup:
 * - syncQueue.initialize() — load persisted queue from AsyncStorage
 * - Process pending items from previous session
 * - Show loading UI
 *
 * SyncManager + strategies are already created in syncInit.ts (module-level).
 */
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
    rotation.value = withRepeat(
      withTiming(360, { duration: 1000 }),
      -1,
      false
    );
  }, []);

  useEffect(() => {
    const initializeSync = async () => {
      try {
        console.log('[App] Starting async sync initialization...');

        // STEP 1: Load persisted queue from AsyncStorage
        setInitStatus({ step: 'Memuat data sinkronisasi...' });
        progress.value = withSpring(0.3, { damping: 15, stiffness: 100 });

        await syncQueue.initialize();
        console.log('[App] ✓ SyncQueue persistence loaded');

        // STEP 2: Check queue status
        setInitStatus({ step: 'Memeriksa antrian...' });
        progress.value = withSpring(0.6, { damping: 15, stiffness: 100 });

        const status = await syncManager.getStatus();
        console.log('[App] Queue status:', {
          total: status.queueStats.totalItems,
          pending: status.queueStats.totalItems - status.queueStats.failedItems,
          failed: status.queueStats.failedItems,
          online: status.isOnline,
        });

        // STEP 3: Process pending items from previous session
        if (status.isOnline && status.queueStats.totalItems > 0) {
          setInitStatus({
            step: `Menyinkronkan ${status.queueStats.totalItems} item...`,
          });
          progress.value = withSpring(0.8, { damping: 15, stiffness: 100 });

          const result = await syncManager.syncBatch(10);

          console.log('[App] Initial sync completed:', {
            processed: result.processedCount,
            succeeded: result.processedCount - result.failedCount,
            failed: result.failedCount,
          });
        }

        console.log('[App] ✓ Sync system ready');
        setInitStatus({ step: 'Siap!' });
        progress.value = withSpring(1);

        setTimeout(() => onReady(), 500);
      } catch (error) {
        console.error('[App] Sync initialization failed:', error);
        setInitStatus({
          step: 'Initialization failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        // Continue anyway — app works offline
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
    <View className="flex-1 bg-white items-center justify-center px-6">
      <Animated.View
        entering={FadeIn.duration(600)}
        className="items-center w-full max-w-sm"
      >
        {/* Main Spinner Container */}
        <View className="relative items-center justify-center mb-8">
          <Animated.View
            style={spinnerStyle}
            className="absolute w-24 h-24 rounded-full border-2 border-emerald-200/40"
          />
          <Animated.View
            style={[spinnerStyle, { transform: [{ rotate: '-45deg' }] }]}
            className="absolute w-20 h-20 rounded-full border-3 border-emerald-300/50"
          />
          <Animated.View
            style={spinnerStyle}
            className="w-16 h-16 rounded-full border-4 border-gray-200 border-t-emerald-500 border-r-emerald-400"
          />
          <View className="absolute bg-emerald-500 rounded-full p-3">
            <Text className="text-white text-xl font-bold">🔄</Text>
          </View>
        </View>

        {/* Progress Section */}
        <View className="w-full space-y-3">
          <View className="w-full h-2.5 rounded-full overflow-hidden bg-gray-100 shadow-inner">
            <Animated.View
              style={progressStyle}
              className="h-full bg-emerald-500 rounded-full"
            />
          </View>

          <Animated.View
            entering={FadeIn.duration(300)}
            className="flex-row items-center justify-center space-x-2"
          >
            <View
              className="w-1.5 h-1.5 rounded-full bg-emerald-500"
              style={{
                shadowColor: '#10b981',
                shadowOpacity: 0.8,
                shadowRadius: 4,
              }}
            />
            <Text className="text-gray-600 text-base font-medium">
              {initStatus.step}
            </Text>
          </Animated.View>

          <View className="flex-row justify-between px-1 mt-1">
            <Text className="text-xs text-gray-400">Mempersiapkan aplikasi</Text>
            <Text className="text-xs text-emerald-500 font-semibold">
              {Math.round(progress.value * 100)}%
            </Text>
          </View>
        </View>

        {/* Error Display */}
        {initStatus.error && (
          <Animated.View
            entering={FadeIn.duration(300).delay(200)}
            className="mt-6 w-full"
          >
            <View className="bg-red-50 border border-red-200 rounded-2xl p-4">
              <View className="flex-row items-start space-x-3">
                <View className="bg-red-100 rounded-full p-2">
                  <Text className="text-base">⚠️</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-red-800 font-semibold text-sm mb-1">
                    Terjadi Kesalahan
                  </Text>
                  <Text className="text-red-600 text-xs leading-5">
                    {initStatus.error}
                  </Text>
                  <Text className="text-red-500 text-xs mt-2 italic">
                    Aplikasi akan tetap dilanjutkan...
                  </Text>
                </View>
              </View>
            </View>
          </Animated.View>
        )}

        {/* App Info Footer */}
        {!initStatus.error && (
          <Animated.View
            entering={FadeIn.duration(400).delay(1500)}
            className="mt-12 w-full"
          >
            <View className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
              <Text className="text-emerald-700 text-xs text-center leading-5 font-medium">
                💡 Menyiapkan menu dan sinkronisasi data
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Brand Footer */}
        <Animated.View
          entering={FadeIn.duration(400).delay(2000)}
          className="absolute bottom-12"
        >
          <Text className="text-gray-400 text-xs">
            Powered by NutriTrack
          </Text>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

// ============================================================================
// Root Layout
// ============================================================================

function AppContent() {
  const [syncReady, setSyncReady] = useState(false);

  const handleSyncReady = useCallback(() => {
    setSyncReady(true);
  }, []);

  useEffect(() => {
    return () => {
      try {
        syncManager.cleanup();
        console.log('[App] Sync system cleaned up');
      } catch (err) {
        // Ignore
      }
    };
  }, []);

  if (!syncReady) {
    return <SyncInitializer onReady={handleSyncReady} />;
  }

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