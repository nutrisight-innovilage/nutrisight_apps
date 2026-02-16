/**
 * appwriteConfig.ts (v2.0 COMPLETE)
 * ---------------------------------------------------------------------------
 * Appwrite configuration dan initialization.
 * 
 * v2.0 Changes:
 * • ✅ Added PHOTO_ANALYSIS collection
 * • ✅ Updated FUNCTIONS with GPT4_VISION_ANALYSIS
 * • ✅ Verified MEAL_PHOTOS bucket
 * ---------------------------------------------------------------------------
 */

import { Client, Account, Databases, Storage, Functions, ID, Query, Models } from 'appwrite';
import EnvConfig  from '@/app/utils/env';

// ---------------------------------------------------------------------------
// Environment Variables (Type-safe)
// ---------------------------------------------------------------------------

const APPWRITE_ENDPOINT: string = EnvConfig.appwrite.endpoint;
const APPWRITE_PROJECT_ID: string = EnvConfig.appwrite.projectId;
const APPWRITE_DATABASE_ID: string = EnvConfig.appwrite.databaseId;

// Log configuration (only in development)
if (__DEV__) {
  console.log('[Appwrite] Environment loaded:', {
    endpoint: APPWRITE_ENDPOINT,
    projectId: APPWRITE_PROJECT_ID ? '✓ Set' : '✗ Missing',
    databaseId: APPWRITE_DATABASE_ID ? '✓ Set' : '✗ Missing',
  });
}

// ---------------------------------------------------------------------------
// Configuration Constants
// ---------------------------------------------------------------------------

export const DATABASE_ID: string = APPWRITE_DATABASE_ID;

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
  
  // Photo Analysis (v2.0)
  PHOTO_ANALYSIS: 'photo_analysis',
} as const;

export const BUCKETS = {
  PROFILE_PICTURES: 'profile-pictures',
  FOOD_IMAGES: 'food-images',
  MEAL_PHOTOS: 'meal-photos', // v2.0 - For user meal photos
} as const;

export const FUNCTIONS = {
  YOLO_ANALYSIS: 'yolo-food-detection', // Legacy - kept for compatibility
  GPT4_VISION_ANALYSIS: 'gpt4-vision-analysis', // v2.0 - OpenRouter GPT-4 Vision
  NUTRITION_CALCULATION: 'nutrition-calculator',
  LLM_ADVICE: 'llm-nutrition-advice', // Future feature
  PERSONALIZED_THRESHOLDS: 'personalized-thresholds',
} as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CollectionName = keyof typeof COLLECTIONS;
export type BucketName = keyof typeof BUCKETS;
export type FunctionName = keyof typeof FUNCTIONS;

interface AppwriteConfig {
  endpoint: string;
  projectId: string;
  databaseId: string;
  collections: typeof COLLECTIONS;
  buckets: typeof BUCKETS;
  functions: typeof FUNCTIONS;
}

interface HealthCheckResult {
  isHealthy: boolean;
  isAuthenticated: boolean;
  error?: string;
}

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

    if (__DEV__) {
      console.log('[Appwrite] ✓ Client initialized successfully');
    }
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
    if (__DEV__) {
      console.log('[Appwrite] Session token set');
    }
  }

  /**
   * Clear session
   */
  public clearSession(): void {
    this.client.setJWT('');
    if (__DEV__) {
      console.log('[Appwrite] Session cleared');
    }
  }

  /**
   * Get current user
   */
  public async getCurrentUser(): Promise<Models.User<Models.Preferences> | null> {
    try {
      const user = await this.account.get();
      if (__DEV__) {
        console.log('[Appwrite] User authenticated:', user.email);
      }
      return user;
    } catch (error) {
      if (__DEV__) {
        console.log('[Appwrite] No active session');
      }
      return null;
    }
  }

  /**
   * Get configuration info
   */
  public getConfig(): AppwriteConfig {
    return {
      endpoint: APPWRITE_ENDPOINT,
      projectId: APPWRITE_PROJECT_ID,
      databaseId: APPWRITE_DATABASE_ID,
      collections: COLLECTIONS,
      buckets: BUCKETS,
      functions: FUNCTIONS,
    };
  }
}

// ---------------------------------------------------------------------------
// Export Instances
// ---------------------------------------------------------------------------

const appwrite = AppwriteService.getInstance();

export const client: Client = appwrite.client;
export const account: Account = appwrite.account;
export const databases: Databases = appwrite.databases;
export const storage: Storage = appwrite.storage;
export const functions: Functions = appwrite.functions;

// Export service for session management
export const appwriteService: AppwriteService = appwrite;

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
  lessThanEqual: (attribute: string, value: any) => Query.lessThanEqual(attribute, value),
  greaterThanEqual: (attribute: string, value: any) => Query.greaterThanEqual(attribute, value),
  search: (attribute: string, value: string) => Query.search(attribute, value),
  orderDesc: (attribute: string) => Query.orderDesc(attribute),
  orderAsc: (attribute: string) => Query.orderAsc(attribute),
  limit: (value: number) => Query.limit(value),
  offset: (value: number) => Query.offset(value),
  between: (attribute: string, start: any, end: any) => Query.between(attribute, start, end),
  isNull: (attribute: string) => Query.isNull(attribute),
  isNotNull: (attribute: string) => Query.isNotNull(attribute),
  startsWith: (attribute: string, value: string) => Query.startsWith(attribute, value),
  endsWith: (attribute: string, value: string) => Query.endsWith(attribute, value),
  select: (attributes: string[]) => Query.select(attributes),
  contains: (attribute: string, value: string) => Query.contains(attribute, value),
};

