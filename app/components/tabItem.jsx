import { View, Text } from 'react-native';
import { useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';

export default function TabItem({ label, focused, children }) {
  // 1. Shared value = state visual
  const active = useSharedValue(0);

  // 2. TRIGGER: saat focused berubah
  useEffect(() => {
    active.value = focused ? 1 : 0;
  }, [focused]);

  // 3. Background animasi
  const bgStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(active.value, { duration: 500 }),
      transform: [
        { scale: withSpring(active.value ? 1.2 : 1) },
      ],
    };
  });

  // 4. Icon animasi
  const iconStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: withTiming(active.value ? -4 : 0) },
      ],
    };
  });

  if (focused) {
  return (
      <View className='flex flex-col items-center justify-center py-2 px-6  -mt-2 rounded-xl bg-green-100 '>
        <Animated.View
          style={bgStyle}
          className="rounded-xl bg-green-50 px-4 py-2"
        />

        <Animated.View style={iconStyle}>
          {children}
        </Animated.View>

        <Text style={{ fontSize: 14 }} className='text-neutral-600'>{label}</Text>
      </View>
    );
  }
  else{
    return (
      <View className='flex flex-col items-center justify-center py-2 px-6 rounded-xl bg-neutral-100'>
        <Animated.View
          
          className="rounded-xl bg-neutral-100 px-4 py-2"
        />
        <Animated.View >
          {children}
        </Animated.View>
        <Text style={{ fontSize: 12 }} className='text-neutral-600'>{label}</Text>
      </View>
    );
  
  }
  
}
