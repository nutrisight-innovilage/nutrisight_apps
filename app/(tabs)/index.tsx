import React from 'react';
import { Text, View, ScrollView } from 'react-native';
import { VictoryPie } from 'victory-native';
import Svg from 'react-native-svg';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

interface NutritionScan {
  id: string;
  foodName: string;
  date: string;
  time: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

const mockScans: NutritionScan[] = [
  {
    id: '1',
    foodName: 'Grilled Chicken Salad',
    date: 'Jan 13, 2026',
    time: '12:30 PM',
    calories: 350,
    protein: 35,
    carbs: 15,
    fats: 18
  },
  {
    id: '2',
    foodName: 'Oatmeal with Berries',
    date: 'Jan 13, 2026',
    time: '8:00 AM',
    calories: 280,
    protein: 8,
    carbs: 45,
    fats: 6
  },
  {
    id: '3',
    foodName: 'Salmon with Rice',
    date: 'Jan 12, 2026',
    time: '7:00 PM',
    calories: 520,
    protein: 42,
    carbs: 58,
    fats: 16
  },
  {
    id: '4',
    foodName: 'Pasta Carbonara',
    date: 'Jan 11, 2026',
    time: '6:30 PM',
    calories: 650,
    protein: 28,
    carbs: 72,
    fats: 28
  },
  {
    id: '5',
    foodName: 'Avocado Toast',
    date: 'Jan 11, 2026',
    time: '9:00 AM',
    calories: 320,
    protein: 12,
    carbs: 35,
    fats: 16
  },
  {
    id: '6',
    foodName: 'Grilled Fish with Vegetables',
    date: 'Jan 10, 2026',
    time: '1:00 PM',
    calories: 380,
    protein: 38,
    carbs: 22,
    fats: 15
  },
  {
    id: '7',
    foodName: 'Smoothie Bowl',
    date: 'Jan 10, 2026',
    time: '7:30 AM',
    calories: 310,
    protein: 14,
    carbs: 48,
    fats: 8
  },
  {
    id: '8',
    foodName: 'Beef Steak with Sweet Potato',
    date: 'Jan 9, 2026',
    time: '7:00 PM',
    calories: 680,
    protein: 52,
    carbs: 55,
    fats: 24
  }
];

// Latest scan for the donut chart
const latestScan = mockScans[0];

const chartData = [
  { x: 'Protein', y: latestScan.protein, color: '#10b981' },
  { x: 'Karbohidrat', y: latestScan.carbs, color: '#3b82f6' },
  { x: 'Lemak', y: latestScan.fats, color: '#f59e0b' }
];

// Nutrition goals (recommended values for a meal)
const nutritionGoals = {
  protein: { min: 20, max: 40, label: 'Protein' },
  carbs: { min: 30, max: 60, label: 'Karbohidrat' },
  fats: { min: 10, max: 25, label: 'Lemak' }
};

// Check nutrition status
const checkNutritionStatus = () => {
  const proteinGood = latestScan.protein >= nutritionGoals.protein.min && latestScan.protein <= nutritionGoals.protein.max;
  const carbsGood = latestScan.carbs >= nutritionGoals.carbs.min && latestScan.carbs <= nutritionGoals.carbs.max;
  const fatsGood = latestScan.fats >= nutritionGoals.fats.min && latestScan.fats <= nutritionGoals.fats.max;
  
  const goodCount = [proteinGood, carbsGood, fatsGood].filter(Boolean).length;
  const allGood = goodCount === 3;
  
  return {
    proteinGood,
    carbsGood,
    fatsGood,
    goodCount,
    allGood
  };
};

const nutritionStatus = checkNutritionStatus();

export default function Index() {
  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 80 }}>
        {/* Header */}
        <View className="bg-white px-6 py-4 shadow-sm">
          <Text className="text-2xl font-bold text-gray-900">NutriSight</Text>
          <Text className="text-sm text-gray-500 mt-1">Lacak nutrisi Anda</Text>
        </View>

        {/* Last Scan Statistics */}
        <View className="bg-white mx-4 mt-4 rounded-2xl p-6" style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 2,
          elevation: 2,
        }}>
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            Statistik gizi seminggu terakhir
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
                {nutritionStatus.allGood ? (
                  <View className="items-center">
                    <View className="w-12 h-12 bg-green-500 rounded-full items-center justify-center mb-1">
                      <Feather name="check" size={28} color="white" />
                    </View>
                    <Text className="text-xs font-semibold text-green-600">Seimbang</Text>
                  </View>
                ) : (
                  <View className="items-center">
                    <Text className="text-2xl font-bold text-gray-900">
                      {nutritionStatus.goodCount}/3
                    </Text>
                    <Text className="text-xs text-gray-500">Nutrisi Baik</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Stats */}
            <View className="flex-1 ml-6">
              <Text className="text-sm font-medium text-gray-600 mb-2">
                tanggal: {latestScan.date}
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
        </View>

        {/* History */}
        <View className="px-4 mt-6 flex-1">
          <Text className="text-lg font-semibold text-gray-900 mb-3">
            Riwayat Pemindaian
          </Text>
          <View className="space-y-3">
            {mockScans.map((scan) => (
              <View 
                key={scan.id} 
                className="bg-white rounded-xl p-4"
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 2,
                  elevation: 2,
                }}
              >
                <View className="flex-row items-start justify-between mb-2">
                  <Text className="font-semibold text-gray-900 flex-1">
                    {scan.foodName}
                  </Text>
                  <Text className="text-sm font-bold text-gray-900 ml-2">
                    {scan.calories} kal
                  </Text>
                </View>
                <View className="flex-row items-center mb-3">
                  <View className="flex-row items-center mr-4">
                    <Feather name="calendar" size={12} color="#6b7280" />
                    <Text className="text-xs text-gray-500 ml-1">{scan.date}</Text>
                  </View>
                  <View className="flex-row items-center">
                    <Feather name="clock" size={12} color="#6b7280" />
                    <Text className="text-xs text-gray-500 ml-1">{scan.time}</Text>
                  </View>
                </View>
                <View className="flex-row items-center">
                  <View className="flex-row items-center mr-4">
                    <View className="w-2 h-2 rounded-full bg-green-500 mr-1" />
                    <Text className="text-xs text-gray-600">P: {scan.protein}g</Text>
                  </View>
                  <View className="flex-row items-center mr-4">
                    <View className="w-2 h-2 rounded-full bg-blue-500 mr-1" />
                    <Text className="text-xs text-gray-600">C: {scan.carbs}g</Text>
                  </View>
                  <View className="flex-row items-center">
                    <View className="w-2 h-2 rounded-full bg-amber-500 mr-1" />
                    <Text className="text-xs text-gray-600">F: {scan.fats}g</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}