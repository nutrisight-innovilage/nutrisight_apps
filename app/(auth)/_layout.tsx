/**
 * app/(auth)/_layout.tsx
 * ---------------------------------------------------------------------------
 * Auth layout - simple stack for login/register
 * ---------------------------------------------------------------------------
 */

import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useAuth } from '@/app/contexts/authContext';
import { View, ActivityIndicator } from 'react-native';

export default function AuthLayout() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      console.log('[Auth] Already authenticated, redirecting to tabs');
      router.replace('/(tabs)');
    }
  }, [isAuthenticated]);

  if (isAuthenticated) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#37B37E" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: '#f0fdf4',
        },
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
    </Stack>
  );
}