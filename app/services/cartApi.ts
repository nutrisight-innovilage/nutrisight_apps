/**
 * cartApi.ts
 * ---------------------------------------------------------------------------
 * Service layer untuk semua operasi cart.
 *
 * Cart diperlakukan sebagai KOLEKSI DATA untuk analisis nutrisi:
 * • Menyimpan item makanan yang akan dianalisis
 * • Menyimpan porsi nasi sebagai bagian dari data meal
 * • Mendukung persistent storage untuk session tracking
 * • Siap untuk integrasi dengan nutrition analysis API
 *
 * Tetap backward compatible dengan interface CartItem yang ada.
 * ---------------------------------------------------------------------------
 */

import { CartItem } from '../types/food';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ---------------------------------------------------------------------------
// Storage Keys
// ---------------------------------------------------------------------------
const STORAGE_KEYS = {
  CART_ITEMS: '@nutrition_analysis:cart_items',
  RICE_PORTION: '@nutrition_analysis:rice_portion',
  MEAL_METADATA: '@nutrition_analysis:meal_metadata',
} as const;

// ---------------------------------------------------------------------------
// Extended Types untuk Nutrition Analysis
// ---------------------------------------------------------------------------

/**
 * Metadata meal yang akan disimpan bersama cart
 * untuk keperluan analisis nutrisi
 */
export interface MealMetadata {
  /** Porsi nasi dalam satuan piring (0, 0.25, 0.5, 1, 1.5, 2, 3) */
  ricePortion: number;
  /** Timestamp meal dibuat */
  createdAt: string;
  /** Timestamp terakhir diupdate */
  updatedAt: string;
  /** Optional: meal type (breakfast, lunch, dinner, snack) */
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  /** Optional: catatan user */
  notes?: string;
}

/**
 * Data lengkap untuk analysis submission
 */
export interface NutritionAnalysisPayload {
  items: CartItem[];
  ricePortion: number;
  metadata: MealMetadata;
}

// ---------------------------------------------------------------------------
// In-memory cache (untuk performa, sync dengan AsyncStorage)
// ---------------------------------------------------------------------------
let cartCache: CartItem[] = [];
let mealMetadataCache: MealMetadata | null = null;

// ---------------------------------------------------------------------------
// Helper: delay simulasi network latency (buang di produksi)
// ---------------------------------------------------------------------------
const delay = (ms = 300) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// ---------------------------------------------------------------------------
// Storage Helpers
// ---------------------------------------------------------------------------

/**
 * Load cart items dari persistent storage
 */
const loadCartFromStorage = async (): Promise<CartItem[]> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.CART_ITEMS);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('[cartApi] Failed to load cart from storage:', error);
  }
  return [];
};

/**
 * Save cart items ke persistent storage
 */
const saveCartToStorage = async (cart: CartItem[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.CART_ITEMS, JSON.stringify(cart));
  } catch (error) {
    console.error('[cartApi] Failed to save cart to storage:', error);
  }
};

/**
 * Load meal metadata dari storage
 */
const loadMealMetadata = async (): Promise<MealMetadata | null> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.MEAL_METADATA);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('[cartApi] Failed to load meal metadata:', error);
  }
  return null;
};

/**
 * Save meal metadata ke storage
 */
const saveMealMetadata = async (metadata: MealMetadata): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.MEAL_METADATA, JSON.stringify(metadata));
  } catch (error) {
    console.error('[cartApi] Failed to save meal metadata:', error);
  }
};

/**
 * Initialize metadata jika belum ada
 */
const initializeMealMetadata = (): MealMetadata => {
  const now = new Date().toISOString();
  return {
    ricePortion: 1, // default 1 piring
    createdAt: now,
    updatedAt: now,
  };
};

// ---------------------------------------------------------------------------
// Public API - Core Cart Operations (Backward Compatible)
// ---------------------------------------------------------------------------

/**
 * Ambil seluruh isi cart.
 * Tetap return CartItem[] untuk backward compatibility.
 */
