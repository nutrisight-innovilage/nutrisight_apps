// Service untuk Data Management
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { StorageStats, ExportData, ExportPackage } from '@/app/types/dataManagement';

// Import services untuk comprehensive export/delete
import authService from '@/app/services/auth/authService';
import menuService from '@/app/services/menu/menuService';
import mealService from '@/app/services/meal/mealService';

// Definisi semua storage keys yang ada di aplikasi
const STORAGE_KEYS = {
  // Storage Stats
  STORAGE_STATS: '@storage:stats',
  
  // Sync Queue
  SYNC_QUEUE: '@sync:queue',
  
  // Menu
  MENU_ITEMS: '@menu:items',
  MENU_DETAILS: '@menu:details',
  MENU_LAST_SYNC: '@menu:lastSync',
  MENU_CATEGORIES: '@menu:categories',
  
  // Nutrition Analysis - Current meal
  CART_ITEMS: '@nutrition_analysis:cart_items',
  RICE_PORTION: '@nutrition_analysis:rice_portion',
  MEAL_METADATA: '@nutrition_analysis:meal_metadata',
  
  // Nutrition Analysis - Pending queue
  PENDING_SCANS: '@nutrition_analysis:pending_scans',
  PENDING_PHOTOS: '@nutrition_analysis:pending_photos',
  PENDING_FEEDBACK: '@nutrition_analysis:pending_feedback',
  
  // Nutrition Analysis - Completed scans
  COMPLETED_SCANS: '@nutrition_analysis:completed_scans',
  SCANS_INDEX: '@nutrition_analysis:scans_index',
  
  // Nutrition Analysis - Local nutrition data
  FOOD_NUTRITION_DB: '@nutrition_analysis:food_nutrition_db',
  NUTRITION_GOALS_PREFIX: '@nutrition_analysis:goals_',
  THRESHOLDS_PREFIX: '@nutrition_analysis:thresholds_',
  
  // Nutrition Analysis - Sync status
  LAST_SYNC_TIME: '@nutrition_analysis:last_sync_time',
  SYNC_STATUS: '@nutrition_analysis:sync_status',
  
  // Auth
  AUTH_DATA: '@auth:data',
  USERS_DATA: '@auth:users',
  PASSWORDS: '@auth:passwords',
  PENDING_UPDATES: '@auth:pending_updates',
  
  // Notifications
  NOTIFICATION_PREFERENCES: '@notification_preferences',
} as const;

// Export options
export interface ExportOptions {
  includeAuth?: boolean;
  includeMenu?: boolean;
  includeMeals?: boolean;
  includeSettings?: boolean;
  includeSensitiveData?: boolean;
  format?: 'json' | 'csv';
  dateRange?: {
    start: string;
    end: string;
  };
}

// Delete options
export interface DeleteOptions {
  keepAuth?: boolean;
  keepMenu?: boolean;
  keepCurrentMeal?: boolean;
  keepSettings?: boolean;
  syncDeletion?: boolean;
}

// Comprehensive export package
export interface ComprehensiveExportPackage extends ExportPackage {
  storageUsed: number;
  breakdown: {
    auth: number;
    menu: number;
    meals: number;
    scans: number;
    settings: number;
  };
  services: {
    auth?: {
      user: any;
      pendingUpdates: number;
    };
    menu?: {
      itemsCount: number;
      detailsCount: number;
      lastSync: string | null;
    };
    meals?: {
      totalScans: number;
      unsyncedScans: number;
      currentCart: any[];
    };
    sync?: {
      pendingCount: number;
      status: any;
    };
  };
}

export class DataManagementService {
  /**
   * ✅ FIXED: Memuat statistik penyimpanan (dalam MB untuk UI)
   */
  static async loadStorageStats(): Promise<StorageStats | null> {
    try {
      const stats = await AsyncStorage.getItem(STORAGE_KEYS.STORAGE_STATS);
      if (stats) {
        return JSON.parse(stats);
      }
      return null;
    } catch (error) {
      console.error('Error loading storage stats:', error);
      return null;
    }
  }

