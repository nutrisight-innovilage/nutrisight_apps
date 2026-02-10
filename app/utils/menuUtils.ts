import { FoodItem, SortOption } from '@/app/types/food';

/**
 * Extract unique categories from menu items
 * @param items - Array of food items
 * @returns Array of unique categories with 'Semua' as first item
 */
export const extractCategories = (items: FoodItem[]): string[] => {
  const uniqueCategories = Array.from(
    new Set(items.map(item => item.category).filter(Boolean))
  ) as string[];
  return ['Semua', ...uniqueCategories];
};

/**
 * Filter menu items by search query
 * @param items - Array of food items
 * @param query - Search query string
 * @returns Filtered array of food items
 */
export const filterMenuBySearch = (items: FoodItem[], query: string): FoodItem[] => {
  if (!query.trim()) return items;
  
  const lowerQuery = query.toLowerCase();
  return items.filter(item =>
    item.foodName.toLowerCase().includes(lowerQuery) ||
    item.description.toLowerCase().includes(lowerQuery)
  );
};

/**
 * Filter menu items by category
 * @param items - Array of food items
 * @param category - Category name
 * @returns Filtered array of food items
 */
export const filterMenuByCategory = (items: FoodItem[], category: string): FoodItem[] => {
  if (category === 'Semua') return items;
  return items.filter(item => item.category === category);
};

/**
 * Sort menu items based on sort option
 * @param items - Array of food items
 * @param sortBy - Sort option
 * @returns Sorted array of food items
 */
export const sortMenu = (items: FoodItem[], sortBy: SortOption): FoodItem[] => {
  const sorted = [...items];
  
  switch (sortBy) {
    case 'name-asc':
      return sorted.sort((a, b) => a.foodName.localeCompare(b.foodName));
    case 'name-desc':
      return sorted.sort((a, b) => b.foodName.localeCompare(a.foodName));
    default:
      return sorted;
  }
};

/**
 * Filter and sort menu items (combined utility)
 * @param items - Array of food items
 * @param filters - Object containing search, category, and sort options
 * @returns Filtered and sorted array of food items
 */
export const filterAndSortMenu = (
  items: FoodItem[],
  filters: {
    searchQuery?: string;
    category?: string;
    sortBy?: SortOption;
  }
): FoodItem[] => {
  let result = items;

  // Apply search filter
  if (filters.searchQuery) {
    result = filterMenuBySearch(result, filters.searchQuery);
  }

  // Apply category filter
  if (filters.category) {
    result = filterMenuByCategory(result, filters.category);
  }

  // Apply sorting
  if (filters.sortBy) {
    result = sortMenu(result, filters.sortBy);
  }

  return result;
};