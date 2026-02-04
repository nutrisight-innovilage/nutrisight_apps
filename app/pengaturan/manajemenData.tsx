import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import CustomHeader from '../components/customHeader';

export default function ManajemenDataPage() {
  // Todo: Ganti dengan data nyata dari penyimpanan atau API
  const [storageStats] = useState({
    totalScans: 47,
    storageUsed: 124.5, // MB
    totalStorage: 500, // MB
    images: 89.2,
    data: 35.3,
  });


  // TODO: Implementasi fungsi clear cache berikut
  const handleClearCache = () => {
    Alert.alert(
      'Hapus Cache',
      'Apakah Anda yakin ingin menghapus cache aplikasi? Ini akan membersihkan file sementara.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: () => console.log('Cache cleared'),
        },
      ]
    );
  };

  // TODO: Implementasi fungsi clear history berikut
  const handleClearHistory = () => {
    Alert.alert(
      'Hapus Riwayat',
      'Apakah Anda yakin ingin menghapus semua riwayat pemindaian? Tindakan ini tidak dapat dibatalkan.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: () => console.log('History cleared'),
        },
      ]
    );
  };

  // TODO: Implementasi fungsi export data berikut
  const handleExportData = () => {
    console.log('Export data');
    Alert.alert('Ekspor Data', 'Data Anda sedang disiapkan untuk diunduh.');
  };

  // TODO: Implementasi fungsi delete account berikut
  const handleDeleteAccount = () => {
    Alert.alert(
      'Hapus Akun',
      'Apakah Anda yakin ingin menghapus akun Anda? Semua data akan dihapus secara permanen dan tidak dapat dipulihkan.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus Akun',
          style: 'destructive',
          onPress: () => console.log('Account deleted'),
        },
      ]
    );
  };

  // TODO: buat fungsi untuk menghitung persentase penyimpanan yang digunakan
  const storagePercent = (storageStats.storageUsed / storageStats.totalStorage) * 100;

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <CustomHeader
        heading="Manajemen Data"
        subHeading='kelola penyimpanan dan riwayat Anda'
        showBackButton={true}
      />
      
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Storage Card */}
        <View className="mb-5 bg-surface rounded-xl p-5" style={{ elevation: 2 }}>
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-bold text-text-primary">
              Penyimpanan
            </Text>
            <View className="bg-primary/10 rounded-full px-3 py-1">
              <Text className="text-xs font-semibold text-primary">
                {storageStats.totalScans} Pemindaian
              </Text>
            </View>
          </View>

          {/* Storage Bar */}
          <View className="mb-3">
            <View className="h-3 bg-overlay rounded-full overflow-hidden">
              <View
                className="h-full bg-primary rounded-full"
                style={{ width: `${storagePercent}%` }}
              />
            </View>
            <View className="flex-row justify-between mt-2">
              <Text className="text-xs text-text-secondary">
                {storageStats.storageUsed} MB terpakai
              </Text>
              <Text className="text-xs text-text-secondary">
                {storageStats.totalStorage} MB
              </Text>
            </View>
          </View>

          {/* Storage Breakdown */}
          <View className="mt-4 pt-4 border-t border-border" style={{ gap: 10 }}>
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center" style={{ gap: 8 }}>
                <View className="h-3 w-3 rounded-full bg-primary" />
                <Text className="text-sm text-text-secondary">Gambar</Text>
              </View>
              <Text className="text-sm font-medium text-text-primary">
                {storageStats.images} MB
              </Text>
            </View>
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center" style={{ gap: 8 }}>
                <View className="h-3 w-3 rounded-full bg-secondary" />
                <Text className="text-sm text-text-secondary">Data</Text>
              </View>
              <Text className="text-sm font-medium text-text-primary">
                {storageStats.data} MB
              </Text>
            </View>
          </View>
        </View>

        {/* Data Management Actions */}
        <Text className="mb-3 pl-1 text-xs font-semibold uppercase tracking-widest text-text-secondary">
          Kelola Data
        </Text>

        <View className="bg-surface rounded-lg overflow-hidden mb-5" style={{ elevation: 2 }}>
          {/* Clear Cache */}
          <TouchableOpacity
            onPress={handleClearCache}
            className="flex-row items-center px-4 py-4"
            style={{ gap: 14 }}
          >
            <View className="h-10 w-10 items-center justify-center rounded-full bg-overlay">
              <MaterialIcons name="cleaning-services" size={20} color="#37B37E" />
            </View>
            <View className="flex-1">
              <Text className="text-[15px] font-medium text-text-primary">
                Hapus Cache
              </Text>
              <Text className="mt-0.5 text-xs text-text-secondary">
                Bersihkan file sementara
              </Text>
            </View>
            <Ionicons name="chevron-forward-outline" size={18} color="#D1D5DB" />
          </TouchableOpacity>

          <View className="h-px bg-border" style={{ marginLeft: 68 }} />

          {/* Clear History */}
          <TouchableOpacity
            onPress={handleClearHistory}
            className="flex-row items-center px-4 py-4"
            style={{ gap: 14 }}
          >
            <View className="h-10 w-10 items-center justify-center rounded-full bg-overlay">
              <Ionicons name="trash-outline" size={20} color="#ffa726" />
            </View>
            <View className="flex-1">
              <Text className="text-[15px] font-medium text-text-primary">
                Hapus Riwayat
              </Text>
              <Text className="mt-0.5 text-xs text-text-secondary">
                Hapus semua riwayat pemindaian
              </Text>
            </View>
            <Ionicons name="chevron-forward-outline" size={18} color="#D1D5DB" />
          </TouchableOpacity>

          <View className="h-px bg-border" style={{ marginLeft: 68 }} />

          {/* Export Data */}
          <TouchableOpacity
            onPress={handleExportData}
            className="flex-row items-center px-4 py-4"
            style={{ gap: 14 }}
          >
            <View className="h-10 w-10 items-center justify-center rounded-full bg-overlay">
              <Ionicons name="download-outline" size={20} color="#1F78FF" />
            </View>
            <View className="flex-1">
              <Text className="text-[15px] font-medium text-text-primary">
                Ekspor Data
              </Text>
              <Text className="mt-0.5 text-xs text-text-secondary">
                Unduh salinan data Anda
              </Text>
            </View>
            <Ionicons name="chevron-forward-outline" size={18} color="#D1D5DB" />
          </TouchableOpacity>
        </View>

        {/* Auto-delete Settings */}
        <Text className="mb-3 pl-1 text-xs font-semibold uppercase tracking-widest text-text-secondary">
          Penghapusan Otomatis
        </Text>

        <View className="bg-surface rounded-lg overflow-hidden mb-5" style={{ elevation: 2 }}>
          <TouchableOpacity className="flex-row items-center px-4 py-4" style={{ gap: 14 }}>
            <View className="h-10 w-10 items-center justify-center rounded-full bg-overlay">
              <Ionicons name="timer-outline" size={20} color="#37B37E" />
            </View>
            <View className="flex-1">
              <Text className="text-[15px] font-medium text-text-primary">
                Hapus Otomatis
              </Text>
              <Text className="mt-0.5 text-xs text-text-secondary">
                Tidak aktif
              </Text>
            </View>
            <Ionicons name="chevron-forward-outline" size={18} color="#D1D5DB" />
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <Text className="mb-3 pl-1 text-xs font-semibold uppercase tracking-widest text-error">
          Zona Berbahaya
        </Text>

        <TouchableOpacity
          onPress={handleDeleteAccount}
          className="bg-error/10 rounded-lg px-4 py-4 flex-row items-center"
          style={{ gap: 12, elevation: 2 }}
        >
          <Ionicons name="warning-outline" size={20} color="#ef4444" />
          <View className="flex-1">
            <Text className="text-[15px] font-semibold text-error">
              Hapus Akun
            </Text>
            <Text className="mt-0.5 text-xs text-error/70">
              Hapus akun dan semua data secara permanen
            </Text>
          </View>
        </TouchableOpacity>

        {/* Info Box */}
        <View className="mt-5 bg-info/10 rounded-lg p-4 flex-row" style={{ gap: 12 }}>
          <Ionicons name="information-circle" size={20} color="#1F78FF" />
          <Text className="flex-1 text-xs text-text-secondary leading-5">
            Data yang dihapus tidak dapat dipulihkan. Pastikan Anda telah mengekspor
            data penting sebelum menghapus.
          </Text>
        </View>

        <View className="h-6" />
      </ScrollView>
    </View>
  );
}