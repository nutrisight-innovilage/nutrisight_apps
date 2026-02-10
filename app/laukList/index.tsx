import React, { useState, useMemo, useCallback, memo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, FlatList, Alert } from 'react-native';
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
import { useCart } from '@/app/contexts/cartContext';
import { useMenu } from '@/app/contexts/menuContext';
import CustomHeader from '@/app/components/customHeader';
import LoadingScreen from '@/app/components/loadingScreen';
import ErrorScreen from '@/app/components/errorScreen';
import { filterAndSortMenu } from '@/app/utils/menuUtils';

// Memoized MenuItem Component untuk optimasi render
const MenuItem = memo<{ 
  item: FoodItem; 
  index: number; 
  onNavigate: (id: string) => void;
}>(({ item, index, onNavigate }) => {
  return (
    <Animated.View entering={FadeInDown.delay(index * 100).springify()}>
      <View className="mb-4">
        <Card onPress={() => onNavigate(item.id)}>
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
});

MenuItem.displayName = 'MenuItem';

// Memoized CategoryFilter Component
const CategoryFilter = memo<{
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}>(({ categories, selectedCategory, onSelectCategory }) => {
  return (
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
              onPress={() => onSelectCategory(category)}
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
  );
});

CategoryFilter.displayName = 'CategoryFilter';

// Memoized SortDropdown Component
const SortDropdown = memo<{
  sortOptions: { value: SortOption; label: string }[];
  sortBy: SortOption;
  onSelectSort: (value: SortOption) => void;
}>(({ sortOptions, sortBy, onSelectSort }) => {
  return (
    <Animated.View entering={FadeInDown.duration(300)}>
      <View className="bg-surface-light mx-4 mt-2 rounded-xl shadow-lg overflow-hidden border border-border-light">
        {sortOptions.map((option, index) => (
          <TouchableOpacity
            key={option.value}
            onPress={() => onSelectSort(option.value)}
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
  );
});

SortDropdown.displayName = 'SortDropdown';

const MenuPage = () => {
  // Local UI states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [sortBy, setSortBy] = useState<SortOption>('name-asc');
  const [showSortOptions, setShowSortOptions] = useState(false);

  // Global contexts - Updated to use cart from cartContext
  const { cart, addToCart, totalItems, isLoading: cartLoading } = useCart();
  const { menuData, categories, isLoading, isRefreshing, error, refreshMenu, fetchMenu } = useMenu();
  
  const cartScale = useSharedValue(1);

  // Filter and sort data using utility function with memoization
  const filteredAndSortedData = useMemo(() => {
    return filterAndSortMenu(menuData, {
      searchQuery,
      category: selectedCategory,
      sortBy,
    });
  }, [menuData, searchQuery, selectedCategory, sortBy]);

  // Optimized handlers with useCallback
  const handleAddToCart = useCallback(async (itemId: string) => {
    try {
      await addToCart(itemId);

      // Animasi bounce tombol cart
      cartScale.value = withSpring(1.2, {}, () => {
        cartScale.value = withSpring(1);
      });

      const menuItem = menuData.find(item => item.id === itemId);
      if (menuItem) {
        Alert.alert('Berhasil', `${menuItem.foodName} ditambahkan ke piring!`);
      }
    } catch (error) {
      Alert.alert('Error', 'Gagal menambahkan ke piring');
      console.error('[MenuPage] Add to cart error:', error);
    }
  }, [addToCart, menuData, cartScale]);

  const navigateToDetail = useCallback((id: string) => {
    router.push(`/laukList/foodCard/${id}`);
  }, []);

  const navigateToPiring = useCallback(() => {
    if (totalItems === 0) {
      Alert.alert('Peringatan', 'Piring masih kosong!');
      return;
    }
    router.push('/laukList/piring');
  }, [totalItems]);

  const handleSelectCategory = useCallback((category: string) => {
    setSelectedCategory(category);
  }, []);

  const handleSelectSort = useCallback((value: SortOption) => {
    setSortBy(value);
    setShowSortOptions(false);
  }, []);

  const toggleSortOptions = useCallback(() => {
    setShowSortOptions(prev => !prev);
  }, []);

  // Animated style untuk tombol cart
  const cartButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cartScale.value }]
  }));

  // Sort options
  const sortOptions: { value: SortOption; label: string }[] = useMemo(() => [
    { value: 'name-asc', label: 'Nama (A-Z)' },
    { value: 'name-desc', label: 'Nama (Z-A)' },
  ], []);

  // Optimized renderItem with useCallback
  const renderMenuItem = useCallback(({ item, index }: { item: FoodItem; index: number }) => {
    return (
      <MenuItem 
        item={item} 
        index={index} 
        onNavigate={navigateToDetail}
      />
    );
  }, [navigateToDetail]);

  // KeyExtractor memoized
  const keyExtractor = useCallback((item: FoodItem) => item.id, []);

  // Loading state
  if (isLoading) {
    return <LoadingScreen message="Memuat menu..." />;
  }

  // Error state
  if (error && !menuData.length) {
    return <ErrorScreen error={error} onRetry={fetchMenu} />;
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
      <CategoryFilter 
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={handleSelectCategory}
      />

      {/* Sort & Result Count */}
      <Animated.View entering={FadeInUp.delay(300).duration(600)}>
        <View className="flex-row justify-between items-center px-4 py-3 bg-surface-light border-b border-border-light">
          <Text className="text-text-secondary-light text-sm font-medium">
            {filteredAndSortedData.length} menu ditemukan
          </Text>
          
          <TouchableOpacity
            onPress={toggleSortOptions}
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
        <SortDropdown 
          sortOptions={sortOptions}
          sortBy={sortBy}
          onSelectSort={handleSelectSort}
        />
      )}

      {/* Menu List */}
      <FlatList
        data={filteredAndSortedData}
        renderItem={renderMenuItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshing={isRefreshing}
        onRefresh={refreshMenu}
        showsVerticalScrollIndicator={false}
        // Performance optimizations
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        initialNumToRender={10}
        windowSize={10}
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
            disabled={cartLoading}
            className={`rounded-full px-6 py-4 shadow-xl flex-row items-center ${
              cartLoading ? 'bg-gray-400' : 'bg-primary-light'
            }`}
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