import React, { useState, useMemo, useEffect, useCallback, useTransition } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import Animated, {
  FadeInDown,
  FadeInUp,
  SlideOutRight,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '@/app/contexts/cartContext';
import { FoodItem } from '@/app/types/food';
import { RICE_PORTIONS } from '@/app/types/meal';
import { mapCartToDisplayItems, calculateTotalItems } from '@/app/utils/cartUtils';
import CustomHeader from '@/app/components/customHeader';
import LoadingScreen from '@/app/components/loadingScreen';
import ErrorScreen from '@/app/components/errorScreen';
import { useMenu } from '@/app/contexts/menuContext';

const PiringPage = () => {
  // ---------- Context ----------
  const {
    cart,
    updateQuantity,
    removeFromCart,
    clearCart,
    ricePortion,
    setRicePortion,
    submitAnalysis,
    isEmpty,
    isLoading: cartLoading,
  } = useCart();

  const { menuData, isLoading: menuLoading, error: menuError, fetchMenu } = useMenu();

  // ---------- Local state ----------
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  
  // Lazy update untuk operasi yang tidak urgent
  const [isPending, startTransition] = useTransition();

  // ---------- Fetch menu jika belum ada ----------
  useEffect(() => {
    if (menuData.length === 0 && !menuLoading && !menuError) {
      fetchMenu();
    }
  }, [menuData.length, menuLoading, menuError, fetchMenu]);

  // ---------- Gabung cart + menuData → CartDisplayItem[] ----------
  const cartItems = useMemo(() => {
    return mapCartToDisplayItems(cart, menuData);
  }, [cart, menuData]);

  // ---------- Total item count ----------
  const totalItems = useMemo(() => {
    return calculateTotalItems(cart);
  }, [cart]);

  // ---------- Handlers ----------
  const handleIncrease = useCallback((id: string) => {
    const item = cart.find((c) => c.id === id);
    if (item) {
      updateQuantity(id, item.quantity + 1);
    }
  }, [cart, updateQuantity]);

  const handleDecrease = useCallback((id: string) => {
    const item = cart.find((c) => c.id === id);
    if (!item) return;

    if (item.quantity <= 1) {
      handleRemove(id);
    } else {
      updateQuantity(id, item.quantity - 1);
    }
  }, [cart, updateQuantity]);

  const handleRemove = useCallback((id: string) => {
    const item = cartItems.find((c) => c.id === id);
    setRemovingId(id);

    setTimeout(() => {
      removeFromCart(id);
      setRemovingId(null);
      if (item) {
        Alert.alert('Info', `${item.foodName} dihapus dari piring`);
      }
    }, 300);
  }, [cartItems, removeFromCart]);

  const handleClearCart = useCallback(() => {
    Alert.alert(
      'Konfirmasi',
      'Yakin ingin mengosongkan piring?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Ya, Kosongkan',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsClearing(true);
              await clearCart();
              
              // Navigate away immediately
              router.back();
              
              // Alert akan muncul di halaman sebelumnya
              setTimeout(() => {
                Alert.alert('Berhasil', 'Piring berhasil dikosongkan');
              }, 300);
            } catch (err) {
              Alert.alert('Error', 'Gagal mengosongkan piring');
              console.error('[PiringPage] Clear cart error:', err);
            } finally {
              setIsClearing(false);
            }
          },
        },
      ]
    );
  }, [clearCart]);

  const handleRicePortionChange = useCallback(async (portion: number) => {
    try {
      // Gunakan lazy update untuk perubahan porsi nasi (non-urgent)
      startTransition(() => {
        setRicePortion(portion);
      });
    } catch (err) {
      Alert.alert('Error', 'Gagal mengubah porsi nasi');
      console.error('[PiringPage] Rice portion error:', err);
    }
  }, [setRicePortion]);

  const handleSubmitAnalysis = useCallback(async () => {
    if (isEmpty) {
      Alert.alert('Perhatian', 'Tambahkan minimal 1 item makanan untuk dianalisis');
      return;
    }

    const selectedPortion = RICE_PORTIONS.find((p) => p.value === ricePortion);

    Alert.alert(
      'Konfirmasi Analisis',
      `Apakah Anda yakin ingin menganalisis makanan ini?\n\nJumlah item: ${totalItems}\nNasi: ${selectedPortion?.label} (~${selectedPortion?.grams}g)`,
      [
        {
          text: 'Batal',
          style: 'cancel',
        },
        {
          text: 'Ya, Analisis',
          onPress: async () => {
            try {
              const result = await submitAnalysis();

              if (result.success) {
                Alert.alert(
                  'Berhasil! 🎉',
                  result.message,
                  [
                    {
                      text: 'OK',
                      onPress: () => {
                        // Navigate ke home tab untuk melihat hasil
                        router.push('/(tabs)');
                      },
                    },
                  ]
                );
              } else {
                Alert.alert('Gagal', result.message);
              }
            } catch (err) {
              Alert.alert('Error', 'Gagal memproses analisis');
              console.error('[PiringPage] Submit analysis error:', err);
            }
          },
        },
      ]
    );
  }, [isEmpty, ricePortion, totalItems, submitAnalysis]);

  const handleBack = useCallback(() => {
    router.back();
  }, []);

  // ---------- Loading state ----------
  if (menuLoading && menuData.length === 0) {
    return <LoadingScreen message="Memuat piring..." />;
  }

  // ---------- Error state ----------
  if (menuError && menuData.length === 0) {
    return (
      <ErrorScreen
        title="Gagal Memuat Data"
        error={menuError}
        onRetry={fetchMenu}
      />
    );
  }

  // ---------- Empty state ----------
  if (cartItems.length === 0) {
    return (
      <View className="flex-1 bg-background-light">
        {/* Header */}
        <Animated.View entering={FadeInUp.duration(600)}>
          <View className="bg-surface-light pt-12 pb-4 px-4 shadow-sm">
            <View className="flex-row items-center">
              <TouchableOpacity
                onPress={handleBack}
                className="mr-3 p-2 rounded-full bg-overlay-light"
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={24} color="#333333" />
              </TouchableOpacity>
              <Text className="text-2xl font-bold text-text-primary-light flex-1">Piringku</Text>
            </View>
          </View>
        </Animated.View>

        {/* Kosong */}
        <View className="flex-1 items-center justify-center px-6">
          <Animated.View entering={FadeInDown.delay(200).duration(600)}>
            <View className="bg-overlay-light rounded-full p-8 mb-6 items-center justify-center">
              <Ionicons name="restaurant-outline" size={64} color="#B0BEC5" />
            </View>
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(350).duration(600)}>
            <View>
              <Text className="text-text-primary-light text-xl font-semibold text-center">
                Piring masih kosong
              </Text>
              <Text className="text-text-secondary-light text-sm mt-2 text-center">
                Tambahkan menu favorit Anda dari halaman menu untuk dianalisis nutrisinya
              </Text>
            </View>
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(500).duration(600)}>
            <TouchableOpacity
              onPress={handleBack}
              className="bg-primary-light px-6 py-3 rounded-lg mt-6 shadow-sm"
              activeOpacity={0.7}
            >
              <Text className="text-text-inverse-light font-semibold text-base">
                Lihat Menu
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
    );
  }

  // ---------- Main render ----------
  return (
    <View className="flex-1 bg-surface">
      {/* Header */}
      <Animated.View entering={FadeInUp.duration(600)}>
        <View className="flex-col gap-2">
          <View className="flex-5">
            <CustomHeader
              heading="Piringku"
              showBackButton={true}
            />
          </View>
          {/* Tombol hapus semua */}
          <TouchableOpacity
            onPress={handleClearCart}
            disabled={isClearing || cartLoading}
            className="p-2 rounded-full flex-2 flex-row items-center justify-center mr-4 bg-overlay-light"
            activeOpacity={0.7}
          >
            <Text className="text-xs text-red-500">Kosongkan piring</Text>
            <Ionicons name="trash-outline" size={22} color="#ef4444" />
          </TouchableOpacity>
        </View>

        {/* Item count badge */}
        <View className="flex-row items-center mt-3 px-4">
          <View className="bg-overlay-light rounded-full px-3 py-1">
            <Text className="text-text-secondary-light text-sm font-medium">
              {totalItems} item di piring
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Scrollable cart list */}
      <ScrollView
        className="flex-1 bg-background-light"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
      >
        {/* Rice Portion Scale */}
        <Animated.View entering={FadeInDown.delay(50).springify()}>
          <View className="bg-surface-light rounded-xl shadow-sm border border-border-light mb-4 p-4">
            <View className="flex-row items-center mb-3">
              <Ionicons name="restaurant" size={20} color="#37B37E" />
              <Text className="text-text-primary-light font-semibold text-base ml-2">
                Porsi Nasi
              </Text>
            </View>

            {/* Scale selector */}
            <View className="flex-row flex-wrap gap-2">
              {RICE_PORTIONS.map((portion) => (
                <TouchableOpacity
                  key={portion.value}
                  onPress={() => handleRicePortionChange(portion.value)}
                  disabled={cartLoading || isPending}
                  className={`px-3 py-2 rounded-lg border ${
                    ricePortion === portion.value
                      ? 'bg-primary-light border-primary-light'
                      : 'bg-overlay-light border-border-light'
                  } ${isPending ? 'opacity-50' : 'opacity-100'}`}
                  activeOpacity={0.7}
                >
                  <Text
                    className={`text-sm font-medium ${
                      ricePortion === portion.value
                        ? 'text-text-inverse-light'
                        : 'text-text-secondary-light'
                    }`}
                  >
                    {portion.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Gram info */}
            <View className="mt-3 pt-3 border-t border-border-light">
              <Text className="text-text-secondary-light text-xs">
                ~{RICE_PORTIONS.find((p) => p.value === ricePortion)?.grams || 0} gram nasi putih
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Cart items */}
        {cartItems.map((item, index) => (
          <Animated.View
            key={item.id}
            entering={FadeInDown.delay(index * 80 + 100).springify()}
            exiting={SlideOutRight.duration(300)}
          >
            <View
              className={`bg-surface-light rounded-xl shadow-sm border border-border-light mb-3 overflow-hidden ${
                removingId === item.id ? 'opacity-50' : 'opacity-100'
              }`}
            >
              {/* Gambar + Info */}
              <View className="flex-row">
                {/* Thumbnail */}
                <View className="w-24 h-24 bg-overlay-light">
                  {item.imageUrl ? (
                    <Animated.Image
                      source={{ uri: item.imageUrl }}
                      className="w-full h-full"
                      style={{ resizeMode: 'cover' }}
                    />
                  ) : (
                    <View className="flex-1 items-center justify-center">
                      <Ionicons name="image-outline" size={28} color="#B0BEC5" />
                    </View>
                  )}
                </View>

                {/* Nama & deskripsi */}
                <View className="flex-1 p-3 justify-center">
                  <Text className="text-text-primary-light font-semibold text-base">
                    {item.foodName}
                  </Text>
                  <Text
                    className="text-text-secondary-light text-sm mt-0.5"
                    numberOfLines={2}
                  >
                    {item.description}
                  </Text>
                </View>
              </View>

              {/* Divider */}
              <View className="border-t border-border-light mx-3" />

              {/* Quantity controls */}
              <View className="flex-row items-center px-3 py-2.5">
                {/* Tombol kurang */}
                <TouchableOpacity
                  onPress={() => handleDecrease(item.id)}
                  disabled={cartLoading}
                  className="w-8 h-8 rounded-full bg-overlay-light border border-border-light items-center justify-center"
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={item.quantity <= 1 ? 'trash-outline' : 'remove-outline'}
                    size={18}
                    color={item.quantity <= 1 ? '#ef4444' : '#333333'}
                  />
                </TouchableOpacity>

                {/* Jumlah */}
                <Text className="text-text-primary-light font-bold text-base w-8 text-center mx-2">
                  {item.quantity}
                </Text>

                {/* Tombol tambah */}
                <TouchableOpacity
                  onPress={() => handleIncrease(item.id)}
                  disabled={cartLoading}
                  className="w-8 h-8 rounded-full bg-primary-light items-center justify-center"
                  activeOpacity={0.7}
                >
                  <Ionicons name="add-outline" size={18} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        ))}
      </ScrollView>

      {/* ---------- Bottom CTA ---------- */}
      <Animated.View entering={FadeInUp.delay(200).duration(500)}>
        <View className="absolute bottom-0 left-0 right-0 bg-surface-light border-t border-border-light px-4 py-4">
          <TouchableOpacity
            onPress={handleSubmitAnalysis}
            disabled={cartLoading || isEmpty}
            className={`w-full py-4 rounded-xl shadow-sm ${
              cartLoading || isEmpty ? 'bg-gray-400' : 'bg-primary-light'
            }`}
            activeOpacity={0.8}
            style={{
              elevation: 4,
              shadowColor: '#37B37E',
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.25,
              shadowRadius: 6,
            }}
          >
            {cartLoading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text className="text-text-inverse-light font-bold text-base text-center">
                Analisis Nutrisi dan Gizi Sekarang
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
};

export default PiringPage;