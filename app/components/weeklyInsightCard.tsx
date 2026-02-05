import React, { useEffect, useRef } from 'react';
import { Text, View, Animated } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { WeeklyInsight } from '@/app/types/nutrition';

interface WeeklyInsightCardProps {
  insight: WeeklyInsight;
}

export default function WeeklyInsightCard({ insight }: WeeklyInsightCardProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const balancedPercentage = insight.mealsCount > 0 
    ? Math.round((insight.balancedMealsCount / insight.mealsCount) * 100)
    : 0;

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}
    >
      <View 
        className="bg-gradient-to-br from-primary to-primary/80 mx-4 mt-4 rounded-2xl p-6"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
          elevation: 6,
        }}
      >
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-lg font-bold text-white">
            Insight Seminggu Terakhir
          </Text>
          <View className="w-10 h-10 bg-white/20 rounded-full items-center justify-center">
            <MaterialCommunityIcons name="chart-line" size={24} color="white" />
          </View>
        </View>

        {/* Main Stats Grid */}
        <View className="flex-row flex-wrap -mx-2 mb-4">
          {/* Total Meals */}
          <View className="w-1/2 px-2 mb-3">
            <View className="bg-white/20 rounded-xl p-3">
              <View className="flex-row items-center mb-1">
                <Feather name="hash" size={14} color="white" />
                <Text className="text-xs text-white/80 ml-1">Total Makanan</Text>
              </View>
              <Text className="text-2xl font-bold text-white">
                {insight.mealsCount}
              </Text>
            </View>
          </View>

          {/* Avg Calories */}
          <View className="w-1/2 px-2 mb-3">
            <View className="bg-white/20 rounded-xl p-3">
              <View className="flex-row items-center mb-1">
                <MaterialCommunityIcons name="fire" size={14} color="white" />
                <Text className="text-xs text-white/80 ml-1">Rata-rata Kalori</Text>
              </View>
              <Text className="text-2xl font-bold text-white">
                {insight.avgCalories}
              </Text>
            </View>
          </View>

          {/* Balanced Meals */}
          <View className="w-1/2 px-2 mb-3">
            <View className="bg-white/20 rounded-xl p-3">
              <View className="flex-row items-center mb-1">
                <Feather name="check-circle" size={14} color="white" />
                <Text className="text-xs text-white/80 ml-1">Seimbang</Text>
              </View>
              <Text className="text-2xl font-bold text-white">
                {insight.balancedMealsCount}
              </Text>
            </View>
          </View>

          {/* Total Calories */}
          <View className="w-1/2 px-2 mb-3">
            <View className="bg-white/20 rounded-xl p-3">
              <View className="flex-row items-center mb-1">
                <MaterialCommunityIcons name="sigma" size={14} color="white" />
                <Text className="text-xs text-white/80 ml-1">Total Kalori</Text>
              </View>
              <Text className="text-2xl font-bold text-white">
                {insight.totalCalories}
              </Text>
            </View>
          </View>
        </View>

        {/* Macro Breakdown */}
        <View className="bg-white/10 rounded-xl p-4 mb-3">
          <Text className="text-sm font-semibold text-white mb-3">
            Total Makronutrien
          </Text>
          <View className="space-y-2">
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center">
                <View className="w-3 h-3 rounded-full bg-green-400 mr-2" />
                <Text className="text-sm text-white">Protein</Text>
              </View>
              <Text className="text-sm font-bold text-white">
                {insight.totalProtein}g
              </Text>
            </View>
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center">
                <View className="w-3 h-3 rounded-full bg-blue-400 mr-2" />
                <Text className="text-sm text-white">Karbohidrat</Text>
              </View>
              <Text className="text-sm font-bold text-white">
                {insight.totalCarbs}g
              </Text>
            </View>
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <View className="w-3 h-3 rounded-full bg-amber-400 mr-2" />
                <Text className="text-sm text-white">Lemak</Text>
              </View>
              <Text className="text-sm font-bold text-white">
                {insight.totalFats}g
              </Text>
            </View>
          </View>
        </View>

        {/* Progress Message */}
        <View className="bg-white/10 rounded-xl p-3">
          <View className="flex-row items-center">
            <Feather 
              name={balancedPercentage >= 70 ? "trending-up" : balancedPercentage >= 40 ? "activity" : "trending-down"} 
              size={18} 
              color="white" 
            />
            <Text className="text-sm text-white ml-2 flex-1">
              {balancedPercentage >= 70 
                ? `Luar biasa! ${balancedPercentage}% makanan Anda seimbang.`
                : balancedPercentage >= 40
                ? `Bagus! ${balancedPercentage}% makanan Anda seimbang. Terus tingkatkan!`
                : `${balancedPercentage}% makanan seimbang. Mari perbaiki pola makan Anda!`
              }
            </Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}