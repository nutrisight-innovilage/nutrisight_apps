import "./globals.css"
import 'react-native-gesture-handler';
import 'react-native-svg';
import { CartProvider } from './contexts/cartContext';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '@/app/contexts/authContext';
import { MenuProvider } from "./contexts/menuContext";

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
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, segments, loading]);

  return ( 
    <MenuProvider>
      <CartProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen 
            name="(auth)"
            options={{ headerShown: false }}
          />
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
    </MenuProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}