/**
 * Error handler for Appwrite errors
 */
export const handleAppwriteError = (error: any): Error => {
  if (__DEV__) {
    console.error('[Appwrite] Error:', error);
  }

  if (error?.code) {
    switch (error.code) {
      case 400:
        return new Error('Bad request - please check your input');
      case 401:
        return new Error('Unauthorized - please login again');
      case 403:
        return new Error('Forbidden - you don\'t have permission');
      case 404:
        return new Error('Resource not found');
      case 409:
        return new Error('Resource already exists');
      case 429:
        return new Error('Too many requests - please try again later');
      case 500:
        return new Error('Server error - please try again');
      case 503:
        return new Error('Service unavailable - please try again later');
      default:
        return new Error(error.message || 'An error occurred');
    }
  }
  
  if (error?.message) {
    return new Error(error.message);
  }
  
  return new Error('An unknown error occurred');
};

/**
 * Check if Appwrite is configured properly
 */
export const isConfigured = (): boolean => {
  return !!(APPWRITE_ENDPOINT && APPWRITE_PROJECT_ID && APPWRITE_DATABASE_ID);
};

/**
 * Health check
 */
export const healthCheck = async (): Promise<HealthCheckResult> => {
  try {
    const user = await account.get();
    
    try {
      await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.USERS,
        [QueryHelpers.limit(1)]
      );
      if (__DEV__) {
        console.log('[Appwrite] ✓ Dashboard ping sent (authenticated)');
      }
    } catch (dbError) {
      if (__DEV__) {
        console.log('[Appwrite] Account OK, database ping failed (may not have data yet)');
      }
    }
    
    return {
      isHealthy: true,
      isAuthenticated: true,
    };
  } catch (error: any) {
    if (error?.code === 401) {
      try {
        await databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.USERS,
          [QueryHelpers.limit(1)]
        );
      } catch (pingError: any) {
        if (pingError?.code === 401 && __DEV__) {
          console.log('[Appwrite] ✓ Dashboard ping sent (unauthenticated, connection OK)');
        }
      }
      
      return {
        isHealthy: true,
        isAuthenticated: false,
      };
    }
    
    if (__DEV__) {
      console.error('[Appwrite] Health check failed:', error);
    }
    
    return {
      isHealthy: false,
      isAuthenticated: false,
      error: error?.message || 'Unknown error',
    };
  }
};

/**
 * Enhanced ping for dashboard detection
 */
export const sendDashboardPing = async (): Promise<{
  success: boolean;
  message: string;
  authenticated: boolean;
}> => {
  try {
    let authenticated = false;
    try {
      await account.get();
      authenticated = true;
    } catch (authError: any) {
      if (authError?.code !== 401) {
        throw authError;
      }
    }

    const pingMethods = [
      async () => {
        try {
          await databases.listDocuments(DATABASE_ID, COLLECTIONS.USERS, [QueryHelpers.limit(1)]);
          return 'Users collection';
        } catch (e: any) {
          if (e?.code === 401 || e?.code === 404) return 'Users collection (expected error)';
          throw e;
        }
      },
      async () => {
        try {
          await databases.listDocuments(DATABASE_ID, COLLECTIONS.MENU_ITEMS, [QueryHelpers.limit(1)]);
          return 'Menu items';
        } catch (e: any) {
          if (e?.code === 401 || e?.code === 404) return 'Menu items (expected error)';
          throw e;
        }
      },
      async () => {
        try {
          await account.get();
          return 'Account authenticated';
        } catch (e: any) {
          if (e?.code === 401) return 'Account check (not logged in)';
          throw e;
        }
      },
      async () => {
        try {
          await storage.listFiles(BUCKETS.PROFILE_PICTURES, [QueryHelpers.limit(1)]);
          return 'Storage access';
        } catch (e: any) {
          if (e?.code === 401 || e?.code === 404) return 'Storage (expected error)';
          throw e;
        }
      },
    ];

    const results = [];
    for (const ping of pingMethods) {
      try {
        const result = await ping();
        results.push(result);
      } catch (error) {
        if (__DEV__) {
          console.log('[Appwrite] Ping method failed:', error);
        }
      }
    }

    if (__DEV__) {
      console.log('[Appwrite] ✓ Dashboard ping completed:', results);
    }

    return {
      success: true,
      message: `✓ Ping successful!\nChecked: ${results.join(', ')}`,
      authenticated,
    };
  } catch (error: any) {
    if (__DEV__) {
      console.error('[Appwrite] Dashboard ping failed:', error);
    }
    return {
      success: false,
      message: `✗ Ping failed: ${error?.message || 'Unknown error'}`,
      authenticated: false,
    };
  }
};

/**
 * Initialize and verify Appwrite connection
 */
export const initializeAppwrite = async (): Promise<boolean> => {
  try {
    if (__DEV__) {
      console.log('[Appwrite] Initializing...');
    }
    
    if (!isConfigured()) {
      console.error('[Appwrite] ✗ Configuration missing - check your .env file');
      return false;
    }
    
    const health = await healthCheck();
    
    if (health.isHealthy) {
      if (__DEV__) {
        console.log('[Appwrite] ✓ Connection successful');
        console.log('[Appwrite] Authenticated:', health.isAuthenticated ? 'Yes' : 'No');
      }
      return true;
    } else {
      console.error('[Appwrite] ✗ Connection failed:', health.error);
      return false;
    }
  } catch (error) {
    console.error('[Appwrite] ✗ Initialization failed:', error);
    return false;
  }
};

// ---------------------------------------------------------------------------
// Export Default
// ---------------------------------------------------------------------------

export default appwrite;