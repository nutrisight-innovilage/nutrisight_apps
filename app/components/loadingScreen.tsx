import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface LoadingScreenProps {
  message?: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  message = 'Memuat...' 
}) => {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { 
        duration: 1000,
        easing: Easing.linear 
      }),
      -1,
      false
    );
  }, []);

  const spinnerStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <View className="flex-1 bg-background items-center justify-center px-6">
      {/* Animated Spinner */}
      <Animated.View 
        entering={FadeIn.duration(400)}
        style={spinnerStyle}
      >
        <View className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary" />
      </Animated.View>

      {/* Message Text */}
      <Animated.View entering={FadeIn.duration(400).delay(100)} className="mt-6">
        <Text className="text-text-secondary text-center text-lg">
          {message}
        </Text>
      </Animated.View>
    </View>
  );
};

export default LoadingScreen;