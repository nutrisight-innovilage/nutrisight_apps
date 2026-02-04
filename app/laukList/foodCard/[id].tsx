import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  SlideInDown,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCart } from '@/app/contexts/cartContext';
import CustomHeader from '@/app/components/customHeader';

// ==================== TYPES ====================
interface Nutrition {
  protein: number;
  fat: number;
  carbs: number;
  calories: number;
  vitamins: string[];
}

interface FoodItem {
  id: string;
  foodName: string;
  nutrition: Nutrition;
  recipe: string;
  imageUrl: string;
  category: string;
}

// ==================== DUMMY DATA ====================
const FOOD_DATA: Record<string, FoodItem> = {
  '1': {
    id: '1',
    foodName: 'Nasi Goreng Spesial',
    category: 'Main Course',
    nutrition: {
      protein: 12,
      fat: 8,
      carbs: 45,
      calories: 320,
      vitamins: ['B1', 'B12', 'C', 'K'],
    },
    recipe: `1. Panaskan minyak di wajan dengan api sedang
2. Tumis bawang putih dan bawang merah hingga harum
3. Masukkan telur, orak-arik hingga matang
4. Tambahkan nasi putih, aduk rata
5. Beri kecap manis, garam, dan merica
6. Masak sambil terus diaduk selama 3-5 menit
7. Sajikan dengan kerupuk dan acar`,
    imageUrl: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400',
  },
  '2': {
    id: '2',
    foodName: 'Ayam Bakar Madu',
    category: 'Main Course',
    nutrition: {
      protein: 28,
      fat: 15,
      carbs: 8,
      calories: 280,
      vitamins: ['B6', 'B12', 'D', 'E'],
    },
    recipe: `1. Bersihkan ayam, lumuri dengan air jeruk nipis
2. Campurkan bumbu: bawang putih, jahe, kecap, madu
3. Marinasi ayam minimal 2 jam di kulkas
4. Panaskan panggangan atau oven 180°C
5. Bakar ayam sambil sesekali diolesi bumbu
6. Balik setiap 10 menit hingga matang merata (30-40 menit)
7. Sajikan dengan sambal dan lalapan`,
    imageUrl: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=400',
  },
  '3': {
    id: '3',
    foodName: 'Gado-Gado',
    category: 'Salad',
    nutrition: {
      protein: 10,
      fat: 12,
      carbs: 25,
      calories: 250,
      vitamins: ['A', 'C', 'E', 'K'],
    },
    recipe: `1. Rebus sayuran: kol, kangkung, tauge, wortel
2. Goreng tempe dan tahu hingga kecokelatan
3. Blender bumbu kacang: kacang tanah, cabai, gula merah, air asam
4. Tata sayuran, tempe, tahu di piring
5. Siram dengan bumbu kacang
6. Tambahkan telur rebus dan kerupuk
7. Sajikan hangat`,
    imageUrl: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400',
  },
};

