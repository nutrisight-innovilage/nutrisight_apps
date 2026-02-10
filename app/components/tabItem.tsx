import { View, Text, ActivityIndicator } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  withSpring, 
  useSharedValue,
  withTiming 
} from 'react-native-reanimated';
import { useState, useEffect } from 'react';

interface TabItemProps {
  label: string;
  focused: boolean;
  children: React.ReactNode;
}

export default function TabItem({ label, focused, children }: TabItemProps) {
  const [mounted, setMounted] = useState(false);
  const scale = useSharedValue(1);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    scale.value = withSpring(focused ? 1.05 : 1, {
      damping: 15,
      stiffness: 150,
    });
  }, [focused]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (!mounted) {
    return (
      <View className='flex flex-col items-center justify-center py-2 px-6'>
        <ActivityIndicator size="small" color="#16a34a" />
      </View>
    );
  }

  return (
    <Animated.View style={animatedStyle}>
      <View className={`flex flex-col items-center justify-center gap-1 py-2 px-6 rounded-xl ${
        focused ? 'bg-green-100' : 'bg-neutral-100'
      }`}>
        {children}
        <Text 
          style={{ fontSize: focused ? 14 : 12 }} 
          className={`text-neutral-600 mt-1 ${focused ? 'font-semibold' : 'font-normal'}`}
        >
          {label}
        </Text>
      </View>
    </Animated.View>
  );
}