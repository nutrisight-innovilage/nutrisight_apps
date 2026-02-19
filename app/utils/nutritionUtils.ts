/**
 * nutritionUtils.ts (v2.1)
 * ---------------------------------------------------------------------------
 * Utility functions for nutrition calculations.
 * 
 * v2.1 Changes:
 * • ✅ calculateWeeklyInsight now computes balancedMealsCount
 * • ✅ calculateTodayStatistics for dashboard
 * • ✅ Types properly match WeeklyInsight interface
 * ---------------------------------------------------------------------------
 */

import { NutritionScan, WeeklyInsight, TodayStatistics, NutritionGoals } from '@/app/types/meal';

// ---------------------------------------------------------------------------
// Nutrition Goals (default values)
// ---------------------------------------------------------------------------

export const nutritionGoals: NutritionGoals = {
  calories: { min: 300, max: 700 },
  protein: { min: 15, max: 50, label: 'Moderate' },
  carbs: { min: 30, max: 100, label: 'Moderate' },
  fats: { min: 10, max: 35, label: 'Moderate' },
};

// ---------------------------------------------------------------------------
// Check Nutrition Status for a single scan
// ---------------------------------------------------------------------------

export interface NutritionStatus {
  proteinGood: boolean;
  carbsGood: boolean;
  fatsGood: boolean;
  allGood: boolean;
  goodCount: number;
}

export function checkNutritionStatus(scan: NutritionScan): NutritionStatus {
  const proteinGood = scan.protein >= nutritionGoals.protein.min && scan.protein <= nutritionGoals.protein.max;
  const carbsGood = scan.carbs >= nutritionGoals.carbs.min && scan.carbs <= nutritionGoals.carbs.max;
  const fatsGood = scan.fats >= nutritionGoals.fats.min && scan.fats <= nutritionGoals.fats.max;

  const goodCount = [proteinGood, carbsGood, fatsGood].filter(Boolean).length;

  return {
    proteinGood,
    carbsGood,
    fatsGood,
    allGood: goodCount === 3,
    goodCount,
  };
}

// ---------------------------------------------------------------------------
// Check if a single scan is "balanced"
// ---------------------------------------------------------------------------

export function isMealBalanced(scan: NutritionScan): boolean {
  const status = checkNutritionStatus(scan);
  return status.allGood;
}

// ---------------------------------------------------------------------------
// Calculate Weekly Insight (v2.1 - with balancedMealsCount)
// ---------------------------------------------------------------------------

export function calculateWeeklyInsight(scans: NutritionScan[]): WeeklyInsight {
  if (!scans || scans.length === 0) {
    return {
      totalCalories: 0,
      avgCalories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFats: 0,
      mealsCount: 0,
      balancedMealsCount: 0,
    };
  }

  // Filter to last 7 days
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const weekScans = scans.filter(scan => {
    const rawDate = (scan as any).lastModified || scan.date;
    const scanDate = new Date(rawDate);
    if (isNaN(scanDate.getTime())) return true; // keep if unparseable
    return scanDate >= weekAgo;
});
  const mealsCount = weekScans.length;
  const totalCalories = weekScans.reduce((sum, s) => sum + s.calories, 0);
  const totalProtein = weekScans.reduce((sum, s) => sum + s.protein, 0);
  const totalCarbs = weekScans.reduce((sum, s) => sum + s.carbs, 0);
  const totalFats = weekScans.reduce((sum, s) => sum + s.fats, 0);
  
  // ✅ v2.1: Count balanced meals
  const balancedMealsCount = weekScans.filter(scan => isMealBalanced(scan)).length;

  return {
    totalCalories,
    avgCalories: mealsCount > 0 ? Math.round(totalCalories / mealsCount) : 0,
    totalProtein,
    totalCarbs,
    totalFats,
    mealsCount,
    balancedMealsCount,
  };
}

// ---------------------------------------------------------------------------
// Calculate Today Statistics (v2.1)
// ---------------------------------------------------------------------------

export function calculateTodayStatistics(scans: NutritionScan[]): TodayStatistics {
  if (!scans || scans.length === 0) {
    return {
      totalCalories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFats: 0,
      mealsCount: 0,
      balancedMealsCount: 0,
      scans: [],
    };
  }

  const mealsCount = scans.length;
  const totalCalories = scans.reduce((sum, s) => sum + s.calories, 0);
  const totalProtein = scans.reduce((sum, s) => sum + s.protein, 0);
  const totalCarbs = scans.reduce((sum, s) => sum + s.carbs, 0);
  const totalFats = scans.reduce((sum, s) => sum + s.fats, 0);
  const balancedMealsCount = scans.filter(scan => isMealBalanced(scan)).length;

  return {
    totalCalories,
    totalProtein,
    totalCarbs,
    totalFats,
    mealsCount,
    balancedMealsCount,
    scans,
  };
}
export const formatDate = (date: Date): string => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
};

export const formatTime = (date: Date): string => {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes.toString().padStart(2, '0');
  return `${displayHours}:${displayMinutes} ${ampm}`;
};