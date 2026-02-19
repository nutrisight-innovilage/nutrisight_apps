import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '@/app/contexts/authContext';
import LoadingScreen from '@/app/components/loadingScreen';
import { UserRole } from '@/app/types/user';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type GenderOption = 'male' | 'female';
type RoleOption = UserRole; // 'ibu hamil' | 'anak anak' | 'remaja' | 'dewasa' | 'lansia'

interface GenderChoice {
  value: GenderOption;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

interface RoleChoice {
  value: RoleOption;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GENDER_OPTIONS: GenderChoice[] = [
  { value: 'male', label: 'Laki-laki', icon: 'male' },
  { value: 'female', label: 'Perempuan', icon: 'female' },
];

const ROLE_OPTIONS: RoleChoice[] = [
  { value: 'anak anak', label: 'Anak-anak', icon: 'happy-outline' },
  { value: 'dewasa', label: 'Dewasa', icon: 'person-outline' },
  { value: 'lansia', label: 'Lansia', icon: 'accessibility-outline' },
  { value: 'ibu hamil', label: 'Ibu Hamil', icon: 'heart-outline' },
  { value: 'remaja', label: 'Remaja', icon: 'school-outline' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ProfilPage() {
  const { user, updateUser } = useAuth();

  // Form state
  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [telepon, setTelepon] = useState('');
  const [umur, setUmur] = useState('');
  const [berat, setBerat] = useState('');
  const [tinggi, setTinggi] = useState('');
  const [gender, setGender] = useState<GenderOption>('male');
  const [role, setRole] = useState<RoleOption>('dewasa');

  // UI state
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [showRolePicker, setShowRolePicker] = useState(false);

  // -------------------------------------------------------------------------
  // Load user data
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (user) {
      setNama(user.name || '');
      setEmail(user.email || '');
      setTelepon(user.phone || '');
      setUmur(user.age ? String(user.age) : '');
      setBerat(user.weight ? String(user.weight) : '');
      setTinggi(user.height ? String(user.height) : '');
      setGender((user.gender as GenderOption) || 'male');
      setRole((user.role as RoleOption) || 'dewasa');
    }
  }, [user]);

  // -------------------------------------------------------------------------
  // Cancel editing — revert to original
  // -------------------------------------------------------------------------

  const handleCancel = () => {
    if (user) {
      setNama(user.name || '');
      setEmail(user.email || '');
      setTelepon(user.phone || '');
      setUmur(user.age ? String(user.age) : '');
      setBerat(user.weight ? String(user.weight) : '');
      setTinggi(user.height ? String(user.height) : '');
      setGender((user.gender as GenderOption) || 'male');
      setRole((user.role as RoleOption) || 'dewasa');
    }
    setIsEditing(false);
  };

  // -------------------------------------------------------------------------
  // Save
  // -------------------------------------------------------------------------

  const handleSave = async () => {
    if (!user) {
      Alert.alert('Error', 'Anda harus login terlebih dahulu');
      return;
    }

    // Validasi
    if (!nama.trim()) {
      Alert.alert('Validasi', 'Nama tidak boleh kosong');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Validasi', 'Email tidak valid');
      return;
    }
    if (umur && (isNaN(Number(umur)) || Number(umur) < 1 || Number(umur) > 150)) {
      Alert.alert('Validasi', 'Umur harus antara 1 – 150 tahun');
      return;
    }
    if (berat && (isNaN(Number(berat)) || Number(berat) < 1 || Number(berat) > 500)) {
      Alert.alert('Validasi', 'Berat badan tidak valid');
      return;
    }
    if (tinggi && (isNaN(Number(tinggi)) || Number(tinggi) < 30 || Number(tinggi) > 300)) {
      Alert.alert('Validasi', 'Tinggi badan tidak valid');
      return;
    }

    setIsSaving(true);

    try {
      await updateUser({
        name: nama.trim(),
        email: email.trim(),
        phone: telepon.trim() || undefined,
        age: umur ? Number(umur) : undefined,
        weight: berat ? Number(berat) : undefined,
        height: tinggi ? Number(tinggi) : undefined,
        gender,
        role,
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

  // -------------------------------------------------------------------------
  // Loading
  // -------------------------------------------------------------------------

  if (isSaving) {
    return <LoadingScreen message="Menyimpan profil..." />;
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  const genderLabel =
    GENDER_OPTIONS.find((g) => g.value === gender)?.label ?? gender;
  const roleLabel =
    ROLE_OPTIONS.find((r) => r.value === role)?.label ?? role;

  const getInitials = () => {
    if (!nama) return '?';
    return nama
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // -------------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------------

  /** Read-only field */
  const ReadOnlyField = ({
    label,
    value,
    icon,
  }: {
    label: string;
    value: string;
    icon: keyof typeof Ionicons.glyphMap;
  }) => (
    <View className="flex-row items-center py-3 border-b border-border">
      <View className="w-9 h-9 rounded-full bg-overlay items-center justify-center mr-3">
        <Ionicons name={icon} size={18} color="#6B7280" />
      </View>
      <View className="flex-1">
        <Text className="text-[11px] text-text-secondary uppercase tracking-widest mb-0.5">
          {label}
        </Text>
        <Text className="text-[15px] text-text-primary">{value || '-'}</Text>
      </View>
    </View>
  );

  /** Editable text field */
  const EditField = ({
    label,
    value,
    onChangeText,
    icon,
    placeholder,
    keyboardType = 'default',
    suffix,
  }: {
    label: string;
    value: string;
    onChangeText: (t: string) => void;
    icon: keyof typeof Ionicons.glyphMap;
    placeholder?: string;
    keyboardType?: TextInput['props']['keyboardType'];
    suffix?: string;
  }) => (
    <View className="mb-4">
      <Text className="text-[11px] text-text-secondary uppercase tracking-widest mb-1.5 ml-1">
        {label}
      </Text>
      <View className="flex-row items-center bg-input rounded-xl border border-border px-3">
        <Ionicons name={icon} size={18} color="#6B7280" />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          keyboardType={keyboardType}
          className="flex-1 py-3 px-3 text-[15px] text-text-primary"
          placeholderTextColor="#9CA3AF"
        />
        {suffix && (
          <Text className="text-[13px] text-text-secondary">{suffix}</Text>
        )}
      </View>
    </View>
  );

  /** Picker button (gender / role) */
  const PickerButton = ({
    label,
    value,
    icon,
    onPress,
  }: {
    label: string;
    value: string;
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
  }) => (
    <View className="mb-4">
      <Text className="text-[11px] text-text-secondary uppercase tracking-widest mb-1.5 ml-1">
        {label}
      </Text>
      <TouchableOpacity
        onPress={onPress}
        className="flex-row items-center bg-input rounded-xl border border-border px-3 py-3"
        activeOpacity={0.7}
      >
        <Ionicons name={icon} size={18} color="#6B7280" />
        <Text className="flex-1 px-3 text-[15px] text-text-primary">
          {value}
        </Text>
        <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
      </TouchableOpacity>
    </View>
  );

  // -------------------------------------------------------------------------
  // Bottom-sheet style picker modal
  // -------------------------------------------------------------------------

  const OptionModal = <T extends string>({
    visible,
    onClose,
    title,
    options,
    selected,
    onSelect,
  }: {
    visible: boolean;
    onClose: () => void;
    title: string;
    options: { value: T; label: string; icon: keyof typeof Ionicons.glyphMap }[];
    selected: T;
    onSelect: (v: T) => void;
  }) => (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        className="flex-1 bg-black/40 justify-end"
        activeOpacity={1}
        onPress={onClose}
      >
        <View className="bg-surface rounded-t-3xl px-5 pt-5 pb-8">
          <View className="w-10 h-1 rounded-full bg-border self-center mb-4" />
          <Text className="text-base font-semibold text-text-primary mb-4">
            {title}
          </Text>
          {options.map((opt) => {
            const isActive = opt.value === selected;
            return (
              <TouchableOpacity
                key={opt.value}
                onPress={() => {
                  onSelect(opt.value);
                  onClose();
                }}
                className={`flex-row items-center px-4 py-3.5 rounded-xl mb-2 ${
                  isActive ? 'bg-primary/10 border border-primary' : 'bg-overlay'
                }`}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={opt.icon}
                  size={20}
                  color={isActive ? '#16A34A' : '#6B7280'}
                />
                <Text
                  className={`flex-1 ml-3 text-[15px] ${
                    isActive
                      ? 'font-semibold text-primary'
                      : 'text-text-primary'
                  }`}
                >
                  {opt.label}
                </Text>
                {isActive && (
                  <Ionicons name="checkmark-circle" size={20} color="#16A34A" />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </TouchableOpacity>
    </Modal>
  );

  // =========================================================================
  // RENDER
  // =========================================================================

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <View className="flex-row items-center justify-between px-4 py-2">
        <TouchableOpacity
          onPress={() => {
            handleCancel();
            router.back();
          }}
          className="p-2"
        >
          <Ionicons name="chevron-back" size={24} color="#000000" />
        </TouchableOpacity>

        <Text className="text-base font-semibold text-text-primary">
          Profil Saya
        </Text>

        <TouchableOpacity
          onPress={() => (isEditing ? handleCancel() : setIsEditing(true))}
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
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Avatar ────────────────────────────────────────────────────── */}
        <View className="items-center mt-4 mb-6">
          <View className="w-24 h-24 rounded-full bg-primary items-center justify-center mb-3">
            <Text className="text-3xl font-bold text-white">
              {getInitials()}
            </Text>
          </View>
          <Text className="text-lg font-semibold text-text-primary">
            {nama || 'Pengguna'}
          </Text>
          <Text className="text-sm text-text-secondary">{email}</Text>
        </View>

        {/* ================================================================
            VIEW MODE
            ================================================================ */}
        {!isEditing && (
          <>
            {/* ── Data Pribadi ───────────────────────────────────────────── */}
            <View className="bg-surface rounded-2xl p-4 mb-4" style={{ elevation: 2 }}>
              <Text className="text-xs font-semibold text-text-secondary uppercase tracking-widest mb-2">
                Data Pribadi
              </Text>

              <ReadOnlyField label="Nama Lengkap" value={nama} icon="person-outline" />
              <ReadOnlyField label="Email" value={email} icon="mail-outline" />
              <ReadOnlyField label="Telepon" value={telepon} icon="call-outline" />
              <ReadOnlyField label="Jenis Kelamin" value={genderLabel} icon={gender === 'male' ? 'male' : 'female'} />
              <ReadOnlyField label="Kategori" value={roleLabel} icon="people-outline" />
            </View>

            {/* ── Data Kesehatan ─────────────────────────────────────────── */}
            <View className="bg-surface rounded-2xl p-4 mb-4" style={{ elevation: 2 }}>
              <Text className="text-xs font-semibold text-text-secondary uppercase tracking-widest mb-2">
                Data Kesehatan
              </Text>

              <ReadOnlyField
                label="Umur"
                value={umur ? `${umur} tahun` : '-'}
                icon="calendar-outline"
              />
              <ReadOnlyField
                label="Berat Badan"
                value={berat ? `${berat} kg` : '-'}
                icon="barbell-outline"
              />
              <ReadOnlyField
                label="Tinggi Badan"
                value={tinggi ? `${tinggi} cm` : '-'}
                icon="resize-outline"
              />
            </View>

            {/* ── Informasi Akun ─────────────────────────────────────────── */}
            <View className="bg-surface rounded-2xl p-4" style={{ elevation: 2 }}>
              <Text className="text-xs font-semibold text-text-secondary uppercase tracking-widest mb-2">
                Informasi Akun
              </Text>

              <View className="flex-row items-center justify-between py-3 border-b border-border">
                <Text className="text-[15px] text-text-secondary">ID Pengguna</Text>
                <Text className="text-[13px] font-medium text-text-primary">
                  {user ? `#${user.id.slice(0, 8)}...` : '-'}
                </Text>
              </View>

              <View className="flex-row items-center justify-between py-3 border-b border-border">
                <Text className="text-[15px] text-text-secondary">Bergabung Sejak</Text>
                <Text className="text-[15px] font-medium text-text-primary">
                  {user?.createdAt
                    ? new Date(user.createdAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '-'}
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
          </>
        )}

        {/* ================================================================
            EDIT MODE
            ================================================================ */}
        {isEditing && (
          <>
            {/* ── Data Pribadi ───────────────────────────────────────────── */}
            <View className="bg-surface rounded-2xl p-4 mb-4" style={{ elevation: 2 }}>
              <Text className="text-xs font-semibold text-text-secondary uppercase tracking-widest mb-3">
                Data Pribadi
              </Text>

              <EditField
                label="Nama Lengkap"
                value={nama}
                onChangeText={setNama}
                icon="person-outline"
                placeholder="Masukkan nama lengkap"
              />
              <EditField
                label="Email"
                value={email}
                onChangeText={setEmail}
                icon="mail-outline"
                placeholder="contoh@email.com"
                keyboardType="email-address"
              />
              <EditField
                label="Nomor Telepon"
                value={telepon}
                onChangeText={setTelepon}
                icon="call-outline"
                placeholder="08xxxxxxxxxx"
                keyboardType="phone-pad"
              />

              <PickerButton
                label="Jenis Kelamin"
                value={genderLabel}
                icon={gender === 'male' ? 'male' : 'female'}
                onPress={() => setShowGenderPicker(true)}
              />
              <PickerButton
                label="Kategori"
                value={roleLabel}
                icon="people-outline"
                onPress={() => setShowRolePicker(true)}
              />
            </View>

            {/* ── Data Kesehatan ─────────────────────────────────────────── */}
            <View className="bg-surface rounded-2xl p-4 mb-4" style={{ elevation: 2 }}>
              <Text className="text-xs font-semibold text-text-secondary uppercase tracking-widest mb-3">
                Data Kesehatan
              </Text>

              <EditField
                label="Umur"
                value={umur}
                onChangeText={setUmur}
                icon="calendar-outline"
                placeholder="Contoh: 25"
                keyboardType="numeric"
                suffix="tahun"
              />
              <EditField
                label="Berat Badan"
                value={berat}
                onChangeText={setBerat}
                icon="barbell-outline"
                placeholder="Contoh: 65"
                keyboardType="numeric"
                suffix="kg"
              />
              <EditField
                label="Tinggi Badan"
                value={tinggi}
                onChangeText={setTinggi}
                icon="resize-outline"
                placeholder="Contoh: 170"
                keyboardType="numeric"
                suffix="cm"
              />
            </View>

            {/* ── Action buttons ─────────────────────────────────────────── */}
            <View className="flex-row" style={{ gap: 12 }}>
              <TouchableOpacity
                onPress={handleCancel}
                className="flex-1 rounded-xl py-4 bg-overlay border border-border"
                activeOpacity={0.7}
              >
                <Text className="text-center text-[15px] font-semibold text-text-secondary">
                  Batal
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSave}
                disabled={isSaving}
                className={`flex-1 rounded-xl py-4 ${
                  isSaving ? 'bg-gray-400' : 'bg-primary'
                }`}
                style={{ elevation: 3 }}
                activeOpacity={0.7}
              >
                <Text className="text-center text-[15px] font-semibold text-white">
                  {isSaving ? 'Menyimpan...' : 'Simpan'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      {/* ── Modals ────────────────────────────────────────────────────── */}
      <OptionModal
        visible={showGenderPicker}
        onClose={() => setShowGenderPicker(false)}
        title="Pilih Jenis Kelamin"
        options={GENDER_OPTIONS}
        selected={gender}
        onSelect={setGender}
      />

      <OptionModal
        visible={showRolePicker}
        onClose={() => setShowRolePicker(false)}
        title="Pilih Kategori"
        options={ROLE_OPTIONS}
        selected={role}
        onSelect={setRole}
      />
    </SafeAreaView>
  );
}