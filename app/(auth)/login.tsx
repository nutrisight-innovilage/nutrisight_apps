import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { Link, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/app/contexts/authContext';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [loginAttempts, setLoginAttempts] = useState(0);
    const { login } = useAuth();

    // Validasi format email
    const validateEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const handleLogin = async () => {
        // Cek apakah sudah terlalu banyak percobaan login gagal
        if (loginAttempts >= 5) {
            Alert.alert(
                'Terlalu Banyak Percobaan',
                'Akun Anda diblokir sementara. Silakan coba lagi dalam beberapa menit.',
                [{ text: 'OK' }]
            );
            return;
        }

        // Validasi field tidak kosong
        if (!email || !password) {
            Alert.alert('Kesalahan', 'Mohon lengkapi semua kolom');
            return;
        }

        // Validasi format email
        if (!validateEmail(email)) {
            Alert.alert('Kesalahan', 'Format email tidak valid');
            return;
        }

        // Validasi panjang password minimal
        if (password.length < 10) {
            Alert.alert('Kesalahan', 'Password minimal 10 karakter');
            return;
        }

        setLoading(true);
        try {
            await login(email.toLowerCase().trim(), password);
            // Reset login attempts on success
            setLoginAttempts(0);
            // Navigation akan dihandle otomatis oleh _layout
            router.replace('/(tabs)');
        } catch (error: any) {
            // Increment login attempts
            setLoginAttempts(prev => prev + 1);
            
            const remainingAttempts = 5 - (loginAttempts + 1);
            let errorMessage = error.message || 'Email atau password salah';
            
            if (remainingAttempts > 0 && remainingAttempts <= 3) {
                errorMessage += `\n\nSisa percobaan: ${remainingAttempts}`;
            }
            
            Alert.alert('Login Gagal', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-background">
            <View className="flex-1 justify-center px-6">
                <View className="mb-12">
                    <Text className="text-4xl font-bold text-text-primary mb-2">Selamat Datang</Text>
                    <Text className="text-base text-text-secondary">Masuk untuk melanjutkan</Text>
                </View>

                <View className="space-y-4">
                    {/* Email Input */}
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
                    
                    {/* Password Input */}
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
                                disabled={loading}
                            >
                                <Text className="text-text-secondary text-sm">
                                    {showPassword ? '👁️' : '👁️‍🗨️'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Security Info */}
                    {loginAttempts > 0 && (
                        <View className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                            <Text className="text-xs text-yellow-800">
                                ⚠️ Percobaan login gagal: {loginAttempts}/5
                            </Text>
                        </View>
                    )}
                    
                    {/* Login Button */}
                    <TouchableOpacity 
                        className="bg-primary rounded-lg py-4 items-center mt-6"
                        onPress={handleLogin}
                        disabled={loading || loginAttempts >= 5}
                    >
                        {loading ? (
                            <ActivityIndicator color="#ffffff" />
                        ) : (
                            <Text className="text-text-inverse text-base font-semibold">Masuk</Text>
                        )}
                    </TouchableOpacity>

                    {/* Security Tips */}
                    <View className="mt-4 bg-gray-50 p-4 rounded-lg">
                        <Text className="text-xs font-medium text-text-secondary mb-2">
                            💡 Tips Keamanan:
                        </Text>
                        <Text className="text-xs text-text-secondary mb-1">
                            • Jangan bagikan password Anda kepada siapa pun
                        </Text>
                        <Text className="text-xs text-text-secondary mb-1">
                            • Gunakan password yang unik dan kuat
                        </Text>
                        <Text className="text-xs text-text-secondary">
                            • Logout setelah selesai menggunakan aplikasi
                        </Text>
                    </View>
                </View>

                {/* Register Link */}
                <View className="mt-8 items-center">
                    <Link href="/register" asChild>
                        <TouchableOpacity>
                            <Text className="text-text-secondary">
                                Belum punya akun? <Text className="text-primary font-semibold">Daftar</Text>
                            </Text>
                        </TouchableOpacity>
                    </Link>
                </View>
            </View>
        </SafeAreaView>
    );
}