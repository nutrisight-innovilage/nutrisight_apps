import { View, Text, Pressable, TouchableOpacity, ActivityIndicator } from 'react-native'
import React, { useEffect, useState } from 'react'
import { Tabs, usePathname, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import TabItem from '@/app/components/tabItem'
import { useAuth } from '@/app/contexts/authContext';
import NetInfo from '@react-native-community/netinfo';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';
import { getSyncManager, GlobalSyncStatus } from '@/app/services/sync/syncManager';

// ============================================================================
// Animated Components
// ============================================================================

function PulsingDot({ color }: { color: string }) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withSpring(1.2, { damping: 2 }),
        withSpring(1, { damping: 2 })
      ),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <View className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
    </Animated.View>
  );
}

function SyncStatusBadge() {
  const [syncStatus, setSyncStatus] = useState<{
    isOnline: boolean;
    isSyncing: boolean;
    totalPending: number;
    failedCount: number;
  } | null>(null);

  const scale = useSharedValue(1);

  useEffect(() => {
    const updateStatus = async () => {
      try {
        const syncManager = getSyncManager();
        const status: GlobalSyncStatus = await syncManager.getStatus();
        
        setSyncStatus({
          isOnline: status.isOnline,
          isSyncing: status.isProcessing,
          totalPending: status.queueStats.totalItems,
          failedCount: status.queueStats.failedItems,
        });
      } catch (err) {
        console.error('[SyncBadge] Failed to get status:', err);
      }
    };

    updateStatus();
    const interval = setInterval(updateStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handlePressIn = () => {
    scale.value = withSpring(0.95);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Don't show if offline with no pending items
  if (!syncStatus || (!syncStatus.isOnline && syncStatus.totalPending === 0)) {
    return null;
  }

  const getStatusColor = () => {
    if (!syncStatus.isOnline) return '#ffa726';
    if (syncStatus.failedCount > 0) return '#ef4444';
    if (syncStatus.totalPending > 0) return '#1F78FF';
    return '#37B37E';
  };

  const getStatusText = () => {
    if (syncStatus.isSyncing) return 'Syncing';
    if (!syncStatus.isOnline) return `${syncStatus.totalPending}`;
    if (syncStatus.failedCount > 0) return `${syncStatus.failedCount}`;
    if (syncStatus.totalPending > 0) return `${syncStatus.totalPending}`;
    return '✓';
  };

  return (
    <View className="absolute top-3 right-4 z-50">
      <TouchableOpacity
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <Animated.View 
          style={[animatedStyle, { backgroundColor: getStatusColor() }]}
          className="px-2 py-1 rounded-full flex-row items-center gap-1.5"
        >
          <PulsingDot color="white" />
          
          {syncStatus.isSyncing && (
            <ActivityIndicator size="small" color="white" />
          )}
          
          <Text className="text-text-inverse text-xs font-semibold">
            {getStatusText()}
          </Text>
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
}

// ============================================================================
// Network Auto-Sync Listener
// ============================================================================

function NetworkAutoSync() {
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const isConnected = state.isConnected ?? false;
      
      if (isConnected) {
        setTimeout(async () => {
          try {
            const syncManager = getSyncManager();
            const status = await syncManager.getStatus();
            
            if (status.queueStats.totalItems > 0) {
              console.log('[Tabs] Auto-sync starting...');
              const result = await syncManager.syncBatch(5);
              console.log(
                `[Tabs] Auto-sync: ${result.processedCount} synced, ` +
                `${result.failedCount} failed`
              );
            }
          } catch (err) {
            console.error('[Tabs] Auto-sync failed:', err);
          }
        }, 1000);
      }
    });

    return () => unsubscribe();
  }, []);

  return null;
}

// ============================================================================
// Main Tabs Layout
// ============================================================================

const _layout = () => {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      console.log('[Tabs] Not authenticated, redirecting to login');
      router.replace('/(auth)/login');
    }
  }, [isAuthenticated]);

  // Show loading if not authenticated
  if (!isAuthenticated) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#37B37E" />
      </View>
    );
  }

  return (
    <>
      {/* Network Auto-Sync */}
      <NetworkAutoSync />

      {/* Sync Status Badge - Floating on top */}
      <SyncStatusBadge />

      {/* Tabs Navigation */}
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarHideOnKeyboard: true,
          tabBarStyle: {
            backgroundColor: "#ffffff",
            borderTopWidth: 0,
            elevation: 0,
            shadowOpacity: 0,
            height: 70 + insets.bottom,
            paddingBottom: insets.bottom,
            paddingTop: 10,
          },
        }}
      >
        <Tabs.Screen
          name='index'
          options={{
            title: "beranda",
            tabBarButton: (props) => {
              const focused = pathname === '/' || pathname === '/(tabs)';
              return (
                <Pressable
                  onPress={props.onPress}
                  className='flex-1 items-center justify-center'
                >
                  <TabItem label="Beranda" focused={focused}>
                    <Ionicons 
                      name={focused ? "home-sharp" : "home-outline"} 
                      size={28} 
                      color={focused ? "#37B37E" : "#525252"} 
                    />
                  </TabItem>
                </Pressable>
              );
            }
          }}
        />
        <Tabs.Screen
          name='makan'
          options={{
            title: "makan",
            tabBarButton: (props) => {
              const focused = pathname === '/makan' || pathname === '/(tabs)/makan';
              return (
                <Pressable
                  onPress={props.onPress}
                  className='flex-1 items-center justify-center'
                >
                  <TabItem label="Makanan" focused={focused}>
                    <Ionicons 
                      name={focused ? "fast-food-sharp" : "fast-food-outline"} 
                      size={28} 
                      color={focused ? "#37B37E" : "#525252"} 
                    />
                  </TabItem>
                </Pressable>
              );
            }
          }}
        />
        <Tabs.Screen
          name='pengaturan'
          options={{
            title: "pengaturan",
            tabBarButton: (props) => {
              const focused = pathname === '/pengaturan' || pathname === '/(tabs)/pengaturan';
              return (
                <Pressable
                  onPress={props.onPress}
                  className='flex-1 items-center justify-center'
                >
                  <TabItem label="Pengaturan" focused={focused}>
                    <Ionicons 
                      name={focused ? "settings-sharp" : "settings-outline"} 
                      size={28} 
                      color={focused ? "#37B37E" : "#525252"} 
                    />
                  </TabItem>
                </Pressable>
              );
            }
          }}
        />
      </Tabs>
    </>
  );
}

export default _layout