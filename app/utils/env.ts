/**
 * config/env.ts
 * ---------------------------------------------------------------------------
 * Type-safe environment variables
 * ---------------------------------------------------------------------------
 */

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


export {};

const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = process.env[key] || defaultValue;
  
  if (!value) {
    throw new Error(`Environment variable ${key} is not defined`);
  }
  
  return value;
};

export const env: EnvConfig = {
  appwrite: {
    endpoint: getEnvVar('EXPO_PUBLIC_APPWRITE_ENDPOINT', 'https://cloud.appwrite.io/v1'),
    projectId: getEnvVar('EXPO_PUBLIC_APPWRITE_PROJECT_ID'),
    databaseId: getEnvVar('EXPO_PUBLIC_APPWRITE_DATABASE_ID', 'nutrition_db'),
  },
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  openrouter: {
    apiKey: Constants.expoConfig?.extra?.openRouterApiKey || process.env.EXPO_PUBLIC_OPENROUTER_API_KEY || '',
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
  },
};

export default env;