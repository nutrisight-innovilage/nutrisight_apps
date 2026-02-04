import { Stack } from 'expo-router';

export default function LaukListLayout() {
  return (
    <Stack screenOptions={{
            headerShown:false}}>
      <Stack.Screen
        name="index"
        options={{ title: 'Daftar Lauk' }}
      />
      <Stack.Screen
        name="foodCard/[id]"
        options={{ title: 'Detail Lauk', headerShown: false }}
      />
      <Stack.Screen
        name='piring'
        options={{ title: 'Piring Saya', headerShown: false }}
      />
    </Stack>
  );
}
