import { NutritionScan } from '@/app/types/nutrition';

// Mock API Base URL - ganti dengan URL API yang sebenarnya
const API_BASE_URL = 'https://api.example.com/nutrition';

/**
 * API Service untuk mengelola data nutrisi
 * Semua fungsi ini dapat dengan mudah diintegrasikan dengan backend API
 */

export class NutritionAPI {
  /**
   * Mendapatkan semua scan nutrisi
   */
  static async getAllScans(): Promise<NutritionScan[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/scans`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // Tambahkan authorization header jika diperlukan
          // 'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch scans');
      }

      const data = await response.json();
      return data.scans || [];
    } catch (error) {
      console.error('Error fetching scans:', error);
      throw error;
    }
  }

  /**
   * Mendapatkan scan berdasarkan ID
   */
  static async getScanById(id: string): Promise<NutritionScan | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/scans/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch scan');
      }

      const data = await response.json();
      return data.scan || null;
    } catch (error) {
      console.error('Error fetching scan:', error);
      throw error;
    }
  }

  /**
   * Menambahkan scan baru
   */
  static async createScan(scanData: Omit<NutritionScan, 'id'>): Promise<NutritionScan> {
    try {
      const response = await fetch(`${API_BASE_URL}/scans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(scanData),
      });

      if (!response.ok) {
        throw new Error('Failed to create scan');
      }

      const data = await response.json();
      return data.scan;
    } catch (error) {
      console.error('Error creating scan:', error);
      throw error;
    }
  }

  /**
   * Mengupdate scan yang sudah ada
   */
  static async updateScan(id: string, scanData: Partial<NutritionScan>): Promise<NutritionScan> {
    try {
      const response = await fetch(`${API_BASE_URL}/scans/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(scanData),
      });

      if (!response.ok) {
        throw new Error('Failed to update scan');
      }

      const data = await response.json();
      return data.scan;
    } catch (error) {
      console.error('Error updating scan:', error);
      throw error;
    }
  }

  /**
   * Menghapus scan
   */
  static async deleteScan(id: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/scans/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete scan');
      }
    } catch (error) {
      console.error('Error deleting scan:', error);
      throw error;
    }
  }

  /**
   * Mendapatkan scan dalam rentang tanggal tertentu
   */
  static async getScansByDateRange(startDate: string, endDate: string): Promise<NutritionScan[]> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/scans?startDate=${startDate}&endDate=${endDate}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch scans by date range');
      }

      const data = await response.json();
      return data.scans || [];
    } catch (error) {
      console.error('Error fetching scans by date range:', error);
      throw error;
    }
  }

  /**
   * Upload gambar makanan untuk analisis AI
   */
  static async analyzeFoodImage(imageUri: string): Promise<Omit<NutritionScan, 'id' | 'date' | 'time'>> {
    try {
      const formData = new FormData();
      formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'food.jpg',
      } as any);

      const response = await fetch(`${API_BASE_URL}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to analyze food image');
      }

      const data = await response.json();
      return data.analysis;
    } catch (error) {
      console.error('Error analyzing food image:', error);
      throw error;
    }
  }
}

/**
 * Mock data untuk development/testing
 * Hapus atau komentari ketika sudah terintegrasi dengan backend
 */
export const mockScans: NutritionScan[] = [
  {
    id: '1',
    foodName: 'Grilled Chicken Salad',
    date: 'Jan 13, 2026',
    time: '12:30 PM',
    calories: 350,
    protein: 35,
    carbs: 15,
    fats: 18
  },
  {
    id: '2',
    foodName: 'Oatmeal with Berries',
    date: 'Jan 13, 2026',
    time: '8:00 AM',
    calories: 280,
    protein: 8,
    carbs: 45,
    fats: 6
  },
  {
    id: '3',
    foodName: 'Salmon with Rice',
    date: 'Jan 12, 2026',
    time: '7:00 PM',
    calories: 520,
    protein: 42,
    carbs: 58,
    fats: 16
  },
  {
    id: '4',
    foodName: 'Pasta Carbonara',
    date: 'Jan 11, 2026',
    time: '6:30 PM',
    calories: 650,
    protein: 28,
    carbs: 72,
    fats: 28
  },
  {
    id: '5',
    foodName: 'Avocado Toast',
    date: 'Jan 11, 2026',
    time: '9:00 AM',
    calories: 320,
    protein: 12,
    carbs: 35,
    fats: 16
  },
  {
    id: '6',
    foodName: 'Grilled Fish with Vegetables',
    date: 'Jan 10, 2026',
    time: '1:00 PM',
    calories: 380,
    protein: 38,
    carbs: 22,
    fats: 15
  },
  {
    id: '7',
    foodName: 'Smoothie Bowl',
    date: 'Jan 10, 2026',
    time: '7:30 AM',
    calories: 310,
    protein: 14,
    carbs: 48,
    fats: 8
  },
  {
    id: '8',
    foodName: 'Beef Steak with Sweet Potato',
    date: 'Jan 9, 2026',
    time: '7:00 PM',
    calories: 680,
    protein: 52,
    carbs: 55,
    fats: 24
  }
];