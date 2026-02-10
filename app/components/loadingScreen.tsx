import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';

interface LoadingScreenProps {
  message?: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  message = 'Memuat...' 
}) => {
  return (
    <View className="flex-1 bg-background-light justify-center items-center">
      <ActivityIndicator size="large" color="#37B37E" />
      <Text className="text-text-secondary-light text-lg mt-4">
        {message}
      </Text>
    </View>
  );
};

export default LoadingScreen;