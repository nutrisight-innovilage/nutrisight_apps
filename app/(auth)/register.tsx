import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/app/contexts/authContext';

type Gender = "male" | "female";
type UserRole = "ibu hamil" | "anak anak" | "remaja" | "dewasa" | "lansia";

interface PasswordStrength {
    score: number;
    label: string;
    color: string;
}

export default function RegisterScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [name, setName] = useState('');
    const [age, setAge] = useState('');
    const [weight, setWeight] = useState('');
    const [height, setHeight] = useState('');
    const [gender, setGender] = useState<Gender | ''>('');
    const [role, setRole] = useState<UserRole | ''>('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const { register } = useAuth();

    const genderOptions: { label: string; value: Gender }[] = [
        { label: 'Laki-laki', value: 'male' },
        { label: 'Perempuan', value: 'female' },
    ];

    const roleOptions: { label: string; value: UserRole }[] = [
        { label: 'Ibu Hamil', value: 'ibu hamil' },
        { label: 'Anak-anak', value: 'anak anak' },
        { label: 'Remaja', value: 'remaja' },
        { label: 'Dewasa', value: 'dewasa' },
        { label: 'Lansia', value: 'lansia' },
    ];

    // Fungsi untuk mengecek kekuatan password
    const checkPasswordStrength = (pass: string): PasswordStrength => {
        let score = 0;
        
        if (pass.length >= 10) score++;
        if (pass.length >= 14) score++;
        if (/[a-z]/.test(pass)) score++;
        if (/[A-Z]/.test(pass)) score++;
        if (/[0-9]/.test(pass)) score++;
        if (/[^a-zA-Z0-9]/.test(pass)) score++;

        if (score <= 2) return { score, label: 'Lemah', color: '#ef4444' };
        if (score <= 4) return { score, label: 'Sedang', color: '#f59e0b' };
        return { score, label: 'Kuat', color: '#10b981' };
    };

    // Validasi password dengan aturan keamanan
    const validatePassword = (pass: string): string | null => {
        if (pass.length < 10) {
            return 'Password minimal 10 karakter';
        }
        if (!/[a-z]/.test(pass)) {
            return 'Password harus mengandung huruf kecil';
        }
        if (!/[A-Z]/.test(pass)) {
            return 'Password harus mengandung huruf besar';
        }
        if (!/[0-9]/.test(pass)) {
            return 'Password harus mengandung angka';
        }
        if (!/[^a-zA-Z0-9]/.test(pass)) {
            return 'Password harus mengandung karakter khusus (!@#$%^&*)';
        }
        return null;
    };

    // Validasi email format
    const validateEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const passwordStrength = password ? checkPasswordStrength(password) : null;

    const handleRegister = async () => {
        // Validasi semua field terisi
        if (!email || !password || !confirmPassword || !name || !age || !weight || !height || !gender || !role) {
            Alert.alert('Kesalahan', 'Mohon lengkapi semua kolom');
            return;
        }

        // Validasi format email
        if (!validateEmail(email)) {
            Alert.alert('Kesalahan', 'Format email tidak valid');
            return;
        }

        // Validasi kekuatan password
        const passwordError = validatePassword(password);
        if (passwordError) {
            Alert.alert('Password Tidak Aman', passwordError);
            return;
        }

        // Validasi password match
        if (password !== confirmPassword) {
            Alert.alert('Kesalahan', 'Password tidak cocok');
            return;
        }

        // Validasi umur
        const ageNum = parseInt(age);
        if (isNaN(ageNum) || ageNum < 1 || ageNum > 150) {
            Alert.alert('Kesalahan', 'Mohon masukkan umur yang valid (1-150)');
            return;
        }

        // Validasi berat dan tinggi
        const weightNum = parseFloat(weight);
        const heightNum = parseFloat(height);
        if (isNaN(weightNum) || weightNum < 1 || isNaN(heightNum) || heightNum < 1) {
            Alert.alert('Kesalahan', 'Mohon masukkan berat dan tinggi yang valid');
            return;
        }

        setLoading(true);
        try {
            await register({
                email: email.toLowerCase().trim(), // Normalisasi email
                password,
                name: name.trim(),
                age,
                weight,
                height,
                gender: gender as Gender,
                role: role as UserRole,
            });
            Alert.alert('Berhasil', 'Pendaftaran berhasil!');
            router.replace('/(tabs)');
        } catch (error: any) {
            Alert.alert('Pendaftaran Gagal', error.message || 'Silakan coba lagi');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-background">
            <ScrollView className="flex-1 px-6">
                <View className="py-8">
                    <Text className="text-4xl font-bold text-text-primary mb-2">Buat Akun</Text>
                    <Text className="text-base text-text-secondary mb-8">Lengkapi data Anda untuk mendaftar</Text>

                    <View className="space-y-4">
                        {/* Email */}
                        <View>
                            <Text className="text-sm font-medium text-text-primary mb-2">Email</Text>
                            <TextInput
                                className="bg-input border border-border rounded-lg px-4 py-3 text-base text-text-primary"
                                placeholder="Masukkan email Anda"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                editable={!loading}
                                placeholderTextColor="#999"
                            />
                        </View>

                        {/* Password */}
                        <View>
                            <Text className="text-sm font-medium text-text-primary mb-2">Password</Text>
                            <View className="relative">
                                <TextInput
                                    className="bg-input border border-border rounded-lg px-4 py-3 text-base text-text-primary pr-12"
                                    placeholder="Masukkan password Anda"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                    editable={!loading}
                                    placeholderTextColor="#999"
                                />
                                <TouchableOpacity
                                    className="absolute right-4 top-3"
                                    onPress={() => setShowPassword(!showPassword)}
                                >
                                    <Text className="text-text-secondary text-sm">
                                        {showPassword ? '👁️' : '👁️‍🗨️'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                            
                            {/* Password Strength Indicator */}
                            {password.length > 0 && passwordStrength && (
                                <View className="mt-2">
                                    <View className="flex-row items-center mb-1">
                                        <View className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                            <View 
                                                style={{
                                                    width: `${(passwordStrength.score / 6) * 100}%`,
                                                    backgroundColor: passwordStrength.color,
                                                    height: '100%'
                                                }}
                                            />
                                        </View>
                                        <Text 
                                            className="ml-2 text-xs font-medium"
                                            style={{ color: passwordStrength.color }}
                                        >
                                            {passwordStrength.label}
                                        </Text>
                                    </View>
                                </View>
                            )}

                            {/* Password Requirements */}
                            <View className="mt-2 bg-gray-50 p-3 rounded-lg">
                                <Text className="text-xs font-medium text-text-secondary mb-1">
                                    Persyaratan Password:
                                </Text>
                                <Text className={`text-xs ${password.length >= 10 ? 'text-green-600' : 'text-text-secondary'}`}>
                                    ✓ Minimal 10 karakter
                                </Text>
                                <Text className={`text-xs ${/[a-z]/.test(password) ? 'text-green-600' : 'text-text-secondary'}`}>
                                    ✓ Mengandung huruf kecil (a-z)
                                </Text>
                                <Text className={`text-xs ${/[A-Z]/.test(password) ? 'text-green-600' : 'text-text-secondary'}`}>
                                    ✓ Mengandung huruf besar (A-Z)
                                </Text>
                                <Text className={`text-xs ${/[0-9]/.test(password) ? 'text-green-600' : 'text-text-secondary'}`}>
                                    ✓ Mengandung angka (0-9)
                                </Text>
                                <Text className={`text-xs ${/[^a-zA-Z0-9]/.test(password) ? 'text-green-600' : 'text-text-secondary'}`}>
                                    ✓ Mengandung karakter khusus (!@#$%^&*)
                                </Text>
                            </View>
                        </View>

                        {/* Confirm Password */}
                        <View>
                            <Text className="text-sm font-medium text-text-primary mb-2">Konfirmasi Password</Text>
                            <View className="relative">
                                <TextInput
                                    className="bg-input border border-border rounded-lg px-4 py-3 text-base text-text-primary pr-12"
                                    placeholder="Konfirmasi password Anda"
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    secureTextEntry={!showConfirmPassword}
                                    editable={!loading}
                                    placeholderTextColor="#999"
                                />
                                <TouchableOpacity
                                    className="absolute right-4 top-3"
                                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                                >
                                    <Text className="text-text-secondary text-sm">
                                        {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                            {confirmPassword.length > 0 && password !== confirmPassword && (
                                <Text className="text-red-500 text-xs mt-1">
                                    Password tidak cocok
                                </Text>
                            )}
                        </View>

                        {/* Full Name */}
                        <View>
                            <Text className="text-sm font-medium text-text-primary mb-2">Nama Lengkap</Text>
                            <TextInput
                                className="bg-input border border-border rounded-lg px-4 py-3 text-base text-text-primary"
                                placeholder="Masukkan nama lengkap Anda"
                                value={name}
                                onChangeText={setName}
                                editable={!loading}
                                placeholderTextColor="#999"
                            />
                        </View>

                        {/* Age and Gender */}
                        <View className="flex-row space-x-4">
                            <View className="flex-1">
                                <Text className="text-sm font-medium text-text-primary mb-2">Umur</Text>
                                <TextInput
                                    className="bg-input border border-border rounded-lg px-4 py-3 text-base text-text-primary"
                                    placeholder="Umur"
                                    value={age}
                                    onChangeText={setAge}
                                    keyboardType="numeric"
                                    editable={!loading}
                                    placeholderTextColor="#999"
                                />
                            </View>

                            <View className="flex-1">
                                <Text className="text-sm font-medium text-text-primary mb-2">Jenis Kelamin</Text>
                                <View className="flex-row space-x-2">
                                    {genderOptions.map((option) => (
                                        <TouchableOpacity
                                            key={option.value}
                                            className={`flex-1 border rounded-lg px-3 py-3 items-center ${
                                                gender === option.value 
                                                    ? 'bg-primary border-primary' 
                                                    : 'bg-input border-border'
                                            }`}
                                            onPress={() => setGender(option.value)}
                                            disabled={loading}
                                        >
                                            <Text className={`text-sm font-medium ${
                                                gender === option.value 
                                                    ? 'text-text-inverse' 
                                                    : 'text-text-primary'
                                            }`}>
                                                {option.label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        </View>

                        {/* Weight and Height */}
                        <View className="flex-row space-x-4">
                            <View className="flex-1">
                                <Text className="text-sm font-medium text-text-primary mb-2">Berat Badan (kg)</Text>
                                <TextInput
                                    className="bg-input border border-border rounded-lg px-4 py-3 text-base text-text-primary"
                                    placeholder="Berat"
                                    value={weight}
                                    onChangeText={setWeight}
                                    keyboardType="numeric"
                                    editable={!loading}
                                    placeholderTextColor="#999"
                                />
                            </View>

                            <View className="flex-1">
                                <Text className="text-sm font-medium text-text-primary mb-2">Tinggi Badan (cm)</Text>
                                <TextInput
                                    className="bg-input border border-border rounded-lg px-4 py-3 text-base text-text-primary"
                                    placeholder="Tinggi"
                                    value={height}
                                    onChangeText={setHeight}
                                    keyboardType="numeric"
                                    editable={!loading}
                                    placeholderTextColor="#999"
                                />
                            </View>
                        </View>

                        {/* Role */}
                        <View>
                            <Text className="text-sm font-medium text-text-primary mb-2">Kategori Pengguna</Text>
                            <View className="space-y-2">
                                {roleOptions.map((option) => (
                                    <TouchableOpacity
                                        key={option.value}
                                        className={`border rounded-lg px-4 py-3 ${
                                            role === option.value 
                                                ? 'bg-primary border-primary' 
                                                : 'bg-input border-border'
                                        }`}
                                        onPress={() => setRole(option.value)}
                                        disabled={loading}
                                    >
                                        <Text className={`text-base font-medium ${
                                            role === option.value 
                                                ? 'text-text-inverse' 
                                                : 'text-text-primary'
                                        }`}>
                                            {option.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Register Button */}
                        <TouchableOpacity 
                            className="bg-primary rounded-lg py-4 items-center mt-6"
                            onPress={handleRegister}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#ffffff" />
                            ) : (
                                <Text className="text-text-inverse text-base font-semibold">Daftar</Text>
                            )}
                        </TouchableOpacity>

                        {/* Login Link */}
                        <View className="mt-4 items-center pb-8">
                            <TouchableOpacity onPress={() => router.back()}>
                                <Text className="text-text-secondary">
                                    Sudah punya akun? <Text className="text-primary font-semibold">Masuk</Text>
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}