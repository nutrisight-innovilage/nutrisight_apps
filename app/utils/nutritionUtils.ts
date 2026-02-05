import { NutritionScan, NutritionGoals, WeeklyInsight } from '@/app/types/nutrition';

export const nutritionGoals: NutritionGoals = {
  protein: { min: 20, max: 40, label: 'Protein' },
  carbs: { min: 30, max: 60, label: 'Karbohidrat' },
  fats: { min: 10, max: 25, label: 'Lemak' }
};

export const checkNutritionStatus = (scan: NutritionScan) => {
  const proteinGood = scan.protein >= nutritionGoals.protein.min && scan.protein <= nutritionGoals.protein.max;
  const carbsGood = scan.carbs >= nutritionGoals.carbs.min && scan.carbs <= nutritionGoals.carbs.max;
  const fatsGood = scan.fats >= nutritionGoals.fats.min && scan.fats <= nutritionGoals.fats.max;
  
  const goodCount = [proteinGood, carbsGood, fatsGood].filter(Boolean).length;
  const allGood = goodCount === 3;
  
  return {
    proteinGood,
    carbsGood,
    fatsGood,
    goodCount,
    allGood
  };
};

export const calculateWeeklyInsight = (scans: NutritionScan[]): WeeklyInsight => {
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  const weeklyScans = scans.filter(scan => {
    const scanDate = new Date(scan.date);
    return scanDate >= oneWeekAgo && scanDate <= now;
  });
  
  const totalCalories = weeklyScans.reduce((sum, scan) => sum + scan.calories, 0);
  const totalProtein = weeklyScans.reduce((sum, scan) => sum + scan.protein, 0);
  const totalCarbs = weeklyScans.reduce((sum, scan) => sum + scan.carbs, 0);
  const totalFats = weeklyScans.reduce((sum, scan) => sum + scan.fats, 0);
  
  const balancedMealsCount = weeklyScans.filter(scan => {
    const status = checkNutritionStatus(scan);
    return status.allGood;
  }).length;
  
  return {
    totalCalories,
    avgCalories: weeklyScans.length > 0 ? Math.round(totalCalories / weeklyScans.length) : 0,
    totalProtein,
    totalCarbs,
    totalFats,
    mealsCount: weeklyScans.length,
    balancedMealsCount
  };
};

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