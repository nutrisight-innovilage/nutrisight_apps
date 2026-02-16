/**
 * photoUploadService.ts (v2.1 FIXED)
 * ---------------------------------------------------------------------------
 * Service untuk upload foto ke Appwrite Storage.
 * Handles compression, validation, dan error handling.
 * 
 * FIXES:
 * ✅ TypeScript error fixed dengan type guards untuk FileInfo
 * ---------------------------------------------------------------------------
 */

import { 
  storage, 
  generateId, 
  BUCKETS, 
  handleAppwriteError 
} from '@/app/config/appwriteConfig';
import { ID } from 'appwrite';
import * as FileSystem from 'expo-file-system/legacy';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UploadPhotoResult {
  success: boolean;
  fileId?: string;
  fileUrl?: string;
  error?: string;
}

interface PhotoMetadata {
  size: number;
  mimeType: string;
  name: string;
}

// Type guard for FileInfo with size property
type FileInfoWithSize = {
  exists: true;
  uri: string;
  size: number;
  modificationTime: number;
  isDirectory: boolean;
};

function hasSize(fileInfo: FileSystem.FileInfo): fileInfo is FileInfoWithSize {
  return fileInfo.exists && 'size' in fileInfo;
}

function hasModificationTime(fileInfo: FileSystem.FileInfo): fileInfo is FileInfoWithSize {
  return fileInfo.exists && 'modificationTime' in fileInfo;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic'];
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'heic'];

// ---------------------------------------------------------------------------
// Photo Upload Service
// ---------------------------------------------------------------------------

