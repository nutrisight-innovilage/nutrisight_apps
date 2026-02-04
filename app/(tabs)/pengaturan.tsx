import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';


// ─── Types ────────────────────────────────────────────────────────────────────
interface SettingItem {
  iconLib: 'Ionicons' | 'MaterialIcons';
  iconName: string;
  label: string;
  description: string;
  onPress?: () => void;
}

interface SettingsGroup {
  title: string;
  items: SettingItem[];
}

// ─── Dynamic Icon ─────────────────────────────────────────────────────────────
function DynamicIcon({
  lib,
  name,
  size,
  color,
}: {
  lib: 'Ionicons' | 'MaterialIcons';
  name: string;
  size: number;
  color: string;
}) {
  if (lib === 'MaterialIcons')
    return <MaterialIcons name={name as any} size={size} color={color} />;
  return <Ionicons name={name as any} size={size} color={color} />;
}

// ─── Settings Page ────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [pressedId, setPressedId] = useState<string | null>(null);
  const handleToPage = (page: string) => {
    console.log(`Navigate to ${page} page`);
    router.push(`/pengaturan/${page}` as any);
  }

  const settingsGroups: SettingsGroup[] = [
    {
      title: 'Akun',
      items: [
        {
          iconLib: 'Ionicons',
          iconName: 'person-outline',
          label: 'Profil',
          description: 'Kelola informasi pribadi Anda',
          onPress: () => handleToPage('profil'),
        },
        {
          iconLib: 'Ionicons',
          iconName: 'notifications-outline',
          label: 'Notifikasi',
          description: 'Konfigurasi notifikasi aplikasi',
          onPress: () => handleToPage('notifikasi'),
        },
      ],
    },
    {
      title: 'Privasi & Keamanan',
      items: [
        {
          iconLib: 'MaterialIcons',
          iconName: 'shield-outlined',
          label: 'informasi Privasi',
          description: 'ketahui kebijakan privasi dan data kami',
          onPress: () => handleToPage('termsAndCondition'),
        },
        {
          iconLib: 'MaterialIcons',
          iconName: 'storage',
          label: 'Manajemen Data',
          description: 'Kelola riwayat pemindaian Anda',
          onPress: () => handleToPage('manajemenData'),
        },
      ],
    },
    {
      title: 'Tentang',
      items: [
        {
          iconLib: 'Ionicons',
          iconName: 'information-circle-outline',
          label: 'Informasi Aplikasi',
          description: 'Versi 1.0.0',
          onPress: () => handleToPage('informasiAplikasi'),
        },
      ],
    },
  ];

  return (
    // root — flex-1, background.light
    <View className="flex-1 bg-background">
      {/* ── Header ────────────────────────────────────────────────────── */}
      <View
        className="bg-surface px-6 pb-4"
        style={{ paddingTop: 56, elevation: 3 }}  // paddingTop safe-area offset + elevation (Android)
      >
        <Text className="text-2xl font-bold text-text-primary">Pengaturan</Text>
        <Text className="mt-0.5 text-xs text-text-secondary">Kelola preferensi Anda</Text>
      </View>

      {/* ── ScrollView ────────────────────────────────────────────────── */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Profile Card ──────────────────────────────────────────── */}
        <LinearGradient
          colors={['#37B37E', '#2e9a6b']}  // primary → darker green
          start={[0, 0]}
          end={[1, 1]}
          className="rounded-xl p-5"
          style={{ elevation: 5 }}
        >
          <View className="flex-row items-center" style={{ gap: 14 }}>
            {/* Avatar */}
            <View className="h-[58px] w-[58px] items-center justify-center rounded-full bg-surface">
              <Ionicons name="person-outline" size={30} color="#37B37E" />
            </View>
            {/* Info */}
            <View className="flex-1">
              <Text className="text-lg font-bold text-text-inverse">Pengguna Tamu</Text>
              <Text className="mt-0.5 text-xs" style={{ color: '#a7f3d0' }}>
                tamu@nutrisight.app
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* ── Settings Groups ───────────────────────────────────────── */}
        {settingsGroups.map((group, gi) => (
          <View key={gi} className="mt-5">
            {/* Group title */}
            <Text className="mb-2 pl-1 text-xs font-semibold uppercase tracking-widest text-text-secondary">
              {group.title}
            </Text>

            {/* Card */}
            <View
              className="overflow-hidden rounded-lg bg-surface"
              style={{ elevation: 2 }}
            >
              {group.items.map((item, ii) => {
                const id = `${gi}-${ii}`;
                const isLast = ii === group.items.length - 1;
                const isPressed = pressedId === id;

                return (
                  <View key={id}>
                    {/* Row */}
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={item.onPress}
                      onPressIn={() => setPressedId(id)}
                      onPressOut={() => setPressedId(null)}
                      className={`flex-row items-center px-3.5 py-3.5 ${isPressed ? 'bg-overlay' : 'bg-surface'}`}
                      style={{ gap: 14 }}
                    >
                      {/* Icon badge */}
                      <View className="h-10 w-10 items-center justify-center rounded-full bg-overlay">
                        <DynamicIcon
                          lib={item.iconLib}
                          name={item.iconName}
                          size={20}
                          color="#37B37E"  // primary
                        />
                      </View>

                      {/* Label + description */}
                      <View className="flex-1">
                        <Text className="text-[15px] font-medium text-text-primary">
                          {item.label}
                        </Text>
                        <Text className="mt-0.5 text-xs text-text-secondary">
                          {item.description}
                        </Text>
                      </View>

                      {/* Chevron */}
                      <Ionicons name="chevron-forward-outline" size={18} color="#D1D5DB" />
                    </TouchableOpacity>

                    {/* Divider — offset melewati icon badge + gap */}
                    {!isLast && (
                      <View className="h-px bg-border" style={{ marginLeft: 68 }} />
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        ))}

        {/* ── Logout Button ─────────────────────────────────────────── */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => console.log('Logout')}
          className="mt-7 flex-row items-center justify-center rounded-lg bg-red-50 py-4"
          style={{ gap: 8, elevation: 2 }}
        >
          <Ionicons name="log-out-outline" size={20} color="#ef4444" />
          <Text className="text-[15px] font-semibold text-error">Keluar</Text>
        </TouchableOpacity>

        {/* Bottom spacer */}
        <View className="h-6" />
      </ScrollView>
    </View>
  );
}