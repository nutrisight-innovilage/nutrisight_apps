import { Stack } from "expo-router";
import "./globals.css"
import 'react-native-gesture-handler';
import 'react-native-svg';
import { StackScreen } from "react-native-screens";

import { CartProvider } from './contexts/cartContext';

export default function RootLayout() {
  return <CartProvider>
      <Stack>

      <Stack.Screen 
        name="(tabs)"
        options={{
          headerShown: false }}
      />
      <Stack.Screen 
        name="pengaturan"
        options={{
          headerShown: false }}
      />
      <Stack.Screen 
        name="(auth)"
        options={{
          headerShown: false }}
      />  
      <Stack.Screen
        name="laukList"
        options={{
          headerShown: false }}
      />
      

    </Stack>;
  </CartProvider> 
}
