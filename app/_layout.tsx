import "./globals.css"
import 'react-native-gesture-handler';
import 'react-native-svg';
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
import { photoSyncStrategy } from '@/app/services/sync/syncStrategy/photoSyncStrategy'; // ✅ NEW

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
        progress.value = withSpring(0.25, { damping: 15, stiffness: 100 });

        const syncQueue = getSyncQueue();
        await syncQueue.initialize();
        console.log('[App] ✓ SyncQueue initialized');

        setInitStatus({ step: 'Initializing sync manager...' });
        progress.value = withSpring(0.5, { damping: 15, stiffness: 100 });

        const syncManager = getSyncManager(syncQueue);
        console.log('[App] ✓ SyncManager initialized');

        setInitStatus({ step: 'Registering sync strategies...' });
        progress.value = withSpring(0.7, { damping: 15, stiffness: 100 });

        // ✅ Register all sync strategies
        syncManager.registerStrategy('auth', authSyncStrategy);
        syncManager.registerStrategy('meal', mealSyncStrategy);
        syncManager.registerStrategy('menu', menuSyncStrategy);
        syncManager.registerStrategy('photo', photoSyncStrategy); // ✅ NEW: Photo sync strategy
        
        console.log('[App] ✓ Registered all sync strategies:', [
          'auth',
          'meal', 
          'menu',
          'photo', // ✅ NEW
        ]);

        setInitStatus({ step: 'Checking queue...' });
        progress.value = withSpring(0.85, { damping: 15, stiffness: 100 });

        const status = await syncManager.getStatus();
        console.log('[App] Queue status:', {
          total: status.queueStats.totalItems,
          pending: status.queueStats.totalItems - status.queueStats.failedItems,
          failed: status.queueStats.failedItems,
          online: status.isOnline,
        });

        // Initial sync if online and has queued items
        if (status.isOnline && status.queueStats.totalItems > 0) {
          setInitStatus({ 
            step: `Syncing ${status.queueStats.totalItems} pending items...` 
          });
          
          const result = await syncManager.syncBatch(10);
          
          console.log('[App] Initial sync completed:', {
            processed: result.processedCount,
            succeeded: result.processedCount - result.failedCount,
            failed: result.failedCount,
          });
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
        
        // Continue anyway after 2s
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
      {/* Main Spinner Container with Glow Effect */}
      <View className="relative items-center justify-center mb-8">
        {/* Outer Glow Ring */}
        <Animated.View 
          style={spinnerStyle}
          className="absolute w-24 h-24 rounded-full border-2 border-emerald-200/40"
        />
        
        {/* Middle Ring */}
        <Animated.View 
          style={[spinnerStyle, { transform: [{ rotate: '-45deg' }] }]}
          className="absolute w-20 h-20 rounded-full border-3 border-emerald-300/50"
        />
        
        {/* Main Spinner */}
        <Animated.View 
          style={spinnerStyle}
          className="w-16 h-16 rounded-full border-4 border-gray-200 border-t-emerald-500 border-r-emerald-400"
        />
        
        {/* Center Icon - Sync Symbol */}
        <View className="absolute bg-emerald-500 rounded-full p-3">
          <Text className="text-white text-xl font-bold">🔄</Text>
        </View>
      </View>

      {/* Progress Section */}
      <View className="w-full space-y-3">
        {/* Progress Bar */}
        <View className="w-full h-2.5 rounded-full overflow-hidden bg-gray-100 shadow-inner">
          <Animated.View 
            style={progressStyle}
            className="h-full bg-emerald-500 rounded-full"
          />
        </View>

        {/* Status Text with Pulsing Dot */}
        <Animated.View 
          entering={FadeIn.duration(300)}
          className="flex-row items-center justify-center space-x-2"
        >
          <View className="w-1.5 h-1.5 rounded-full bg-emerald-500" 
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

        {/* Progress Info */}
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
// Root Layout - Providers & Sync Init
// ============================================================================

function AppContent() {
  const [syncReady, setSyncReady] = useState(false);

  // ✅ Wrap onReady callback dengan useCallback agar stabil
  const handleSyncReady = useCallback(() => {
    setSyncReady(true);
  }, []);

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
    return <SyncInitializer onReady={handleSyncReady} />;
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