export const getCart = async (): Promise<CartItem[]> => {
  await delay(100);
  
  // Load dari storage jika cache kosong
  if (cartCache.length === 0) {
    cartCache = await loadCartFromStorage();
  }
  
  return [...cartCache];
};

/**
 * Tambah item ke cart.
 * Kalau item sudah ada → increment quantity sebesar `qty`.
 * Kalau belum ada       → push entry baru.
 *
 * @param id   – id menu item
 * @param qty  – jumlah yang ditambahkan (default 1)
 */
export const addToCart = async (id: string, qty: number = 1): Promise<CartItem[]> => {
  await delay(100);

  const existing = cartCache.find((item) => item.id === id);

  if (existing) {
    existing.quantity += qty;
  } else {
    cartCache.push({ id, quantity: qty });
  }

  // Update metadata timestamp
  if (!mealMetadataCache) {
    mealMetadataCache = initializeMealMetadata();
  } else {
    mealMetadataCache.updatedAt = new Date().toISOString();
  }

  // Persist ke storage
  await saveCartToStorage(cartCache);
  await saveMealMetadata(mealMetadataCache);

  return [...cartCache];
};

/**
 * Set quantity item tertentu secara eksplisit.
 * Kalau `quantity <= 0` → item dihapus dari cart.
 *
 * @param id       – id menu item
 * @param quantity – target quantity baru
 */
export const updateCartItem = async (id: string, quantity: number): Promise<CartItem[]> => {
  await delay(100);

  if (quantity <= 0) {
    cartCache = cartCache.filter((item) => item.id !== id);
  } else {
    const existing = cartCache.find((item) => item.id === id);
    if (existing) {
      existing.quantity = quantity;
    } else {
      cartCache.push({ id, quantity });
    }
  }

  // Update metadata timestamp
  if (mealMetadataCache) {
    mealMetadataCache.updatedAt = new Date().toISOString();
    await saveMealMetadata(mealMetadataCache);
  }

  await saveCartToStorage(cartCache);
  return [...cartCache];
};

/**
 * Hapus satu item dari cart sepenuhnya.
 *
 * @param id – id menu item yang dihapus
 */
export const removeFromCart = async (id: string): Promise<CartItem[]> => {
  await delay(100);
  cartCache = cartCache.filter((item) => item.id !== id);

  // Update metadata timestamp
  if (mealMetadataCache) {
    mealMetadataCache.updatedAt = new Date().toISOString();
    await saveMealMetadata(mealMetadataCache);
  }

  await saveCartToStorage(cartCache);
  return [...cartCache];
};

/**
 * Kosongkan seluruh cart.
 */
export const clearCart = async (): Promise<CartItem[]> => {
  await delay(100);
  cartCache = [];
  mealMetadataCache = null;

  await AsyncStorage.removeItem(STORAGE_KEYS.CART_ITEMS);
  await AsyncStorage.removeItem(STORAGE_KEYS.MEAL_METADATA);
  await AsyncStorage.removeItem(STORAGE_KEYS.RICE_PORTION);

  return [];
};

// ---------------------------------------------------------------------------
// Extended API - Nutrition Analysis Specific
// ---------------------------------------------------------------------------

/**
 * Update rice portion untuk meal ini.
 * Mendukung linear scale: 0, 0.25, 0.5, 1, 1.5, 2, 3
 *
 * @param portion – porsi nasi dalam satuan piring
 */
export const updateRicePortion = async (portion: number): Promise<void> => {
  await delay(50);

  if (!mealMetadataCache) {
    mealMetadataCache = initializeMealMetadata();
  }

  mealMetadataCache.ricePortion = portion;
  mealMetadataCache.updatedAt = new Date().toISOString();

  await saveMealMetadata(mealMetadataCache);
  
  // Juga simpan ke key terpisah untuk backward compat
  await AsyncStorage.setItem(STORAGE_KEYS.RICE_PORTION, portion.toString());
};

/**
 * Get rice portion saat ini
 */
