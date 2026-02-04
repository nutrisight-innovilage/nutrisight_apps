import { FoodItem, FoodItemDetail } from '@/app/types/food';

// Mock data - ganti dengan API call yang sebenarnya
const FOOD_DATA_DETAIL: Record<string, FoodItemDetail> = {
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
    description: 'Nasi goreng dengan bumbu spesial dan tambahan kerupuk.',
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
    description: 'Ayam bakar yang manis dan lezat dengan bumbu madu.',
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
    description: 'Salad sayuran segar dengan bumbu kacang yang kaya rasa.',
    imageUrl: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400',
  },
};

// API Configuration
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
const API_TIMEOUT = 10000; // 10 seconds

// Helper function for API calls with timeout
const fetchWithTimeout = async (url: string, options: RequestInit = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

/**
 * Fetch all menu items (basic info only)
 * TODO: Replace with your actual API endpoint
 */
export const fetchMenuItems = async (): Promise<FoodItem[]> => {
  try {
    // TODO: Uncomment when API is ready
    // const response = await fetchWithTimeout(`${API_BASE_URL}/menu`);
    // if (!response.ok) {
    //   throw new Error(`HTTP error! status: ${response.status}`);
    // }
    // const data = await response.json();
    // return data;

    // Mock API call - HAPUS INI NANTI
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Convert detailed data to basic FoodItem
    const basicItems: FoodItem[] = Object.values(FOOD_DATA_DETAIL).map(item => ({
      id: item.id,
      foodName: item.foodName,
      description: item.description,
      imageUrl: item.imageUrl,
      category: item.category,
    }));

    return basicItems;
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - silakan coba lagi');
      }
      throw new Error(`Gagal memuat menu: ${error.message}`);
    }
    throw new Error('Gagal memuat menu');
  }
};

/**
 * Fetch detailed food item by ID
 * TODO: Replace with your actual API endpoint
 */
export const fetchFoodItemDetail = async (id: string): Promise<FoodItemDetail> => {
  try {
    // TODO: Uncomment when API is ready
    // const response = await fetchWithTimeout(`${API_BASE_URL}/menu/${id}`);
    // if (!response.ok) {
    //   throw new Error(`HTTP error! status: ${response.status}`);
    // }
    // const data = await response.json();
    // return data;

    // Mock API call - HAPUS INI NANTI
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const item = FOOD_DATA_DETAIL[id];
    if (!item) {
      throw new Error('Menu tidak ditemukan');
    }

    return item;
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - silakan coba lagi');
      }
      throw new Error(`Gagal memuat detail menu: ${error.message}`);
    }
    throw new Error('Gagal memuat detail menu');
  }
};

/**
 * Search menu items
 * TODO: Replace with your actual API endpoint
 */
export const searchMenuItems = async (query: string): Promise<FoodItem[]> => {
  try {
    // TODO: Uncomment when API is ready
    // const response = await fetchWithTimeout(
    //   `${API_BASE_URL}/menu/search?q=${encodeURIComponent(query)}`
    // );
    // if (!response.ok) {
    //   throw new Error(`HTTP error! status: ${response.status}`);
    // }
    // const data = await response.json();
    // return data;

    // Mock implementation - HAPUS INI NANTI
    const allItems = await fetchMenuItems();
    return allItems.filter(item =>
      item.foodName.toLowerCase().includes(query.toLowerCase()) ||
      item.description.toLowerCase().includes(query.toLowerCase())
    );
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Gagal mencari menu: ${error.message}`);
    }
    throw new Error('Gagal mencari menu');
  }
};

/**
 * Get menu items by category
 * TODO: Replace with your actual API endpoint
 */
export const fetchMenuByCategory = async (category: string): Promise<FoodItem[]> => {
  try {
    // TODO: Uncomment when API is ready
    // const response = await fetchWithTimeout(
    //   `${API_BASE_URL}/menu/category/${encodeURIComponent(category)}`
    // );
    // if (!response.ok) {
    //   throw new Error(`HTTP error! status: ${response.status}`);
    // }
    // const data = await response.json();
    // return data;

    // Mock implementation - HAPUS INI NANTI
    const allItems = await fetchMenuItems();
    if (category === 'Semua') {
      return allItems;
    }
    return allItems.filter(item => item.category === category);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Gagal memuat kategori: ${error.message}`);
    }
    throw new Error('Gagal memuat kategori');
  }
};