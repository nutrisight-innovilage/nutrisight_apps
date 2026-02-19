/**
 * nutritionCalculator.ts (v1.2)
 * ---------------------------------------------------------------------------
 * SINGLE SOURCE OF TRUTH for all nutrition calculations.
 * Used by both Photo flow AND Cart/Manual flow.
 * 
 * FOOD CATEGORIES (fixed list — matches Appwrite food collection `category`):
 * ayam, ikan, nasi, tempe, telur, tahu, sambal, sayur, kuah, other
 * 
 * Each category has:
 * • Nutrition per 100g (calories, protein, carbs, fats) — CALCULATED
 * • Default serving grams per 1 qty in cart
 * • Vitamin/mineral list — NON-CALCULATED (informational only)
 * 
 * ENTRY POINTS:
 * • calculateMeal(DetectedFoodItem[])           → Photo AI flow
 * • calculateFromCart(CartItem[], ricePortion)   → Manual cart flow
 * ---------------------------------------------------------------------------
 */

import { CartItem } from '@/app/types/food';
import { RICE_PORTIONS } from '@/app/types/meal';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FoodCategory =
  | 'ayam'
  | 'ikan'
  | 'nasi'
  | 'tempe'
  | 'telur'
  | 'tahu'
  | 'sambal'
  | 'sayur'
  | 'kuah'
  | 'other';

export const ALL_FOOD_CATEGORIES: FoodCategory[] = [
  'ayam', 'ikan', 'nasi', 'tempe', 'telur',
  'tahu', 'sambal', 'sayur', 'kuah', 'other',
];