export const getRicePortion = async (): Promise<number> => {
  await delay(50);

  if (!mealMetadataCache) {
    mealMetadataCache = await loadMealMetadata();
  }

  if (mealMetadataCache) {
    return mealMetadataCache.ricePortion;
  }

  // Fallback ke storage lama
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.RICE_PORTION);
    return stored ? parseFloat(stored) : 1;
  } catch {
    return 1;
  }
};

/**
 * Update meal metadata (meal type, notes, etc.)
 */
export const updateMealMetadata = async (
  updates: Partial<Omit<MealMetadata, 'createdAt' | 'updatedAt'>>
): Promise<MealMetadata> => {
  await delay(50);

  if (!mealMetadataCache) {
    mealMetadataCache = initializeMealMetadata();
  }

  mealMetadataCache = {
    ...mealMetadataCache,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  await saveMealMetadata(mealMetadataCache);
  return { ...mealMetadataCache };
};

/**
 * Get meal metadata lengkap
 */
export const getMealMetadata = async (): Promise<MealMetadata> => {
  await delay(50);

  if (!mealMetadataCache) {
    mealMetadataCache = await loadMealMetadata();
  }

  if (!mealMetadataCache) {
    mealMetadataCache = initializeMealMetadata();
    await saveMealMetadata(mealMetadataCache);
  }

  return { ...mealMetadataCache };
};

/**
 * Prepare data untuk dikirim ke nutrition analysis API.
 * Menggabungkan cart items, rice portion, dan metadata.
 */
export const prepareNutritionAnalysisPayload = async (): Promise<NutritionAnalysisPayload> => {
  await delay(100);

  const items = await getCart();
  const metadata = await getMealMetadata();

  return {
    items,
    ricePortion: metadata.ricePortion,
    metadata,
  };
};

/**
 * Submit meal untuk analisis nutrisi.
 * TODO: Implementasi integrasi dengan backend nutrition analysis API.
 *
 * @returns Analysis result (sementara mock)
 */
export const submitForNutritionAnalysis = async (): Promise<{
  success: boolean;
  analysisId?: string;
  message: string;
}> => {
  await delay(500);

  const payload = await prepareNutritionAnalysisPayload();

  // Validasi: harus ada minimal 1 item
  if (payload.items.length === 0) {
    return {
      success: false,
      message: 'Tidak ada item untuk dianalisis',
    };
  }

  // TODO: Ganti dengan actual API call
  // const response = await fetch('https://api.example.com/nutrition/analyze', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(payload),
  // });

  // Mock success response
  const mockAnalysisId = `analysis_${Date.now()}`;

  console.log('[cartApi] Nutrition analysis submitted:', {
    analysisId: mockAnalysisId,
    itemCount: payload.items.length,
    ricePortion: payload.ricePortion,
  });

  return {
    success: true,
    analysisId: mockAnalysisId,
    message: 'Analisis nutrisi berhasil dimulai',
  };
};

/**
 * Initialize cache dari storage saat app startup.
 * Call ini di app initialization (e.g., di _layout.tsx)
 */
export const initializeCart = async (): Promise<void> => {
  cartCache = await loadCartFromStorage();
  mealMetadataCache = await loadMealMetadata();

  if (!mealMetadataCache && cartCache.length > 0) {
    // Ada cart items tapi belum ada metadata → create metadata
    mealMetadataCache = initializeMealMetadata();
    await saveMealMetadata(mealMetadataCache);
  }
};

// ---------------------------------------------------------------------------
// Analytics & History (untuk future features)
// ---------------------------------------------------------------------------

/**
 * Simpan meal history untuk tracking.
 * Bisa dipakai untuk fitur "Riwayat Makan" atau "Analisis Trend".
 */
export const saveMealToHistory = async (
  payload: NutritionAnalysisPayload
): Promise<void> => {
  // TODO: Implement meal history storage
  // Could use AsyncStorage with array of meals or send to backend
  console.log('[cartApi] Saving meal to history:', payload);
};

/**
 * Clear cache (untuk testing / debugging)
 */
export const clearCache = (): void => {
  cartCache = [];
  mealMetadataCache = null;
};