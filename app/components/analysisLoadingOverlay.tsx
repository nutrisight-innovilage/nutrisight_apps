/**
 * analysisLoadingOverlay.tsx
 * ---------------------------------------------------------------------------
 * Full-screen overlay shown while AI is analyzing a food photo.
 * Shows a pulsing animation with status text.
 * ---------------------------------------------------------------------------
 */

import React, { useEffect } from 'react';
import { View, Text, Modal } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface AnalysisLoadingOverlayProps {
  visible: boolean;
  message?: string;
}

export default function AnalysisLoadingOverlay({ 
  visible, 
  message = 'Menganalisis makanan...' 
}: AnalysisLoadingOverlayProps) {
  const pulse = useSharedValue(1);
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      rotation.value = withRepeat(
        withTiming(360, { duration: 3000, easing: Easing.linear }),
        -1,
        false
      );
    }
  }, [visible]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const rotateStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View className="flex-1 bg-black/70 items-center justify-center px-8">
        <Animated.View entering={FadeIn.duration(300)}>
          <View className="bg-white rounded-3xl p-8 items-center w-full max-w-sm"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.25,
              shadowRadius: 16,
              elevation: 10,
            }}
          >
            {/* Animated Icon */}
            <Animated.View style={pulseStyle} className="mb-6">
              <View className="w-24 h-24 bg-green-100 rounded-full items-center justify-center">
                <Animated.View style={rotateStyle}>
                  <MaterialCommunityIcons name="food-apple-outline" size={48} color="#10b981" />
                </Animated.View>
              </View>
            </Animated.View>

            {/* Status Text */}
            <Text className="text-lg font-bold text-gray-900 text-center mb-2">
              {message}
            </Text>
            <Text className="text-sm text-gray-500 text-center">
              AI sedang mengidentifikasi makanan dan menghitung nutrisi
            </Text>

            {/* Progress dots */}
            <View className="flex-row mt-6 space-x-2">
              {[0, 1, 2].map((i) => (
                <ProgressDot key={i} delay={i * 200} />
              ))}
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Progress Dot Sub-component
// ---------------------------------------------------------------------------

function ProgressDot({ delay }: { delay: number }) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    const startDelay = setTimeout(() => {
      opacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 400 }),
          withTiming(0.3, { duration: 400 })
        ),
        -1,
        true
      );
    }, delay);

    return () => clearTimeout(startDelay);
  }, []);

  const dotStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={dotStyle}
      className="w-3 h-3 rounded-full bg-green-500 mx-1"
    />
  );
}