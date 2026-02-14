/**
 * SyncStatusComponents.tsx
 * ---------------------------------------------------------------------------
 * Komponen-komponen view untuk Sync Status Screen (Improved)
 * ---------------------------------------------------------------------------
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { GlobalSyncStatus } from '@/app/services/sync/syncManager';

// ============================================================================
// Animated Components
// ============================================================================

export function PulsingDot({ color }: { color: string }) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.3, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View className="mr-2.5 items-center justify-center">
      <View 
        className="w-2.5 h-2.5 rounded-full" 
        style={{ backgroundColor: color }} 
      />
      <Animated.View 
        style={[animatedStyle, { backgroundColor: color }]}
        className="w-2.5 h-2.5 rounded-full absolute"
      />
    </View>
  );
}

// ============================================================================
// Section Components
// ============================================================================

interface ConnectionStatusCardProps {
  status: GlobalSyncStatus;
  hasItems: boolean;
}

export function ConnectionStatusCard({ status, hasItems }: ConnectionStatusCardProps) {
  return (
    <View className={`rounded-2xl p-5 border ${
      status.isOnline 
        ? 'bg-success/10 border-success/30' 
        : 'bg-warning/10 border-warning/30'
    }`}>
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          <PulsingDot color={status.isOnline ? '#37B37E' : '#ffa726'} />
          <View>
            <Text className="text-base font-bold text-text-primary">
              {status.isOnline ? 'Connected' : 'Offline Mode'}
            </Text>
            <Text className="text-xs text-text-secondary mt-0.5">
              {status.isOnline ? 'All systems operational' : 'Working offline'}
            </Text>
          </View>
        </View>
        
        {status.isProcessing && (
          <View className="flex-row items-center bg-success/20 px-3 py-1.5 rounded-full">
            <ActivityIndicator size="small" color="#37B37E" />
            <Text className="text-xs text-success font-semibold ml-2">Syncing</Text>
          </View>
        )}
      </View>

      {!status.isOnline && hasItems && (
        <View className="mt-3 pt-3 border-t border-warning/20">
          <Text className="text-sm text-text-secondary">
            💾 {status.queueStats.totalItems} items queued for sync
          </Text>
        </View>
      )}
    </View>
  );
}

interface QueueStatsSectionProps {
  queueStats: any;
}

export function QueueStatsSection({ queueStats }: QueueStatsSectionProps) {
  return (
    <View>
      <Text className="text-base font-bold text-text-primary mb-3">
        Queue Overview
      </Text>
      <View className="flex-row gap-3">
        <StatCard 
          label="Total Items" 
          value={queueStats.totalItems} 
          color="#1F78FF"
          icon="📊"
        />
        <StatCard 
          label="Failed" 
          value={queueStats.failedItems} 
          color="#ef4444"
          icon="⚠️"
        />
        <StatCard 
          label="Avg Retries" 
          value={queueStats.avgRetries.toFixed(1)} 
          color="#ffa726"
          icon="🔄"
        />
      </View>
    </View>
  );
}

export function ItemsByTypeSection({ queueStats }: QueueStatsSectionProps) {
  const items = Object.entries(queueStats.byType).filter(([_, count]) => count as number > 0);
  
  if (items.length === 0) return null;

  return (
    <View>
      <Text className="text-base font-bold text-text-primary mb-3">
        By Type
      </Text>
      <View className="bg-surface rounded-2xl border border-border/20 overflow-hidden">
        {items.map(([type, count], index) => (
          <TypeRow 
            key={type} 
            type={type} 
            count={count as number}
            isLast={index === items.length - 1}
          />
        ))}
      </View>
    </View>
  );
}

export function ItemsByPrioritySection({ queueStats }: QueueStatsSectionProps) {
  const items = Object.entries(queueStats.byPriority).filter(([_, count]) => count as number > 0);
  
  if (items.length === 0) return null;

  return (
    <View>
      <Text className="text-base font-bold text-text-primary mb-3">
        By Priority
      </Text>
      <View className="bg-surface rounded-2xl border border-border/20 overflow-hidden">
        {items.map(([priority, count], index) => (
          <PriorityRow 
            key={priority} 
            priority={parseInt(priority)} 
            count={count as number}
            isLast={index === items.length - 1}
          />
        ))}
      </View>
    </View>
  );
}

interface LastSyncSectionProps {
  lastSyncTime: string;
}

export function LastSyncSection({ lastSyncTime }: LastSyncSectionProps) {
  return (
    <View className="bg-surface rounded-2xl p-5 border border-border/20">
      <View className="flex-row items-center mb-2">
        <Text className="text-2xl mr-2">🕐</Text>
        <Text className="text-base font-bold text-text-primary">
          Last Sync
        </Text>
      </View>
      <Text className="text-sm text-text-primary font-medium ml-9">
        {new Date(lastSyncTime).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}
      </Text>
      <Text className="text-xs text-text-secondary ml-9 mt-1">
        {getTimeAgo(lastSyncTime)}
      </Text>
    </View>
  );
}

interface ActiveStrategySectionProps {
  activeStrategy: string;
}

export function ActiveStrategySection({ activeStrategy }: ActiveStrategySectionProps) {
  return (
    <View className="bg-info/10 rounded-2xl p-5 border border-info/30">
      <View className="flex-row items-center">
        <View className="bg-info/20 w-10 h-10 rounded-full items-center justify-center mr-3">
          <ActivityIndicator size="small" color="#1F78FF" />
        </View>
        <View className="flex-1">
          <Text className="text-xs text-info font-semibold uppercase tracking-wide mb-1">
            Active Strategy
          </Text>
          <Text className="text-sm text-text-primary font-medium">
            {activeStrategy}
          </Text>
        </View>
      </View>
    </View>
  );
}

export function InfoCard() {
  return (
    <View className="bg-info/10 rounded-2xl p-5 border border-info/20">
      <View className="flex-row items-start mb-3">
        <Text className="text-2xl mr-2">💡</Text>
        <Text className="text-base font-bold text-info flex-1">
          How Sync Works
        </Text>
      </View>
      <View className="space-y-2 ml-9">
        <View className="flex-row items-start">
          <Text className="text-info mr-2">•</Text>
          <Text className="text-sm text-text-secondary flex-1 leading-5">
            Data syncs automatically when you're online
          </Text>
        </View>
        <View className="flex-row items-start">
          <Text className="text-info mr-2">•</Text>
          <Text className="text-sm text-text-secondary flex-1 leading-5">
            Offline changes are queued and synced later
          </Text>
        </View>
        <View className="flex-row items-start">
          <Text className="text-info mr-2">•</Text>
          <Text className="text-sm text-text-secondary flex-1 leading-5">
            Failed items retry with delays: 1s → 5s → 15s → 60s
          </Text>
        </View>
      </View>
    </View>
  );
}

export function EmptyState() {
  return (
    <View className="items-center py-8">
      <View className="bg-success/10 w-20 h-20 rounded-full items-center justify-center mb-4">
        <Text className="text-4xl">✓</Text>
      </View>
      <Text className="text-xl font-bold text-text-primary mb-2">
        All Caught Up!
      </Text>
      <Text className="text-sm text-text-secondary text-center px-8">
        No pending items in the sync queue
      </Text>
    </View>
  );
}

// ============================================================================
// Card Components
// ============================================================================

interface StatCardProps {
  label: string;
  value: string | number;
  color: string;
  icon: string;
}

export function StatCard({ label, value, color, icon }: StatCardProps) {
  return (
    <View className="flex-1">
      <View 
        className="bg-surface rounded-2xl p-4 border-l-4 border border-border/20 min-h-[90px]"
        style={{ borderLeftColor: color }}
      >
        <Text className="text-xl mb-1">{icon}</Text>
        <Text className="text-2xl font-bold text-text-primary mb-1">
          {value}
        </Text>
        <Text className="text-xs text-text-secondary uppercase tracking-wide">
          {label}
        </Text>
      </View>
    </View>
  );
}

interface TypeRowProps {
  type: string;
  count: number;
  isLast: boolean;
}

export function TypeRow({ type, count, isLast }: TypeRowProps) {
  return (
    <View 
      className={`flex-row items-center justify-between px-5 py-4 ${
        !isLast ? 'border-b border-border/10' : ''
      }`}
    >
      <View className="flex-row items-center flex-1">
        <View 
          className="w-2.5 h-2.5 rounded-full mr-3"
          style={{ backgroundColor: getTypeColor(type) }}
        />
        <View className="flex-1">
          <Text className="text-sm text-text-primary font-semibold capitalize">
            {type}
          </Text>
        </View>
      </View>
      <View 
        className="px-3 py-1.5 rounded-full min-w-[44px] items-center"
        style={{ backgroundColor: `${getTypeColor(type)}15` }}
      >
        <Text 
          className="text-sm font-bold"
          style={{ color: getTypeColor(type) }}
        >
          {count}
        </Text>
      </View>
    </View>
  );
}

interface PriorityRowProps {
  priority: number;
  count: number;
  isLast: boolean;
}

export function PriorityRow({ priority, count, isLast }: PriorityRowProps) {
  const { color, label } = getPriorityInfo(priority);
  
  return (
    <View 
      className={`flex-row items-center justify-between px-5 py-4 ${
        !isLast ? 'border-b border-border/10' : ''
      }`}
    >
      <View className="flex-1">
        <View className="flex-row items-center mb-1">
          <View 
            className="w-2 h-2 rounded-full mr-2"
            style={{ backgroundColor: color }}
          />
          <Text className="text-sm text-text-primary font-semibold">
            Priority {priority}
          </Text>
        </View>
        <Text className="text-xs text-text-secondary ml-4">
          {label}
        </Text>
      </View>
      <Text className="text-xl font-bold text-text-primary">{count}</Text>
    </View>
  );
}

interface ActionButtonProps {
  label: string;
  icon: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'warning' | 'error';
  disabled?: boolean;
  loading?: boolean;
}

export function ActionButton({
  label,
  icon,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
}: ActionButtonProps) {
  const getVariantClasses = () => {
    if (disabled) return 'bg-disabled/50 border border-disabled';
    
    switch (variant) {
      case 'primary':
        return 'bg-primary border border-primary';
      case 'secondary':
        return 'bg-secondary border border-secondary';
      case 'warning':
        return 'bg-warning border border-warning';
      case 'error':
        return 'bg-error border border-error';
      default:
        return 'bg-primary border border-primary';
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      <View 
        className={`${getVariantClasses()} rounded-xl py-4 px-5 flex-row items-center justify-center min-h-[56px]`}
      >
        {loading ? (
          <ActivityIndicator size="small" color="white" />
        ) : (
          <>
            <Text className="text-xl mr-2">{icon}</Text>
            <Text className={`font-semibold text-base ${
              disabled ? 'text-text-secondary' : 'text-text-inverse'
            }`}>
              {label}
            </Text>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

function getTypeColor(type: string): string {
  const colors: Record<string, string> = {
    auth: '#1F78FF',
    meal: '#37B37E',
    menu: '#8b5cf6',
    photo: '#ffa726',
    feedback: '#ec4899',
    profile: '#06b6d4',
    other: '#6b7280',
  };
  return colors[type.toLowerCase()] || '#6b7280';
}

function getPriorityInfo(priority: number): { color: string; label: string } {
  const info: Record<number, { color: string; label: string }> = {
    1: { color: '#ef4444', label: 'Critical - Immediate sync required' },
    2: { color: '#ffa726', label: 'High - Sync as soon as possible' },
    3: { color: '#1F78FF', label: 'Normal - Standard sync priority' },
    4: { color: '#37B37E', label: 'Low - Sync when convenient' },
    5: { color: '#6b7280', label: 'Lowest - Background sync' },
  };
  return info[priority] || { color: '#6b7280', label: 'Unknown priority' };
}

function getTimeAgo(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diff = now - then;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (seconds < 10) return 'Just now';
  if (seconds < 60) return `${seconds} seconds ago`;
  if (minutes < 60) return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  if (days < 7) return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  
  return new Date(timestamp).toLocaleDateString();
}