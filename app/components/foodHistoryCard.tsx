import React, { useEffect, useRef } from 'react';
import { Text, View, Animated, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { NutritionScan } from '@/app/types/meal';

interface FoodHistoryCardProps {
  scan: NutritionScan;
  index: number;
  onPress?: (scan: NutritionScan) => void;
}

export default function FoodHistoryCard({ scan, index, onPress }: FoodHistoryCardProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        delay: index * 80,
        useNativeDriver: true,
        friction: 8,
      }),
    ]).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      friction: 8,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
    }).start();
  };

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [
          { translateY: slideAnim },
          { scale: scaleAnim }
        ],
      }}
    >
      <Pressable
        onPress={() => onPress?.(scan)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <View 
          className="bg-white rounded-xl p-4 mb-3"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <View className="flex-row items-start justify-between mb-2">
            <Text className="font-semibold text-gray-900 flex-1 text-base">
              {scan.foodName}
            </Text>
            <View className="bg-primary/10 px-2 py-1 rounded-lg ml-2">
              <Text className="text-sm font-bold text-primary">
                {scan.calories} kal
              </Text>
            </View>
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
      </Pressable>
    </Animated.View>
  );
}