export interface NutritionPer100g {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

export interface VitaminMineralInfo {
  vitamins: string[];
  minerals: string[];
  notes?: string;
}

export interface FoodCategoryProfile {
  category: FoodCategory;
  label: string;
  labelEn: string;
  nutritionPer100g: NutritionPer100g;
  defaultServingGrams: number;   // default grams per 1 qty in cart
  vitaminsMinerals: VitaminMineralInfo;
}

export interface DetectedFoodItem {
  category: FoodCategory;
  portionGrams: number;
  confidenceCategory: number;
  confidencePortion: number;
}

export interface FoodNutritionResult {
  category: FoodCategory;
  label: string;
  portionGrams: number;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  vitaminsMinerals: VitaminMineralInfo;
  confidenceCategory: number;
  confidencePortion: number;
}

export interface MealNutritionResult {
  foods: FoodNutritionResult[];
  totalNutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
  totalPortionGrams: number;
  allVitaminsMinerals: VitaminMineralInfo;
  confidence: number;
}

/**
 * Food catalog entry — built dynamically from Appwrite food docs.
 * Maps a food $id to its category + serving size.
 */
export interface FoodCatalogEntry {
  id: string;           // Appwrite $id (e.g. "6993d2c00020aba141bd")
  name: string;         // foodName from DB
  category: FoodCategory;
  servingGrams: number; // grams per 1 qty in cart
}

export type FoodCatalog = Record<string, FoodCatalogEntry>;

// ---------------------------------------------------------------------------
// Food Category Database (FIXED FORMULAS)
// ---------------------------------------------------------------------------

export const FOOD_CATEGORY_DATABASE: Record<FoodCategory, FoodCategoryProfile> = {
  ayam: {
    category: 'ayam',
    label: 'Ayam',
    labelEn: 'Chicken',
    defaultServingGrams: 150,  // ~1 potong paha/dada
    nutritionPer100g: { calories: 219, protein: 25.0, carbs: 3.5, fats: 11.0 },
    vitaminsMinerals: {
      vitamins: ['Vitamin B3 (Niacin)', 'Vitamin B6', 'Vitamin B12', 'Vitamin A'],
      minerals: ['Fosfor', 'Selenium', 'Zat Besi', 'Zinc', 'Kalium'],
      notes: 'Sumber protein hewani tinggi. Bagian dada lebih rendah lemak dibanding paha.',
    },
  },

  ikan: {
    category: 'ikan',
    label: 'Ikan',
    labelEn: 'Fish',
    defaultServingGrams: 120,  // ~1 ekor sedang
    nutritionPer100g: { calories: 142, protein: 24.0, carbs: 0.5, fats: 5.0 },
    vitaminsMinerals: {
      vitamins: ['Vitamin D', 'Vitamin B12', 'Vitamin B6', 'Vitamin A'],
      minerals: ['Omega-3', 'Selenium', 'Fosfor', 'Yodium', 'Zat Besi'],
      notes: 'Sumber omega-3 dan protein tinggi. Ikan laut mengandung yodium lebih tinggi.',
    },
  },

  nasi: {
    category: 'nasi',
    label: 'Nasi',
    labelEn: 'Rice',
    defaultServingGrams: 200,  // ~1 piring (handled by rice portion system)
    nutritionPer100g: { calories: 130, protein: 2.7, carbs: 28.0, fats: 0.3 },
    vitaminsMinerals: {
      vitamins: ['Vitamin B1 (Thiamin)', 'Vitamin B3 (Niacin)', 'Vitamin B6'],
      minerals: ['Mangan', 'Selenium', 'Magnesium', 'Fosfor'],
      notes: 'Sumber karbohidrat utama. Nasi merah lebih tinggi serat dan vitamin.',
    },
  },

  tempe: {
    category: 'tempe',
    label: 'Tempe',
    labelEn: 'Tempeh',
    defaultServingGrams: 50,   // ~2-3 potong
    nutritionPer100g: { calories: 192, protein: 18.5, carbs: 9.4, fats: 10.8 },
    vitaminsMinerals: {
      vitamins: ['Vitamin B12', 'Vitamin B2 (Riboflavin)', 'Vitamin K'],
      minerals: ['Mangan', 'Fosfor', 'Magnesium', 'Zat Besi', 'Kalsium', 'Zinc'],
      notes: 'Sumber protein nabati fermentasi. Mengandung probiotik dan isoflavon.',
    },
  },

  telur: {
    category: 'telur',
    label: 'Telur',
    labelEn: 'Egg',
    defaultServingGrams: 55,   // ~1 butir
    nutritionPer100g: { calories: 155, protein: 12.6, carbs: 1.1, fats: 10.6 },
    vitaminsMinerals: {
      vitamins: ['Vitamin A', 'Vitamin D', 'Vitamin B12', 'Vitamin B2 (Riboflavin)', 'Vitamin E'],
      minerals: ['Selenium', 'Fosfor', 'Zat Besi', 'Zinc', 'Kolin'],
      notes: 'Sumber protein lengkap. Kuning telur mengandung kolin tinggi untuk otak.',
    },
  },

  tahu: {
    category: 'tahu',
    label: 'Tahu',
    labelEn: 'Tofu',
    defaultServingGrams: 75,   // ~2-3 potong
    nutritionPer100g: { calories: 80, protein: 8.1, carbs: 1.9, fats: 4.8 },
    vitaminsMinerals: {
      vitamins: ['Vitamin B1 (Thiamin)', 'Vitamin K'],
      minerals: ['Kalsium', 'Mangan', 'Fosfor', 'Selenium', 'Zat Besi', 'Magnesium'],
      notes: 'Sumber protein nabati rendah kalori. Tahu goreng memiliki kalori lebih tinggi.',
    },
  },

  sambal: {
    category: 'sambal',
    label: 'Sambal',
    labelEn: 'Chili Sauce',
    defaultServingGrams: 25,   // ~1 sendok makan
    nutritionPer100g: { calories: 65, protein: 1.5, carbs: 8.0, fats: 3.5 },
    vitaminsMinerals: {
      vitamins: ['Vitamin C', 'Vitamin A (Beta-karoten)', 'Vitamin B6'],
      minerals: ['Kalium', 'Mangan'],
      notes: 'Cabai mengandung capsaicin yang dapat meningkatkan metabolisme.',
    },
  },

  sayur: {
    category: 'sayur',
    label: 'Sayur',
    labelEn: 'Vegetables',
    defaultServingGrams: 100,  // ~1 porsi sayur
    nutritionPer100g: { calories: 55, protein: 2.5, carbs: 7.5, fats: 2.0 },
    vitaminsMinerals: {
      vitamins: ['Vitamin A', 'Vitamin C', 'Vitamin K', 'Asam Folat', 'Vitamin E'],
      minerals: ['Kalium', 'Magnesium', 'Zat Besi', 'Kalsium', 'Serat'],
      notes: 'Sumber serat dan mikronutrien. Sayuran hijau kaya akan zat besi dan asam folat.',
    },
  },

  kuah: {
    category: 'kuah',
    label: 'Kuah',
    labelEn: 'Broth/Soup',
    defaultServingGrams: 200,  // ~1 mangkok
    nutritionPer100g: { calories: 20, protein: 1.8, carbs: 1.5, fats: 0.8 },
    vitaminsMinerals: {
      vitamins: ['Vitamin B3 (Niacin)'],
      minerals: ['Natrium', 'Kalium'],
      notes: 'Kalori rendah. Kuah santan memiliki kalori lebih tinggi karena lemak kelapa.',
    },
  },

  other: {
    category: 'other',
    label: 'Lainnya',
    labelEn: 'Other',
    defaultServingGrams: 100,  // generic
    nutritionPer100g: { calories: 150, protein: 5.0, carbs: 20.0, fats: 5.0 },
    vitaminsMinerals: {
      vitamins: ['Bervariasi'],
      minerals: ['Bervariasi'],
      notes: 'Estimasi umum untuk makanan yang tidak terdeteksi spesifik.',
    },
  },
};

// ---------------------------------------------------------------------------
// Helper: Rice portion → grams
// ---------------------------------------------------------------------------

const getRiceGrams = (ricePortion: number): number => {
  const riceData = RICE_PORTIONS.find((r) => r.value === ricePortion);
  return riceData ? riceData.grams : 200;
};

/**
 * Get default serving grams for a category
 */
export const getDefaultServingGrams = (category: FoodCategory): number => {
  return FOOD_CATEGORY_DATABASE[category].defaultServingGrams;
};

// ---------------------------------------------------------------------------
// Catalog Builder (from Appwrite food docs)
// ---------------------------------------------------------------------------

/**
 * Build a FoodCatalog from an array of Appwrite food documents.
 * 
 * Expected doc shape:
 * {
 *   $id: "6993d2c00020aba141bd",
 *   foodName: "gulai daging tahu",
 *   category: "tahu",
 *   ...
 * }
 */
export function buildCatalogFromDocs(
  docs: Array<{ $id: string; foodName: string; category: string }>
): FoodCatalog {
  const catalog: FoodCatalog = {};

  for (const doc of docs) {
    const category: FoodCategory = NutritionCalculator.isValidCategory(doc.category)
      ? (doc.category as FoodCategory)
      : 'other';

    catalog[doc.$id] = {
      id: doc.$id,
      name: doc.foodName,
      category,
      servingGrams: getDefaultServingGrams(category),
    };
  }

  return catalog;
}

// ---------------------------------------------------------------------------
// Nutrition Calculator
// ---------------------------------------------------------------------------

export class NutritionCalculator {

