import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Switch, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CustomHeader from '@/app/components/customHeader';
import { NotificationSetting } from '@/app/types/pengaturan';
import { NotificationService } from '@/app/services/notificationAPI';
import * as Notifications from 'expo-notifications';

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

  const [sound, setSound] = useState(true);
  const [vibration, setVibration] = useState(true);
  const [permissionGranted, setPermissionGranted] = useState(false);

  useEffect(() => {
    initializeNotifications();
    loadPreferences();

    // Setup notification listeners
    const responseSubscription = NotificationService.addNotificationResponseListener(
      (response) => {
        console.log('Notification response:', response);
        // Handle notification tap
      }
    );

    const receivedSubscription = NotificationService.addNotificationReceivedListener(
      (notification) => {
        console.log('Notification received:', notification);
      }
    );

    return () => {
      responseSubscription.remove();
      receivedSubscription.remove();
    };
  }, []);

  const initializeNotifications = async () => {
    const granted = await NotificationService.requestPermissions();
    setPermissionGranted(granted);
    
    if (!granted) {
      Alert.alert(
        'Izin Notifikasi',
        'Aplikasi memerlukan izin notifikasi untuk mengirim pengingat dan update. Silakan aktifkan di pengaturan.',
        [{ text: 'OK' }]
      );
    }
  };

  const loadPreferences = async () => {
    const preferences = await NotificationService.loadPreferences();
    if (preferences) {
      setNotifications(preferences.notifications);
      setSound(preferences.sound);
      setVibration(preferences.vibration);
    }
  };

  const savePreferences = async (
    updatedNotifications: NotificationSetting[],
    updatedSound: boolean,
    updatedVibration: boolean
  ) => {
    await NotificationService.savePreferences({
      notifications: updatedNotifications,
      sound: updatedSound,
      vibration: updatedVibration,
    });
  };

  const toggleNotification = async (id: string) => {
    const updatedNotifications = notifications.map((item) =>
      item.id === id ? { ...item, enabled: !item.enabled } : item
    );

    setNotifications(updatedNotifications);
    await savePreferences(updatedNotifications, sound, vibration);

    // Handle specific notification types
    const toggledItem = updatedNotifications.find((item) => item.id === id);
    if (toggledItem) {
      if (id === 'reminder' && toggledItem.enabled) {
        // Setup daily reminder
        await NotificationService.setupDailyReminder(12, 0);
        
        // Send test notification
        await NotificationService.sendNotification({
          title: 'Pengingat Diaktifkan! ⏰',
          body: 'Anda akan menerima pengingat harian untuk scan makanan',
        });
      } else if (id === 'reminder' && !toggledItem.enabled) {
        // Cancel all reminders
        const scheduled = await NotificationService.getAllScheduledNotifications();
        for (const notif of scheduled) {
          await NotificationService.cancelNotification(notif.identifier);
        }
      } else if (id === 'tips' && toggledItem.enabled) {
        // Send sample health tip
        await NotificationService.sendHealthTipNotification(
          'Minum air putih minimal 8 gelas sehari untuk menjaga hidrasi tubuh'
        );
      }
    }
  };

  const toggleSound = async () => {
    const newValue = !sound;
    setSound(newValue);
    await savePreferences(notifications, newValue, vibration);
  };

  const toggleVibration = async () => {
    const newValue = !vibration;
    setVibration(newValue);
    await savePreferences(notifications, sound, newValue);
  };

  const enabledCount = notifications.filter((n) => n.enabled).length;

  return (
    <View className="flex-1 bg-background">
      <CustomHeader
        heading="Notifikasi"
        subHeading="kelola preferensi notifikasi Anda"
        showBackButton={true}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Card */}
        <View
          className="mb-5 bg-primary/10 rounded-lg p-4 flex-row items-center"
          style={{ gap: 12 }}
        >
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
          {!permissionGranted && (
            <View className="px-2 py-1 bg-error/10 rounded">
              <Text className="text-xs text-error font-medium">No Permission</Text>
            </View>
          )}
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
                <View
                  className="flex-row items-center px-4 py-4"
                  style={{ gap: 14 }}
                >
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
                    disabled={!permissionGranted}
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
              <Ionicons
                name="volume-high-outline"
                size={20}
                color={sound ? '#37B37E' : '#D1D5DB'}
              />
            </View>
            <View className="flex-1">
              <Text className="text-[15px] font-medium text-text-primary">
                Suara
              </Text>
              <Text className="mt-0.5 text-xs text-text-secondary">
                Mainkan suara notifikasi
              </Text>
            </View>
            <Switch
              value={sound}
              onValueChange={toggleSound}
              trackColor={{ false: '#D1D5DB', true: '#37B37E' }}
              thumbColor={sound ? '#ffffff' : '#f4f4f5'}
            />
          </View>

          <View className="h-px bg-border" style={{ marginLeft: 68 }} />

          <View className="flex-row items-center px-4 py-4" style={{ gap: 14 }}>
            <View className="h-10 w-10 items-center justify-center rounded-full bg-overlay">
              <Ionicons
                name="phone-portrait-outline"
                size={20}
                color={vibration ? '#37B37E' : '#D1D5DB'}
              />
            </View>
            <View className="flex-1">
              <Text className="text-[15px] font-medium text-text-primary">
                Getar
              </Text>
              <Text className="mt-0.5 text-xs text-text-secondary">
                Getarkan perangkat
              </Text>
            </View>
            <Switch
              value={vibration}
              onValueChange={toggleVibration}
              trackColor={{ false: '#D1D5DB', true: '#37B37E' }}
              thumbColor={vibration ? '#ffffff' : '#f4f4f5'}
            />
          </View>
        </View>

        {/* Info Box */}
        <View
          className="mt-5 bg-info/10 rounded-lg p-4 flex-row"
          style={{ gap: 12 }}
        >
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