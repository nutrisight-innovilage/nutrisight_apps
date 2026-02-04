import React, { useState } from 'react';
import { View, Text, ScrollView, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CustomHeader from '../components/customHeader';

// TODO: masukkan interface NotificationSetting ke types/pengaturan
interface NotificationSetting {
  id: string;
  icon: string;
  label: string;
  description: string;
  enabled: boolean;
}

export default function NotifikasiPage() {
  const [notifications, setNotifications] = useState<NotificationSetting[]>([
    {
      id: 'scan',
      icon: 'scan-outline',
      label: 'Hasil Pemindaian',
      description: 'Notifikasi saat pemindaian selesai',
      enabled: true,
    },
    {
      id: 'tips',
      icon: 'bulb-outline',
      label: 'Tips Kesehatan',
      description: 'Saran nutrisi harian',
      enabled: true,
    },
    {
      id: 'reminder',
      icon: 'time-outline',
      label: 'Pengingat',
      description: 'Pengingat untuk memindai makanan',
      enabled: false,
    },
    {
      id: 'updates',
      icon: 'newspaper-outline',
      label: 'Pembaruan Aplikasi',
      description: 'Info fitur dan pembaruan baru',
      enabled: true,
    },
    {
      id: 'promo',
      icon: 'gift-outline',
      label: 'Promosi & Penawaran',
      description: 'Penawaran khusus dan diskon',
      enabled: false,
    },
  ]);

  // TODO: buat fungsi toggleNotification
  const toggleNotification = (id: string) => {
    setNotifications((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, enabled: !item.enabled } : item
      )
    );
  };

  const enabledCount = notifications.filter((n) => n.enabled).length;

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      
      <CustomHeader
        heading="Notifikasi"
        subHeading='kelola preferensi notifikasi Anda'
        showBackButton={true}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Card */}
        <View className="mb-5 bg-primary/10 rounded-lg p-4 flex-row items-center" style={{ gap: 12 }}>
          <View className="h-12 w-12 items-center justify-center rounded-full bg-primary">
            <Ionicons name="notifications-outline" size={24} color="#ffffff" />
          </View>
          <View className="flex-1">
            <Text className="text-lg font-bold text-text-primary">
              {enabledCount} Aktif
            </Text>
            <Text className="text-xs text-text-secondary">
              dari {notifications.length} notifikasi
            </Text>
          </View>
        </View>

        {/* Notification Settings */}
        <Text className="mb-3 pl-1 text-xs font-semibold uppercase tracking-widest text-text-secondary">
          Jenis Notifikasi
        </Text>

        <View className="bg-surface rounded-lg overflow-hidden" style={{ elevation: 2 }}>
          {notifications.map((item, index) => {
            const isLast = index === notifications.length - 1;

            return (
              <View key={item.id}>
                <View className="flex-row items-center px-4 py-4" style={{ gap: 14 }}>
                  {/* Icon */}
                  <View className="h-10 w-10 items-center justify-center rounded-full bg-overlay">
                    <Ionicons
                      name={item.icon as any}
                      size={20}
                      color={item.enabled ? '#37B37E' : '#D1D5DB'}
                    />
                  </View>

                  {/* Label & Description */}
                  <View className="flex-1">
                    <Text className="text-[15px] font-medium text-text-primary">
                      {item.label}
                    </Text>
                    <Text className="mt-0.5 text-xs text-text-secondary">
                      {item.description}
                    </Text>
                  </View>

                  {/* Switch */}
                  <Switch
                    value={item.enabled}
                    onValueChange={() => toggleNotification(item.id)}
                    trackColor={{ false: '#D1D5DB', true: '#37B37E' }}
                    thumbColor={item.enabled ? '#ffffff' : '#f4f4f5'}
                  />
                </View>

                {!isLast && (
                  <View className="h-px bg-border" style={{ marginLeft: 68 }} />
                )}
              </View>
            );
          })}
        </View>

        {/* Sound & Vibration */}
        <Text className="mt-6 mb-3 pl-1 text-xs font-semibold uppercase tracking-widest text-text-secondary">
          Pengaturan Lainnya
        </Text>

        <View className="bg-surface rounded-lg overflow-hidden" style={{ elevation: 2 }}>
          <View className="flex-row items-center px-4 py-4" style={{ gap: 14 }}>
            <View className="h-10 w-10 items-center justify-center rounded-full bg-overlay">
              <Ionicons name="volume-high-outline" size={20} color="#37B37E" />
            </View>
            <View className="flex-1">
              <Text className="text-[15px] font-medium text-text-primary">Suara</Text>
              <Text className="mt-0.5 text-xs text-text-secondary">
                Mainkan suara notifikasi
              </Text>
            </View>
            <Switch
              value={true}
              trackColor={{ false: '#D1D5DB', true: '#37B37E' }}
              thumbColor="#ffffff"
            />
          </View>

          <View className="h-px bg-border" style={{ marginLeft: 68 }} />

          <View className="flex-row items-center px-4 py-4" style={{ gap: 14 }}>
            <View className="h-10 w-10 items-center justify-center rounded-full bg-overlay">
              <Ionicons name="phone-portrait-outline" size={20} color="#37B37E" />
            </View>
            <View className="flex-1">
              <Text className="text-[15px] font-medium text-text-primary">Getar</Text>
              <Text className="mt-0.5 text-xs text-text-secondary">
                Getarkan perangkat
              </Text>
            </View>
            <Switch
              value={true}
              trackColor={{ false: '#D1D5DB', true: '#37B37E' }}
              thumbColor="#ffffff"
            />
          </View>
        </View>

        {/* Info Box */}
        <View className="mt-5 bg-info/10 rounded-lg p-4 flex-row" style={{ gap: 12 }}>
          <Ionicons name="information-circle" size={20} color="#1F78FF" />
          <Text className="flex-1 text-xs text-text-secondary leading-5">
            Notifikasi membantu Anda tetap terinformasi tentang aktivitas dan
            pembaruan penting dalam aplikasi.
          </Text>
        </View>

        <View className="h-6" />
      </ScrollView>
    </View>
  );
}