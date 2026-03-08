/**
 * openRouterConfig.ts (v3.0 - Single Source of Truth for Prompts)
 * ---------------------------------------------------------------------------
 * Configuration for OpenRouter API integration.
 *
 * v3.0 Changes:
 * ✅ Centralized ALL prompts here (no more duplicates in other files)
 * ✅ Weekly summary: educational/analytical tone (not motivational)
 * ✅ Photo analysis: non-food detection built into prompt
 * ✅ Photo detection prompt uses fixed Indonesian food categories
 *
 * Used by:
 * • openRouterService.ts (the ONLY service that calls OpenRouter)
 * • photoSyncStrategy.ts (calls openRouterService, NOT OpenRouter directly)
 * ---------------------------------------------------------------------------
 */

// ---------------------------------------------------------------------------
// Environment / Constants
// ---------------------------------------------------------------------------

const OPENROUTER_API_KEY =
  process.env.EXPO_PUBLIC_OPENROUTER_API_KEY || 'YOUR_OPENROUTER_API_KEY';

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
  temperature: 0.1,
  max_tokens: 500,
  top_p: 0.9,
};

export const WEEKLY_SUMMARY_CONFIG: OpenRouterRequestConfig = {
  model: OPENROUTER_MODELS.WEEKLY_SUMMARY,
  temperature: 0.5,
  max_tokens: 300,
  top_p: 0.9,
};

// ---------------------------------------------------------------------------
// Prompt Templates
// ---------------------------------------------------------------------------

