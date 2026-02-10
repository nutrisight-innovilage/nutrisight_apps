/**
 * authOfflineAPI.ts
 * ---------------------------------------------------------------------------
 * Offline API service untuk authentication.
 * 
 * Features:
 * • AsyncStorage untuk persistent local auth
 * • Local user management
 * • Offline-first authentication
 * • Sync preparation untuk online mode
 * ---------------------------------------------------------------------------
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, AuthResponse, LoginRequest, RegisterRequest, UpdateUserRequest } from '@/app/types/user';

// ---------------------------------------------------------------------------
// Storage Keys
// ---------------------------------------------------------------------------

const STORAGE_KEYS = {
  AUTH_DATA: '@auth:data',
  USERS_DATA: '@auth:users',
  PASSWORDS: '@auth:passwords',
  PENDING_UPDATES: '@auth:pending_updates',
};

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

/**
 * Simulate API delay for consistency
 */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Generate unique ID
 */
const generateId = (): string => {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Generate mock token
 */
const generateToken = (userId: string): string => {
  return `offline_token_${userId}_${Date.now()}`;
};

// ---------------------------------------------------------------------------
// Auth Offline API
// ---------------------------------------------------------------------------

export const authOfflineAPI = {
  /**
   * Register a new user (offline)
   */
  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    await delay(1000);

    try {
      // Get existing users
      const usersJson = await AsyncStorage.getItem(STORAGE_KEYS.USERS_DATA);
      const users: User[] = usersJson ? JSON.parse(usersJson) : [];

      // Check if email already exists
      const existingUser = users.find(
        u => u.email.toLowerCase() === data.email.toLowerCase()
      );
      
      if (existingUser) {
        throw new Error('Email already registered');
      }

      // Create new user
      const newUser: User = {
        id: generateId(),
        email: data.email,
        name: data.name,
        age: parseInt(data.age),
        weight: parseFloat(data.weight),
        height: parseFloat(data.height),
        gender: data.gender,
        role: data.role,
        createdAt: new Date().toISOString(),
      };

      // Store password separately
      const passwordsJson = await AsyncStorage.getItem(STORAGE_KEYS.PASSWORDS);
      const passwords: Record<string, string> = passwordsJson ? JSON.parse(passwordsJson) : {};
      passwords[newUser.id] = data.password;
      await AsyncStorage.setItem(STORAGE_KEYS.PASSWORDS, JSON.stringify(passwords));

      // Save user to users list
      users.push(newUser);
      await AsyncStorage.setItem(STORAGE_KEYS.USERS_DATA, JSON.stringify(users));

      // Generate token
      const token = generateToken(newUser.id);

      // Save auth data
      const authData: AuthResponse = { user: newUser, token };
      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_DATA, JSON.stringify(authData));

      console.log('[authOfflineAPI] User registered offline');
      return authData;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Login user (offline)
   */
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    await delay(800);

    try {
      // Get users
      const usersJson = await AsyncStorage.getItem(STORAGE_KEYS.USERS_DATA);
      const users: User[] = usersJson ? JSON.parse(usersJson) : [];

      // Find user by email
      const user = users.find(
        u => u.email.toLowerCase() === data.email.toLowerCase()
      );

      if (!user) {
        throw new Error('Invalid email or password');
      }

      // Check password
      const passwordsJson = await AsyncStorage.getItem(STORAGE_KEYS.PASSWORDS);
      const passwords: Record<string, string> = passwordsJson ? JSON.parse(passwordsJson) : {};

      if (passwords[user.id] !== data.password) {
        throw new Error('Invalid email or password');
      }

      // Generate new token
      const token = generateToken(user.id);

      // Save auth data
      const authData: AuthResponse = { user, token };
      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_DATA, JSON.stringify(authData));

      console.log('[authOfflineAPI] User logged in offline');
      return authData;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Logout user (offline)
   */
  logout: async (): Promise<void> => {
    await delay(300);

    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_DATA);
      console.log('[authOfflineAPI] User logged out offline');
    } catch (error) {
      console.error('[authOfflineAPI] Logout error:', error);
    }
  },

  /**
   * Get current user from local storage
   */
  getCurrentUser: async (): Promise<AuthResponse | null> => {
    try {
      const authJson = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_DATA);
      
      if (!authJson) {
        return null;
      }

      return JSON.parse(authJson);
    } catch (error) {
      console.error('[authOfflineAPI] Error getting current user:', error);
      return null;
    }
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated: async (): Promise<boolean> => {
    const authData = await authOfflineAPI.getCurrentUser();
    return authData !== null;
  },

  /**
   * Update user profile (offline)
   */
  updateUser: async (
    userId: string,
    userData: UpdateUserRequest,
    token: string
  ): Promise<AuthResponse> => {
    await delay(800);

    try {
      // Get all users
      const usersJson = await AsyncStorage.getItem(STORAGE_KEYS.USERS_DATA);
      const users: User[] = usersJson ? JSON.parse(usersJson) : [];

      // Find user index
      const userIndex = users.findIndex(u => u.id === userId);
      
      if (userIndex === -1) {
        throw new Error('User not found');
      }

      // Update user data
      const updatedUser: User = {
        ...users[userIndex],
        ...userData,
        updatedAt: new Date().toISOString(),
      };

      // Update in users array
      users[userIndex] = updatedUser;
      await AsyncStorage.setItem(STORAGE_KEYS.USERS_DATA, JSON.stringify(users));

      // Update auth data
      const authData: AuthResponse = { user: updatedUser, token };
      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_DATA, JSON.stringify(authData));

      // Mark as pending sync
      await authOfflineAPI.markPendingUpdate(userId, userData);

      console.log('[authOfflineAPI] User profile updated offline');
      return authData;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Delete user account (offline)
   */
  deleteAccount: async (userId: string): Promise<void> => {
    await delay(500);

    try {
      // Get all users
      const usersJson = await AsyncStorage.getItem(STORAGE_KEYS.USERS_DATA);
      const users: User[] = usersJson ? JSON.parse(usersJson) : [];

      // Remove user from users list
      const filteredUsers = users.filter(u => u.id !== userId);
      await AsyncStorage.setItem(STORAGE_KEYS.USERS_DATA, JSON.stringify(filteredUsers));

      // Remove password
      const passwordsJson = await AsyncStorage.getItem(STORAGE_KEYS.PASSWORDS);
      const passwords: Record<string, string> = passwordsJson ? JSON.parse(passwordsJson) : {};
      delete passwords[userId];
      await AsyncStorage.setItem(STORAGE_KEYS.PASSWORDS, JSON.stringify(passwords));

      // Remove auth data
      await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_DATA);

      // Remove all user-specific data
      const allKeys = await AsyncStorage.getAllKeys();
      const userKeys = allKeys.filter(key =>
        key.includes(userId) ||
        key.startsWith(`user_${userId}`) ||
        key.startsWith(`scan_${userId}`) ||
        key.startsWith(`history_${userId}`)
      );

      if (userKeys.length > 0) {
        await AsyncStorage.multiRemove(userKeys);
      }

      console.log('[authOfflineAPI] User account deleted offline');
    } catch (error) {
      throw error;
    }
  },

  /**
   * Change password (offline)
   */
  changePassword: async (
    userId: string,
    oldPassword: string,
    newPassword: string
  ): Promise<void> => {
    await delay(500);

    try {
      // Get passwords
      const passwordsJson = await AsyncStorage.getItem(STORAGE_KEYS.PASSWORDS);
      const passwords: Record<string, string> = passwordsJson ? JSON.parse(passwordsJson) : {};

      // Verify old password
      if (passwords[userId] !== oldPassword) {
        throw new Error('Invalid old password');
      }

      // Update password
      passwords[userId] = newPassword;
      await AsyncStorage.setItem(STORAGE_KEYS.PASSWORDS, JSON.stringify(passwords));

      console.log('[authOfflineAPI] Password changed offline');
    } catch (error) {
      throw error;
    }
  },

  /**
   * Check if email is available (offline)
   */
  checkEmailAvailable: async (email: string): Promise<boolean> => {
    await delay(300);

    try {
      const usersJson = await AsyncStorage.getItem(STORAGE_KEYS.USERS_DATA);
      const users: User[] = usersJson ? JSON.parse(usersJson) : [];

      const exists = users.some(
        u => u.email.toLowerCase() === email.toLowerCase()
      );

      return !exists;
    } catch (error) {
      console.error('[authOfflineAPI] Error checking email:', error);
      return false;
    }
  },

  // ---------------------------------------------------------------------------
  // Sync Support
  // ---------------------------------------------------------------------------

  /**
   * Mark user update as pending sync
   */
  markPendingUpdate: async (
    userId: string,
    updateData: UpdateUserRequest
  ): Promise<void> => {
    try {
      const pendingJson = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_UPDATES);
      const pending: Record<string, UpdateUserRequest> = pendingJson
        ? JSON.parse(pendingJson)
        : {};

      pending[userId] = {
        ...pending[userId],
        ...updateData,
      };

      await AsyncStorage.setItem(
        STORAGE_KEYS.PENDING_UPDATES,
        JSON.stringify(pending)
      );

      console.log('[authOfflineAPI] Marked update as pending sync');
    } catch (error) {
      console.error('[authOfflineAPI] Error marking pending update:', error);
    }
  },

  /**
   * Get pending updates for sync
   */
  getPendingUpdates: async (): Promise<Record<string, UpdateUserRequest>> => {
    try {
      const pendingJson = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_UPDATES);
      return pendingJson ? JSON.parse(pendingJson) : {};
    } catch (error) {
      console.error('[authOfflineAPI] Error getting pending updates:', error);
      return {};
    }
  },

  /**
   * Clear pending update after successful sync
   */
  clearPendingUpdate: async (userId: string): Promise<void> => {
    try {
      const pendingJson = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_UPDATES);
      const pending: Record<string, UpdateUserRequest> = pendingJson
        ? JSON.parse(pendingJson)
        : {};

      delete pending[userId];

      await AsyncStorage.setItem(
        STORAGE_KEYS.PENDING_UPDATES,
        JSON.stringify(pending)
      );

      console.log('[authOfflineAPI] Cleared pending update for user');
    } catch (error) {
      console.error('[authOfflineAPI] Error clearing pending update:', error);
    }
  },

  /**
   * Get all users (for sync)
   */
  getAllUsers: async (): Promise<User[]> => {
    try {
      const usersJson = await AsyncStorage.getItem(STORAGE_KEYS.USERS_DATA);
      return usersJson ? JSON.parse(usersJson) : [];
    } catch (error) {
      console.error('[authOfflineAPI] Error getting all users:', error);
      return [];
    }
  },

  /**
   * Save user from server (during sync)
   */
  saveUserFromServer: async (user: User): Promise<void> => {
    try {
      const usersJson = await AsyncStorage.getItem(STORAGE_KEYS.USERS_DATA);
      const users: User[] = usersJson ? JSON.parse(usersJson) : [];

      // Update or add user
      const index = users.findIndex(u => u.id === user.id);
      
      if (index !== -1) {
        users[index] = user;
      } else {
        users.push(user);
      }

      await AsyncStorage.setItem(STORAGE_KEYS.USERS_DATA, JSON.stringify(users));
      console.log('[authOfflineAPI] User saved from server');
    } catch (error) {
      console.error('[authOfflineAPI] Error saving user from server:', error);
    }
  },

  /**
   * Clear all auth data (for fresh start)
   */
  clearAllData: async (): Promise<void> => {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.AUTH_DATA,
        STORAGE_KEYS.USERS_DATA,
        STORAGE_KEYS.PASSWORDS,
        STORAGE_KEYS.PENDING_UPDATES,
      ]);
      console.log('[authOfflineAPI] All auth data cleared');
    } catch (error) {
      console.error('[authOfflineAPI] Error clearing all data:', error);
    }
  },
};

export default authOfflineAPI;