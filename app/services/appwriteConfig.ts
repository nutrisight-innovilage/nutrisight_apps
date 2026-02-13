/**
 * appwriteConfig.ts
 * ---------------------------------------------------------------------------
 * Appwrite configuration dan initialization.
 * 
 * Setup:
 * 1. Client - Main Appwrite client
 * 2. Account - Authentication service
 * 3. Databases - Data storage
 * 4. Storage - File storage (images, photos)
 * 5. Functions - Serverless functions (YOLO, LLM)
 * 
 * Collections Structure:
 * • users - User profiles (synced from Account)
 * • menu_items - Food menu items
 * • nutrition_scans - User's meal scans
 * • nutrition_goals - User's nutrition goals
 * • feedback - User feedback for ML training
 * ---------------------------------------------------------------------------
 */

import { Client, Account, Databases, Storage, Functions, ID, Query } from 'appwrite';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const APPWRITE_ENDPOINT = process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID || 'your-project-id';

// Database & Collection IDs
export const DATABASE_ID = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID || 'main';

export const COLLECTIONS = {
  // Auth & Users
  USERS: 'users',
  USER_PREFERENCES: 'user_preferences',
  
  // Menu
  MENU_ITEMS: 'menu_items',
  MENU_CATEGORIES: 'menu_categories',
  
  // Nutrition
  NUTRITION_SCANS: 'nutrition_scans',
  NUTRITION_GOALS: 'nutrition_goals',
  WEEKLY_INSIGHTS: 'weekly_insights',
  
  // Feedback & Analytics
  USER_FEEDBACK: 'user_feedback',
  PHOTO_ANALYSIS: 'photo_analysis',
} as const;

// Storage Bucket IDs
export const BUCKETS = {
  PROFILE_PICTURES: 'profile-pictures',
  FOOD_IMAGES: 'food-images',
  MEAL_PHOTOS: 'meal-photos',
} as const;

// Function IDs for serverless
export const FUNCTIONS = {
  YOLO_ANALYSIS: 'yolo-food-detection',
  NUTRITION_CALCULATION: 'nutrition-calculator',
  LLM_ADVICE: 'llm-nutrition-advice',
  PERSONALIZED_THRESHOLDS: 'personalized-thresholds',
} as const;

// ---------------------------------------------------------------------------
// Client Initialization
// ---------------------------------------------------------------------------

class AppwriteService {
  private static instance: AppwriteService;
  
  public client: Client;
  public account: Account;
  public databases: Databases;
  public storage: Storage;
  public functions: Functions;

  private constructor() {
    // Initialize client
    this.client = new Client()
      .setEndpoint(APPWRITE_ENDPOINT)
      .setProject(APPWRITE_PROJECT_ID);

    // Initialize services
    this.account = new Account(this.client);
    this.databases = new Databases(this.client);
    this.storage = new Storage(this.client);
    this.functions = new Functions(this.client);

    console.log('[Appwrite] Client initialized');
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): AppwriteService {
    if (!AppwriteService.instance) {
      AppwriteService.instance = new AppwriteService();
    }
    return AppwriteService.instance;
  }

  /**
   * Set session token (for authenticated requests)
   */
  public setSession(sessionToken: string): void {
    this.client.setJWT(sessionToken);
  }

  /**
   * Clear session
   */
  public clearSession(): void {
    this.client.setJWT('');
  }
}

// ---------------------------------------------------------------------------
// Export Instances
// ---------------------------------------------------------------------------

const appwrite = AppwriteService.getInstance();

export const client = appwrite.client;
export const account = appwrite.account;
export const databases = appwrite.databases;
export const storage = appwrite.storage;
export const functions = appwrite.functions;

// Export service for session management
export const appwriteService = appwrite;

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

/**
 * Generate unique ID (Appwrite style)
 */
export const generateId = (): string => {
  return ID.unique();
};

/**
 * Query helpers
 */
export const QueryHelpers = {
  equal: (attribute: string, value: any) => Query.equal(attribute, value),
  notEqual: (attribute: string, value: any) => Query.notEqual(attribute, value),
  lessThan: (attribute: string, value: any) => Query.lessThan(attribute, value),
  greaterThan: (attribute: string, value: any) => Query.greaterThan(attribute, value),
  search: (attribute: string, value: string) => Query.search(attribute, value),
  orderDesc: (attribute: string) => Query.orderDesc(attribute),
  orderAsc: (attribute: string) => Query.orderAsc(attribute),
  limit: (value: number) => Query.limit(value),
  offset: (value: number) => Query.offset(value),
  between: (attribute: string, start: any, end: any) => Query.between(attribute, start, end),
};

/**
 * Error handler for Appwrite errors
 */
export const handleAppwriteError = (error: any): Error => {
  if (error.code) {
    switch (error.code) {
      case 401:
        return new Error('Unauthorized - please login again');
      case 404:
        return new Error('Resource not found');
      case 409:
        return new Error('Resource already exists');
      case 429:
        return new Error('Too many requests - please try again later');
      case 500:
        return new Error('Server error - please try again');
      default:
        return new Error(error.message || 'An error occurred');
    }
  }
  return error;
};

/**
 * Check if Appwrite is configured properly
 */
export const isConfigured = (): boolean => {
  return APPWRITE_PROJECT_ID !== 'your-project-id';
};

/**
 * Health check
 */
export const healthCheck = async (): Promise<boolean> => {
  try {
    await account.get();
    return true;
  } catch (error) {
    // Not logged in is OK for health check
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return true;
    }
    console.error('[Appwrite] Health check failed:', error);
    return false;
  }
};

export default appwrite;