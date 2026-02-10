import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ErrorScreenProps {
  error: string;
  onRetry: () => void;
  title?: string;
}

const ErrorScreen: React.FC<ErrorScreenProps> = ({ 
  error, 
  onRetry,
  title = 'Terjadi Kesalahan'
}) => {
  return (
    <View className="flex-1 bg-background-light justify-center items-center px-6">
      <View className="bg-red-100 rounded-full p-6 mb-4">
        <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
      </View>
      
      <Text className="text-text-primary-light text-lg font-semibold mt-2">
        {title}
      </Text>
      
      <Text className="text-text-secondary-light text-center mt-2 text-base">
        {error}
      </Text>
      
      <TouchableOpacity
        onPress={onRetry}
        className="bg-primary-light px-6 py-3 rounded-lg mt-6 shadow-sm"
        activeOpacity={0.7}
      >
        <Text className="text-text-inverse-light font-semibold text-base">
          Coba Lagi
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default ErrorScreen;