export const PROMPTS = {
  // =========================================================================
  // PHOTO ANALYSIS — Fixed Indonesian Food Categories + Non-Food Detection
  // =========================================================================

  /**
   * Food detection prompt with fixed categories.
   * AI detects category + portion grams ONLY — nutrition calculated locally.
   *
   * Also handles NON-FOOD images by returning isFood: false.
   */
  FOOD_DETECTION: `You are a food detection AI for Indonesian meals. Analyze the provided image.

STEP 1 — CHECK IF THIS IS FOOD:
First, determine if the image contains food. If the image does NOT contain food (e.g., person, object, scenery, text, animal, selfie, document, etc.), respond ONLY with:
{
  "isFood": false,
  "reason": "<brief description of what the image shows instead>"
}
Do NOT proceed to Step 2 if the image is not food.

STEP 2 — IF FOOD IS DETECTED:
Classify each visible food item into one of these EXACT categories:

ALLOWED CATEGORIES (use ONLY these values):
- "ayam" → Chicken (any preparation: goreng, bakar, rebus, etc.)
- "ikan" → Fish (any type: goreng, bakar, pindang, etc.)
- "nasi" → Rice (putih, goreng, uduk, etc.)
- "tempe" → Tempeh (goreng, bacem, mendoan, etc.)
- "telur" → Egg (goreng, rebus, dadar, etc.)
- "tahu" → Tofu (goreng, bacem, etc.)
- "sambal" → Chili sauce/paste (any type)
- "sayur" → Vegetables (any: kangkung, bayam, lalapan, capcay, etc.)
- "kuah" → Broth/soup liquid (soto, sup, rawon broth, etc.)
- "other" → Anything else not in above categories

IMPORTANT RULES:
1. ONLY use categories from the list above. No other values allowed.
2. portionGrams MUST be in GRAMS only (not ml, not pieces, not servings).
3. For "kuah" (broth), estimate the liquid volume in grams (1ml ≈ 1g).
4. If same category appears multiple times (e.g., 2 types of sayur), combine into one entry.
5. Respond with VALID JSON only. No text before or after.

OUTPUT FORMAT FOR FOOD:
{
  "isFood": true,
  "foods": [
    {
      "category": "<one of the allowed categories>",
      "portionGrams": <number in grams>,
      "confidenceCategory": <0.00 to 1.00>,
      "confidencePortion": <0.00 to 1.00>
    }
  ]
}

EXAMPLE — Nasi padang plate:
{
  "isFood": true,
  "foods": [
    { "category": "nasi", "portionGrams": 200, "confidenceCategory": 0.95, "confidencePortion": 0.85 },
    { "category": "ayam", "portionGrams": 120, "confidenceCategory": 0.92, "confidencePortion": 0.80 },
    { "category": "sayur", "portionGrams": 80, "confidenceCategory": 0.88, "confidencePortion": 0.75 },
    { "category": "sambal", "portionGrams": 25, "confidenceCategory": 0.90, "confidencePortion": 0.70 }
  ]
}

EXAMPLE — Not food:
{
  "isFood": false,
  "reason": "Image shows a cat sitting on a table"
}

Now analyze the provided image:`,

  // =========================================================================
  // WEEKLY SUMMARY — Educational / Analytical / Warning
  // =========================================================================

  /**
   * System prompt for weekly nutrition summary.
   * Tone: educational, analytical, honest. NOT motivational.
   * Purpose: teach, reflect, warn about nutritional status.
   */
  WEEKLY_SUMMARY_SYSTEM: `Kamu adalah ahli gizi Indonesia yang memberikan evaluasi jujur dan edukatif tentang pola makan mingguan seseorang.

TUJUAN:
- Mencerminkan kondisi asupan gizi secara faktual (baik, buruk, berlebihan, kekurangan)
- Mengajarkan tentang keseimbangan nutrisi
- Memperingatkan jika ada masalah (kalori berlebih, protein kurang, dll.)
- BUKAN untuk memotivasi atau menyemangati — fokus pada fakta dan edukasi

PANDUAN EVALUASI:
- Kebutuhan kalori harian rata-rata: 1800-2200 kkal (tergantung aktivitas)
- Protein harian: 50-65g (minimal 10-15% dari total kalori)
- Karbohidrat harian: 250-325g (45-65% dari total kalori)
- Lemak harian: 44-78g (20-35% dari total kalori)
- Rasio seimbang per porsi: protein ≥15%, karbohidrat 45-65%, lemak ≤35%

FORMAT JAWABAN:
Berikan 2-3 kalimat singkat dalam Bahasa Indonesia yang mencakup:
1. Status keseluruhan (baik/kurang/berlebihan)
2. Masalah spesifik yang perlu diperhatikan (jika ada)
3. Saran konkret perbaikan (jika ada masalah)

CONTOH:
- "Asupan protein minggu ini kurang dari kebutuhan harian (hanya 35g/hari vs rekomendasi 50-65g). Karbohidrat berlebihan 40% dari batas atas. Kurangi nasi/gorengan dan tambah lauk protein seperti telur, tempe, atau ikan."
- "Pola makan minggu ini cukup seimbang. Protein dan karbohidrat dalam rentang normal. Lemak sedikit tinggi — perhatikan porsi gorengan dan santan."
- "Total kalori sangat rendah (rata-rata 900 kkal/hari) — ini di bawah kebutuhan minimum. Risiko kekurangan energi dan nutrisi. Pastikan makan 3 kali sehari dengan porsi cukup."
- "Hanya 2 dari 14 porsi yang seimbang. Pola makan didominasi karbohidrat tinggi dengan protein minim. Tambahkan sumber protein di setiap makan."`,

  /**
   * User prompt template for weekly summary.
   */
  WEEKLY_SUMMARY_USER: (data: {
    mealsCount: number;
    totalCalories: number;
    avgCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFats: number;
    balancedMealsCount: number;
    daysTracked?: number;
  }) => {
    const days = data.daysTracked || 7;
    const dailyCalories = Math.round(data.totalCalories / days);
    const dailyProtein = Math.round(data.totalProtein / days);
    const dailyCarbs = Math.round(data.totalCarbs / days);
    const dailyFats = Math.round(data.totalFats / days);

    return `Data nutrisi minggu ini (${days} hari):
- Total porsi tercatat: ${data.mealsCount}
- Total kalori: ${data.totalCalories} kkal (rata-rata ${dailyCalories} kkal/hari, ${data.avgCalories} kkal/porsi)
- Protein: ${data.totalProtein}g total (${dailyProtein}g/hari)
- Karbohidrat: ${data.totalCarbs}g total (${dailyCarbs}g/hari)
- Lemak: ${data.totalFats}g total (${dailyFats}g/hari)
- Porsi seimbang: ${data.balancedMealsCount} dari ${data.mealsCount}

Berikan evaluasi jujur tentang kondisi asupan gizi ini. Jangan memotivasi, tapi ajarkan dan peringatkan jika ada masalah.`;
  },
} as const;

// ---------------------------------------------------------------------------
// API Headers Builder
// ---------------------------------------------------------------------------

export function getOpenRouterHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${OPENROUTER_API_KEY}`,
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