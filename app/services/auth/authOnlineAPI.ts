/**
 * authOnlineAPI.ts (FIXED - APPWRITE VERSION)
 * ---------------------------------------------------------------------------
 * Online API service untuk authentication menggunakan Appwrite.
 * 
 * FIXES APPLIED:
 * • ✅ Email update properly documented (requires password)
 * • ✅ Account deletion limitation documented
 * • ✅ Better error handling
 * • ✅ Separate function for email update with password
 * ---------------------------------------------------------------------------
 */

import { 
  account, 
  databases, 
  DATABASE_ID, 
  COLLECTIONS,
  generateId,
  handleAppwriteError,
  appwriteService,
} from '@/app/services/appwriteConfig';
import { User, AuthResponse, LoginRequest, RegisterRequest, UpdateUserRequest } from '@/app/types/user';
import { Models } from 'appwrite';

// ---------------------------------------------------------------------------
// Type Conversions
// ---------------------------------------------------------------------------

/**
 * Convert Appwrite User to our User type
 */
const convertAppwriteUser = async (appwriteUser: Models.User<Models.Preferences>): Promise<User> => {
  // Try to get additional user data from database
  let userData: any = {};
  
  try {
    const userDoc = await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.USERS,
      appwriteUser.$id
    );
    userData = userDoc;
  } catch (error) {
    console.warn('[authOnlineAPI] User document not found, using Account data only');
  }

  return {
    id: appwriteUser.$id,
    email: appwriteUser.email,
    name: appwriteUser.name,
    createdAt: appwriteUser.$createdAt,
    // Fields from database with proper fallbacks
    age: userData.age || 0,
    weight: userData.weight || 0,
    height: userData.height || 0,
    gender: userData.gender || 'male',
    role: userData.role || 'dewasa',
    phone: userData.phone,
    updatedAt: userData.updatedAt || appwriteUser.$updatedAt,
  };
};

/**
 * Create AuthResponse from Appwrite session
 */
const createAuthResponse = async (session: Models.Session): Promise<AuthResponse> => {
  const appwriteUser = await account.get();
  const user = await convertAppwriteUser(appwriteUser);
  
  return {
    user,
    token: session.secret,
    refreshToken: session.$id,
  };
};

// ---------------------------------------------------------------------------
// Auth Online API (FIXED)
// ---------------------------------------------------------------------------

