import "./globals.css"
import 'react-native-gesture-handler';
import 'react-native-svg';
import { CartProvider } from './contexts/cartContext';

import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '@/app/contexts/authContext';

function RootLayoutNav() {
  const { isAuthenticated, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';
    const inProtectedRoute = inTabsGroup || segments[0] === 'pengaturan' || segments[0] === 'laukList';

    if (!isAuthenticated && inProtectedRoute) {
      // Redirect to login if not authenticated and trying to access protected routes
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      // Redirect to app if authenticated and on auth screens
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, segments, loading, router]);

  return (
    <CartProvider>
      <Stack screenOptions={{ headerShown: false }}>
        {/* Auth routes - accessible when NOT authenticated */}
        <Stack.Screen 
          name="(auth)"
          options={{ headerShown: false }}
        />
        
        {/* Protected routes - accessible when authenticated */}
        <Stack.Screen 
          name="(tabs)"
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="pengaturan"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="laukList"
          options={{ headerShown: false }}
        />
      </Stack>
    </CartProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}