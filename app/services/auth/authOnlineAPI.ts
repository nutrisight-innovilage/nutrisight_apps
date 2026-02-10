/**
 * authOnlineAPI.ts
 * ---------------------------------------------------------------------------
 * Online API service untuk authentication.
 * 
 * Features:
 * • Real backend authentication
 * • JWT token management
 * • Secure password handling
 * • Session management
 * ---------------------------------------------------------------------------
 */

import { User, AuthResponse, LoginRequest, RegisterRequest, UpdateUserRequest } from '@/app/types/user';

// ---------------------------------------------------------------------------
// API Configuration
// ---------------------------------------------------------------------------

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
const API_TIMEOUT = 10000; // 10 seconds

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

/**
 * Fetch with timeout
 */
const fetchWithTimeout = async (url: string, options: RequestInit = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

/**
 * Handle API response
 */
const handleResponse = async (response: Response) => {
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || `HTTP error! status: ${response.status}`);
  }

  return data;
};

// ---------------------------------------------------------------------------
// Auth Online API
// ---------------------------------------------------------------------------

export const authOnlineAPI = {
  /**
   * Register a new user
   */
  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        body: JSON.stringify(data),
      });

      const result = await handleResponse(response);
      console.log('[authOnlineAPI] User registered successfully');
      return result;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout - silakan coba lagi');
        }
        throw new Error(`Gagal mendaftar: ${error.message}`);
      }
      throw new Error('Gagal mendaftar');
    }
  },

  /**
   * Login user
   */
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        body: JSON.stringify(data),
      });

      const result = await handleResponse(response);
      console.log('[authOnlineAPI] User logged in successfully');
      return result;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout - silakan coba lagi');
        }
        throw new Error(`Gagal login: ${error.message}`);
      }
      throw new Error('Gagal login');
    }
  },

  /**
   * Logout user
   */
  logout: async (token: string): Promise<void> => {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      await handleResponse(response);
      console.log('[authOnlineAPI] User logged out successfully');
    } catch (error) {
      // Log error but don't throw - logout should always succeed locally
      console.error('[authOnlineAPI] Logout error:', error);
    }
  },

  /**
   * Verify current token and get user data
   */
  verifyToken: async (token: string): Promise<AuthResponse> => {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/auth/verify`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await handleResponse(response);
      return result;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Token verification failed: ${error.message}`);
      }
      throw new Error('Token verification failed');
    }
  },

  /**
   * Get current user profile
   */
  getCurrentUser: async (token: string): Promise<User> => {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/auth/me`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await handleResponse(response);
      return result.user;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Gagal memuat profil: ${error.message}`);
      }
      throw new Error('Gagal memuat profil');
    }
  },

  /**
   * Update user profile
   */
  updateUser: async (
    userId: string,
    userData: UpdateUserRequest,
    token: string
  ): Promise<AuthResponse> => {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/users/${userId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(userData),
      });

      const result = await handleResponse(response);
      console.log('[authOnlineAPI] User profile updated successfully');
      return result;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Gagal update profil: ${error.message}`);
      }
      throw new Error('Gagal update profil');
    }
  },

  /**
   * Delete user account
   */
  deleteAccount: async (userId: string, token: string): Promise<void> => {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/users/${userId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      await handleResponse(response);
      console.log('[authOnlineAPI] User account deleted successfully');
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Gagal hapus akun: ${error.message}`);
      }
      throw new Error('Gagal hapus akun');
    }
  },

  /**
   * Change password
   */
  changePassword: async (
    userId: string,
    oldPassword: string,
    newPassword: string,
    token: string
  ): Promise<void> => {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/users/${userId}/password`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ oldPassword, newPassword }),
        }
      );

      await handleResponse(response);
      console.log('[authOnlineAPI] Password changed successfully');
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Gagal ubah password: ${error.message}`);
      }
      throw new Error('Gagal ubah password');
    }
  },

  /**
   * Request password reset
   */
  requestPasswordReset: async (email: string): Promise<void> => {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/auth/forgot-password`,
        {
          method: 'POST',
          body: JSON.stringify({ email }),
        }
      );

      await handleResponse(response);
      console.log('[authOnlineAPI] Password reset requested');
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Gagal request reset password: ${error.message}`);
      }
      throw new Error('Gagal request reset password');
    }
  },

  /**
   * Reset password with token
   */
  resetPassword: async (resetToken: string, newPassword: string): Promise<void> => {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/auth/reset-password`,
        {
          method: 'POST',
          body: JSON.stringify({ resetToken, newPassword }),
        }
      );

      await handleResponse(response);
      console.log('[authOnlineAPI] Password reset successfully');
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Gagal reset password: ${error.message}`);
      }
      throw new Error('Gagal reset password');
    }
  },

  /**
   * Refresh access token
   */
  refreshToken: async (refreshToken: string): Promise<AuthResponse> => {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      });

      const result = await handleResponse(response);
      console.log('[authOnlineAPI] Token refreshed successfully');
      return result;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Gagal refresh token: ${error.message}`);
      }
      throw new Error('Gagal refresh token');
    }
  },

  /**
   * Check if email is available
   */
  checkEmailAvailable: async (email: string): Promise<boolean> => {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/auth/check-email?email=${encodeURIComponent(email)}`,
        {
          method: 'GET',
        }
      );

      const result = await handleResponse(response);
      return result.available;
    } catch (error) {
      console.error('[authOnlineAPI] Error checking email:', error);
      return false;
    }
  },

  /**
   * Upload profile picture
   */
  uploadProfilePicture: async (
    userId: string,
    imageFile: File | Blob,
    token: string
  ): Promise<{ imageUrl: string }> => {
    try {
      const formData = new FormData();
      formData.append('image', imageFile);

      const response = await fetchWithTimeout(
        `${API_BASE_URL}/users/${userId}/profile-picture`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            // Don't set Content-Type, let browser set it with boundary
          },
          body: formData,
        }
      );

      const result = await handleResponse(response);
      console.log('[authOnlineAPI] Profile picture uploaded successfully');
      return result;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Gagal upload foto profil: ${error.message}`);
      }
      throw new Error('Gagal upload foto profil');
    }
  },
};

export default authOnlineAPI;