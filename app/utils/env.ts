import Constants from 'expo-constants';

interface EnvConfig {
  appwrite: {
    endpoint: string;
    projectId: string;
    databaseId: string;
  };
  isDevelopment: boolean;
  isProduction: boolean;
  openrouter: {
    apiKey: string;
    endpoint: string;
  };
}

export const env: EnvConfig = {
  appwrite: {
    endpoint: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1',
    projectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID || '',
    databaseId: process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID || 'nutrition_db',
  },
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  openrouter: {
    apiKey: Constants.expoConfig?.extra?.openRouterApiKey || process.env.EXPO_PUBLIC_OPENROUTER_API_KEY || '',
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
  },
};

export default env;