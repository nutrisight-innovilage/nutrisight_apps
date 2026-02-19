/**
 * photoUploadService.ts (v2.5 FIXED - FormData upload untuk React Native)
 * ---------------------------------------------------------------------------
 * Service untuk upload foto ke Appwrite Storage.
 *
 * HISTORY OF FIXES:
 * ❌ v2.1 — new Blob([Uint8Array])       → "ArrayBuffer not supported"
 * ❌ v2.2 — fetch(uri).blob()            → "Cannot assign to property 'name'"
 * ❌ v2.3 — new Blob([uint8.buffer])     → "ArrayBuffer not supported"
 * ❌ v2.4 — Object.defineProperty hack   → "ArrayBuffer not supported" (sama)
 *
 * ✅ v2.5 — FormData + fetch langsung ke Appwrite REST API
 *    • React Native support FormData + fetch dengan file:// URI natively
 *    • Tidak perlu Blob/ArrayBuffer sama sekali
 *    • Bypass Appwrite SDK storage.createFile() yang butuh File object
 * ---------------------------------------------------------------------------
 */

import * as FileSystem from 'expo-file-system/legacy';
import {
  BUCKETS,
  DATABASE_ID,
} from '@/app/config/appwriteConfig';
import EnvConfig from '@/app/utils/env';

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

// Type guard for FileInfo with size/modificationTime
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
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'heic'];

const APPWRITE_ENDPOINT = EnvConfig.appwrite.endpoint;
const APPWRITE_PROJECT_ID = EnvConfig.appwrite.projectId;

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
      const fileInfo = await FileSystem.getInfoAsync(uri);

      if (!fileInfo.exists) {
        return { valid: false, error: 'File does not exist' };
      }

      if (hasSize(fileInfo) && fileInfo.size > MAX_FILE_SIZE) {
        return {
          valid: false,
          error: `File too large (${(fileInfo.size / 1024 / 1024).toFixed(2)}MB). Max: 10MB`,
        };
      }

      const extension = uri.split('.').pop()?.toLowerCase();

      if (!extension || !ALLOWED_EXTENSIONS.includes(extension)) {
        return {
          valid: false,
          error: `Invalid file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`,
        };
      }

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
        error: error instanceof Error ? error.message : 'Validation failed',
      };
    }
  }

  /**
   * Generate unique ID (Appwrite style)
   */
  private static generateFileId(): string {
    // Appwrite ID format: alphanumeric, max 36 chars
    return `${Date.now().toString(36)}${Math.random().toString(36).substring(2, 10)}`.substring(0, 36);
  }

  /**
   * ✅ FIXED v2.5: Upload via FormData + fetch (React Native native support)
   *
   * Kenapa FormData bukan Appwrite SDK storage.createFile()?
   *
   * React Native Blob limitations:
   *   new Blob([ArrayBuffer])  → ❌ "ArrayBuffer not supported"
   *   new Blob([Uint8Array])   → ❌ "ArrayBufferView not supported"
   *   fetch(uri).blob()        → native Blob (read-only, can't wrap in File)
   *   new File([nativeBlob])   → ❌ "Cannot assign to property 'name'"
   *
   * FormData solution:
   *   FormData.append('file', { uri, name, type })  → ✅ React Native handle ini natively
   *   fetch() dengan FormData  → ✅ langsung ke Appwrite REST API
   *   Tidak perlu Blob/File/ArrayBuffer sama sekali
   */
  private static async uploadViaFormData(
    uri: string,
    fileId: string,
    metadata: PhotoMetadata,
    token?: string
  ): Promise<{ fileId: string; fileUrl: string }> {
    const uploadUrl = `${APPWRITE_ENDPOINT}/storage/buckets/${BUCKETS.MEAL_PHOTOS}/files`;

    // ✅ React Native FormData accept { uri, name, type } object langsung
    const formData = new FormData();
    formData.append('fileId', fileId);
    formData.append('file', {
      uri,
      name: metadata.name,
      type: metadata.mimeType,
    } as any); // 'as any' karena TypeScript tidak tau RN FormData extension ini

    const headers: Record<string, string> = {
      'X-Appwrite-Project': APPWRITE_PROJECT_ID,
      'Content-Type': 'multipart/form-data',
    };

    // Attach token jika ada (untuk authenticated bucket)
    if (token) {
      headers['X-Appwrite-JWT'] = token;
    }

    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(
        errorBody?.message || `Upload failed with status ${response.status}`
      );
    }

    const result = await response.json();

    const fileUrl = `${APPWRITE_ENDPOINT}/storage/buckets/${BUCKETS.MEAL_PHOTOS}/files/${result.$id}/view?project=${APPWRITE_PROJECT_ID}`;

    return {
      fileId: result.$id,
      fileUrl,
    };
  }

  /**
   * Upload photo ke Appwrite Storage
   */
  static async uploadPhoto(
    photoUri: string,
    userId: string,
    token?: string
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
      const fileId = this.generateFileId();

      // 2. Upload via FormData (React Native compatible)
      const { fileId: uploadedId, fileUrl } = await this.uploadViaFormData(
        photoUri,
        fileId,
        metadata,
        token
      );

      console.log('[PhotoUpload] ✅ Upload successful:', uploadedId);

      return {
        success: true,
        fileId: uploadedId,
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
   * Delete photo dari Storage
   */
  static async deletePhoto(fileId: string, token?: string): Promise<boolean> {
    try {
      console.log('[PhotoUpload] Deleting photo...', fileId);

      const url = `${APPWRITE_ENDPOINT}/storage/buckets/${BUCKETS.MEAL_PHOTOS}/files/${fileId}`;

      const headers: Record<string, string> = {
        'X-Appwrite-Project': APPWRITE_PROJECT_ID,
      };

      if (token) {
        headers['X-Appwrite-JWT'] = token;
      }

      const response = await fetch(url, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Delete failed with status ${response.status}`);
      }

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
      const localDir = `${FileSystem.documentDirectory}meal_photos/`;
      const dirInfo = await FileSystem.getInfoAsync(localDir);

      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(localDir, { intermediates: true });
      }

      const extension = sourceUri.split('.').pop()?.toLowerCase() || 'jpg';
      const localFilename = `meal_${Date.now()}.${extension}`;
      const localUri = `${localDir}${localFilename}`;

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

      if (!dirInfo.exists) return 0;

      const files = await FileSystem.readDirectoryAsync(localDir);
      let totalSize = 0;

      for (const file of files) {
        const fileInfo = await FileSystem.getInfoAsync(`${localDir}${file}`);
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

      if (!dirInfo.exists) return 0;

      const files = await FileSystem.readDirectoryAsync(localDir);
      const now = Date.now();
      const maxAge = daysOld * 24 * 60 * 60 * 1000;
      let deletedCount = 0;

      for (const file of files) {
        const filePath = `${localDir}${file}`;
        const fileInfo = await FileSystem.getInfoAsync(filePath);

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