import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { Link, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/app/contexts/authContext';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [loginAttempts, setLoginAttempts] = useState(0);
    const [errorMessage, setErrorMessage] = useState('');
    const { login } = useAuth();

    const validateEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const handleLogin = async () => {
        setErrorMessage('');

        if (loginAttempts >= 5) {
            setErrorMessage('Terlalu banyak percobaan. Akun Anda diblokir sementara. Silakan coba lagi dalam beberapa menit.');
            return;
        }

        if (!email || !password) {
            setErrorMessage('Mohon lengkapi semua kolom');
            return;
        }

        if (!validateEmail(email)) {
            setErrorMessage('Format email tidak valid');
            return;
        }

        if (password.length < 10) {
            setErrorMessage('Password minimal 10 karakter');
            return;
        }

        setLoading(true);
        try {
            await login(email.toLowerCase().trim(), password);
            setLoginAttempts(0);
            router.replace('/(tabs)');
        } catch (error: any) {
            const newAttempts = loginAttempts + 1;
            setLoginAttempts(newAttempts);

            const remainingAttempts = 5 - newAttempts;
            let msg = error.message || 'Email atau password salah';

            if (remainingAttempts > 0 && remainingAttempts <= 3) {
                msg += ` Sisa percobaan: ${remainingAttempts}`;
            }

            setErrorMessage(msg);
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
                            onChangeText={(text) => { setEmail(text); setErrorMessage(''); }}
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
                                onChangeText={(text) => { setPassword(text); setErrorMessage(''); }}
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

                    {/* Error Message */}
                    {errorMessage ? (
                        <View className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                            <Text className="text-red-600 text-sm">{errorMessage}</Text>
                        </View>
                    ) : null}

                    {/* Login Attempts Warning */}
                    {loginAttempts > 0 && !errorMessage && (
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