import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { Link, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/app/contexts/authContext';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please fill all fields');
            return;
        }

        setLoading(true);
        try {
            await login(email, password);
            // Navigation will be handled automatically by _layout
            router.replace('/(tabs)');
        } catch (error: any) {
            Alert.alert('Login Failed', error.message || 'Invalid email or password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-background">
            <View className="flex-1 justify-center px-6">
                <View className="mb-12">
                    <Text className="text-4xl font-bold text-text-primary mb-2">Welcome Back</Text>
                    <Text className="text-base text-text-secondary">Sign in to continue</Text>
                </View>
                
                <View className="space-y-4">
                    <View>
                        <Text className="text-sm font-medium text-text-primary mb-2">Email</Text>
                        <TextInput
                            className="bg-input border border-border rounded-lg px-4 py-3 text-base text-text-primary"
                            placeholder="Enter your email"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            editable={!loading}
                            placeholderTextColor="#999"
                        />
                    </View>
                    
                    <View>
                        <Text className="text-sm font-medium text-text-primary mb-2">Password</Text>
                        <TextInput
                            className="bg-input border border-border rounded-lg px-4 py-3 text-base text-text-primary"
                            placeholder="Enter your password"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            editable={!loading}
                            placeholderTextColor="#999"
                        />
                    </View>
                    
                    <TouchableOpacity 
                        className="bg-primary rounded-lg py-4 items-center mt-6"
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#ffffff" />
                        ) : (
                            <Text className="text-text-inverse text-base font-semibold">Sign In</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <View className="mt-8 items-center">
                    <Link href="/register" asChild>
                        <TouchableOpacity>
                            <Text className="text-text-secondary">
                                Don't have an account? <Text className="text-primary font-semibold">Register</Text>
                            </Text>
                        </TouchableOpacity>
                    </Link>
                </View>
            </View>
        </SafeAreaView>
    );
}