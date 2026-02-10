import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '@/app/contexts/authContext';

export default function ProfilPage() {
  const { user, updateUser } = useAuth();
  
  const [nama, setNama] = useState('Pengguna Tamu');
  const [email, setEmail] = useState('tamu@nutrisight.app');
  const [telepon, setTelepon] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load user data from AuthContext
  useEffect(() => {
    if (user) {
      setNama(user.name || 'Pengguna Tamu');
      setEmail(user.email || 'tamu@nutrisight.app');
      setTelepon(user.phone || '');
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) {
      Alert.alert('Error', 'Anda harus login terlebih dahulu');
      return;
    }

    // Validasi input
    if (!nama.trim()) {
      Alert.alert('Validasi Error', 'Nama tidak boleh kosong');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Validasi Error', 'Email tidak valid');
      return;
    }

    setIsSaving(true);

    try {
      await updateUser({
        name: nama.trim(),
        email: email.trim(),
        phone: telepon.trim(),
      });
      
      setIsEditing(false);
      Alert.alert('Berhasil', 'Profil berhasil diperbarui');
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Gagal menyimpan perubahan profil');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center justify-between m-4">
        <TouchableOpacity onPress={() => {setIsEditing(false); router.back()}} className="p-2">
          <Ionicons name="chevron-back" size={24} color="#000000" />
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => setIsEditing(!isEditing)}
          className="rounded-full bg-accent p-2"
        >
          <Ionicons
            name={isEditing ? 'close-outline' : 'pencil-outline'}
            size={20}
            color="#ffffff"
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Form Section */}
        <View className="bg-surface rounded-lg p-4" style={{ elevation: 2 }}>
          {/* Nama */}
          <View className="mb-4">
            <Text className="mb-2 text-xs font-semibold text-text-secondary uppercase tracking-widest">
              Nama Lengkap
            </Text>
            <TextInput
              value={nama}
              onChangeText={setNama}
              editable={isEditing}
              className={`rounded-lg px-4 py-3 text-[15px] text-text-primary ${
                isEditing ? 'bg-input border border-primary' : 'bg-overlay'
              }`}
              placeholderTextColor="#666666"
            />
          </View>

          {/* Email */}
          <View className="mb-4">
            <Text className="mb-2 text-xs font-semibold text-text-secondary uppercase tracking-widest">
              Email
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              editable={isEditing}
              keyboardType="email-address"
              className={`rounded-lg px-4 py-3 text-[15px] text-text-primary ${
                isEditing ? 'bg-input border border-primary' : 'bg-overlay'
              }`}
              placeholderTextColor="#666666"
            />
          </View>

          {/* Telepon */}
          <View className="mb-4">
            <Text className="mb-2 text-xs font-semibold text-text-secondary uppercase tracking-widest">
              Nomor Telepon
            </Text>
            <TextInput
              value={telepon}
              onChangeText={setTelepon}
              editable={isEditing}
              keyboardType="phone-pad"
              placeholder="Masukkan nomor telepon"
              className={`rounded-lg px-4 py-3 text-[15px] text-text-primary ${
                isEditing ? 'bg-input border border-primary' : 'bg-overlay'
              }`}
              placeholderTextColor="#666666"
            />
          </View>
        </View>

        {/* Save Button */}
        {isEditing && (
          <TouchableOpacity
            onPress={handleSave}
            disabled={isSaving}
            className={`mt-6 rounded-lg py-4 ${isSaving ? 'bg-gray-400' : 'bg-primary'}`}
            style={{ elevation: 3 }}
          >
            <Text className="text-center text-[15px] font-semibold text-text-inverse">
              {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Account Info */}
        <View className="mt-6 bg-surface rounded-lg p-4" style={{ elevation: 2 }}>
          <Text className="mb-3 text-xs font-semibold text-text-secondary uppercase tracking-widest">
            Informasi Akun
          </Text>
          
          <View className="flex-row items-center justify-between py-3 border-b border-border">
            <Text className="text-[15px] text-text-secondary">ID Pengguna</Text>
            <Text className="text-[15px] font-medium text-text-primary">
              {user ? `#${user.id}` : '#USR-001'}
            </Text>
          </View>
          
          <View className="flex-row items-center justify-between py-3 border-b border-border">
            <Text className="text-[15px] text-text-secondary">Bergabung Sejak</Text>
            <Text className="text-[15px] font-medium text-text-primary">
              {user?.createdAt 
                ? new Date(user.createdAt).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })
                : 'Jan 2025'
              }
            </Text>
          </View>
          
          <View className="flex-row items-center justify-between py-3">
            <Text className="text-[15px] text-text-secondary">Status Akun</Text>
            <View className="flex-row items-center" style={{ gap: 6 }}>
              <View className="h-2 w-2 rounded-full bg-success" />
              <Text className="text-[15px] font-medium text-success">Aktif</Text>
            </View>
          </View>
        </View>

        <View className="h-6" />
      </ScrollView>
    </SafeAreaView>
  );
}