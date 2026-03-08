/**
 * history.tsx (v2.0 — NativeWind)
 * ---------------------------------------------------------------------------
 * Sama persis dengan v1.0, hanya StyleSheet diganti className NativeWind
 * menggunakan token warna dari tailwind.config.js.
 * ---------------------------------------------------------------------------
 */

import {
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Animated as RNAnimated,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeInDown,
  FadeIn,
} from 'react-native-reanimated';

import { useCart } from '@/app/contexts/cartContext';
import { useAuth } from '@/app/contexts/authContext';
import { useToast } from '@/app/components/useToast';
import { NutritionScan } from '@/app/types/meal';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TabKey = 'today' | 'all';
type ScanStatus = 'complete' | 'pending' | 'not-food' | 'error';

interface ScanWithStatus extends NutritionScan {
  _status: ScanStatus;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getScanStatus(scan: NutritionScan): ScanStatus {
  if (scan.foodName?.startsWith('Bukan Makanan')) return 'not-food';
  if (
    scan.foodName === 'Menganalisis...' ||
    scan.foodName === 'Analisis Gagal - Akan Dicoba Ulang'
  )
    return 'pending';
  if (scan.calories > 0 && scan.foodName && scan.foodName !== 'Menganalisis...') return 'complete';
  return 'error';
}

function formatCalories(n: number) {
  return Math.round(n).toLocaleString('id-ID');
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Offline pill */
function OfflinePill() {
  return (
    <View className="flex-row items-center bg-[#FFF7E6] rounded-[20px] px-2.5 py-1 border border-[#FFD080]">
      <Ionicons name="cloud-offline-outline" size={13} color="#ffa726" />
      <Text className="text-accent text-[11px] font-semibold ml-1">Offline</Text>
    </View>
  );
}

/** Macro stat pill — warna dinamis, pakai inline style untuk border/bg */
function MacroPill({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: number;
  unit: string;
  color: string;
}) {
  return (
    <View
      className="flex-1 rounded-xl py-2.5 items-center border"
      style={{ borderColor: color + '30', backgroundColor: color + '10' }}
    >
      <Text className="text-base font-extrabold tracking-tight" style={{ color }}>
        {Math.round(value)}
        <Text className="text-[10px] font-medium">{unit}</Text>
      </Text>
      <Text className="text-[10px] font-medium mt-0.5" style={{ color: color + 'CC' }}>
        {label}
      </Text>
    </View>
  );
}

/** Status badge on scan card */
function StatusBadge({ status }: { status: ScanStatus }) {
  if (status === 'complete') return null;

  const MAP: Record<
    Exclude<ScanStatus, 'complete'>,
    { label: string; bg: string; color: string; icon: keyof typeof Ionicons.glyphMap }
  > = {
    pending: {
      label: 'Menunggu',
      bg: '#FFF7E6',
      color: '#e68a00',
      icon: 'time-outline',
    },
    'not-food': {
      label: 'Bukan Makanan',
      bg: '#FEF2F2',
      color: '#ef4444',
      icon: 'close-circle-outline',
    },
    error: {
      label: 'Gagal',
      bg: '#FEF2F2',
      color: '#ef4444',
      icon: 'alert-circle-outline',
    },
  };

  const cfg = MAP[status];
  return (
    <View
      className="flex-row items-center rounded-lg px-2 py-[3px] self-start mt-1.5 gap-1"
      style={{ backgroundColor: cfg.bg }}
    >
      <Ionicons name={cfg.icon} size={12} color={cfg.color} />
      <Text className="text-[11px] font-semibold" style={{ color: cfg.color }}>
        {cfg.label}
      </Text>
    </View>
  );
}

/** Individual scan card */
function ScanCard({
  scan,
  onDelete,
  index,
}: {
  scan: ScanWithStatus;
  onDelete: (id: string) => void;
  index: number;
}) {
  const isPending = scan._status === 'pending';
  const pulseAnim = useRef(new RNAnimated.Value(1)).current;

  useEffect(() => {
    if (!isPending) return;
    const loop = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(pulseAnim, { toValue: 0.5, duration: 800, useNativeDriver: true }),
        RNAnimated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [isPending]);

  const accentColor =
    scan._status === 'complete'
      ? '#37B37E'
      : scan._status === 'pending'
      ? '#ffa726'
      : '#ef4444';

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 60).springify().damping(18)}
      className="bg-surface rounded-2xl p-3.5 flex-row overflow-hidden"
      style={{ elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 }}
    >
      {/* Left accent bar */}
      <View
        className="w-1 rounded self-stretch flex-shrink-0"
        style={{ backgroundColor: accentColor }}
      />

      <View className="flex-1 pl-3">
        {/* Top row: name + delete */}
        <View className="flex-row items-start">
          <View className="flex-1">
            {isPending ? (
              <RNAnimated.Text
                className="text-[15px] font-bold leading-5 flex-1 pr-2"
                style={{ opacity: pulseAnim, color: '#ffa726' }}
                numberOfLines={2}
              >
                {scan.foodName}
              </RNAnimated.Text>
            ) : (
              <Text
                className="text-[15px] font-bold text-[#1A2B22] leading-5 flex-1 pr-2"
                numberOfLines={2}
              >
                {scan.foodName}
              </Text>
            )}
            <Text className="text-[11px] text-[#BBCCC4] mt-[3px] font-medium">
              {scan.date} · {scan.time}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => onDelete(scan.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="p-1 mt-0.5"
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={16} color="#ccc" />
          </TouchableOpacity>
        </View>

        {/* Status badge */}
        <StatusBadge status={scan._status} />

        {/* Macros — only when complete */}
        {scan._status === 'complete' && (
          <View className="flex-row gap-1.5 mt-2.5 flex-wrap">
            <NutritionChip label="Kal" value={scan.calories} unit="kcal" color="#FF7849" />
            <NutritionChip label="Prot" value={scan.protein} unit="g" color="#37B37E" />
            <NutritionChip label="Karb" value={scan.carbs} unit="g" color="#1F78FF" />
            <NutritionChip label="Lem" value={scan.fats} unit="g" color="#A855F7" />
          </View>
        )}
      </View>
    </Animated.View>
  );
}

/** Tiny nutrition chip inside scan card */
function NutritionChip({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: number;
  unit: string;
  color: string;
}) {
  return (
    <View
      className="rounded-lg px-2 py-1 items-center min-w-[52px]"
      style={{ backgroundColor: color + '12' }}
    >
      <Text className="text-[13px] font-extrabold tracking-tight" style={{ color }}>
        {Math.round(value)}
        <Text className="text-[9px] font-semibold">{unit}</Text>
      </Text>
      <Text className="text-[9px] font-medium mt-[1px]" style={{ color: color + 'AA' }}>
        {label}
      </Text>
    </View>
  );
}

/** Weekly stat row item */
function WeekStat({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: number;
  unit: string;
  color: string;
}) {
  return (
    <View className="items-center flex-1">
      <Text className="text-lg font-bold" style={{ color }}>
        {Math.round(value)}
      </Text>
      <Text className="text-[10px] text-[#999] mt-[1px]">{unit}</Text>
      <Text className="text-[10px] text-[#bbb] mt-[1px]">{label}</Text>
    </View>
  );
}

/** Empty state */
function EmptyState({ tab }: { tab: TabKey }) {
  return (
    <Animated.View
      entering={FadeIn.delay(200)}
      className="items-center pt-12 px-10 pb-6"
    >
      <View className="w-[88px] h-[88px] rounded-full bg-[#F0F4F2] items-center justify-center mb-4">
        <MaterialCommunityIcons
          name={tab === 'today' ? 'food-apple-outline' : 'history'}
          size={40}
          color="#C8D6CC"
        />
      </View>
      <Text className="text-base font-bold text-[#1A2B22] text-center mb-2">
        {tab === 'today' ? 'Belum ada scan hari ini' : 'Belum ada riwayat'}
      </Text>
      <Text className="text-[13px] text-[#AABBB4] text-center leading-[19px] mb-6">
        {tab === 'today'
          ? 'Ambil foto makananmu dan analisis dengan AI.'
          : 'Mulai scan makanan untuk melihat riwayat nutrisimu.'}
      </Text>
      <TouchableOpacity
        onPress={() => router.push('/camera')}
        className="flex-row items-center gap-2 bg-primary px-5 py-3 rounded-[14px]"
        activeOpacity={0.8}
      >
        <Ionicons name="camera" size={16} color="#fff" />
        <Text className="text-text-inverse font-bold text-sm">Scan Makanan</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function HistoryPage() {
  const {
    recentScans,
    todayScans,
    isLoadingScans,
    weeklyInsight,
    aiSummary,
    isSummaryLoading,
    todayStats,
    refreshScans,
    refreshTodayScans,
    refreshWeeklyInsight,
    deleteScan,
    getPhotoAnalysisStatus,
  } = useCart();

  const { user, isOffline } = useAuth();
  const { showToast, ToastContainer } = useToast();
  const { width: screenWidth } = useWindowDimensions();

  const [activeTab, setActiveTab] = useState<TabKey>('today');
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [enrichedToday, setEnrichedToday] = useState<ScanWithStatus[]>([]);
  const [enrichedAll, setEnrichedAll] = useState<ScanWithStatus[]>([]);

  const tabHalfWidth = (screenWidth - 32) / 2;
  const tabUnderlineX = useSharedValue(0);
  const tabUnderlineStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tabUnderlineX.value }],
  }));

  // ---------------------------------------------------------------------------
  // Status enrichment
  // ---------------------------------------------------------------------------

  const enrichScans = useCallback(
    async (scans: NutritionScan[]): Promise<ScanWithStatus[]> => {
      return Promise.all(
        scans.map(async (scan) => {
          const base = getScanStatus(scan);
          if (base === 'pending') {
            try {
              const live = await getPhotoAnalysisStatus(scan.id);
              if (live.isComplete && live.scan) {
                return { ...live.scan, _status: 'complete' as ScanStatus };
              }
              if (live.isNotFood) return { ...scan, _status: 'not-food' as ScanStatus };
              return { ...scan, _status: 'pending' as ScanStatus };
            } catch {
              return { ...scan, _status: 'pending' as ScanStatus };
            }
          }
          return { ...scan, _status: base };
        })
      );
    },
    [getPhotoAnalysisStatus]
  );

  useEffect(() => {
    enrichScans(todayScans).then(setEnrichedToday);
  }, [todayScans, enrichScans]);

  useEffect(() => {
    enrichScans(recentScans).then(setEnrichedAll);
  }, [recentScans, enrichScans]);

  useEffect(() => {
    const hasPending = (scans: ScanWithStatus[]) =>
      scans.some((s) => s._status === 'pending');

    if (!hasPending(enrichedToday) && !hasPending(enrichedAll)) return;

    const interval = setInterval(async () => {
      if (hasPending(enrichedToday)) {
        const refreshed = await enrichScans(todayScans);
        setEnrichedToday(refreshed);
      }
      if (hasPending(enrichedAll)) {
        const refreshed = await enrichScans(recentScans);
        setEnrichedAll(refreshed);
      }
    }, 8000);

    return () => clearInterval(interval);
  }, [enrichedToday, enrichedAll, todayScans, recentScans, enrichScans]);

  // ---------------------------------------------------------------------------
  // Refresh
  // ---------------------------------------------------------------------------

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refreshScans(), refreshTodayScans(), refreshWeeklyInsight()]);
    } finally {
      setRefreshing(false);
    }
  }, [refreshScans, refreshTodayScans, refreshWeeklyInsight]);

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------

  const handleDelete = useCallback(
    async (id: string) => {
      setDeletingId(id);
      try {
        await deleteScan(id);
        showToast({ type: 'success', title: 'Scan dihapus', duration: 2500 });
      } catch {
        showToast({ type: 'error', title: 'Gagal menghapus', message: 'Silakan coba lagi.' });
      } finally {
        setDeletingId(null);
      }
    },
    [deleteScan, showToast]
  );

  const confirmDelete = useCallback(
    (id: string, foodName: string) => {
      showToast({
        type: 'warning',
        title: `Hapus "${foodName.slice(0, 28)}${foodName.length > 28 ? '…' : ''}"?`,
        message: 'Tindakan ini tidak bisa dibatalkan.',
        duration: 0,
        actions: [
          { label: 'Hapus', onPress: () => handleDelete(id) },
          { label: 'Batal', variant: 'ghost' },
        ],
      });
    },
    [showToast, handleDelete]
  );

  // ---------------------------------------------------------------------------
  // Tab switch
  // ---------------------------------------------------------------------------

  const switchTab = (tab: TabKey) => {
    setActiveTab(tab);
    tabUnderlineX.value = withSpring(tab === 'today' ? 0 : tabHalfWidth, { damping: 20 });
  };

  // ---------------------------------------------------------------------------
  // Greeting
  // ---------------------------------------------------------------------------

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 11) return 'Selamat Pagi';
    if (h < 15) return 'Selamat Siang';
    if (h < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  const displayName = user?.name?.split(' ')[0] ?? 'Kamu';

  // ---------------------------------------------------------------------------
  // RENDER: Today Stats Banner
  // ---------------------------------------------------------------------------

  const StatsBanner = () => (
    <Animated.View
      entering={FadeInDown.delay(80).springify()}
      className="mx-4 my-4 bg-surface rounded-[20px] p-5 border border-[#E8F5EF]"
      style={{
        elevation: 4,
        shadowColor: '#37B37E',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.10,
        shadowRadius: 12,
      }}
    >
      {/* Big calorie number */}
      <View className="items-center mb-4">
        <Text className="text-[44px] font-black text-[#1A2B22] tracking-tighter leading-[48px]">
          {formatCalories(todayStats.totalCalories)}
        </Text>
        <Text className="text-[13px] text-text-secondary font-medium mt-0.5">kcal hari ini</Text>
      </View>

      {/* Divider */}
      <View className="h-px bg-[#F0F4F2] mb-3.5" />

      {/* Macro pills */}
      <View className="flex-row gap-2">
        <MacroPill label="Protein" value={todayStats.totalProtein} unit="g" color="#37B37E" />
        <MacroPill label="Karbo" value={todayStats.totalCarbs} unit="g" color="#1F78FF" />
        <MacroPill label="Lemak" value={todayStats.totalFats} unit="g" color="#FF7849" />
      </View>

      {/* Meal count */}
      <View className="flex-row items-center justify-center mt-3 gap-[5px]">
        <Ionicons name="restaurant-outline" size={13} color="#37B37E" />
        <Text className="text-[12px] text-primary font-semibold">
          {todayStats.mealsCount} scan hari ini
        </Text>
      </View>
    </Animated.View>
  );

  // ---------------------------------------------------------------------------
  // RENDER: Weekly Card
  // ---------------------------------------------------------------------------

  const WeeklyCard = () => (
    <Animated.View
      entering={FadeInDown.delay(150).springify()}
      className="mx-4 mb-4 bg-surface rounded-[20px] p-[18px]"
      style={{
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      }}
    >
      {/* Header */}
      <View className="flex-row items-center justify-between mb-3.5">
        <View className="flex-row items-center gap-1.5">
          <MaterialCommunityIcons name="chart-line" size={18} color="#37B37E" />
          <Text className="text-[15px] font-bold text-[#1A2B22]">Ringkasan Mingguan</Text>
        </View>
        <Text className="text-[12px] text-[#aaa]">{weeklyInsight.mealsCount} total scan</Text>
      </View>

      {/* Stats row */}
      <View className="flex-row items-center bg-[#F9FBFA] rounded-2xl py-3.5 mb-3">
        <WeekStat label="Kalori" value={weeklyInsight.totalCalories} unit="kcal" color="#FF7849" />
        <View className="w-px h-8 bg-[#E8EDE9]" />
        <WeekStat label="Protein" value={weeklyInsight.totalProtein} unit="g" color="#37B37E" />
        <View className="w-px h-8 bg-[#E8EDE9]" />
        <WeekStat label="Karbo" value={weeklyInsight.totalCarbs} unit="g" color="#1F78FF" />
        <View className="w-px h-8 bg-[#E8EDE9]" />
        <WeekStat label="Lemak" value={weeklyInsight.totalFats} unit="g" color="#A855F7" />
      </View>

      {/* Avg calories */}
      <View className="flex-row items-center gap-1.5 mb-1">
        <Ionicons name="flame-outline" size={14} color="#FF7849" />
        <Text className="text-[12px] text-[#888]">
          Rata-rata{' '}
          <Text className="font-bold text-[#FF7849]">
            {formatCalories(weeklyInsight.avgCalories)} kcal
          </Text>{' '}
          per hari
        </Text>
      </View>

      {/* AI Summary */}
      {isSummaryLoading ? (
        <View className="flex-row items-center gap-2 mt-3 p-3 bg-[#F4FAF7] rounded-xl">
          <ActivityIndicator size="small" color="#37B37E" />
          <Text className="text-[12px] text-text-secondary">Membuat ringkasan AI...</Text>
        </View>
      ) : aiSummary ? (
        <View className="mt-3 bg-[#F4FAF7] rounded-xl p-3 border-l-[3px] border-primary">
          <View className="flex-row items-center gap-1 mb-1.5">
            <Ionicons name="sparkles" size={11} color="#37B37E" />
            <Text className="text-[10px] font-bold text-primary uppercase tracking-wide">
              AI Insight
            </Text>
          </View>
          <Text className="text-[13px] text-[#4A6356] leading-[19px]">{aiSummary}</Text>
        </View>
      ) : null}
    </Animated.View>
  );

  // ---------------------------------------------------------------------------
  // RENDER: Tabs
  // ---------------------------------------------------------------------------

  const Tabs = () => (
    <Animated.View
      entering={FadeInDown.delay(220).springify()}
      className="flex-row mx-4 mb-3 bg-surface rounded-2xl overflow-hidden relative"
      style={{
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      }}
    >
      <TouchableOpacity
        className="flex-1 py-[13px] items-center"
        onPress={() => switchTab('today')}
        activeOpacity={0.8}
      >
        <Text
          className={`text-sm font-semibold ${
            activeTab === 'today' ? 'text-[#1A2B22]' : 'text-[#C0C8C4]'
          }`}
        >
          Hari Ini
          {enrichedToday.length > 0 && (
            <Text
              className={`text-xs font-bold ${
                activeTab === 'today' ? 'text-primary' : 'text-[#C0C8C4]'
              }`}
            >
              {' '}{enrichedToday.length}
            </Text>
          )}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        className="flex-1 py-[13px] items-center"
        onPress={() => switchTab('all')}
        activeOpacity={0.8}
      >
        <Text
          className={`text-sm font-semibold ${
            activeTab === 'all' ? 'text-[#1A2B22]' : 'text-[#C0C8C4]'
          }`}
        >
          Semua Riwayat
          {enrichedAll.length > 0 && (
            <Text
              className={`text-xs font-bold ${
                activeTab === 'all' ? 'text-primary' : 'text-[#C0C8C4]'
              }`}
            >
              {' '}{enrichedAll.length}
            </Text>
          )}
        </Text>
      </TouchableOpacity>

      {/* Sliding underline */}
      <View className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#F4F7F5] rounded-sm overflow-hidden">
        <Animated.View
          className="h-full bg-primary rounded-sm"
          style={[{ width: '50%' }, tabUnderlineStyle]}
        />
      </View>
    </Animated.View>
  );

  // ---------------------------------------------------------------------------
  // Scan list
  // ---------------------------------------------------------------------------

  const currentScans = activeTab === 'today' ? enrichedToday : enrichedAll;

  // ---------------------------------------------------------------------------
  // FULL RENDER
  // ---------------------------------------------------------------------------

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#37B37E"
            colors={['#37B37E']}
          />
        }
      >
        {/* ── Header ── */}
        <Animated.View
          entering={FadeInDown.springify()}
          className="flex-row items-center px-5 pt-14 pb-4 bg-surface rounded-b-3xl"
          style={{
            elevation: 3,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 8,
          }}
        >
          <View className="flex-1">
            <Text className="text-[13px] text-text-secondary font-medium">{greeting()},</Text>
            <Text className="text-[22px] font-extrabold text-[#1A2B22] tracking-tight">
              {displayName} 👋
            </Text>
          </View>
          <View className="flex-row items-center gap-2">
            {isOffline && <OfflinePill />}
            <TouchableOpacity
              onPress={() => router.push('/camera')}
              className="bg-primary w-10 h-10 rounded-full items-center justify-center"
              activeOpacity={0.8}
            >
              <Ionicons name="camera" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* ── Today Stats ── */}
        <StatsBanner />

        {/* ── Weekly Insight ── */}
        {weeklyInsight.mealsCount > 0 && <WeeklyCard />}

        {/* ── Tabs ── */}
        <Tabs />

        {/* ── Scan list ── */}
        {isLoadingScans && !refreshing ? (
          <View className="items-center pt-[60px] gap-3">
            <ActivityIndicator size="large" color="#37B37E" />
            <Text className="text-[13px] text-[#aaa]">Memuat riwayat...</Text>
          </View>
        ) : currentScans.length === 0 ? (
          <EmptyState tab={activeTab} />
        ) : (
          <View className="px-4 gap-2.5">
            {currentScans.map((scan, idx) => (
              <ScanCard
                key={scan.id}
                scan={scan}
                index={idx}
                onDelete={(id) => {
                  const name = scan.foodName ?? 'item ini';
                  confirmDelete(id, name);
                }}
              />
            ))}
          </View>
        )}

        {/* Bottom padding */}
        <View className="h-8" />
      </ScrollView>

      {/* ── Toast ── */}
      <ToastContainer />
    </View>
  );
}