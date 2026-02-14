/**
 * app/index.tsx
 * ---------------------------------------------------------------------------
 * Entry point - handles initial routing based on auth status
 * ---------------------------------------------------------------------------
 */

import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator, Text } from 'react-native';
import { useAuth } from '@/app/contexts/authContext';

export default function Index() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    // Redirect based on auth status
    if (isAuthenticated) {
      console.log('[Index] User authenticated, redirecting to tabs');
      router.replace('/(tabs)');
    } else {
      console.log('[Index] User not authenticated, redirecting to login');
      router.replace('/(auth)/login');
    }
  }, [isAuthenticated, loading]);

  // Show loading while checking auth
  return (
    <View className="flex-1 bg-background items-center justify-center">
      <ActivityIndicator size="large" color="#37B37E" />
      <Text className="mt-4 text-text-secondary">Loading...</Text>
    </View>
  );
}