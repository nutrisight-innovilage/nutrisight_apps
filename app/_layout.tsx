import { Stack } from "expo-router";
import "./globals.css"
import 'react-native-gesture-handler';
import 'react-native-svg';
import { StackScreen } from "react-native-screens";



export default function RootLayout() {
  return <Stack>

    <Stack.Screen 
      name="(tabs)"
      options={{
        headerShown: false }}
    />
    
    

  </Stack>;
}
