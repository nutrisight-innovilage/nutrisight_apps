import { Stack } from 'expo-router';

export default function PengaturanLayout() {
  return (
    <Stack screenOptions={{
            headerShown:false}}>
      
      <Stack.Screen
    name="profil"
    options={{ title: 'Profil Pengguna', headerShown: false }}
    />
    <Stack.Screen
    name="notifikasi"
    options={{ title: 'Notifikasi', headerShown: false }}
    />
    <Stack.Screen
    name="informasiAplikasi"
    options={{ title: 'Informasi Aplikasi', headerShown: false }}
    />
    <Stack.Screen
    name="manajemenData"
    options={{ title: 'Manajemen Data', headerShown: false }}
    />
    <Stack.Screen
    name="informasiPrivasi"
    options={{ title: 'Informasi Privasi', headerShown: false }}
    />
    <Stack.Screen
    name='syncStatusPage'
    options={{ title: 'Status Sinkronisasi', headerShown: false }}
    />
    </Stack>
  );
}
