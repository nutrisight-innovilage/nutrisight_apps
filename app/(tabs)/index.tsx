/**
 * index.tsx (v2.1 - Today Stats + Pull-to-Refresh + Weekly Insight)
 * ---------------------------------------------------------------------------
 * Home dashboard for NutriSight.
 * 
 * v2.1 Changes:
 * • ✅ Pull-to-refresh on entire page
 * • ✅ "Today Statistics" replaces "Last Scan Statistics"
 * • ✅ WeeklyInsightCard connected to backend with AI summary
 * • ✅ Proper loading states
 * ---------------------------------------------------------------------------
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Text, View, ScrollView, Pressable, Alert, RefreshControl, TouchableOpacity } from 'react-native';
import { VictoryPie } from 'victory-native';
import Svg from 'react-native-svg';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { NutritionScan, ChartDataPoint } from '@/app/types/meal';
import { 
  checkNutritionStatus, 
  nutritionGoals,
} from '@/app/utils/nutritionUtils';
import { useCart } from '@/app/contexts/cartContext';
import FoodHistoryCard from '@/app/components/foodHistoryCard';
import WeeklyInsightCard from '@/app/components/weeklyInsightCard';
import LoadingScreen from '@/app/components/loadingScreen';

export default function Index() {
  const { 
    recentScans, 
    todayScans,
    isLoadingScans, 
    refreshScans,
    refreshTodayScans,
    refreshWeeklyInsight,
    deleteScan,
    lastSubmittedScan,
    weeklyInsight,
    aiSummary,
    isSummaryLoading,
    todayStats,
  } = useCart();
  
  const [initialLoading, setInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load data on mount
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setInitialLoading(true);
      await Promise.all([
        refreshScans(),
        refreshTodayScans(),
        refreshWeeklyInsight(),
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Gagal memuat data');
    } finally {
      setInitialLoading(false);
    }
  };

  // ✅ Pull-to-refresh handler
  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refreshScans(),
        refreshTodayScans(),
        refreshWeeklyInsight(),
      ]);
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshScans, refreshTodayScans, refreshWeeklyInsight]);

  const handleDeleteScan = async (id: string) => {
    Alert.alert(
      'Hapus Data',
      'Apakah Anda yakin ingin menghapus data ini?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteScan(id);
              Alert.alert('Berhasil', 'Data berhasil dihapus');
            } catch (error) {
              console.error('Error deleting scan:', error);
              Alert.alert('Error', 'Gagal menghapus data');
            }
          }
        }
      ]
    );
  };

  // Loading screen
  if (initialLoading && recentScans.length === 0) {
    return <LoadingScreen message="Memuat data nutrisi..." />;
  }

  // =========================================================================
  // TODAY STATISTICS DATA
  // =========================================================================

  const hasTodayData = todayStats.mealsCount > 0;

  // Chart data from today's totals
  const todayChartData: ChartDataPoint[] = hasTodayData ? [
    { x: 'Protein', y: todayStats.totalProtein || 1, color: '#10b981' },
    { x: 'Karbohidrat', y: todayStats.totalCarbs || 1, color: '#3b82f6' },
    { x: 'Lemak', y: todayStats.totalFats || 1, color: '#f59e0b' },
  ] : [];

  // Check overall today nutrition status
  const todayNutritionStatus = hasTodayData ? {
    proteinGood: todayStats.totalProtein >= nutritionGoals.protein.min && todayStats.totalProtein <= nutritionGoals.protein.max * todayStats.mealsCount,
    carbsGood: todayStats.totalCarbs >= nutritionGoals.carbs.min && todayStats.totalCarbs <= nutritionGoals.carbs.max * todayStats.mealsCount,
    fatsGood: todayStats.totalFats >= nutritionGoals.fats.min && todayStats.totalFats <= nutritionGoals.fats.max * todayStats.mealsCount,
    allGood: todayStats.balancedMealsCount === todayStats.mealsCount,
    goodCount: todayStats.balancedMealsCount,
  } : null;

  const onViewHistory = () => {
    console.log('Navigating to History screen...');
    router.push('/history');
  };

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ paddingBottom: 80 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={['#10b981']}
            tintColor="#10b981"
          />
        }
      >
        {/* Header */}
        <View className="bg-white px-6 py-4 shadow-sm">
          <Text className="text-2xl font-bold text-gray-900">NutriSight</Text>
          <Text className="text-sm text-gray-500 mt-1">Lacak nutrisi Anda</Text>
        </View>

        {/* ✅ Weekly Insight Card - Connected to backend with AI summary */}
        <WeeklyInsightCard 
          insight={weeklyInsight} 
          aiSummary={aiSummary}
          isSummaryLoading={isSummaryLoading}
        />

        {/* ✅ TODAY STATISTICS (replaces "Last Scan Statistics") */}
        <View className="bg-white mx-4 mt-4 rounded-2xl p-6" style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 2,
          elevation: 2,
        }}>
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-semibold text-gray-900">
              Statistik Hari Ini
            </Text>
            <View className="bg-green-100 rounded-full px-3 py-1">
              <Text className="text-xs font-semibold text-green-700">
                {todayStats.mealsCount} makanan
              </Text>
            </View>
          </View>

          {hasTodayData ? (
            <>
              {/* Chart and Stats Container */}
              <View className="flex-row items-center justify-between mb-4">
                {/* Donut Chart */}
                <View className="w-40 h-40 relative items-center justify-center">
                  <Svg width={160} height={160}>
                    <VictoryPie
                      standalone={false}
                      width={160}
                      height={160}
                      data={todayChartData}
                      innerRadius={50}
                      colorScale={todayChartData.map(d => d.color)}
                      labels={() => null}
                      padding={0}
                    />
                  </Svg>
                  
                  {/* Center Content */}
                  <View className="absolute inset-0 items-center justify-center">
                    {todayNutritionStatus?.allGood ? (
                      <View className="items-center">
                        <View className="w-12 h-12 bg-green-500 rounded-full items-center justify-center mb-1">
                          <Feather name="check" size={28} color="white" />
                        </View>
                        <Text className="text-xs font-semibold text-green-600">Seimbang</Text>
                      </View>
                    ) : (
                      <View className="items-center">
                        <Text className="text-2xl font-bold text-gray-900">
                          {todayStats.balancedMealsCount}/{todayStats.mealsCount}
                        </Text>
                        <Text className="text-xs text-gray-500">Seimbang</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Stats */}
                <View className="flex-1 ml-6">
                  <Text className="text-sm font-medium text-gray-600 mb-2">
                    Total Hari Ini
                  </Text>
                  <Text className="text-3xl font-bold text-gray-900 mb-3">
                    {todayStats.totalCalories} kal
                  </Text>
                  <View className="space-y-2">
                    <View className="flex-row items-center justify-between mb-2">
                      <View className="flex-row items-center">
                        <View className="w-3 h-3 rounded-full bg-green-500 mr-2" />
                        <Text className="text-sm text-gray-600">Protein</Text>
                      </View>
                      <Text className="text-sm font-semibold text-gray-900">
                        {todayStats.totalProtein}g
                      </Text>
                    </View>
                    <View className="flex-row items-center justify-between mb-2">
                      <View className="flex-row items-center">
                        <View className="w-3 h-3 rounded-full bg-blue-500 mr-2" />
                        <Text className="text-sm text-gray-600">Karbohidrat</Text>
                      </View>
                      <Text className="text-sm font-semibold text-gray-900">
                        {todayStats.totalCarbs}g
                      </Text>
                    </View>
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center">
                        <View className="w-3 h-3 rounded-full bg-amber-500 mr-2" />
                        <Text className="text-sm text-gray-600">Lemak</Text>
                      </View>
                      <Text className="text-sm font-semibold text-gray-900">
                        {todayStats.totalFats}g
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Today's Meals Quick List */}
              {todayScans.length > 0 && (
                <View className="mt-2 bg-gray-50 rounded-xl p-3">
                  <Text className="text-xs font-semibold text-gray-500 mb-2">
                    Makanan hari ini:
                  </Text>
                  {todayScans.map((scan, idx) => (
                    <View key={scan.id} className={`flex-row items-center justify-between py-1.5 ${
                      idx < todayScans.length - 1 ? 'border-b border-gray-200' : ''
                    }`}>
                      <Text className="text-sm text-gray-700 flex-1" numberOfLines={1}>
                        {scan.foodName}
                      </Text>
                      <Text className="text-sm font-semibold text-gray-900 ml-2">
                        {scan.calories} kal
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </>
          ) : (
            /* Empty State */
            <View className="items-center py-6">
              <Feather name="sunrise" size={40} color="#d1d5db" />
              <Text className="text-gray-400 mt-3 text-center text-sm">
                Belum ada makanan hari ini.{'\n'}Tambahkan makanan pertama Anda!
              </Text>
            </View>
          )}
        </View>

        {/* ✅ History with pull-to-refresh */}
        <View className="px-4 mt-6 flex-1">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-lg font-semibold text-gray-900">
              Riwayat Pemindaian
            </Text>
            <TouchableOpacity onPress={onViewHistory} className="flex-row items-center">
              <Feather name="refresh-cw" size={16} color="#10b981" />
              <Text className="text-xs text-green-600 ml-1">Lihat secara lengkap</Text>
            </TouchableOpacity>
            <Text className="text-sm text-gray-500">
              {recentScans.length} makanan
            </Text>
          </View>
          
          {isLoadingScans && recentScans.length === 0 ? (
            <View className="bg-white rounded-xl p-8 items-center">
              <Text className="text-gray-500">Memuat data...</Text>
            </View>
          ) : recentScans.length === 0 ? (
            <View className="bg-white rounded-xl p-8 items-center">
              <Feather name="inbox" size={48} color="#d1d5db" />
              <Text className="text-gray-500 mt-4 text-center">
                Belum ada data makanan.{'\n'}Tambahkan makanan pertama Anda!
              </Text>
            </View>
          ) : (
            <View className="space-y-3">
              {recentScans.map((scan, index) => (
                <FoodHistoryCard 
                  key={scan.id} 
                  scan={scan} 
                  index={index}
                  onPress={(scan) => handleDeleteScan(scan.id)}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}