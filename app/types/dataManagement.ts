// Types untuk Data Management

export interface StorageStats {
  totalScans: number;
  storageUsed: number; // in MB
  totalStorage: number; // in MB
  images: number; // in MB
  data: number; // in MB
}

export interface ExportData {
  [key: string]: any;
}

export interface ExportPackage {
  exportDate: string;
  appVersion: string;
  user: {
    id: string;
    email: string;
    name: string;
  } | null;
  totalScans: number;
  data: ExportData;
}

export interface DataManagementService {
  loadStorageStats: () => Promise<StorageStats | null>;
  updateStorageStats: (stats: StorageStats) => Promise<void>;
  clearCache: () => Promise<void>;
  clearHistory: () => Promise<void>;
  exportData: (stats: StorageStats, user: any) => Promise<string>;
  deleteAllUserData: () => Promise<void>;
}