  // =========================================================================
  // CORE: Calculate from DetectedFoodItem[] (Photo AI flow)
  // =========================================================================

  static calculateSingleFood(item: DetectedFoodItem): FoodNutritionResult {
    const profile = FOOD_CATEGORY_DATABASE[item.category];
    const scaleFactor = item.portionGrams / 100;

    return {
      category: item.category,
      label: profile.label,
      portionGrams: item.portionGrams,
      calories: Math.round(profile.nutritionPer100g.calories * scaleFactor),
      protein: Math.round(profile.nutritionPer100g.protein * scaleFactor * 10) / 10,
      carbs: Math.round(profile.nutritionPer100g.carbs * scaleFactor * 10) / 10,
      fats: Math.round(profile.nutritionPer100g.fats * scaleFactor * 10) / 10,
      vitaminsMinerals: profile.vitaminsMinerals,
      confidenceCategory: item.confidenceCategory,
      confidencePortion: item.confidencePortion,
    };
  }

  static calculateMeal(items: DetectedFoodItem[]): MealNutritionResult {
    const foods = items.map(item => this.calculateSingleFood(item));

    const totalNutrition = { calories: 0, protein: 0, carbs: 0, fats: 0 };
    let totalPortionGrams = 0;
    let totalConfidence = 0;
    const allVitamins = new Set<string>();
    const allMinerals = new Set<string>();

    for (const food of foods) {
      totalNutrition.calories += food.calories;
      totalNutrition.protein += food.protein;
      totalNutrition.carbs += food.carbs;
      totalNutrition.fats += food.fats;
      totalPortionGrams += food.portionGrams;
      totalConfidence += (food.confidenceCategory + food.confidencePortion) / 2;

      food.vitaminsMinerals.vitamins.forEach(v => allVitamins.add(v));
      food.vitaminsMinerals.minerals.forEach(m => allMinerals.add(m));
    }

    totalNutrition.protein = Math.round(totalNutrition.protein * 10) / 10;
    totalNutrition.carbs = Math.round(totalNutrition.carbs * 10) / 10;
    totalNutrition.fats = Math.round(totalNutrition.fats * 10) / 10;

    const avgConfidence = foods.length > 0
      ? Math.round((totalConfidence / foods.length) * 100) / 100
      : 0;

    return {
      foods,
      totalNutrition,
      totalPortionGrams,
      allVitaminsMinerals: {
        vitamins: Array.from(allVitamins).filter(v => v !== 'Bervariasi'),
        minerals: Array.from(allMinerals).filter(m => m !== 'Bervariasi'),
      },
      confidence: avgConfidence,
    };
  }