export class PhotoUploadService {
  /**
   * Validate photo file
   */
  private static async validatePhoto(uri: string): Promise<{
    valid: boolean;
    error?: string;
    metadata?: PhotoMetadata;
  }> {
    try {
      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(uri);
      
      if (!fileInfo.exists) {
        return { valid: false, error: 'File does not exist' };
      }

      // Check size with type guard
      if (hasSize(fileInfo) && fileInfo.size > MAX_FILE_SIZE) {
        return { 
          valid: false, 
          error: `File too large (${(fileInfo.size / 1024 / 1024).toFixed(2)}MB). Max: 10MB` 
        };
      }

      // Get extension from URI
      const extension = uri.split('.').pop()?.toLowerCase();
      
      if (!extension || !ALLOWED_EXTENSIONS.includes(extension)) {
        return { 
          valid: false, 
          error: `Invalid file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}` 
        };
      }

      // Determine MIME type
      let mimeType = 'image/jpeg';
      if (extension === 'png') mimeType = 'image/png';
      else if (extension === 'heic') mimeType = 'image/heic';

      return {
        valid: true,
        metadata: {
          size: hasSize(fileInfo) ? fileInfo.size : 0,
          mimeType,
          name: `meal_${Date.now()}.${extension}`,
        },
      };
    } catch (error) {
      console.error('[PhotoUpload] Validation error:', error);
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : 'Validation failed' 
      };
    }
  }

  /**
   * Upload photo ke Appwrite Storage
   */
  static async uploadPhoto(
    photoUri: string, 
    userId: string
  ): Promise<UploadPhotoResult> {
    try {
      console.log('[PhotoUpload] Starting upload...', photoUri);

      // 1. Validate photo
      const validation = await this.validatePhoto(photoUri);
      
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error || 'Invalid photo',
        };
      }

      const metadata = validation.metadata!;

      // 2. Read file as blob
      const fileBlob = await this.readFileAsBlob(photoUri, metadata.mimeType);
      
      if (!fileBlob) {
        return {
          success: false,
          error: 'Failed to read photo file',
        };
      }

      // 3. Create File object
      const file = new File([fileBlob], metadata.name, { 
        type: metadata.mimeType 
      });

      // 4. Upload to Appwrite Storage
      const fileId = generateId();
      
      const uploadedFile = await storage.createFile(
        BUCKETS.MEAL_PHOTOS,
        fileId,
        file
      );

      console.log('[PhotoUpload] ✅ Upload successful:', uploadedFile.$id);

      // 5. Get file URL
      const fileUrl = this.getFileUrl(uploadedFile.$id);

      return {
        success: true,
        fileId: uploadedFile.$id,
        fileUrl,
      };
    } catch (error) {
      console.error('[PhotoUpload] Upload failed:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  /**
   * Read file sebagai Blob
   */
  private static async readFileAsBlob(
    uri: string, 
    mimeType: string
  ): Promise<Blob | null> {
    try {
      // React Native: Read as base64 then convert to Blob
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Convert base64 to Blob
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      
      const byteArray = new Uint8Array(byteNumbers);
      return new Blob([byteArray], { type: mimeType });
    } catch (error) {
      console.error('[PhotoUpload] Failed to read file as blob:', error);
      return null;
    }
  }

  /**
   * Get public file URL
   */
  private static getFileUrl(fileId: string): string {
    // Appwrite public file URL format
    const endpoint = storage.client.config.endpoint;
    const projectId = storage.client.config.project;
    
    return `${endpoint}/storage/buckets/${BUCKETS.MEAL_PHOTOS}/files/${fileId}/view?project=${projectId}`;
  }

  /**
   * Delete photo dari Storage
   */
  static async deletePhoto(fileId: string): Promise<boolean> {
    try {
      console.log('[PhotoUpload] Deleting photo...', fileId);

      await storage.deleteFile(BUCKETS.MEAL_PHOTOS, fileId);

      console.log('[PhotoUpload] ✅ Photo deleted');
      return true;
    } catch (error) {
      console.error('[PhotoUpload] Delete failed:', error);
      return false;
    }
  }

  /**
   * Save photo locally (untuk offline)
   */
  static async savePhotoLocally(
    sourceUri: string
  ): Promise<{ success: boolean; localUri?: string; error?: string }> {
    try {
      // Create local directory if not exists
      const localDir = `${FileSystem.documentDirectory}meal_photos/`;
      const dirInfo = await FileSystem.getInfoAsync(localDir);
      
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(localDir, { intermediates: true });
      }

      // Generate local filename
      const extension = sourceUri.split('.').pop()?.toLowerCase() || 'jpg';
      const localFilename = `meal_${Date.now()}.${extension}`;
      const localUri = `${localDir}${localFilename}`;

      // Copy file to local directory
      await FileSystem.copyAsync({
        from: sourceUri,
        to: localUri,
      });

      console.log('[PhotoUpload] ✅ Photo saved locally:', localUri);

      return {
        success: true,
        localUri,
      };
    } catch (error) {
      console.error('[PhotoUpload] Failed to save locally:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Save failed',
      };
    }
  }

  /**
   * Get local photos directory size
   */
  static async getLocalPhotosSize(): Promise<number> {
    try {
      const localDir = `${FileSystem.documentDirectory}meal_photos/`;
      const dirInfo = await FileSystem.getInfoAsync(localDir);
      
      if (!dirInfo.exists) {
        return 0;
      }

      const files = await FileSystem.readDirectoryAsync(localDir);
      let totalSize = 0;

      for (const file of files) {
        const fileInfo = await FileSystem.getInfoAsync(`${localDir}${file}`);
        // ✅ Type guard: check if file exists and has size property
        if (hasSize(fileInfo)) {
          totalSize += fileInfo.size || 0;
        }
      }

      return totalSize;
    } catch (error) {
      console.error('[PhotoUpload] Failed to get local size:', error);
      return 0;
    }
  }

  /**
   * Clean up old local photos
   */
  static async cleanupOldLocalPhotos(daysOld: number = 7): Promise<number> {
    try {
      const localDir = `${FileSystem.documentDirectory}meal_photos/`;
      const dirInfo = await FileSystem.getInfoAsync(localDir);
      
      if (!dirInfo.exists) {
        return 0;
      }

      const files = await FileSystem.readDirectoryAsync(localDir);
      const now = Date.now();
      const maxAge = daysOld * 24 * 60 * 60 * 1000;
      let deletedCount = 0;

      for (const file of files) {
        const filePath = `${localDir}${file}`;
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        
        // ✅ Type guard: check if file has modificationTime property
        if (hasModificationTime(fileInfo)) {
          const age = now - fileInfo.modificationTime * 1000;
          
          if (age > maxAge) {
            await FileSystem.deleteAsync(filePath);
            deletedCount++;
          }
        }
      }

      console.log(`[PhotoUpload] ✅ Cleaned up ${deletedCount} old photos`);
      return deletedCount;
    } catch (error) {
      console.error('[PhotoUpload] Cleanup failed:', error);
      return 0;
    }
  }
}

export default PhotoUploadService;