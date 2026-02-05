export interface NutritionScan {
  id: string;
  foodName: string;
  date: string;
  time: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

export interface NutritionGoals {
  protein: { min: number; max: number; label: string };
  carbs: { min: number; max: number; label: string };
  fats: { min: number; max: number; label: string };
}

export interface WeeklyInsight {
  totalCalories: number;
  avgCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFats: number;
  mealsCount: number;
  balancedMealsCount: number;
}

export interface ChartDataPoint {
  x: string;
  y: number;
  color: string;
}