/**
 * openRouterConfig.ts
 * ---------------------------------------------------------------------------
 * Configuration for OpenRouter API integration.
 * 
 * Used for:
 * • Photo analysis (food identification from images)
 * • Weekly nutrition summary (AI-generated one-liner)
 * 
 * Model: OpenAI GPT-4.1 via OpenRouter
 * ---------------------------------------------------------------------------
 */

// ---------------------------------------------------------------------------
// Environment / Constants
// ---------------------------------------------------------------------------

/**
 * ⚠️ IMPORTANT: Replace with your actual OpenRouter API key.
 * In production, use environment variables or a secure vault.
 * 
 * Get your key at: https://openrouter.ai/keys
 */
const OPENROUTER_API_KEY = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY || 'YOUR_OPENROUTER_API_KEY';

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

// ---------------------------------------------------------------------------
// Model Configuration
// ---------------------------------------------------------------------------

export const OPENROUTER_MODELS = {
  /** GPT-4.1 for photo analysis (vision-capable) */
  PHOTO_ANALYSIS: 'openai/gpt-4.1',
  /** GPT-4.1 for text summarization */
  WEEKLY_SUMMARY: 'openai/gpt-4.1',
} as const;

// ---------------------------------------------------------------------------
// Request Configuration
// ---------------------------------------------------------------------------

export interface OpenRouterRequestConfig {
  model: string;
  temperature: number;
  max_tokens: number;
  top_p: number;
}

export const PHOTO_ANALYSIS_CONFIG: OpenRouterRequestConfig = {
  model: OPENROUTER_MODELS.PHOTO_ANALYSIS,
  temperature: 0.3,
  max_tokens: 1024,
  top_p: 0.9,
};

export const WEEKLY_SUMMARY_CONFIG: OpenRouterRequestConfig = {
  model: OPENROUTER_MODELS.WEEKLY_SUMMARY,
  temperature: 0.7,
  max_tokens: 150,
  top_p: 0.9,
};

// ---------------------------------------------------------------------------
// Prompt Templates
// ---------------------------------------------------------------------------

export const PROMPTS = {
  /**
   * System prompt for food photo analysis.
   * The AI identifies foods, estimates portions, and returns structured JSON.
   */
  PHOTO_ANALYSIS_SYSTEM: `You are a professional nutritionist AI assistant specializing in Indonesian food identification and nutrition analysis.

When given a food photo, you must:
1. Identify all visible food items (use Indonesian food names when applicable)
2. Estimate portion sizes in grams
3. Calculate approximate nutrition per item
4. Return a structured JSON response

IMPORTANT: Always respond in valid JSON format with this exact structure:
{
  "success": true,
  "foods": [
    {
      "name": "Food name (Indonesian)",
      "estimatedGrams": 150,
      "confidence": 0.85,
      "nutrition": {
        "calories": 250,
        "protein": 15,
        "carbs": 30,
        "fats": 8
      }
    }
  ],
  "totalNutrition": {
    "calories": 500,
    "protein": 30,
    "carbs": 60,
    "fats": 16
  },
  "mealDescription": "Brief description of the meal in Indonesian"
}

If you cannot identify the food clearly, set confidence below 0.5 and provide your best estimate.
If the image is not food, return: { "success": false, "error": "Gambar bukan makanan" }`,

  /**
   * User prompt template for photo analysis.
   */
  PHOTO_ANALYSIS_USER: 'Analisis foto makanan ini. Identifikasi semua makanan yang terlihat, perkirakan porsi dan nutrisinya.',

  /**
   * System prompt for weekly nutrition summary.
   * Generates a concise, motivational one-liner in Indonesian.
   */
  WEEKLY_SUMMARY_SYSTEM: `You are a friendly Indonesian nutritionist. Given weekly nutrition data, generate exactly ONE short motivational sentence in Indonesian (Bahasa Indonesia) summarizing the week's eating habits.

Rules:
- Maximum 1 sentence, under 80 characters
- Use casual, friendly Indonesian
- Include a relevant emoji
- Be encouraging but honest
- Focus on the most notable aspect (good balance, high calories, low protein, etc.)

Examples:
- "Minggu ini protein kamu oke banget! 💪"
- "Kalori agak tinggi, yuk kurangi gorengan 🍳"
- "Pola makan seimbang, pertahankan! ⭐"
- "Kurang sayur minggu ini, tambah ya 🥬"`,

  /**
   * User prompt template for weekly summary.
   * {data} will be replaced with actual nutrition data.
   */
  WEEKLY_SUMMARY_USER: (data: {
    mealsCount: number;
    totalCalories: number;
    avgCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFats: number;
    balancedMealsCount: number;
  }) => `Data nutrisi minggu ini:
- Total makanan: ${data.mealsCount} porsi
- Total kalori: ${data.totalCalories} kal (rata-rata ${data.avgCalories}/porsi)
- Protein: ${data.totalProtein}g
- Karbohidrat: ${data.totalCarbs}g  
- Lemak: ${data.totalFats}g
- Makanan seimbang: ${data.balancedMealsCount}/${data.mealsCount}

Berikan 1 kalimat ringkasan motivasi dalam Bahasa Indonesia.`,
} as const;

// ---------------------------------------------------------------------------
// API Headers Builder
// ---------------------------------------------------------------------------

export function getOpenRouterHeaders(): Record<string, string> {
  return {
    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': 'https://nutrisight.app',
    'X-Title': 'NutriSight',
  };
}

// ---------------------------------------------------------------------------
// API URL
// ---------------------------------------------------------------------------

export function getOpenRouterChatURL(): string {
  return `${OPENROUTER_BASE_URL}/chat/completions`;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export function isOpenRouterConfigured(): boolean {
  return (
    OPENROUTER_API_KEY !== 'YOUR_OPENROUTER_API_KEY' &&
    OPENROUTER_API_KEY.length > 10
  );
}

// ---------------------------------------------------------------------------
// Export Config Object
// ---------------------------------------------------------------------------

const openRouterConfig = {
  apiKey: OPENROUTER_API_KEY,
  baseUrl: OPENROUTER_BASE_URL,
  models: OPENROUTER_MODELS,
  photoAnalysis: PHOTO_ANALYSIS_CONFIG,
  weeklySummary: WEEKLY_SUMMARY_CONFIG,
  prompts: PROMPTS,
  getHeaders: getOpenRouterHeaders,
  getChatURL: getOpenRouterChatURL,
  isConfigured: isOpenRouterConfigured,
};

export default openRouterConfig;