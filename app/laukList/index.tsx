import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import Animated, { 
  FadeInDown, 
  FadeInUp,
  useAnimatedStyle,
  withSpring,
  useSharedValue
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import SearchBox from '@/app/components/searchBox';
import Card from '@/app/components/card';
import FoodCardItem from './foodCard/foodCardItem';
import { FoodItem, SortOption } from '@/app/types/food';
import { fetchMenuItems } from '@/app/services/api';
import { useCart } from '@/app/contexts/cartContext';
import CustomHeader from '../components/customHeader';

const MenuPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [sortBy, setSortBy] = useState<SortOption>('name-asc');
  const [showSortOptions, setShowSortOptions] = useState(false);

  // Cart dari global context
  const { cart, addToCart, totalItems } = useCart();
  
  // Service states
  const [menuData, setMenuData] = useState<FoodItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const cartScale = useSharedValue(1);


  // TODO: pindahin fetching ke context dan API service layer
  // Fetch menu data
  const fetchMenu = async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      const data = await fetchMenuItems();
      setMenuData(data);
      
      if (showRefreshIndicator) {
        Alert.alert('Berhasil', 'Menu berhasil diperbarui!');
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Gagal memuat data menu';
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
      console.error('Error fetching menu:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchMenu();
  }, []);

  // TODO: extract kategori ke context atau util function
  // Kategori yang tersedia - extract dari data
  const categories = useMemo(() => {
    const uniqueCategories = Array.from(
      new Set(menuData.map(item => item.category).filter(Boolean))
    ) as string[];
    return ['Semua', ...uniqueCategories];
  }, [menuData]);

  // TODO: extract filter & sort logic ke util function
  // Filter dan sort data
  const filteredAndSortedData = useMemo(() => {
    let filtered = menuData;

    // Filter berdasarkan search
    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.foodName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter berdasarkan kategori
    if (selectedCategory !== 'Semua') {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }

    // Sort data
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return a.foodName.localeCompare(b.foodName);
        case 'name-desc':
          return b.foodName.localeCompare(a.foodName);
        default:
          return 0;
      }
    });

    return sorted;
  }, [menuData, searchQuery, selectedCategory, sortBy]);

  // Wrapper: tambah ke cart via context + animasi + alert
  const handleAddToCart = async (itemId: string) => {
    await addToCart(itemId);

    // Animasi bounce tombol cart
    cartScale.value = withSpring(1.2, {}, () => {
      cartScale.value = withSpring(1);
    });

    const menuItem = menuData.find(item => item.id === itemId);
    if (menuItem) {
      Alert.alert('Berhasil', `${menuItem.foodName} ditambahkan ke piring!`);
    }
  };

  // Navigasi ke halaman detail
  const navigateToDetail = (id: string) => {
    router.push(`/laukList/foodCard/${id}`);
  };

  // Navigasi ke halaman piring
  const navigateToPiring = () => {
    if (totalItems === 0) {
      Alert.alert('Peringatan', 'Piring masih kosong!');
      return;
    }
    router.push('/laukList/piring');
  };

  // Navigasi back
  const handleBack = () => {
    router.back();
  };

  // Refresh data
  const handleRefresh = () => {
    fetchMenu(true);
  };

  // Animated style untuk tombol cart
  const cartButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cartScale.value }]
  }));

  // Sort options
  const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'name-asc', label: 'Nama (A-Z)' },
    { value: 'name-desc', label: 'Nama (Z-A)' },
  ];

  const renderMenuItem = ({ item, index }: { item: FoodItem; index: number }) => {
    const cartItem = cart.find(c => c.id === item.id);
    const cartQuantity = cartItem?.quantity ?? 0;

    return (
      <Animated.View entering={FadeInDown.delay(index * 100).springify()}>
        <View className="mb-4">
          <Card onPress={() => navigateToDetail(item.id)}>
            <FoodCardItem
              id={item.id}
              name={item.foodName}
              description={item.description}
              imageUrl={item.imageUrl}
            />
          </Card>
        </View>
      </Animated.View>
    );
  };

  // TODO: refactor loading page ke komponen terpisah
  // Loading state
  if (isLoading) {
    return (
      <View className="flex-1 bg-background-light justify-center items-center">
        <ActivityIndicator size="large" color="#37B37E" />
        <Text className="text-text-secondary-light mt-4 text-base">Memuat menu...</Text>
      </View>
    );
  }

  // TODO: refactor error page ke komponen terpisah
  // Error state
  if (error && !menuData.length) {
    return (
      <View className="flex-1 bg-background-light justify-center items-center px-6">
        <View className="bg-red-100 rounded-full p-6 mb-4">
          <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
        </View>
        <Text className="text-text-primary-light text-lg font-semibold mt-2">Terjadi Kesalahan</Text>
        <Text className="text-text-secondary-light text-center mt-2 text-base">{error}</Text>
        <TouchableOpacity
          onPress={() => fetchMenu()}
          className="bg-primary-light px-6 py-3 rounded-lg mt-6 shadow-sm"
          activeOpacity={0.7}
        >
          <Text className="text-text-inverse-light font-semibold text-base">Coba Lagi</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background-light">
      {/* Header dengan Search Box */}
      <Animated.View entering={FadeInUp.duration(600)}>
        <CustomHeader
            heading="Menu Lauk"
            showBackButton={true}
          />

          {/* Search Box */}
          <SearchBox
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Cari menu favorit..."
          />
      </Animated.View>

      {/* Filter Kategori */}
      <Animated.View entering={FadeInUp.delay(200).duration(600)}>
        <View className="bg-surface-light border-b border-border-light">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="py-3 px-4"
            contentContainerStyle={{ paddingRight: 16 }}
          >
            {categories.map((category) => (
              <TouchableOpacity
                key={category}
                onPress={() => setSelectedCategory(category)}
                className={`mr-3 px-5 py-2.5 rounded-full ${
                  selectedCategory === category
                    ? 'bg-primary-light shadow-sm'
                    : 'bg-overlay-light border border-border-light'
                }`}
                activeOpacity={0.7}
              >
                <Text
                  className={`font-semibold text-sm ${
                    selectedCategory === category
                      ? 'text-text-inverse-light'
                      : 'text-text-primary-light'
                  }`}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Animated.View>

      {/* Sort & Result Count */}
      <Animated.View entering={FadeInUp.delay(300).duration(600)}>
        <View className="flex-row justify-between items-center px-4 py-3 bg-surface-light border-b border-border-light">
          <Text className="text-text-secondary-light text-sm font-medium">
            {filteredAndSortedData.length} menu ditemukan
          </Text>
          
          <TouchableOpacity
            onPress={() => setShowSortOptions(!showSortOptions)}
            className="flex-row items-center bg-overlay-light px-3 py-2 rounded-lg border border-border-light"
            activeOpacity={0.7}
          >
            <Ionicons name="funnel-outline" size={16} color="#333333" />
            <Text className="ml-2 text-text-primary-light font-medium text-sm">
              {sortOptions.find(opt => opt.value === sortBy)?.label}
            </Text>
            <Ionicons 
              name={showSortOptions ? "chevron-up" : "chevron-down"} 
              size={16} 
              color="#333333" 
              style={{ marginLeft: 4 }}
            />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Sort Options Dropdown */}
      {showSortOptions && (
        <Animated.View entering={FadeInDown.duration(300)}>
          <View className="bg-surface-light mx-4 mt-2 rounded-xl shadow-lg overflow-hidden border border-border-light">
            {sortOptions.map((option, index) => (
              <TouchableOpacity
                key={option.value}
                onPress={() => {
                  setSortBy(option.value);
                  setShowSortOptions(false);
                }}
                className={`px-4 py-3.5 ${
                  index < sortOptions.length - 1 ? 'border-b border-border-light' : ''
                } ${sortBy === option.value ? 'bg-overlay-light' : ''}`}
                activeOpacity={0.7}
              >
                <View className="flex-row items-center justify-between">
                  <Text
                    className={`text-sm ${
                      sortBy === option.value
                        ? 'text-primary-light font-semibold'
                        : 'text-text-primary-light font-medium'
                    }`}
                  >
                    {option.label}
                  </Text>
                  {sortBy === option.value && (
                    <Ionicons name="checkmark" size={20} color="#37B37E" />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      )}

      {/* Menu List */}
      <FlatList
        data={filteredAndSortedData}
        renderItem={renderMenuItem}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshing={isRefreshing}
        onRefresh={handleRefresh}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View className="items-center justify-center py-20">
            <View className="bg-overlay-light rounded-full p-6 mb-4">
              <Ionicons name="search-outline" size={48} color="#B0BEC5" />
            </View>
            <Text className="text-text-primary-light text-lg font-semibold">Menu tidak ditemukan</Text>
            <Text className="text-text-secondary-light text-sm mt-2">Coba kata kunci lain atau kategori berbeda</Text>
          </View>
        }
      />

      {/* Floating Button - Ke Piringku */}
      <Animated.View style={[cartButtonStyle]}>
        <View className="absolute bottom-6 right-6">
          <TouchableOpacity
            onPress={navigateToPiring}
            className="bg-primary-light rounded-full px-6 py-4 shadow-xl flex-row items-center"
            activeOpacity={0.8}
            style={{
              elevation: 8,
              shadowColor: '#37B37E',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
            }}
          >
            <Ionicons name="restaurant" size={24} color="white" />
            {totalItems > 0 && (
              <View className="ml-2 bg-white rounded-full px-3 py-1 min-w-[28px] items-center">
                <Text className="text-primary-light font-bold text-sm">{totalItems}</Text>
              </View>
            )}
            <Text className="text-text-inverse-light font-semibold ml-2 text-base">Piringku</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
};

export default MenuPage;