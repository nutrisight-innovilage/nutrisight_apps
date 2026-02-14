import React, { useState, useEffect } from 'react';
import { Text, View, ScrollView, Pressable, Alert } from 'react-native';
import { VictoryPie } from 'victory-native';
import Svg from 'react-native-svg';
import { Feather } from '@expo/vector-icons';
import { NutritionScan, ChartDataPoint } from '@/app/types/meal';
import { 
  checkNutritionStatus, 
  calculateWeeklyInsight, 
  nutritionGoals 
} from '@/app/utils/nutritionUtils';
import { useCart } from '@/app/contexts/cartContext';
import FoodHistoryCard from '@/app/components/foodHistoryCard';
import WeeklyInsightCard from '@/app/components/weeklyInsightCard';

import LoadingScreen from '@/app/components/loadingScreen';

export default function Index() {
  const { 
    recentScans, 
    isLoadingScans, 
    refreshScans,
    deleteScan,
    lastSubmittedScan
  } = useCart();
  
  const [initialLoading, setInitialLoading] = useState(true);

  // Load data dari context saat component mount
  useEffect(() => {
    loadScans();
  }, []);

  const loadScans = async () => {
    try {
      setInitialLoading(true);
      await refreshScans();
    } catch (error) {
      console.error('Error loading scans:', error);
      Alert.alert('Error', 'Gagal memuat data');
    } finally {
      setInitialLoading(false);
    }
  };

  
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

  // Tampilkan loading screen saat initial load
  if (initialLoading && recentScans.length === 0) {
    return <LoadingScreen message="Memuat data nutrisi..." />;
  }

  // Latest scan untuk chart
  const latestScan = recentScans[0];

  // Chart data
  const chartData: ChartDataPoint[] = latestScan ? [
    { x: 'Protein', y: latestScan.protein, color: '#10b981' },
    { x: 'Karbohidrat', y: latestScan.carbs, color: '#3b82f6' },
    { x: 'Lemak', y: latestScan.fats, color: '#f59e0b' }
  ] : [];

  // Nutrition status
  const nutritionStatus = latestScan ? checkNutritionStatus(latestScan) : null;

  // Weekly insight
  const weeklyInsight = calculateWeeklyInsight(recentScans);

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 80 }}>
        {/* Header */}
        <View className="bg-white px-6 py-4 shadow-sm">
          <Text className="text-2xl font-bold text-gray-900">NutriSight</Text>
          <Text className="text-sm text-gray-500 mt-1">Lacak nutrisi Anda</Text>
        </View>

        {/* Weekly Insight Card */}
        <WeeklyInsightCard insight={weeklyInsight} />

        {/* Last Scan Statistics */}
        {latestScan && (
          <View className="bg-white mx-4 mt-4 rounded-2xl p-6" style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 2,
          }}>
            <Text className="text-lg font-semibold text-gray-900 mb-4">
              Scan Terakhir
            </Text>
            
            {/* Chart and Stats Container */}
            <View className="flex-row items-center justify-between mb-4">
              {/* Donut Chart */}
              <View className="w-40 h-40 relative items-center justify-center">
                <Svg width={160} height={160}>
                  <VictoryPie
                    standalone={false}
                    width={160}
                    height={160}
                    data={chartData}
                    innerRadius={50}
                    colorScale={chartData.map(d => d.color)}
                    labels={() => null}
                    padding={0}
                  />
                </Svg>
                
                {/* Center Content */}
                <View className="absolute inset-0 items-center justify-center">
                  {nutritionStatus?.allGood ? (
                    <View className="items-center">
                      <View className="w-12 h-12 bg-green-500 rounded-full items-center justify-center mb-1">
                        <Feather name="check" size={28} color="white" />
                      </View>
                      <Text className="text-xs font-semibold text-green-600">Seimbang</Text>
                    </View>
                  ) : (
                    <View className="items-center">
                      <Text className="text-2xl font-bold text-gray-900">
                        {nutritionStatus?.goodCount}/3
                      </Text>
                      <Text className="text-xs text-gray-500">Nutrisi Baik</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Stats */}
              <View className="flex-1 ml-6">
                <Text className="text-sm font-medium text-gray-600 mb-2">
                  {latestScan.foodName}
                </Text>
                <Text className="text-3xl font-bold text-gray-900 mb-3">
                  {latestScan.calories} kal
                </Text>
                <View className="space-y-2">
                  <View className="flex-row items-center justify-between mb-2">
                    <View className="flex-row items-center">
                      <View className="w-3 h-3 rounded-full bg-green-500 mr-2" />
                      <Text className="text-sm text-gray-600">Protein</Text>
                    </View>
                    <Text className="text-sm font-semibold text-gray-900">
                      {latestScan.protein}g
                    </Text>
                  </View>
                  <View className="flex-row items-center justify-between mb-2">
                    <View className="flex-row items-center">
                      <View className="w-3 h-3 rounded-full bg-blue-500 mr-2" />
                      <Text className="text-sm text-gray-600">Karbohidrat</Text>
                    </View>
                    <Text className="text-sm font-semibold text-gray-900">
                      {latestScan.carbs}g
                    </Text>
                  </View>
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <View className="w-3 h-3 rounded-full bg-amber-500 mr-2" />
                      <Text className="text-sm text-gray-600">Lemak</Text>
                    </View>
                    <Text className="text-sm font-semibold text-gray-900">
                      {latestScan.fats}g
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Nutrition Status */}
            {nutritionStatus && (
              <View className="mt-4 bg-gray-50 rounded-xl p-4">
                <Text className="text-sm font-semibold text-gray-900 mb-3">
                  Status Nutrisi
                </Text>
                <View className="space-y-2">
                  {/* Protein Status */}
                  <View className="flex-row items-center justify-between mb-2">
                    <View className="flex-row items-center">
                      <View className="w-3 h-3 rounded-full bg-green-500 mr-2" />
                      <Text className="text-sm text-gray-600">Protein</Text>
                    </View>
                    <View className="flex-row items-center space-x-2">
                      <Text className="text-xs text-gray-500 mr-2">
                        {nutritionGoals.protein.min}-{nutritionGoals.protein.max}g
                      </Text>
                      {nutritionStatus.proteinGood ? (
                        <Feather name="check" size={16} color="#10b981" />
                      ) : (
                        <Feather name="x" size={16} color="#ef4444" />
                      )}
                    </View>
                  </View>
                  
                  {/* Carbs Status */}
                  <View className="flex-row items-center justify-between mb-2">
                    <View className="flex-row items-center">
                      <View className="w-3 h-3 rounded-full bg-blue-500 mr-2" />
                      <Text className="text-sm text-gray-600">Karbohidrat</Text>
                    </View>
                    <View className="flex-row items-center space-x-2">
                      <Text className="text-xs text-gray-500 mr-2">
                        {nutritionGoals.carbs.min}-{nutritionGoals.carbs.max}g
                      </Text>
                      {nutritionStatus.carbsGood ? (
                        <Feather name="check" size={16} color="#10b981" />
                      ) : (
                        <Feather name="x" size={16} color="#ef4444" />
                      )}
                    </View>
                  </View>
                  
                  {/* Fats Status */}
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <View className="w-3 h-3 rounded-full bg-amber-500 mr-2" />
                      <Text className="text-sm text-gray-600">Lemak</Text>
                    </View>
                    <View className="flex-row items-center space-x-2">
                      <Text className="text-xs text-gray-500 mr-2">
                        {nutritionGoals.fats.min}-{nutritionGoals.fats.max}g
                      </Text>
                      {nutritionStatus.fatsGood ? (
                        <Feather name="check" size={16} color="#10b981" />
                      ) : (
                        <Feather name="x" size={16} color="#ef4444" />
                      )}
                    </View>
                  </View>
                </View>
                
                {/* Overall Feedback */}
                {nutritionStatus.allGood && (
                  <View className="mt-3 pt-3 border-t border-gray-200">
                    <View className="flex-row items-center space-x-2">
                      <Feather name="check" size={20} color="#10b981" />
                      <Text className="text-sm font-semibold text-green-600 flex-1 ml-2">
                        Nutrisi seimbang! Makanan ini sangat baik untuk Anda.
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* History */}
        <View className="px-4 mt-6 flex-1">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-lg font-semibold text-gray-900">
              Riwayat Pemindaian
            </Text>
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