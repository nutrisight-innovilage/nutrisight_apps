// utils/cartUtils.ts
import { CartItem, FoodItem } from '@/app/types/food';
import { CartDisplayItem } from '@/app/types/meal';

/**
 * Menggabungkan data cart dengan data menu untuk mendapatkan informasi lengkap
 */
export const mapCartToDisplayItems = (
  cart: CartItem[],
  menuData: FoodItem[]
): CartDisplayItem[] => {
  return cart
    .map((cartItem) => {
      const menuItem = menuData.find((m) => m.id === cartItem.id);
      if (!menuItem) return null;
      return { ...cartItem, ...menuItem };
    })
    .filter(Boolean) as CartDisplayItem[];
};

/**
 * Menghitung total item dalam cart
 */
export const calculateTotalItems = (cart: CartItem[]): number => {
  return cart.reduce((sum, item) => sum + item.quantity, 0);
};