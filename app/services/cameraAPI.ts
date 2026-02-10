import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { CameraView } from 'expo-camera';
import NetInfo from '@react-native-community/netinfo';
import type { CapturedPhoto, PhotoOptions, PickImageOptions } from '@/app/types/camera';
import { getSyncManager } from '@/app/services/sync/syncManager';
import { PhotoSyncStrategy } from '@/app/services/sync/syncStrategy/mealSyncStrategy'; // Sesuaikan path

export class CameraService {
  /**
   * Check if device is online
   */
  static async isOnline(): Promise<boolean> {
    try {
      const netInfoState = await NetInfo.fetch();
      return netInfoState.isConnected === true && netInfoState.isInternetReachable === true;
    } catch (error) {
      console.error('Error checking network status:', error);
      return false;
    }
  }

  /**
   * Request camera permission
   */
  static async requestCameraPermission(): Promise<boolean> {
    try {
      // Check online status first
      const online = await this.isOnline();
      if (!online) {
        Alert.alert(
          'Tidak Ada Koneksi',
          'Fitur kamera memerlukan koneksi internet untuk menganalisis makanan.',
          [{ text: 'OK', style: 'cancel' }]
        );
        return false;
      }

      const { Camera } = await import('expo-camera');
      const { status } = await Camera.requestCameraPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      return false;
    }
  }

  /**
   * Request gallery/media library permission
   */
  static async requestGalleryPermission(): Promise<boolean> {
    try {
      // Check online status first
      const online = await this.isOnline();
      if (!online) {
        Alert.alert(
          'Tidak Ada Koneksi',
          'Fitur galeri memerlukan koneksi internet untuk menganalisis makanan.',
          [{ text: 'OK', style: 'cancel' }]
        );
        return false;
      }

      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Izin Diperlukan',
          'Aplikasi membutuhkan akses ke galeri untuk memilih foto.'
        );
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error requesting gallery permission:', error);
      return false;
    }
  }

  /**
   * Take a photo using the camera
   */
  static async takePhoto(
    cameraRef: CameraView | null,
    options: PhotoOptions = {}
  ): Promise<CapturedPhoto | null> {
    // Check online status
    const online = await this.isOnline();
    if (!online) {
      Alert.alert(
        'Tidak Ada Koneksi',
        'Fitur kamera memerlukan koneksi internet untuk menganalisis makanan.',
        [{ text: 'OK', style: 'cancel' }]
      );
      return null;
    }

    if (!cameraRef) {
      console.error('Camera ref is null');
      return null;
    }

    try {
      const photo = await cameraRef.takePictureAsync({
        quality: options.quality ?? 0.8,
        base64: options.base64 ?? false,
      });

      if (!photo) return null;

      const capturedPhoto: CapturedPhoto = {
        uri: photo.uri,
        width: photo.width,
        height: photo.height,
        base64: photo.base64,
      };

      console.log('Foto diambil:', capturedPhoto.uri);
      return capturedPhoto;
    } catch (error) {
      console.error('Error mengambil foto:', error);
      Alert.alert('Error', 'Gagal mengambil foto. Silakan coba lagi.');
      return null;
    }
  }

  /**
   * Pick an image from the gallery
   */
  static async pickImageFromGallery(
    options: PickImageOptions = {}
  ): Promise<CapturedPhoto | null> {
    // Check online status
    const online = await this.isOnline();
    if (!online) {
      Alert.alert(
        'Tidak Ada Koneksi',
        'Fitur galeri memerlukan koneksi internet untuk menganalisis makanan.',
        [{ text: 'OK', style: 'cancel' }]
      );
      return null;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: options.allowsEditing ?? true,
        aspect: options.aspect ?? [3, 4],
        quality: options.quality ?? 0.8,
      });

      if (result.canceled || !result.assets[0]) {
        return null;
      }

      const asset = result.assets[0];
      const capturedPhoto: CapturedPhoto = {
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
      };

      console.log('Gambar dipilih:', capturedPhoto.uri);
      return capturedPhoto;
    } catch (error) {
      console.error('Error memilih gambar:', error);
      Alert.alert('Error', 'Gagal memilih gambar. Silakan coba lagi.');
      return null;
    }
  }

  /**
   * Analyze food from photo - integrated with PhotoSyncStrategy
   */
  static async analyzeFood(photoUri: string, metadata?: any): Promise<any> {
    try {
      // Check online status
      const online = await this.isOnline();
      if (!online) {
        Alert.alert(
          'Tidak Ada Koneksi',
          'Analisis makanan memerlukan koneksi internet. Silakan coba lagi saat terhubung ke internet.',
          [{ text: 'OK', style: 'cancel' }]
        );
        return null;
      }

      console.log('[CameraService] Analyzing food from:', photoUri);

      // Get SyncManager instance
      const syncManager = getSyncManager();

      // Use sync method yang sudah ada
      const success = await syncManager.sync('photo', {
        photoUri,
        metadata,
      });

      if (success) {
        console.log('[CameraService] Photo added to sync queue');
        
        Alert.alert(
          'Sedang Diproses',
          'Foto sedang dianalisis. Hasilnya akan muncul sebentar lagi.',
          [{ text: 'OK', style: 'default' }]
        );
      } else {
        throw new Error('Failed to add photo to sync queue');
      }

    } catch (error) {
      console.error('[CameraService] Error analyzing food:', error);
      
      Alert.alert(
        'Error',
        'Gagal menganalisis makanan. Pastikan koneksi internet aktif dan coba lagi.',
        [{ text: 'OK', style: 'cancel' }]
      );
    }
  }
}