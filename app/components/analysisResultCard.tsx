/**
 * analysisResultCard.tsx
 * ---------------------------------------------------------------------------
 * Shows the result of AI food photo analysis.
 * Displays detected foods, confidence, and total nutrition.
 * 
 * Actions: Save to history, Retake photo, Dismiss
 * ---------------------------------------------------------------------------
 */

import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { AIDetectedFood } from '@/app/types/meal';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AnalysisResultCardProps {
  /** URI of the analyzed photo */
  photoUri: string;
  /** Detected foods from AI */
  foods: AIDetectedFood[];
  /** Total nutrition summary */
  totalNutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
  /** AI meal description */
  mealDescription: string;
  /** Save result to history */
  onSave: () => void;
  /** Retake / reanalyze */
  onRetake: () => void;
  /** Dismiss / close */
  onDismiss: () => void;
  /** Whether save is in progress */
  isSaving?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) return '#10b981'; // green
  if (confidence >= 0.5) return '#f59e0b'; // amber
  return '#ef4444'; // red
}

function getConfidenceLabel(confidence: number): string {
  if (confidence >= 0.8) return 'Tinggi';
  if (confidence >= 0.5) return 'Sedang';
  return 'Rendah';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AnalysisResultCard({
  photoUri,
  foods,
  totalNutrition,
  mealDescription,
  onSave,
  onRetake,
  onDismiss,
  isSaving = false,
}: AnalysisResultCardProps) {
  return (
    <ScrollView className="flex-1 bg-gray-50" contentContainerStyle={{ paddingBottom: 32 }}>
      {/* Photo Preview */}
      <Animated.View entering={FadeInUp.duration(400)}>
        <View className="relative">
          <Image
            source={{ uri: photoUri }}
            className="w-full"
            style={{ aspectRatio: 4 / 3 }}
            resizeMode="cover"
          />
          {/* Close button */}
          <TouchableOpacity
            onPress={onDismiss}
            className="absolute top-12 right-4 bg-black/50 rounded-full p-2"
            activeOpacity={0.75}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>

          {/* Success badge */}
          <View className="absolute bottom-4 left-4 bg-green-500 rounded-full px-4 py-2 flex-row items-center">
            <Feather name="check-circle" size={16} color="white" />
            <Text className="text-white font-semibold text-sm ml-2">
              Analisis Selesai
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Meal Description */}
      {mealDescription ? (
        <Animated.View entering={FadeInUp.duration(400).delay(100)} className="mx-4 mt-4">
          <View className="bg-white rounded-xl p-4 flex-row items-center" style={{
            shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05, shadowRadius: 2, elevation: 2,
          }}>
            <MaterialCommunityIcons name="food-variant" size={24} color="#10b981" />
            <Text className="text-base font-medium text-gray-800 ml-3 flex-1">
              {mealDescription}
            </Text>
          </View>
        </Animated.View>
      ) : null}

      {/* Total Nutrition Summary */}
      <Animated.View entering={FadeInUp.duration(400).delay(200)} className="mx-4 mt-4">
        <View className="bg-white rounded-2xl p-5" style={{
          shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05, shadowRadius: 2, elevation: 2,
        }}>
          <Text className="text-lg font-bold text-gray-900 mb-4">
            Total Nutrisi
          </Text>

          <View className="flex-row justify-between">
            {/* Calories */}
            <View className="items-center flex-1">
              <View className="w-14 h-14 bg-orange-100 rounded-full items-center justify-center mb-2">
                <MaterialCommunityIcons name="fire" size={28} color="#f97316" />
              </View>
              <Text className="text-xl font-bold text-gray-900">
                {totalNutrition.calories}
              </Text>
              <Text className="text-xs text-gray-500">Kalori</Text>
            </View>

            {/* Protein */}
            <View className="items-center flex-1">
              <View className="w-14 h-14 bg-green-100 rounded-full items-center justify-center mb-2">
                <Text className="text-lg font-bold text-green-600">P</Text>
              </View>
              <Text className="text-xl font-bold text-gray-900">
                {totalNutrition.protein}g
              </Text>
              <Text className="text-xs text-gray-500">Protein</Text>
            </View>

            {/* Carbs */}
            <View className="items-center flex-1">
              <View className="w-14 h-14 bg-blue-100 rounded-full items-center justify-center mb-2">
                <Text className="text-lg font-bold text-blue-600">K</Text>
              </View>
              <Text className="text-xl font-bold text-gray-900">
                {totalNutrition.carbs}g
              </Text>
              <Text className="text-xs text-gray-500">Karbo</Text>
            </View>

            {/* Fats */}
            <View className="items-center flex-1">
              <View className="w-14 h-14 bg-amber-100 rounded-full items-center justify-center mb-2">
                <Text className="text-lg font-bold text-amber-600">L</Text>
              </View>
              <Text className="text-xl font-bold text-gray-900">
                {totalNutrition.fats}g
              </Text>
              <Text className="text-xs text-gray-500">Lemak</Text>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Detected Foods List */}
      <Animated.View entering={FadeInUp.duration(400).delay(300)} className="mx-4 mt-4">
        <View className="bg-white rounded-2xl p-5" style={{
          shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05, shadowRadius: 2, elevation: 2,
        }}>
          <Text className="text-lg font-bold text-gray-900 mb-4">
            Makanan Terdeteksi ({foods.length})
          </Text>

          {foods.map((food, index) => (
            <View
              key={index}
              className={`flex-row items-center py-3 ${
                index < foods.length - 1 ? 'border-b border-gray-100' : ''
              }`}
            >
              {/* Food icon */}
              <View className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center mr-3">
                <MaterialCommunityIcons name="food" size={20} color="#6b7280" />
              </View>

              {/* Food details */}
              <View className="flex-1">
                <Text className="text-sm font-semibold text-gray-900">
                  {food.name}
                </Text>
                <Text className="text-xs text-gray-500 mt-0.5">
                  ~{food.estimatedGrams}g · {food.nutrition.calories} kal
                </Text>
              </View>

              {/* Confidence badge */}
              <View
                className="px-2 py-1 rounded-full"
                style={{ backgroundColor: `${getConfidenceColor(food.confidence)}20` }}
              >
                <Text
                  className="text-xs font-medium"
                  style={{ color: getConfidenceColor(food.confidence) }}
                >
                  {getConfidenceLabel(food.confidence)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </Animated.View>

      {/* Action Buttons */}
      <Animated.View entering={FadeInDown.duration(400).delay(400)} className="mx-4 mt-6">
        {/* Save Button */}
        <TouchableOpacity
          onPress={onSave}
          disabled={isSaving}
          className={`w-full rounded-xl py-4 flex-row items-center justify-center ${
            isSaving ? 'bg-green-400' : 'bg-green-600'
          }`}
          activeOpacity={0.75}
        >
          <Ionicons name="checkmark-circle" size={22} color="#fff" />
          <Text className="text-white font-semibold text-base ml-2">
            {isSaving ? 'Menyimpan...' : 'Simpan ke Riwayat'}
          </Text>
        </TouchableOpacity>

        {/* Retake Button */}
        <TouchableOpacity
          onPress={onRetake}
          className="w-full mt-3 bg-gray-200 rounded-xl py-3 flex-row items-center justify-center"
          activeOpacity={0.75}
        >
          <Ionicons name="camera" size={20} color="#374151" />
          <Text className="text-gray-800 font-semibold text-base ml-2">
            Ambil Ulang
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </ScrollView>
  );
}