  /**
   * ✅ FIXED: Menyimpan statistik (dalam MB untuk UI)
   */
  static async updateStorageStats(stats: StorageStats): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.STORAGE_STATS, JSON.stringify(stats));
    } catch (error) {
      console.error('Error updating storage stats:', error);
      throw error;
    }
  }

  /**
   * Menghitung ukuran storage yang digunakan secara real-time
   * Internal: gunakan KB, convert ke MB untuk stats
   */
  static async calculateActualStorageUsed(): Promise<{
    totalSize: number; // in KB
    breakdown: {
      auth: number;
      menu: number;
      nutrition: number;
      scans: number;
      cache: number;
      other: number;
    };
  }> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const allData = await AsyncStorage.multiGet(keys);
      
      let breakdown = {
        auth: 0,
        menu: 0,
        nutrition: 0,
        scans: 0,
        cache: 0,
        other: 0,
      };

      allData.forEach(([key, value]) => {
        const size = new Blob([value || '']).size / 1024; // KB
        
        if (key.startsWith('@auth:')) {
          breakdown.auth += size;
        } else if (key.startsWith('@menu:')) {
          breakdown.menu += size;
        } else if (key.startsWith('@nutrition_analysis:')) {
          if (key.includes('completed_scans') || key.includes('scans_index') || 
              key.includes('pending_scans') || key.includes('pending_photos')) {
            breakdown.scans += size;
          } else {
            breakdown.nutrition += size;
          }
        } else if (key.startsWith('cache_') || key.startsWith('@cache:')) {
          breakdown.cache += size;
        } else {
          breakdown.other += size;
        }
      });

      const totalSize = Object.values(breakdown).reduce((a, b) => a + b, 0);

      return { totalSize, breakdown };
    } catch (error) {
      console.error('Error calculating storage:', error);
      throw error;
    }
  }

  /**
   * ✅ FIXED: Menghapus cache (return void untuk UI compatibility)
   */
  static async clearCache(): Promise<void> {
    try {
      // Hapus cache dari AsyncStorage
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => 
        key.startsWith('cache_') || 
        key.startsWith('@cache:') ||
        key === STORAGE_KEYS.SYNC_QUEUE
      );
      
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
      }

      // Hapus file cache dari file system
      if (FileSystem.cacheDirectory) {
        try {
          const cacheFiles = await FileSystem.readDirectoryAsync(FileSystem.cacheDirectory);
          
          for (const file of cacheFiles) {
            await FileSystem.deleteAsync(
              `${FileSystem.cacheDirectory}${file}`, 
              { idempotent: true }
            );
          }
        } catch (fsError) {
          console.log('No cache files to delete:', fsError);
        }
      }

      console.log('[DataManagement] Cache cleared successfully');
    } catch (error) {
      console.error('Error clearing cache:', error);
      throw error;
    }
  }

  /**
   * ✅ FIXED: Menghapus semua riwayat pemindaian (return void untuk UI compatibility)
   */
  static async clearHistory(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const historyKeys = keys.filter(key => 
        key === STORAGE_KEYS.COMPLETED_SCANS ||
        key === STORAGE_KEYS.SCANS_INDEX ||
        key === STORAGE_KEYS.PENDING_SCANS ||
        key === STORAGE_KEYS.PENDING_PHOTOS ||
        key === STORAGE_KEYS.PENDING_FEEDBACK ||
        key.startsWith('scan_') || 
        key.startsWith('history_') ||
        key.startsWith('result_')
      );
      
      if (historyKeys.length > 0) {
        await AsyncStorage.multiRemove(historyKeys);
      }

      // Hapus foto-foto scan
      if (FileSystem.documentDirectory) {
        try {
          const files = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory);
          const scanFiles = files.filter(file => 
            file.includes('scan_') || 
            file.includes('photo_') ||
            file.match(/\.(jpg|jpeg|png)$/i)
          );
          
          for (const file of scanFiles) {
            await FileSystem.deleteAsync(
              `${FileSystem.documentDirectory}${file}`, 
              { idempotent: true }
            );
          }
        } catch (fsError) {
          console.log('No scan files to delete:', fsError);
        }
      }

      console.log('[DataManagement] History cleared successfully');
    } catch (error) {
      console.error('Error clearing history:', error);
      throw error;
    }
  }

  /**
   * ✅ NEW: Update storage stats setelah clear cache
   * Compatible dengan UI yang ada
   */
  static updateStatsAfterClearCache(currentStats: StorageStats): StorageStats {
    // Estimasi: cache biasanya 10-20 MB
    const estimatedCacheSize = 15; // MB
    
    return {
      ...currentStats,
      storageUsed: Math.max(0, currentStats.storageUsed - estimatedCacheSize),
    };
  }

  /**
   * ✅ NEW: Reset storage stats setelah clear history
   * Compatible dengan UI yang ada
   */
  static resetStatsAfterClearHistory(currentStats: StorageStats): StorageStats {
    // Hapus scan count dan reset images (karena scan images dihapus)
    return {
      ...currentStats,
      totalScans: 0,
      images: 0,
      storageUsed: Math.max(0, currentStats.storageUsed - currentStats.images),
    };
  }

  /**
   * Menghapus data meal saat ini (cart)
   */
  static async clearCurrentMeal(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.CART_ITEMS,
        STORAGE_KEYS.RICE_PORTION,
        STORAGE_KEYS.MEAL_METADATA,
      ]);
      
      console.log('Current meal cleared');
    } catch (error) {
      console.error('Error clearing current meal:', error);
      throw error;
    }
  }

  /**
   * ✅ IMPROVED: Export data (default simple export untuk UI)
   * Signature tetap sama untuk backward compatibility
   */
  static async exportData(
    stats: StorageStats,
    user: any,
    options?: ExportOptions
  ): Promise<string> {
    try {
      // Default simple export jika options tidak diberikan
      const exportOptions: ExportOptions = options || {
        includeAuth: true,
        includeMenu: false,
        includeMeals: true,
        includeSettings: true,
        includeSensitiveData: false,
      };

      console.log('[DataManagement] Starting export...');

      // Get all storage data
      const keys = await AsyncStorage.getAllKeys();
      const allData = await AsyncStorage.multiGet(keys);
      
      // Filter based on options
      const exportData: ExportData = {};
      allData.forEach(([key, value]) => {
        // Skip sensitive data
        if (!exportOptions.includeSensitiveData && key === STORAGE_KEYS.PASSWORDS) {
          return;
        }

        // Filter by category
        if (!exportOptions.includeAuth && key.startsWith('@auth:')) return;
        if (!exportOptions.includeMenu && key.startsWith('@menu:')) return;
        if (!exportOptions.includeMeals && key.startsWith('@nutrition_analysis:')) return;
        if (!exportOptions.includeSettings && key === STORAGE_KEYS.NOTIFICATION_PREFERENCES) return;
        
        try {
          exportData[key] = JSON.parse(value || '{}');
        } catch {
          exportData[key] = value;
        }
      });

      // Create export package (simple version untuk UI)
      const exportPackage: ExportPackage = {
        exportDate: new Date().toISOString(),
        appVersion: '1.0.0',
        user: user ? {
          id: user.id,
          email: user.email,
          name: user.name,
        } : null,
        totalScans: stats.totalScans,
        storageUsed: stats.storageUsed, // Already in MB from stats
        data: exportData,
      };

      // Save to file
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const fileName = `nutritionix_data_${timestamp}.json`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      
      await FileSystem.writeAsStringAsync(
        fileUri,
        JSON.stringify(exportPackage, null, 2),
        { encoding: FileSystem.EncodingType.UTF8 }
      );

      console.log('[DataManagement] ✅ Export completed:', fileUri);
      
      return fileUri;
    } catch (error) {
      console.error('[DataManagement] Export failed:', error);
      throw error;
    }
  }

  /**
   * ✅ NEW: Comprehensive export (untuk advanced usage)
   */
  static async exportDataComprehensive(
    stats: StorageStats,
    user: any,
    options: ExportOptions = {}
  ): Promise<string> {
    try {
      const {
        includeAuth = true,
        includeMenu = true,
        includeMeals = true,
        includeSettings = true,
        includeSensitiveData = false,
        dateRange,
      } = options;

      console.log('[DataManagement] Starting comprehensive export...');

      // Get all storage data
      const keys = await AsyncStorage.getAllKeys();
      const allData = await AsyncStorage.multiGet(keys);
      
      // Filter based on options
      const exportData: ExportData = {};
      allData.forEach(([key, value]) => {
        if (!includeSensitiveData && key === STORAGE_KEYS.PASSWORDS) {
          return;
        }

        if (!includeAuth && key.startsWith('@auth:')) return;
        if (!includeMenu && key.startsWith('@menu:')) return;
        if (!includeMeals && key.startsWith('@nutrition_analysis:')) return;
        if (!includeSettings && key === STORAGE_KEYS.NOTIFICATION_PREFERENCES) return;
        
        try {
          exportData[key] = JSON.parse(value || '{}');
        } catch {
          exportData[key] = value;
        }
      });

      // Get storage breakdown
      const { totalSize, breakdown } = await this.calculateActualStorageUsed();

      // Collect service-specific data
      const services: ComprehensiveExportPackage['services'] = {};

      if (includeAuth) {
        try {
          const authData = await authService.getCurrentUser();
          const pendingUpdates = await authService.getPendingUpdatesCount();
          services.auth = {
            user: authData?.user || null,
            pendingUpdates,
          };
        } catch (error) {
          console.warn('[DataManagement] Failed to get auth data:', error);
        }
      }

      if (includeMenu) {
        try {
          const cacheInfo = await menuService.getCacheInfo();
          services.menu = {
            itemsCount: cacheInfo.itemsCount || 0,
            detailsCount: cacheInfo.detailsCount || 0,
            lastSync: cacheInfo.lastSync || null,
          };
        } catch (error) {
          console.warn('[DataManagement] Failed to get menu data:', error);
        }
      }

      if (includeMeals) {
        try {
          const allScans = await mealService.getAllScans();
          const unsyncedCount = await mealService.getPendingCount();
          const cart = await mealService.getCart();
          
          let scansToExport = allScans;
          if (dateRange) {
            const startDate = new Date(dateRange.start);
            const endDate = new Date(dateRange.end);
            scansToExport = allScans.filter(scan => {
              const scanDate = new Date(scan.date);
              return scanDate >= startDate && scanDate <= endDate;
            });
          }
          
          services.meals = {
            totalScans: scansToExport.length,
            unsyncedScans: unsyncedCount,
            currentCart: cart,
          };

          if (scansToExport.length !== allScans.length) {
            exportData[STORAGE_KEYS.COMPLETED_SCANS] = scansToExport;
          }
        } catch (error) {
          console.warn('[DataManagement] Failed to get meal data:', error);
        }
      }

      // Create comprehensive export package
      const exportPackage: ComprehensiveExportPackage = {
        exportDate: new Date().toISOString(),
        appVersion: '1.0.0',
        user: user ? {
          id: user.id,
          email: user.email,
          name: user.name,
        } : null,
        totalScans: stats.totalScans,
        storageUsed: totalSize / 1024, // Convert KB to MB
        breakdown: {
          auth: breakdown.auth / 1024,
          menu: breakdown.menu / 1024,
          meals: breakdown.nutrition / 1024,
          scans: breakdown.scans / 1024,
          settings: breakdown.other / 1024,
        },
        data: exportData,
        services,
      };

      // Save to file
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `nutritionix_export_comprehensive_${timestamp}.json`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      
      await FileSystem.writeAsStringAsync(
        fileUri,
        JSON.stringify(exportPackage, null, 2),
        { encoding: FileSystem.EncodingType.UTF8 }
      );

      console.log('[DataManagement] ✅ Comprehensive export completed:', fileUri);
      
      return fileUri;
    } catch (error) {
      console.error('[DataManagement] Comprehensive export failed:', error);
      throw error;
    }
  }

  /**
   * Mengimpor data dari file JSON
   */
  static async importData(fileUri: string): Promise<boolean> {
    try {
      const content = await FileSystem.readAsStringAsync(fileUri);
      const importPackage: ExportPackage = JSON.parse(content);
      
      if (!importPackage.data || !importPackage.exportDate) {
        throw new Error('Invalid export file format');
      }

      // Restore data (exclude passwords)
      const dataEntries = Object.entries(importPackage.data).filter(
        ([key]) => key !== STORAGE_KEYS.PASSWORDS
      );
      
      for (const [key, value] of dataEntries) {
        await AsyncStorage.setItem(
          key, 
          typeof value === 'string' ? value : JSON.stringify(value)
        );
      }

      console.log('[DataManagement] ✅ Data imported successfully');
      return true;
    } catch (error) {
      console.error('[DataManagement] Import failed:', error);
      throw error;
    }
  }

  /**
   * Share file yang telah diekspor
   */
  static async shareExportedFile(fileUri: string): Promise<boolean> {
    try {
      const canShare = await Sharing.isAvailableAsync();
      
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Ekspor Data Nutritionix',
          UTI: 'public.json',
        });
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('[DataManagement] Sharing failed:', error);
      throw error;
    }
  }

  /**
   * ✅ FIXED: Delete all user data
   * Uses authService.deleteAccount() untuk proper deletion with sync
   */
  static async deleteAllUserData(): Promise<void> {
    try {
      console.log('[DataManagement] Starting data deletion...');

      // ✅ FIXED: Use authService.deleteAccount() untuk notify server
      try {
        const authData = await authService.getCurrentUser();
        if (authData) {
          // This will queue deletion via SyncManager automatically
          await authService.deleteAccount(authData.user.id, authData.token);
          console.log('[DataManagement] ✅ Account deletion queued via authService');
        }
      } catch (authError) {
        console.warn('[DataManagement] Failed to delete account via authService:', authError);
      }

      // Clear via services
      try {
        await menuService.clearAllCache();
        console.log('[DataManagement] ✅ Menu cache cleared');
      } catch (error) {
        console.warn('[DataManagement] Failed to clear menu cache:', error);
      }

      try {
        await mealService.clearAllData();
        console.log('[DataManagement] ✅ Meal data cleared');
      } catch (error) {
        console.warn('[DataManagement] Failed to clear meal data:', error);
      }

      // Clear all AsyncStorage
      const allKeys = await AsyncStorage.getAllKeys();
      await AsyncStorage.multiRemove(allKeys);

      // Clear file system
      if (FileSystem.documentDirectory) {
        try {
          const files = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory);
          for (const file of files) {
            await FileSystem.deleteAsync(
              `${FileSystem.documentDirectory}${file}`, 
              { idempotent: true }
            );
          }
        } catch (fsError) {
          console.log('[DataManagement] No document files to delete:', fsError);
        }
      }

      if (FileSystem.cacheDirectory) {
        try {
          const cacheFiles = await FileSystem.readDirectoryAsync(FileSystem.cacheDirectory);
          for (const file of cacheFiles) {
            await FileSystem.deleteAsync(
              `${FileSystem.cacheDirectory}${file}`, 
              { idempotent: true }
            );
          }
        } catch (fsError) {
          console.log('[DataManagement] No cache files to delete:', fsError);
        }
      }

      console.log('[DataManagement] ✅ All user data deleted');
    } catch (error) {
      console.error('[DataManagement] Deletion failed:', error);
      throw error;
    }
  }

  /**
   * ✅ NEW: Delete with options (untuk advanced usage)
   */
  static async deleteUserDataWithOptions(options: DeleteOptions = {}): Promise<{
    success: boolean;
    deletedSize: number;
    message: string;
  }> {
    try {
      const {
        keepAuth = false,
        keepMenu = false,
        keepCurrentMeal = false,
        keepSettings = false,
        syncDeletion = true,
      } = options;

      console.log('[DataManagement] Starting selective deletion...');
      
      // Calculate current storage
      const { totalSize: beforeSize } = await this.calculateActualStorageUsed();

      // Backup data to keep
      const backups: Array<[string, string]> = [];
      
      if (keepAuth) {
        const authKeys = [STORAGE_KEYS.AUTH_DATA, STORAGE_KEYS.USERS_DATA];
        const authData = await AsyncStorage.multiGet(authKeys);
        backups.push(...authData.filter(([, v]) => v !== null) as Array<[string, string]>);
      }

      if (keepMenu) {
        const menuKeys = [
          STORAGE_KEYS.MENU_ITEMS,
          STORAGE_KEYS.MENU_DETAILS,
          STORAGE_KEYS.MENU_CATEGORIES,
          STORAGE_KEYS.MENU_LAST_SYNC,
        ];
        const menuData = await AsyncStorage.multiGet(menuKeys);
        backups.push(...menuData.filter(([, v]) => v !== null) as Array<[string, string]>);
      }

      if (keepCurrentMeal) {
        const mealKeys = [
          STORAGE_KEYS.CART_ITEMS,
          STORAGE_KEYS.RICE_PORTION,
          STORAGE_KEYS.MEAL_METADATA,
        ];
        const mealData = await AsyncStorage.multiGet(mealKeys);
        backups.push(...mealData.filter(([, v]) => v !== null) as Array<[string, string]>);
      }

      if (keepSettings) {
        const settingsData = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATION_PREFERENCES);
        if (settingsData) {
          backups.push([STORAGE_KEYS.NOTIFICATION_PREFERENCES, settingsData]);
        }
      }

      // ✅ FIXED: Use authService.deleteAccount() if sync enabled
      if (syncDeletion && !keepAuth) {
        try {
          const authData = await authService.getCurrentUser();
          if (authData) {
            await authService.deleteAccount(authData.user.id, authData.token);
            console.log('[DataManagement] ✅ Account deletion queued via authService');
          }
        } catch (authError) {
          console.warn('[DataManagement] Failed to delete account via authService:', authError);
        }
      }

      // Clear via services
      if (!keepAuth) {
        try {
          await authService.clearAllData();
        } catch (error) {
          console.warn('[DataManagement] Failed to clear auth data:', error);
        }
      }
      
      if (!keepMenu) {
        try {
          await menuService.clearAllCache();
        } catch (error) {
          console.warn('[DataManagement] Failed to clear menu cache:', error);
        }
      }
      
      if (!keepCurrentMeal) {
        try {
          await mealService.clearAllData();
        } catch (error) {
          console.warn('[DataManagement] Failed to clear meal data:', error);
        }
      }

      // Clear all AsyncStorage
      const allKeys = await AsyncStorage.getAllKeys();
      await AsyncStorage.multiRemove(allKeys);

      // Clear file system
      if (FileSystem.documentDirectory) {
        try {
          const files = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory);
          for (const file of files) {
            await FileSystem.deleteAsync(`${FileSystem.documentDirectory}${file}`, { idempotent: true });
          }
        } catch (fsError) {
          console.log('[DataManagement] No document files to delete:', fsError);
        }
      }

      if (FileSystem.cacheDirectory) {
        try {
          const cacheFiles = await FileSystem.readDirectoryAsync(FileSystem.cacheDirectory);
          for (const file of cacheFiles) {
            await FileSystem.deleteAsync(`${FileSystem.cacheDirectory}${file}`, { idempotent: true });
          }
        } catch (fsError) {
          console.log('[DataManagement] No cache files to delete:', fsError);
        }
      }

      // Restore backed up data
      if (backups.length > 0) {
        await AsyncStorage.multiSet(backups);
      }

      // Calculate deleted size
      const { totalSize: afterSize } = await this.calculateActualStorageUsed();
      const deletedSize = (beforeSize - afterSize) / 1024; // Convert to MB

      return {
        success: true,
        deletedSize,
        message: `Successfully deleted ${deletedSize.toFixed(2)} MB of data`,
      };
    } catch (error) {
      console.error('[DataManagement] Deletion failed:', error);
      return {
        success: false,
        deletedSize: 0,
        message: error instanceof Error ? error.message : 'Deletion failed',
      };
    }
  }

  /**
   * Menghitung persentase penyimpanan yang digunakan
   */
  static calculateStoragePercentage(storageUsed: number, totalStorage: number): number {
    if (totalStorage <= 0) return 0;
    return Math.min(100, (storageUsed / totalStorage) * 100);
  }

  /**
   * Format ukuran storage ke format yang mudah dibaca
   */
  static formatStorageSize(sizeInKB: number): string {
    if (sizeInKB < 1024) {
      return `${sizeInKB.toFixed(2)} KB`;
    } else if (sizeInKB < 1024 * 1024) {
      return `${(sizeInKB / 1024).toFixed(2)} MB`;
    } else {
      return `${(sizeInKB / (1024 * 1024)).toFixed(2)} GB`;
    }
  }

  /**
   * ✅ FIXED: Mendapatkan storage stats default (dalam MB untuk UI)
   */
  static getDefaultStorageStats(): StorageStats {
    return {
      totalScans: 0,
      storageUsed: 0, // MB
      totalStorage: 500, // MB
      images: 0, // MB
      data: 0, // MB
    };
  }

  /**
   * ✅ FIXED: Update storage stats setelah operasi clear (dalam MB)
   */
  static async refreshStorageStats(): Promise<StorageStats> {
    try {
      const { totalSize, breakdown } = await this.calculateActualStorageUsed();
      
      let totalScans = 0;
      try {
        const completedScans = await AsyncStorage.getItem(STORAGE_KEYS.COMPLETED_SCANS);
        if (completedScans) {
          const scans = JSON.parse(completedScans);
          totalScans = Array.isArray(scans) ? scans.length : 0;
        }
      } catch {
        totalScans = 0;
      }

      // Convert KB to MB for UI
      const stats: StorageStats = {
        totalScans,
        storageUsed: parseFloat((totalSize / 1024).toFixed(1)), // KB to MB, 1 decimal
        totalStorage: 500, // MB
        images: parseFloat((breakdown.scans / 1024).toFixed(1)), // KB to MB
        data: parseFloat(((breakdown.nutrition + breakdown.menu + breakdown.other) / 1024).toFixed(1)), // KB to MB
      };

      await this.updateStorageStats(stats);
      return stats;
    } catch (error) {
      console.error('[DataManagement] Failed to refresh stats:', error);
      return this.getDefaultStorageStats();
    }
  }

  /**
   * Cek apakah storage hampir penuh (>80%)
   */
  static isStorageAlmostFull(stats: StorageStats): boolean {
    return this.calculateStoragePercentage(stats.storageUsed, stats.totalStorage) > 80;
  }

  /**
   * Mendapatkan rekomendasi untuk membersihkan storage
   */
  static getStorageRecommendations(stats: StorageStats): string[] {
    const recommendations: string[] = [];
    const percentage = this.calculateStoragePercentage(stats.storageUsed, stats.totalStorage);

    if (percentage > 90) {
      recommendations.push('Storage hampir penuh! Segera hapus data yang tidak diperlukan.');
    } else if (percentage > 80) {
      recommendations.push('Storage mulai penuh. Pertimbangkan untuk menghapus cache atau riwayat lama.');
    }

    if (stats.images > stats.data * 2) {
      recommendations.push('Gambar menggunakan lebih banyak ruang. Hapus riwayat scan untuk menghemat storage.');
    }

    if (stats.totalScans > 100) {
      recommendations.push('Anda memiliki banyak riwayat scan. Ekspor dan hapus data lama jika diperlukan.');
    }

    return recommendations;
  }

  /**
   * Get detailed breakdown by service (dalam MB)
   */
  static async getDetailedBreakdown(): Promise<{
    total: number;
    byService: {
      auth: { size: number; percentage: number };
      menu: { size: number; percentage: number };
      meals: { size: number; percentage: number };
      scans: { size: number; percentage: number };
      cache: { size: number; percentage: number };
      other: { size: number; percentage: number };
    };
  }> {
    const { totalSize, breakdown } = await this.calculateActualStorageUsed();
    
    // Convert KB to MB
    const totalMB = totalSize / 1024;
    
    return {
      total: parseFloat(totalMB.toFixed(2)),
      byService: {
        auth: {
          size: parseFloat((breakdown.auth / 1024).toFixed(2)),
          percentage: parseFloat(((breakdown.auth / totalSize) * 100).toFixed(1)),
        },
        menu: {
          size: parseFloat((breakdown.menu / 1024).toFixed(2)),
          percentage: parseFloat(((breakdown.menu / totalSize) * 100).toFixed(1)),
        },
        meals: {
          size: parseFloat((breakdown.nutrition / 1024).toFixed(2)),
          percentage: parseFloat(((breakdown.nutrition / totalSize) * 100).toFixed(1)),
        },
        scans: {
          size: parseFloat((breakdown.scans / 1024).toFixed(2)),
          percentage: parseFloat(((breakdown.scans / totalSize) * 100).toFixed(1)),
        },
        cache: {
          size: parseFloat((breakdown.cache / 1024).toFixed(2)),
          percentage: parseFloat(((breakdown.cache / totalSize) * 100).toFixed(1)),
        },
        other: {
          size: parseFloat((breakdown.other / 1024).toFixed(2)),
          percentage: parseFloat(((breakdown.other / totalSize) * 100).toFixed(1)),
        },
      },
    };
  }
}

export { STORAGE_KEYS };