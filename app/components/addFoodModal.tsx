import React, { useState } from 'react';
import { 
  Text, 
  View, 
  Modal, 
  TextInput, 
  Pressable, 
  ScrollView,
  KeyboardAvoidingView,
  Platform 
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { NutritionScan } from '@/app/types/meal';
import { formatDate, formatTime } from '@/app/utils/nutritionUtils';

interface AddFoodModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<NutritionScan, 'id'>) => void;
}

export default function AddFoodModal({ visible, onClose, onSubmit }: AddFoodModalProps) {
  const [foodName, setFoodName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fats, setFats] = useState('');

  const resetForm = () => {
    setFoodName('');
    setCalories('');
    setProtein('');
    setCarbs('');
    setFats('');
  };

  const handleSubmit = () => {
    if (!foodName || !calories || !protein || !carbs || !fats) {
      return;
    }

    const now = new Date();
    const newScan: Omit<NutritionScan, 'id'> = {
      foodName,
      date: formatDate(now),
      time: formatTime(now),
      calories: parseFloat(calories),
      protein: parseFloat(protein),
      carbs: parseFloat(carbs),
      fats: parseFloat(fats),
    };

    onSubmit(newScan);
    resetForm();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-end">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View 
            className="bg-white rounded-t-3xl"
            style={{
              maxHeight: '90%',
            }}
          >
            {/* Header */}
            <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-100">
              <Text className="text-xl font-bold text-gray-900">
                Tambah Makanan
              </Text>
              <Pressable onPress={onClose}>
                <View className="w-8 h-8 bg-gray-100 rounded-full items-center justify-center">
                  <Feather name="x" size={20} color="#6b7280" />
                </View>
              </Pressable>
            </View>

            <ScrollView className="px-6 py-4">
              {/* Food Name */}
              <View className="mb-4">
                <Text className="text-sm font-semibold text-gray-700 mb-2">
                  Nama Makanan
                </Text>
                <View className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                  <TextInput
                    value={foodName}
                    onChangeText={setFoodName}
                    placeholder="Contoh: Nasi Goreng"
                    placeholderTextColor="#9ca3af"
                    className="text-base text-gray-900"
                  />
                </View>
              </View>

              {/* Calories */}
              <View className="mb-4">
                <Text className="text-sm font-semibold text-gray-700 mb-2">
                  Kalori
                </Text>
                <View className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                  <TextInput
                    value={calories}
                    onChangeText={setCalories}
                    placeholder="350"
                    placeholderTextColor="#9ca3af"
                    keyboardType="numeric"
                    className="text-base text-gray-900"
                  />
                </View>
              </View>

              {/* Macros Row */}
              <View className="flex-row -mx-2 mb-4">
                {/* Protein */}
                <View className="flex-1 px-2">
                  <Text className="text-sm font-semibold text-gray-700 mb-2">
                    Protein (g)
                  </Text>
                  <View className="bg-green-50 rounded-xl px-3 py-3 border border-green-200">
                    <TextInput
                      value={protein}
                      onChangeText={setProtein}
                      placeholder="25"
                      placeholderTextColor="#9ca3af"
                      keyboardType="numeric"
                      className="text-base text-gray-900"
                    />
                  </View>
                </View>

                {/* Carbs */}
                <View className="flex-1 px-2">
                  <Text className="text-sm font-semibold text-gray-700 mb-2">
                    Karbo (g)
                  </Text>
                  <View className="bg-blue-50 rounded-xl px-3 py-3 border border-blue-200">
                    <TextInput
                      value={carbs}
                      onChangeText={setCarbs}
                      placeholder="45"
                      placeholderTextColor="#9ca3af"
                      keyboardType="numeric"
                      className="text-base text-gray-900"
                    />
                  </View>
                </View>

                {/* Fats */}
                <View className="flex-1 px-2">
                  <Text className="text-sm font-semibold text-gray-700 mb-2">
                    Lemak (g)
                  </Text>
                  <View className="bg-amber-50 rounded-xl px-3 py-3 border border-amber-200">
                    <TextInput
                      value={fats}
                      onChangeText={setFats}
                      placeholder="12"
                      placeholderTextColor="#9ca3af"
                      keyboardType="numeric"
                      className="text-base text-gray-900"
                    />
                  </View>
                </View>
              </View>

              {/* Info Box */}
              <View className="bg-blue-50 rounded-xl p-4 mb-6">
                <View className="flex-row items-start">
                  <Feather name="info" size={16} color="#3b82f6" />
                  <Text className="text-sm text-blue-700 ml-2 flex-1">
                    Masukkan informasi nutrisi seakurat mungkin untuk tracking yang lebih baik
                  </Text>
                </View>
              </View>
            </ScrollView>

            {/* Footer Buttons */}
            <View className="px-6 py-4 border-t border-gray-100">
              <View className="flex-row space-x-3">
                <Pressable 
                  onPress={onClose}
                  className="flex-1"
                >
                  <View className="bg-gray-100 rounded-xl py-4 items-center">
                    <Text className="text-base font-semibold text-gray-700">
                      Batal
                    </Text>
                  </View>
                </Pressable>

                <Pressable 
                  onPress={handleSubmit}
                  className="flex-1"
                >
                  <View className="bg-primary rounded-xl py-4 items-center">
                    <Text className="text-base font-semibold text-white">
                      Simpan
                    </Text>
                  </View>
                </Pressable>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}