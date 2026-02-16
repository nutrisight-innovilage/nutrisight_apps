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

export interface DeleteOptions {
  keepAuth?: boolean;
  keepMenu?: boolean;
  keepCurrentMeal?: boolean;
  keepSettings?: boolean;
  syncDeletion?: boolean;
}

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
      categoriesCount: number;
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

// Update ExportPackage
export interface ExportPackage {
  exportDate: string;
  appVersion: string;
  user: {
    id: string;
    email: string;
    name: string;
  } | null;
  totalScans: number;
  storageUsed?: number; // Added
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