// ==================== MAIN COMPONENT ====================
export default function CardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [recipeExpanded, setRecipeExpanded] = useState(false);
  const [foodData, setFoodData] = useState<FoodItem | null>(null);
  const [loading, setLoading] = useState(true);

  // Cart context
  const { addToCart, cart } = useCart();

  // ==================== DATA FETCHING ====================
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      
      // Simulasi API call dengan delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const data = FOOD_DATA[id as string];
      setFoodData(data || null);
      setLoading(false);
    };

    if (id) {
      loadData();
    }
  }, [id]);

  // ==================== ANIMATED STYLES ====================
  const arrowRotation = useAnimatedStyle(() => {
    return {
      transform: [
        { rotate: withTiming(recipeExpanded ? '180deg' : '0deg', { duration: 200 }) }
      ],
    };
  });

  // ==================== HANDLERS ====================
  const handleBack = () => {
    router.back();
  };

  const handleAddMeal = async () => {
    if (foodData) {
      try {
        await addToCart(id as string, 1);
        Alert.alert('Berhasil', `${foodData.foodName} berhasil ditambahkan ke piring!`);
        console.log(`Adding meal with ID: ${id}`);
      } catch (error) {
        Alert.alert('Error', 'Gagal menambahkan ke piring');
        console.error('Error adding to cart:', error);
      }
    }
  };

  // Check if item is already in cart
  const itemInCart = cart.find(item => item.id === id);
  const cartQuantity = itemInCart?.quantity || 0;

  // ==================== LOADING STATE ====================
  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#10b981" />
        <Text className="mt-4 text-gray-600 text-base">Memuat data...</Text>
      </SafeAreaView>
    );
  }

  // ==================== ERROR STATE ====================
  if (!foodData) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center px-6">
        <Animated.View entering={FadeIn.duration(300)}>
          <View className="items-center">
            <View className="bg-red-100 rounded-full p-6 mb-4">
              <MaterialIcons name="error-outline" size={48} color="#ef4444" />
            </View>
            <Text className="text-xl font-bold text-gray-900 mt-2">
              Makanan Tidak Ditemukan
            </Text>
            <Text className="text-gray-500 text-center mt-2 text-base">
              Makanan dengan ID "{id}" tidak ada dalam database
            </Text>
            <TouchableOpacity
              onPress={handleBack}
              className="mt-6 bg-emerald-500 px-8 py-3 rounded-xl shadow-lg"
              activeOpacity={0.8}
            >
              <Text className="text-white font-semibold text-base">
                Kembali
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </SafeAreaView>
    );
  }

  // ==================== MAIN RENDER ====================
  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* ==================== FIXED HEADER ==================== */}
      <Animated.View entering={FadeInDown.duration(400)}>
        <CustomHeader 
          heading={foodData.foodName}
          subHeading={foodData.category}
          showBackButton={true}
          />    
          <View className="w-10" />
      </Animated.View>

      {/* ==================== SCROLLABLE CONTENT ==================== */}
      <ScrollView 
        className="flex-1"
        showsVerticalScrollIndicator={false}
      >
        {/* ==================== FOOD IMAGE ==================== */}
        <Animated.View entering={FadeIn.delay(200).duration(500)}>
          <View className="mx-4 mt-4 rounded-2xl overflow-hidden bg-gray-100 shadow-lg">
            <View className="aspect-[4/3]">
              <Image
                source={{ uri: foodData.imageUrl }}
                className="w-full h-full"
                resizeMode="cover"
              />
              {/* Gradient Overlay */}
              <View 
                className="absolute bottom-0 left-0 right-0 h-24"
                style={{
                  backgroundColor: 'rgba(0,0,0,0.4)',
                }}
              />
              {/* Cart Badge if item in cart */}
              {cartQuantity > 0 && (
                <View className="absolute top-3 right-3 bg-emerald-500 rounded-full px-3 py-1.5 shadow-lg">
                  <Text className="text-white font-bold text-sm">
                    {cartQuantity}x di piring
                  </Text>
                </View>
              )}
            </View>
          </View>
        </Animated.View>

        {/* ==================== CALORIES BADGE ==================== */}
        <Animated.View entering={SlideInDown.delay(300).springify()}>
          <View className="mx-4 -mt-6" style={{ zIndex: 10 }}>
            <View 
              className="bg-white rounded-2xl p-4 shadow-lg"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              <View className="flex-row items-center justify-center">
                <View className="bg-orange-100 rounded-full p-2">
                  <MaterialIcons name="local-fire-department" size={20} color="#f59e0b" />
                </View>
                <Text className="text-2xl font-bold text-gray-900 ml-3">
                  {foodData.nutrition.calories}
                </Text>
                <Text className="text-base text-gray-500 ml-1 font-medium">kalori</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* ==================== NUTRITION INFO ==================== */}
        <Animated.View entering={FadeInUp.delay(400).duration(500)}>
          <View className="mx-4 mt-6">
            <Text className="text-lg font-bold text-gray-900 mb-4">
              Informasi Gizi
            </Text>
            
            <View className="flex-row justify-between gap-3">
              {/* Protein */}
              <View className="flex-1 bg-blue-50 rounded-2xl overflow-hidden border border-blue-100">
                <View className="p-4 items-center">
                  <View className="bg-blue-500 rounded-full p-2.5 mb-2">
                    <MaterialIcons name="fitness-center" size={18} color="#ffffff" />
                  </View>
                  <Text className="text-xs text-gray-600 font-medium">Protein</Text>
                  <Text className="text-xl font-bold text-gray-900 mt-1">
                    {foodData.nutrition.protein}
                  </Text>
                  <Text className="text-xs text-gray-500">gram</Text>
                </View>
              </View>

              {/* Fat */}
              <View className="flex-1 bg-amber-50 rounded-2xl overflow-hidden border border-amber-100">
                <View className="p-4 items-center">
                  <View className="bg-amber-500 rounded-full p-2.5 mb-2">
                    <MaterialIcons name="opacity" size={18} color="#ffffff" />
                  </View>
                  <Text className="text-xs text-gray-600 font-medium">Lemak</Text>
                  <Text className="text-xl font-bold text-gray-900 mt-1">
                    {foodData.nutrition.fat}
                  </Text>
                  <Text className="text-xs text-gray-500">gram</Text>
                </View>
              </View>

              {/* Carbs */}
              <View className="flex-1 bg-green-50 rounded-2xl overflow-hidden border border-green-100">
                <View className="p-4 items-center">
                  <View className="bg-green-500 rounded-full p-2.5 mb-2">
                    <MaterialIcons name="eco" size={18} color="#ffffff" />
                  </View>
                  <Text className="text-xs text-gray-600 font-medium">Karbo</Text>
                  <Text className="text-xl font-bold text-gray-900 mt-1">
                    {foodData.nutrition.carbs}
                  </Text>
                  <Text className="text-xs text-gray-500">gram</Text>
                </View>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* ==================== VITAMINS ==================== */}
        <Animated.View entering={FadeInUp.delay(500).duration(500)}>
          <View className="mx-4 mt-6">
            <Text className="text-base font-bold text-gray-900 mb-3">
              Vitamin & Mineral
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {foodData.nutrition.vitamins.map((vitamin, index) => (
                <Animated.View
                  key={vitamin}
                  entering={FadeIn.delay(600 + index * 50).springify()}
                >
                  <View className="bg-emerald-100 border border-emerald-200 px-4 py-2.5 rounded-full">
                    <Text className="text-sm font-semibold text-emerald-700">
                      Vitamin {vitamin}
                    </Text>
                  </View>
                </Animated.View>
              ))}
            </View>
          </View>
        </Animated.View>

        {/* ==================== RECIPE SECTION ==================== */}
        <Animated.View entering={FadeInUp.delay(600).duration(500)}>
          <View className="mx-4 mt-6 mb-4 bg-gray-50 rounded-2xl overflow-hidden border border-gray-200">
            {/* Recipe Header */}
            <TouchableOpacity
              onPress={() => setRecipeExpanded(!recipeExpanded)}
              className="flex-row justify-between items-center p-4"
              activeOpacity={0.7}
            >
              <View className="flex-row items-center">
                <View className="bg-gray-200 rounded-full p-2">
                  <MaterialIcons name="restaurant-menu" size={18} color="#4b5563" />
                </View>
                <Text className="text-base font-bold text-gray-900 ml-3">
                  Cara Memasak
                </Text>
              </View>
              <Animated.View style={arrowRotation}>
                <MaterialIcons 
                  name="expand-more" 
                  size={24} 
                  color="#6b7280" 
                />
              </Animated.View>
            </TouchableOpacity>

            {/* Recipe Content with Animation */}
            {recipeExpanded && (
              <Animated.View entering={FadeInDown.duration(300)}>
                <View className="px-4 pb-4 pt-2 border-t border-gray-200">
                  <Text className="text-sm text-gray-700 leading-6">
                    {foodData.recipe}
                  </Text>
                </View>
              </Animated.View>
            )}
          </View>
        </Animated.View>

        {/* Bottom Spacing for Floating Button */}
        <View className="h-24" />
      </ScrollView>

      {/* ==================== FLOATING ADD BUTTON ==================== */}
      <Animated.View entering={SlideInDown.delay(700).springify()}>
        <View
          className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-4"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 8,
          }}
        >
          <TouchableOpacity
            onPress={handleAddMeal}
            className="bg-emerald-500 flex-row items-center justify-center py-4 rounded-2xl"
            activeOpacity={0.8}
            style={{
              shadowColor: '#10b981',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <MaterialIcons name="add-circle" size={24} color="#fff" />
            <Text className="text-white text-base font-bold ml-2">
              {cartQuantity > 0 ? `Tambah Lagi (${cartQuantity}x)` : 'Tambah ke Piring'}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}