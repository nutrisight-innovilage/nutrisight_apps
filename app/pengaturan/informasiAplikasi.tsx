import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import CustomHeader from '../components/customHeader';

export default function InformasiAplikasiPage() {
  const appInfo = {
    version: '1.0.0',
    buildNumber: '2025.01.15',
    lastUpdate: '15 Januari 2025',
  };

  const teamMembers = [
    { name: 'Development Team', role: 'Engineering' },
    { name: 'Design Team', role: 'UI/UX Design' },
    { name: 'AI Team', role: 'Machine Learning' },
  ];

  const links: Array<{
    icon: string;
    iconLib: 'Ionicons' | 'MaterialIcons';
    label: string;
    value: string;
    url: string;
  }> = [
    {
      icon: 'globe-outline',
      iconLib: 'Ionicons',
      label: 'Website',
      value: 'nutrisight.app',
      url: 'https://nutrisight.app',
    },
    {
      icon: 'mail-outline',
      iconLib: 'Ionicons',
      label: 'Email Support',
      value: 'support@nutrisight.app',
      url: 'mailto:support@nutrisight.app',
    },
    {
      icon: 'logo-github',
      iconLib: 'Ionicons',
      label: 'GitHub',
      value: 'github.com/nutrisight',
      url: 'https://github.com/nutrisight',
    },
  ];

  const features = [
    'Pemindaian makanan dengan AI',
    'Analisis nutrisi real-time',
    'Riwayat pemindaian',
    'Rekomendasi kesehatan',
    'Mode offline',
  ];

  const openUrl = (url: string) => {
    Linking.openURL(url);
  };

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <CustomHeader
        heading="Informasi Aplikasi"
        subHeading='tentang nutrisight'
        showBackButton={true}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* App Logo & Version */}
        <View className="mb-5 bg-surface rounded-xl p-6 items-center" style={{ elevation: 2 }}>
          <View className="h-20 w-20 items-center justify-center rounded-2xl bg-primary mb-4">
            <Ionicons name="nutrition-outline" size={40} color="#ffffff" />
          </View>
          <Text className="text-2xl font-bold text-text-primary">NutriSight</Text>
          <Text className="mt-1 text-sm text-text-secondary">
            Scan. Analyze. Live Healthy.
          </Text>
          <View className="mt-4 bg-overlay rounded-full px-4 py-2">
            <Text className="text-xs font-semibold text-primary">
              Version {appInfo.version}
            </Text>
          </View>
        </View>

        {/* Version Info */}
        <Text className="mb-3 pl-1 text-xs font-semibold uppercase tracking-widest text-text-secondary">
          Informasi Versi
        </Text>

        <View className="bg-surface rounded-lg overflow-hidden mb-5" style={{ elevation: 2 }}>
          <View className="px-4 py-3.5 flex-row items-center justify-between">
            <Text className="text-[15px] text-text-secondary">Versi Aplikasi</Text>
            <Text className="text-[15px] font-medium text-text-primary">
              {appInfo.version}
            </Text>
          </View>
          <View className="h-px bg-border" />
          <View className="px-4 py-3.5 flex-row items-center justify-between">
            <Text className="text-[15px] text-text-secondary">Build Number</Text>
            <Text className="text-[15px] font-medium text-text-primary">
              {appInfo.buildNumber}
            </Text>
          </View>
          <View className="h-px bg-border" />
          <View className="px-4 py-3.5 flex-row items-center justify-between">
            <Text className="text-[15px] text-text-secondary">Terakhir Diperbarui</Text>
            <Text className="text-[15px] font-medium text-text-primary">
              {appInfo.lastUpdate}
            </Text>
          </View>
        </View>

        {/* Features */}
        <Text className="mb-3 pl-1 text-xs font-semibold uppercase tracking-widest text-text-secondary">
          Fitur Utama
        </Text>

        <View className="bg-surface rounded-lg overflow-hidden mb-5" style={{ elevation: 2 }}>
          {features.map((feature, index) => (
            <View key={index}>
              <View className="flex-row items-center px-4 py-3.5" style={{ gap: 12 }}>
                <View className="h-6 w-6 items-center justify-center rounded-full bg-primary">
                  <Ionicons name="checkmark" size={14} color="#ffffff" />
                </View>
                <Text className="flex-1 text-[15px] text-text-primary">{feature}</Text>
              </View>
              {index < features.length - 1 && (
                <View className="h-px bg-border" style={{ marginLeft: 60 }} />
              )}
            </View>
          ))}
        </View>

        {/* Contact & Links */}
        <Text className="mb-3 pl-1 text-xs font-semibold uppercase tracking-widest text-text-secondary">
          Hubungi Kami
        </Text>

        <View className="bg-surface rounded-lg overflow-hidden mb-5" style={{ elevation: 2 }}>
          {links.map((link, index) => {
            const Icon = link.iconLib === 'MaterialIcons' ? MaterialIcons : Ionicons;
            const isLast = index === links.length - 1;

            return (
              <View key={index}>
                <TouchableOpacity
                  onPress={() => openUrl(link.url)}
                  className="flex-row items-center px-4 py-4"
                  style={{ gap: 14 }}
                >
                  <View className="h-10 w-10 items-center justify-center rounded-full bg-overlay">
                    <Icon name={link.icon as any} size={20} color="#37B37E" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[15px] font-medium text-text-primary">
                      {link.label}
                    </Text>
                    <Text className="mt-0.5 text-xs text-text-secondary">
                      {link.value}
                    </Text>
                  </View>
                  <Ionicons name="open-outline" size={18} color="#D1D5DB" />
                </TouchableOpacity>
                {!isLast && (
                  <View className="h-px bg-border" style={{ marginLeft: 68 }} />
                )}
              </View>
            );
          })}
        </View>

        {/* Team */}
        <Text className="mb-3 pl-1 text-xs font-semibold uppercase tracking-widest text-text-secondary">
          Tim Pengembang
        </Text>

        <View className="bg-surface rounded-lg overflow-hidden mb-5" style={{ elevation: 2 }}>
          {teamMembers.map((member, index) => {
            const isLast = index === teamMembers.length - 1;

            return (
              <View key={index}>
                <View className="flex-row items-center px-4 py-3.5" style={{ gap: 12 }}>
                  <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Ionicons name="people" size={20} color="#37B37E" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[15px] font-medium text-text-primary">
                      {member.name}
                    </Text>
                    <Text className="mt-0.5 text-xs text-text-secondary">
                      {member.role}
                    </Text>
                  </View>
                </View>
                {!isLast && (
                  <View className="h-px bg-border" style={{ marginLeft: 66 }} />
                )}
              </View>
            );
          })}
        </View>

        {/* Legal Links */}
        <View style={{ gap: 12 }}>
          <TouchableOpacity
            className="bg-surface rounded-lg px-4 py-4 flex-row items-center justify-between"
            style={{ elevation: 2 }}
          >
            <View className="flex-row items-center" style={{ gap: 12 }}>
              <Ionicons name="document-text-outline" size={20} color="#37B37E" />
              <Text className="text-[15px] font-medium text-text-primary">
                Lisensi Open Source
              </Text>
            </View>
            <Ionicons name="chevron-forward-outline" size={18} color="#D1D5DB" />
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-surface rounded-lg px-4 py-4 flex-row items-center justify-between"
            style={{ elevation: 2 }}
          >
            <View className="flex-row items-center" style={{ gap: 12 }}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#37B37E" />
              <Text className="text-[15px] font-medium text-text-primary">
                Kebijakan Privasi
              </Text>
            </View>
            <Ionicons name="chevron-forward-outline" size={18} color="#D1D5DB" />
          </TouchableOpacity>
        </View>

        {/* Copyright */}
        <View className="mt-6 mb-2 items-center">
          <Text className="text-xs text-text-secondary text-center">
            © 2025 NutriSight. All rights reserved.
          </Text>
          <Text className="mt-1 text-xs text-text-secondary text-center">
            Made with ❤️ for healthier living
          </Text>
        </View>

        <View className="h-6" />
      </ScrollView>
    </View>
  );
}