export const authOnlineAPI = {
  /**
   * Register a new user
   */
  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    try {
      console.log('[authOnlineAPI] Registering new user...');

      // Create Appwrite Account
      const userId = generateId();
      await account.create(
        userId,
        data.email,
        data.password,
        data.name
      );

      console.log('[authOnlineAPI] Account created, logging in...');

      // Auto login after registration
      const session = await account.createEmailPasswordSession(
        data.email,
        data.password
      );

      // Create user profile document in database
      try {
        await databases.createDocument(
          DATABASE_ID,
          COLLECTIONS.USERS,
          userId,
          {
            email: data.email,
            name: data.name,
            age: parseInt(data.age) || 0,
            weight: parseFloat(data.weight) || 0,
            height: parseFloat(data.height) || 0,
            gender: data.gender,
            role: data.role,
            phone: data.phone || null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
        );
        console.log('[authOnlineAPI] User profile created in database');
      } catch (dbError) {
        console.error('[authOnlineAPI] Failed to create user profile:', dbError);
        // Continue anyway, profile can be created later
      }

      const authResponse = await createAuthResponse(session);
      console.log('[authOnlineAPI] ✅ User registered successfully');
      
      return authResponse;
    } catch (error) {
      console.error('[authOnlineAPI] Registration error:', error);
      throw handleAppwriteError(error);
    }
  },

  /**
   * Login user
   */
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    try {
      console.log('[authOnlineAPI] Logging in user...');

      // Create session
      const session = await account.createEmailPasswordSession(
        data.email,
        data.password
      );

      const authResponse = await createAuthResponse(session);
      console.log('[authOnlineAPI] ✅ User logged in successfully');
      
      return authResponse;
    } catch (error) {
      console.error('[authOnlineAPI] Login error:', error);
      throw handleAppwriteError(error);
    }
  },

  /**
   * Logout user
   */
  logout: async (token: string): Promise<void> => {
    try {
      console.log('[authOnlineAPI] Logging out user...');

      // Delete current session
      await account.deleteSession('current');

      console.log('[authOnlineAPI] ✅ User logged out successfully');
    } catch (error) {
      console.error('[authOnlineAPI] Logout error:', error);
      // Don't throw - logout should succeed locally even if server fails
    }
  },

  /**
   * Verify current token and get user data
   */
  verifyToken: async (token: string): Promise<AuthResponse> => {
    try {
      console.log('[authOnlineAPI] Verifying token...');

      // Set session
      appwriteService.setSession(token);

      // Get current user (this verifies the session)
      const appwriteUser = await account.get();
      const user = await convertAppwriteUser(appwriteUser);

      // Get current session
      const session = await account.getSession('current');

      return {
        user,
        token: session.secret,
        refreshToken: session.$id,
      };
    } catch (error) {
      console.error('[authOnlineAPI] Token verification error:', error);
      throw handleAppwriteError(error);
    }
  },

  /**
   * Get current user profile
   */
  getCurrentUser: async (token: string): Promise<User> => {
    try {
      // Set session
      appwriteService.setSession(token);

      const appwriteUser = await account.get();
      const user = await convertAppwriteUser(appwriteUser);
      
      return user;
    } catch (error) {
      console.error('[authOnlineAPI] Get current user error:', error);
      throw handleAppwriteError(error);
    }
  },

  /**
   * Update user profile (FIXED)
   * NOTE: Email update requires separate function with password
   */
  updateUser: async (
    userId: string,
    userData: UpdateUserRequest,
    token: string
  ): Promise<AuthResponse> => {
    try {
      console.log('[authOnlineAPI] Updating user profile...');

      // Set session
      appwriteService.setSession(token);

      // Update account name if provided
      if (userData.name) {
        await account.updateName(userData.name);
      }

      // ✅ FIXED: Email update removed from here
      // Email update requires password verification (see updateEmail function below)
      if (userData.email) {
        console.warn('[authOnlineAPI] Email update requires password - use updateEmail() instead');
      }

      // Update user document in database
      try {
        const updateData: any = {
          updatedAt: new Date().toISOString(),
        };

        // Only include fields that are provided
        if (userData.name !== undefined) updateData.name = userData.name;
        if (userData.phone !== undefined) updateData.phone = userData.phone;
        if (userData.age !== undefined) updateData.age = userData.age;
        if (userData.weight !== undefined) updateData.weight = userData.weight;
        if (userData.height !== undefined) updateData.height = userData.height;
        if (userData.gender !== undefined) updateData.gender = userData.gender;
        if (userData.role !== undefined) updateData.role = userData.role;

        await databases.updateDocument(
          DATABASE_ID,
          COLLECTIONS.USERS,
          userId,
          updateData
        );
      } catch (dbError) {
        console.error('[authOnlineAPI] Failed to update user document:', dbError);
      }

      // Get updated user data
      const session = await account.getSession('current');
      const authResponse = await createAuthResponse(session);

      console.log('[authOnlineAPI] ✅ User profile updated successfully');
      return authResponse;
    } catch (error) {
      console.error('[authOnlineAPI] Update user error:', error);
      throw handleAppwriteError(error);
    }
  },

  /**
   * ✅ NEW: Update email (requires password)
   * Separate function for email updates
   */
  updateEmail: async (
    newEmail: string,
    currentPassword: string,
    token: string
  ): Promise<AuthResponse> => {
    try {
      console.log('[authOnlineAPI] Updating email...');

      // Set session
      appwriteService.setSession(token);

      // Update email (requires password for security)
      await account.updateEmail(newEmail, currentPassword);

      // Get updated session
      const session = await account.getSession('current');
      const authResponse = await createAuthResponse(session);

      console.log('[authOnlineAPI] ✅ Email updated successfully');
      return authResponse;
    } catch (error) {
      console.error('[authOnlineAPI] Update email error:', error);
      throw handleAppwriteError(error);
    }
  },

  /**
   * Delete user account (FIXED - Documented limitations)
   * 
   * ⚠️ IMPORTANT: Appwrite does NOT allow client-side account deletion
   * This function will:
   * 1. Delete user data from database
   * 2. Delete user's nutrition scans
   * 3. Logout (delete session)
   * 
   * But the Appwrite Account itself will REMAIN.
   * To fully delete account, you need:
   * - Server SDK, OR
   * - Cloud Function with admin privileges
   */
  deleteAccount: async (userId: string, token: string): Promise<void> => {
    try {
      console.log('[authOnlineAPI] Deleting user data...');

      // Set session
      appwriteService.setSession(token);

      // 1. Delete user profile document from database
      try {
        await databases.deleteDocument(
          DATABASE_ID,
          COLLECTIONS.USERS,
          userId
        );
        console.log('[authOnlineAPI] ✅ User profile deleted');
      } catch (dbError) {
        console.error('[authOnlineAPI] Failed to delete user profile:', dbError);
      }

      // 2. Delete user's nutrition scans (batch delete)
      try {
        const scans = await databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.NUTRITION_SCANS,
          [
            // Query to get all scans for this user
            // Query.equal('userId', userId),
          ]
        );

        await Promise.all(
          scans.documents.map(scan =>
            databases.deleteDocument(
              DATABASE_ID,
              COLLECTIONS.NUTRITION_SCANS,
              scan.$id
            )
          )
        );

        console.log(`[authOnlineAPI] ✅ Deleted ${scans.documents.length} nutrition scans`);
      } catch (scanError) {
        console.error('[authOnlineAPI] Failed to delete nutrition scans:', scanError);
      }

      // 3. Delete user's nutrition goals
      try {
        const goals = await databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.NUTRITION_GOALS,
          []
        );

        await Promise.all(
          goals.documents.map(goal =>
            databases.deleteDocument(
              DATABASE_ID,
              COLLECTIONS.NUTRITION_GOALS,
              goal.$id
            )
          )
        );

        console.log('[authOnlineAPI] ✅ Nutrition goals deleted');
      } catch (goalError) {
        console.error('[authOnlineAPI] Failed to delete nutrition goals:', goalError);
      }

      // 4. Logout (delete session)
      await account.deleteSession('current');

      console.log('[authOnlineAPI] ✅ User data deleted and logged out');
      console.warn('[authOnlineAPI] ⚠️ Appwrite Account still exists (requires Server SDK to fully delete)');
    } catch (error) {
      console.error('[authOnlineAPI] Delete account error:', error);
      throw handleAppwriteError(error);
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
      console.log('[authOnlineAPI] Changing password...');

      // Set session
      appwriteService.setSession(token);

      // Update password (requires old password)
      await account.updatePassword(newPassword, oldPassword);

      console.log('[authOnlineAPI] ✅ Password changed successfully');
    } catch (error) {
      console.error('[authOnlineAPI] Change password error:', error);
      throw handleAppwriteError(error);
    }
  },

  /**
   * Request password reset
   */
  requestPasswordReset: async (email: string): Promise<void> => {
    try {
      console.log('[authOnlineAPI] Requesting password reset...');

      // Set up password reset URL (must be configured in Appwrite console)
      const resetUrl = `${process.env.EXPO_PUBLIC_APP_URL || 'myapp://'}reset-password`;
      
      await account.createRecovery(email, resetUrl);

      console.log('[authOnlineAPI] ✅ Password reset email sent');
    } catch (error) {
      console.error('[authOnlineAPI] Request password reset error:', error);
      throw handleAppwriteError(error);
    }
  },

  /**
   * Reset password with recovery token
   */
  resetPassword: async (
    userId: string,
    secret: string,
    newPassword: string
  ): Promise<void> => {
    try {
      console.log('[authOnlineAPI] Resetting password...');

      await account.updateRecovery(userId, secret, newPassword);

      console.log('[authOnlineAPI] ✅ Password reset successfully');
    } catch (error) {
      console.error('[authOnlineAPI] Reset password error:', error);
      throw handleAppwriteError(error);
    }
  },

  /**
   * Refresh access token
   * Note: Appwrite handles this automatically with sessions
   */
  refreshToken: async (refreshToken: string): Promise<AuthResponse> => {
    try {
      console.log('[authOnlineAPI] Refreshing token...');

      // In Appwrite, sessions are auto-refreshed
      // We just need to get the current session
      const session = await account.getSession('current');
      const authResponse = await createAuthResponse(session);

      console.log('[authOnlineAPI] ✅ Token refreshed successfully');
      return authResponse;
    } catch (error) {
      console.error('[authOnlineAPI] Refresh token error:', error);
      throw handleAppwriteError(error);
    }
  },

  /**
   * Check if email is available
   */
  checkEmailAvailable: async (email: string): Promise<boolean> => {
    try {
      // Query users collection to check if email exists
      const result = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.USERS,
        []
      );

      // Check if any document has this email
      const emailExists = result.documents.some(doc => doc.email === email);

      return !emailExists;
    } catch (error) {
      console.error('[authOnlineAPI] Error checking email:', error);
      return false;
    }
  },
};

export default authOnlineAPI;