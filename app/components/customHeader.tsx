import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

interface CustomHeaderProps {
  heading: string;
  subHeading?: string;
  showBackButton?: boolean;
}

export default function CustomHeader({
  heading,
  subHeading,
  showBackButton = true,
}: CustomHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    try {
      // Cobagunakan router.back()
      if (router.canGoBack()) {
        router.back();
      } else {
        // Fallback ke /home jika tidak bisa back
        router.replace('/(tabs)');
      }
    } catch (error) {
      // Jika terjadi error, langsung ke /home
      router.replace('/(tabs)');
    }
  };

  return (
    <SafeAreaView edges={['top']}>
<View
      className="bg-surface px-6 pb-2 mt-2 flex-row items-center"
    >
      {showBackButton && (
        <TouchableOpacity
          onPress={handleBack}
          className="mr-4 h-10 w-10 items-center justify-center rounded-full bg-overlay"
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color="#1F2937" />
        </TouchableOpacity>
      )}

      <View className="flex-1">
        <Text className="text-2xl font-bold text-text-primary">
          {heading}
        </Text>
        {subHeading && (
          <Text className="mt-0.5 text-xs text-text-secondary">
            {subHeading}
          </Text>
        )}
      </View>
    </View>
    </SafeAreaView>
    
  );
}