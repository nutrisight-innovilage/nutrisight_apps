import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/app/contexts/authContext';

type Gender = "male" | "female";
type UserRole = "ibu hamil" | "anak anak" | "remaja" | "dewasa" | "lansia";

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

    const handleRegister = async () => {
        if (!email || !password || !confirmPassword || !name || !age || !weight || !height || !gender || !role) {
            Alert.alert('Error', 'Please fill all fields');
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return;
        }

        if (parseInt(age) < 1 || parseInt(age) > 150) {
            Alert.alert('Error', 'Please enter a valid age');
            return;
        }

        if (parseFloat(weight) < 1 || parseFloat(height) < 1) {
            Alert.alert('Error', 'Please enter valid weight and height');
            return;
        }

        setLoading(true);
        try {
            await register({
                email,
                password,
                name,
                age,
                weight,
                height,
                gender: gender as Gender,
                role: role as UserRole,
            });
            Alert.alert('Success', 'Registration successful!');
            router.replace('/(tabs)');
        } catch (error: any) {
            Alert.alert('Registration Failed', error.message || 'Please try again');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-background">
            <ScrollView className="flex-1 px-6">
                <View className="py-8">
                    <Text className="text-4xl font-bold text-text-primary mb-2">Create Account</Text>
                    <Text className="text-base text-text-secondary mb-8">Fill in your details to register</Text>

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

                        <View>
                            <Text className="text-sm font-medium text-text-primary mb-2">Confirm Password</Text>
                            <TextInput
                                className="bg-input border border-border rounded-lg px-4 py-3 text-base text-text-primary"
                                placeholder="Confirm your password"
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry
                                editable={!loading}
                                placeholderTextColor="#999"
                            />
                        </View>

                        <View>
                            <Text className="text-sm font-medium text-text-primary mb-2">Full Name</Text>
                            <TextInput
                                className="bg-input border border-border rounded-lg px-4 py-3 text-base text-text-primary"
                                placeholder="Enter your full name"
                                value={name}
                                onChangeText={setName}
                                editable={!loading}
                                placeholderTextColor="#999"
                            />
                        </View>

                        <View className="flex-row space-x-4">
                            <View className="flex-1">
                                <Text className="text-sm font-medium text-text-primary mb-2">Age</Text>
                                <TextInput
                                    className="bg-input border border-border rounded-lg px-4 py-3 text-base text-text-primary"
                                    placeholder="Age"
                                    value={age}
                                    onChangeText={setAge}
                                    keyboardType="numeric"
                                    editable={!loading}
                                    placeholderTextColor="#999"
                                />
                            </View>

                            <View className="flex-1">
                                <Text className="text-sm font-medium text-text-primary mb-2">Gender</Text>
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

                        <View className="flex-row space-x-4">
                            <View className="flex-1">
                                <Text className="text-sm font-medium text-text-primary mb-2">Weight (kg)</Text>
                                <TextInput
                                    className="bg-input border border-border rounded-lg px-4 py-3 text-base text-text-primary"
                                    placeholder="Weight"
                                    value={weight}
                                    onChangeText={setWeight}
                                    keyboardType="numeric"
                                    editable={!loading}
                                    placeholderTextColor="#999"
                                />
                            </View>

                            <View className="flex-1">
                                <Text className="text-sm font-medium text-text-primary mb-2">Height (cm)</Text>
                                <TextInput
                                    className="bg-input border border-border rounded-lg px-4 py-3 text-base text-text-primary"
                                    placeholder="Height"
                                    value={height}
                                    onChangeText={setHeight}
                                    keyboardType="numeric"
                                    editable={!loading}
                                    placeholderTextColor="#999"
                                />
                            </View>
                        </View>

                        <View>
                            <Text className="text-sm font-medium text-text-primary mb-2">Role (Kategori Pengguna)</Text>
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

                        <TouchableOpacity 
                            className="bg-primary rounded-lg py-4 items-center mt-6"
                            onPress={handleRegister}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#ffffff" />
                            ) : (
                                <Text className="text-text-inverse text-base font-semibold">Register</Text>
                            )}
                        </TouchableOpacity>

                        <View className="mt-4 items-center pb-8">
                            <TouchableOpacity onPress={() => router.back()}>
                                <Text className="text-text-secondary">
                                    Already have an account? <Text className="text-primary font-semibold">Login</Text>
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}