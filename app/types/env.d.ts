/// <reference types="node" />

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      EXPO_PUBLIC_APPWRITE_ENDPOINT?: string;
      EXPO_PUBLIC_APPWRITE_PROJECT_ID?: string;
      EXPO_PUBLIC_APPWRITE_DATABASE_ID?: string;
      EXPO_PUBLIC_OPENROUTER_API_KEY? : string;
      NODE_ENV?: 'development' | 'production' | 'test';
    }
  }
}