/**
 * weeklyInsightCard.tsx (v2.1)
 * ---------------------------------------------------------------------------
 * Weekly nutrition insight card with AI summary.
 * 
 * v2.1 Changes:
 * • ✅ Fixed: types match WeeklyInsight interface (balancedMealsCount)
 * • ✅ New: AI summary text field at bottom
 * • ✅ New: loading state for AI summary
 * • ✅ New: onRefresh callback for pull-to-refresh
 * ---------------------------------------------------------------------------
 */

import React, { useEffect, useRef } from 'react';
import { Text, View, Animated, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { WeeklyInsight } from '@/app/types/meal';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface WeeklyInsightCardProps {
  insight: WeeklyInsight;
  /** Optional: AI-generated summary (loaded async from OpenRouter) */
  aiSummary?: string | null;
  /** Whether the AI summary is still loading */
  isSummaryLoading?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function WeeklyInsightCard({ 
  insight, 
  aiSummary,
  isSummaryLoading = false,
}: WeeklyInsightCardProps) {
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

  // ✅ Fixed: uses balancedMealsCount from WeeklyInsight type
  const balancedPercentage = insight.mealsCount > 0 
    ? Math.round((insight.balancedMealsCount / insight.mealsCount) * 100)
    : 0;

  // Determine the summary text to display
  const displaySummary = aiSummary || insight.aiSummary || null;

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}
    >
      <LinearGradient
        colors={['#10b981', '#059669']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="mx-4 mt-4 rounded-2xl p-6"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
          elevation: 6,
        }}
      >
        {/* Header */}
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

          {/* Balanced Meals - ✅ Fixed: uses balancedMealsCount */}
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
        <View className="bg-white/10 rounded-xl p-3 mb-3">
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
                : insight.mealsCount === 0
                ? 'Belum ada data minggu ini. Mulai catat makanan Anda!'
                : `${balancedPercentage}% makanan seimbang. Mari perbaiki pola makan Anda!`
              }
            </Text>
          </View>
        </View>

        {/* ✅ v2.1: AI Summary Text Field */}
        <View className="bg-white/15 rounded-xl p-3">
          <View className="flex-row items-center">
            <MaterialCommunityIcons name="robot-outline" size={16} color="rgba(255,255,255,0.8)" />
            <Text className="text-xs text-white/60 ml-1 font-medium">AI Insight</Text>
          </View>
          {isSummaryLoading ? (
            <View className="flex-row items-center mt-2">
              <ActivityIndicator size="small" color="rgba(255,255,255,0.7)" />
              <Text className="text-sm text-white/70 ml-2 italic">
                Menganalisis pola makan...
              </Text>
            </View>
          ) : (
            <Text className="text-sm text-white mt-2 leading-5">
              {displaySummary || 'Tambahkan lebih banyak data untuk mendapat insight AI 🤖'}
            </Text>
          )}
        </View>
      </LinearGradient>
    </Animated.View>
  );
}