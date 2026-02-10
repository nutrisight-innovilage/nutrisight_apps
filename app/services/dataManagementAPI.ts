// Service untuk Data Management
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { StorageStats, ExportData, ExportPackage } from '@/app/types/dataManagement';

export class DataManagementService {
  /**
   * Memuat statistik penyimpanan dari AsyncStorage
   */
  static async loadStorageStats(): Promise<StorageStats | null> {
    try {
      const stats = await AsyncStorage.getItem('storageStats');
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
   * Menyimpan/update statistik penyimpanan ke AsyncStorage
   */
  static async updateStorageStats(stats: StorageStats): Promise<void> {
    try {
      await AsyncStorage.setItem('storageStats', JSON.stringify(stats));
    } catch (error) {
      console.error('Error updating storage stats:', error);
      throw error;
    }
  }

  /**
   * Menghapus cache dari AsyncStorage dan file system
   */
  static async clearCache(): Promise<void> {
    try {
      // Hapus cache dari AsyncStorage
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('cache_'));
      
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

      console.log('Cache cleared successfully');
    } catch (error) {
      console.error('Error clearing cache:', error);
      throw error;
    }
  }

  /**
   * Menghapus semua riwayat pemindaian dari AsyncStorage
   */
  static async clearHistory(): Promise<void> {
    try {
      // Hapus semua data riwayat dari AsyncStorage
      const keys = await AsyncStorage.getAllKeys();
      const historyKeys = keys.filter(key => 
        key.startsWith('scan_') || 
        key.startsWith('history_') ||
        key.startsWith('result_')
      );
      
      if (historyKeys.length > 0) {
        await AsyncStorage.multiRemove(historyKeys);
      }

      console.log('History cleared successfully');
    } catch (error) {
      console.error('Error clearing history:', error);
      throw error;
    }
  }

  /**
   * Mengekspor semua data user ke file JSON
   * @returns URI file yang telah dibuat
   */
  static async exportData(stats: StorageStats, user: any): Promise<string> {
    try {
      // Ambil semua data dari AsyncStorage
      const keys = await AsyncStorage.getAllKeys();
      const allData = await AsyncStorage.multiGet(keys);
      
      // Format data ke JSON
      const exportData: ExportData = {};
      allData.forEach(([key, value]) => {
        try {
          exportData[key] = JSON.parse(value || '{}');
        } catch {
          exportData[key] = value;
        }
      });

      // Tambahkan metadata
      const exportPackage: ExportPackage = {
        exportDate: new Date().toISOString(),
        appVersion: '1.0.0',
        user: user ? {
          id: user.id,
          email: user.email,
          name: user.name,
        } : null,
        totalScans: stats.totalScans,
        data: exportData,
      };

      // Simpan ke file
      const fileName = `data_export_${Date.now()}.json`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      
      await FileSystem.writeAsStringAsync(
        fileUri,
        JSON.stringify(exportPackage, null, 2),
        { encoding: FileSystem.EncodingType.UTF8 }
      );

      console.log('Data exported to:', fileUri);
      return fileUri;
    } catch (error) {
      console.error('Error exporting data:', error);
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
          dialogTitle: 'Ekspor Data',
          UTI: 'public.json',
        });
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error sharing file:', error);
      throw error;
    }
  }

  /**
   * Menghapus semua data user dari file system
   */
  static async deleteAllUserData(): Promise<void> {
    try {
      // Hapus semua file dari document directory
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
          console.log('No document files to delete:', fsError);
        }
      }

      // Hapus semua file dari cache directory
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

      console.log('All user data deleted successfully');
    } catch (error) {
      console.error('Error deleting user data:', error);
      throw error;
    }
  }

  /**
   * Menghitung persentase penyimpanan yang digunakan
   */
  static calculateStoragePercentage(storageUsed: number, totalStorage: number): number {
    return (storageUsed / totalStorage) * 100;
  }

  /**
   * Mendapatkan storage stats default
   */
  static getDefaultStorageStats(): StorageStats {
    return {
      totalScans: 0,
      storageUsed: 0,
      totalStorage: 500,
      images: 0,
      data: 0,
    };
  }

  /**
   * Update storage stats setelah clear cache
   */
  static updateStatsAfterClearCache(currentStats: StorageStats, cacheSize: number = 20): StorageStats {
    return {
      ...currentStats,
      storageUsed: Math.max(0, currentStats.storageUsed - cacheSize),
    };
  }

  /**
   * Reset storage stats setelah clear history
   */
  static resetStatsAfterClearHistory(currentStats: StorageStats): StorageStats {
    return {
      ...currentStats,
      totalScans: 0,
      storageUsed: 0,
      images: 0,
      data: 0,
    };
  }
}