// ---------------------------------------------------------------------------
// Basic FoodItem interface – untuk list / menu
// ---------------------------------------------------------------------------
export interface FoodItem {
  id: string;
  foodName: string;
  description: string;
  imageUrl: string;
  category: string;
}

// ---------------------------------------------------------------------------
// Nutrition interface
// ---------------------------------------------------------------------------
export interface Nutrition {
  protein: number;
  fat: number;
  carbs: number;
  calories: number;
  vitamins: string[];
}

// ---------------------------------------------------------------------------
// Detailed FoodItem interface – untuk detail page
// ---------------------------------------------------------------------------
export interface FoodItemDetail extends FoodItem {
  nutrition: Nutrition;
  recipe: string;
}

// ---------------------------------------------------------------------------
// Cart item interface – lightweight, hanya id + qty.
// Price di-resolve dari FoodItem saat dibutuhkan.
// ---------------------------------------------------------------------------
export interface CartItem {
  id: string;
  quantity: number;
}

// ---------------------------------------------------------------------------
// Sort options
// ---------------------------------------------------------------------------
export type SortOption = 'name-asc' | 'name-desc';