  // =========================================================================
  // CART FLOW: CartItem[] → DetectedFoodItem[] → calculateMeal()
  // =========================================================================

  /**
   * Calculate nutrition from cart items + rice portion.
   * 
   * @param items        Cart items (id + quantity)
   * @param ricePortion  Rice portion value from RICE_PORTIONS (e.g. 200 = 1 piring)
   * @param catalog      Food catalog (built from Appwrite docs, cached locally)
   *                     If null/empty, falls back to category 'other' with default grams.
   */
  static calculateFromCart(
    items: CartItem[],
    ricePortion: number,
    catalog?: FoodCatalog | null
  ): MealNutritionResult {
    const detectedItems: DetectedFoodItem[] = [];

    for (const cartItem of items) {
      const entry = catalog?.[cartItem.id];

      if (entry) {
        // Found in catalog → use category + serving grams
        detectedItems.push({
          category: entry.category,
          portionGrams: entry.servingGrams * cartItem.quantity,
          confidenceCategory: 1.0,
          confidencePortion: 1.0,
        });
      } else {
        // Not in catalog → fallback to 'other'
        console.warn(
          `[NutritionCalculator] Food ID "${cartItem.id}" not in catalog, using "other"`
        );
        detectedItems.push({
          category: 'other',
          portionGrams: getDefaultServingGrams('other') * cartItem.quantity,
          confidenceCategory: 0.5,
          confidencePortion: 0.5,
        });
      }
    }

    // Rice — via hardcoded portion system (½ piring, 1 piring, dll)
    const riceGrams = getRiceGrams(ricePortion);
    if (riceGrams > 0) {
      detectedItems.push({
        category: 'nasi',
        portionGrams: riceGrams,
        confidenceCategory: 1.0,
        confidencePortion: 1.0,
      });
    }

    return this.calculateMeal(detectedItems);
  }

  /**
   * Quick calorie estimate (for preview UI)
   */
  static estimateCaloriesFromCart(
    items: CartItem[],
    ricePortion: number,
    catalog?: FoodCatalog | null
  ): number {
    return this.calculateFromCart(items, ricePortion, catalog).totalNutrition.calories;
  }

  // =========================================================================
  // HELPERS
  // =========================================================================

  static getCategoryProfile(category: FoodCategory): FoodCategoryProfile {
    return FOOD_CATEGORY_DATABASE[category];
  }

  static getAllCategoryProfiles(): FoodCategoryProfile[] {
    return ALL_FOOD_CATEGORIES.map(cat => FOOD_CATEGORY_DATABASE[cat]);
  }

  static isValidCategory(value: string): value is FoodCategory {
    return ALL_FOOD_CATEGORIES.includes(value as FoodCategory);
  }

  // =========================================================================
  // AI RESPONSE PARSER (for Photo flow)
  // =========================================================================

  static parseAIDetection(aiResponse: {
    foods: Array<{
      category: string;
      portionGrams: number;
      confidenceCategory: number;
      confidencePortion: number;
    }>;
  }): DetectedFoodItem[] {
    if (!aiResponse?.foods || !Array.isArray(aiResponse.foods)) {
      return [];
    }

    return aiResponse.foods
      .map(food => {
        const category: FoodCategory = this.isValidCategory(food.category)
          ? food.category
          : 'other';

        return {
          category,
          portionGrams: Math.max(0, Math.round(food.portionGrams)),
          confidenceCategory: Math.min(1, Math.max(0, food.confidenceCategory ?? 0.5)),
          confidencePortion: Math.min(1, Math.max(0, food.confidencePortion ?? 0.5)),
        };
      })
      .filter(food => food.portionGrams > 0);
  }
}