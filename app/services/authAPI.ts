import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, AuthResponse, LoginRequest, RegisterRequest } from '@/app/types/user';

const STORAGE_KEY = '@auth_data';
const USERS_KEY = '@users_data';

// Simulate API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const authAPI = {
  /**
   * Register a new user
   */
  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    await delay(1000);

    try {
      // Get existing users
      const usersJson = await AsyncStorage.getItem(USERS_KEY);
      const users: User[] = usersJson ? JSON.parse(usersJson) : [];

      // Check if email already exists
      const existingUser = users.find(u => u.email.toLowerCase() === data.email.toLowerCase());
      if (existingUser) {
        throw new Error('Email already registered');
      }

      // Create new user
      const newUser: User = {
        id: Date.now().toString(),
        email: data.email,
        name: data.name,
        age: parseInt(data.age),
        weight: parseFloat(data.weight),
        height: parseFloat(data.height),
        gender: data.gender,
        role: data.role,
        createdAt: new Date().toISOString(),
      };

      // Store password separately (in real app, this would be hashed on backend)
      const passwordsJson = await AsyncStorage.getItem('@passwords');
      const passwords: { [key: string]: string } = passwordsJson ? JSON.parse(passwordsJson) : {};
      passwords[newUser.id] = data.password;
      await AsyncStorage.setItem('@passwords', JSON.stringify(passwords));

      // Save user
      users.push(newUser);
      await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));

      // Generate token
      const token = `token_${newUser.id}_${Date.now()}`;

      // Save auth data
      const authData: AuthResponse = { user: newUser, token };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(authData));

      return authData;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Login user
   */
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    await delay(800);

    try {
      // Get users
      const usersJson = await AsyncStorage.getItem(USERS_KEY);
      const users: User[] = usersJson ? JSON.parse(usersJson) : [];

      // Find user
      const user = users.find(u => u.email.toLowerCase() === data.email.toLowerCase());
      if (!user) {
        throw new Error('Invalid email or password');
      }

      // Check password
      const passwordsJson = await AsyncStorage.getItem('@passwords');
      const passwords: { [key: string]: string } = passwordsJson ? JSON.parse(passwordsJson) : {};
      
      if (passwords[user.id] !== data.password) {
        throw new Error('Invalid email or password');
      }

      // Generate token
      const token = `token_${user.id}_${Date.now()}`;

      // Save auth data
      const authData: AuthResponse = { user, token };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(authData));

      return authData;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Logout user
   */
  logout: async (): Promise<void> => {
    await AsyncStorage.removeItem(STORAGE_KEY);
  },

  /**
   * Get current user
   */
  getCurrentUser: async (): Promise<AuthResponse | null> => {
    try {
      const authJson = await AsyncStorage.getItem(STORAGE_KEY);
      if (!authJson) return null;
      
      return JSON.parse(authJson);
    } catch (error) {
      return null;
    }
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated: async (): Promise<boolean> => {
    const authData = await authAPI.getCurrentUser();
    return authData !== null;
  },
};