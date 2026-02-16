/**
 * SyncStatusScreen.tsx
 * ---------------------------------------------------------------------------
 * Sync status display with improved UI/UX and animations
 * ---------------------------------------------------------------------------
 */

import React, { useEffect, useState } from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  Layout,
} from 'react-native-reanimated';
import CustomHeader from '@/app/components/customHeader';
import { getSyncManager, GlobalSyncStatus } from '@/app/services/sync/syncManager';
import {
  PulsingDot,
  StatCard,
  TypeRow,
  PriorityRow,
  ActionButton,
  ConnectionStatusCard,
  QueueStatsSection,
  ItemsByTypeSection,
  ItemsByPrioritySection,
  LastSyncSection,
  ActiveStrategySection,
  InfoCard,
  EmptyState,
} from '@/app/components/SyncStatusComponents';
import LoadingScreen from '@/app/components/loadingScreen';

// ============================================================================
// Main Component
// ============================================================================

export default function SyncStatusScreen() {
  const [status, setStatus] = useState<GlobalSyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Load status
  const loadStatus = async () => {
    try {
      const syncManager = getSyncManager();
      const currentStatus = await syncManager.getStatus();
      setStatus(currentStatus);
    } catch (err) {
      console.error('[SyncStatus] Failed to load:', err);
      Alert.alert('Error', 'Failed to load sync status');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  // Manual sync
  const handleSync = async () => {
    if (syncing) return;

    try {
      setSyncing(true);
      const syncManager = getSyncManager();
      
      Alert.alert(
        'Start Sync',
        `Sync ${status?.queueStats.totalItems || 0} pending items?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Sync',
            onPress: async () => {
              const result = await syncManager.syncAll();
              
              Alert.alert(
                'Sync Complete',
                `✓ Processed: ${result.processedCount}\n✗ Failed: ${result.failedCount}`,
                [{ text: 'OK', onPress: loadStatus }]
              );
            },
          },
        ]
      );
    } catch (err) {
      Alert.alert('Error', 'Failed to start sync');
    } finally {
      setSyncing(false);
    }
  };

  // Clear failed items
  const handleClearFailed = async () => {
    try {
      Alert.alert(
        'Clear Failed Items',
        'Remove all items that exceeded max retries?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Clear',
            style: 'destructive',
            onPress: async () => {
              const syncManager = getSyncManager();
              const removed = await syncManager.removeFailed();
              Alert.alert('Success', `Removed ${removed} failed items`);
              loadStatus();
            },
          },
        ]
      );
    } catch (err) {
      Alert.alert('Error', 'Failed to clear failed items');
    }
  };

  // Clear all items
  const handleClearAll = async () => {
    try {
      Alert.alert(
        'Clear All Items',
        '⚠️ Remove ALL pending items from queue?\nThis cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Clear All',
            style: 'destructive',
            onPress: async () => {
              const syncManager = getSyncManager();
              await syncManager.clearAll();
              Alert.alert('Success', 'All items cleared');
              loadStatus();
            },
          },
        ]
      );
    } catch (err) {
      Alert.alert('Error', 'Failed to clear items');
    }
  };

  // Export diagnostics
  const handleExportDiagnostics = async () => {
    try {
      const syncManager = getSyncManager();
      const diagnostics = await syncManager.exportDiagnostics();
      
      console.log('=== SYNC DIAGNOSTICS ===');
      console.log(JSON.stringify(diagnostics, null, 2));
      
      Alert.alert(
        'Diagnostics Exported',
        'Check console logs for full diagnostics data'
      );
    } catch (err) {
      Alert.alert('Error', 'Failed to export diagnostics');
    }
  };

  if (loading) {
    return <LoadingScreen message="Loading sync status..." />
  }

  if (!status) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-6">
        <View className="bg-surface rounded-2xl p-8 items-center shadow-sm border border-border/30">
          <Text className="text-5xl mb-4">⚠️</Text>
          <Text className="text-lg font-semibold text-text-primary mb-2">
            Failed to Load
          </Text>
          <Text className="text-sm text-text-secondary text-center mb-6">
            Unable to load sync status. Please try again.
          </Text>
          <TouchableOpacity 
            className="bg-primary px-8 py-3.5 rounded-xl active:opacity-80"
            onPress={loadStatus}
          >
            <Text className="text-base text-text-inverse font-semibold">
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const { queueStats } = status;
  const hasItems = queueStats.totalItems > 0;
  const hasFailed = queueStats.failedItems > 0;

  return (
    <ScrollView
      className="flex-1 bg-background"
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl 
          refreshing={refreshing} 
          onRefresh={() => {
            setRefreshing(true);
            loadStatus();
          }}
          tintColor="#37B37E"
        />
      }
    >
      {/* Header */}
      <View >
        <Animated.View entering={FadeInDown.duration(500)}>
          <CustomHeader 
            heading="Sync Status" 
            subHeading='Monitor and manage data synchronization' 
          />
        </Animated.View>
      </View>

      {/* Connection Status Card */}
      <View className="px-6 pb-5">
        <Animated.View entering={FadeInDown.duration(500).delay(50)}>
          <ConnectionStatusCard 
            status={status}
            hasItems={hasItems}
          />
        </Animated.View>
      </View>

      {/* Content Section */}
      {hasItems ? (
        <>
          {/* Queue Statistics */}
          <View className="px-6 pb-5">
            <Animated.View entering={FadeInDown.duration(500).delay(100)}>
              <QueueStatsSection queueStats={queueStats} />
            </Animated.View>
          </View>

          {/* Items by Type */}
          <View className="px-6 pb-5">
            <Animated.View entering={FadeInDown.duration(500).delay(150)}>
              <ItemsByTypeSection queueStats={queueStats} />
            </Animated.View>
          </View>

          {/* Items by Priority */}
          <View className="px-6 pb-5">
            <Animated.View entering={FadeInDown.duration(500).delay(200)}>
              <ItemsByPrioritySection queueStats={queueStats} />
            </Animated.View>
          </View>
        </>
      ) : (
        /* Empty State */
        <View className="px-6 py-12">
          <Animated.View entering={FadeIn.duration(600).delay(100)}>
            <EmptyState />
          </Animated.View>
        </View>
      )}

      {/* Last Sync Time */}
      {status.lastSyncTime && (
        <View className="px-6 pb-5">
          <Animated.View entering={FadeInDown.duration(500).delay(250)}>
            <LastSyncSection lastSyncTime={status.lastSyncTime} />
          </Animated.View>
        </View>
      )}

      {/* Active Strategy */}
      {status.activeStrategy && (
        <View className="px-6 pb-5">
          <Animated.View entering={FadeInDown.duration(500).delay(300)}>
            <ActiveStrategySection activeStrategy={status.activeStrategy} />
          </Animated.View>
        </View>
      )}

      {/* Actions Section */}
      <View className="px-6 pb-5">
        <Animated.View entering={FadeInDown.duration(500).delay(350)}>
          <View className="bg-surface rounded-2xl p-5 shadow-sm border border-border/20">
            <Text className="text-lg font-bold text-text-primary mb-4">
              Quick Actions
            </Text>
            <View className="gap-3">
              <ActionButton
                label="Sync Now"
                icon="↻"
                onPress={handleSync}
                variant="primary"
                disabled={syncing || !hasItems}
                loading={syncing}
              />
              <ActionButton
                label="Clear Failed Items"
                icon="🗑"
                onPress={handleClearFailed}
                variant="warning"
                disabled={!hasFailed}
              />
              <ActionButton
                label="Clear All Items"
                icon="⚠️"
                onPress={handleClearAll}
                variant="error"
                disabled={!hasItems}
              />
              <ActionButton
                label="Export Diagnostics"
                icon="📊"
                onPress={handleExportDiagnostics}
                variant="secondary"
              />
            </View>
          </View>
        </Animated.View>
      </View>

      {/* Info Card */}
      <View className="px-6 pb-8">
        <Animated.View entering={FadeInUp.duration(500).delay(400)}>
          <InfoCard />
        </Animated.View>
      </View>
    </ScrollView>
  );
}