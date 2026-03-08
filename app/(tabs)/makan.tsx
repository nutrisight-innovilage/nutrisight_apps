/**
 * camera.tsx (v3.1 - Shows AnalysisResultCard after scan)
 * ---------------------------------------------------------------------------
 * Camera page with integrated AI food photo analysis.
 *
 * v3.1 Changes:
 * ✅ After analysis, shows AnalysisResultCard instead of QueuedResultScreen
 * ✅ AnalysisResultCard has "Lihat Riwayat" button to navigate to history
 * ✅ Removed QueuedResultScreen sub-component
 * ---------------------------------------------------------------------------
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { router } from 'expo-router';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import NetInfo from '@react-native-community/netinfo';

import { CameraFacing, CapturedPhoto } from '@/app/types/camera';
import { NutritionScan, AIDetectedFood } from '@/app/types/meal';
import { CameraService } from '@/app/services/camera/cameraAPI';
import { useCart } from '@/app/contexts/cartContext';
import { useToast } from '@/app/components/useToast';
import LoadingScreen from '@/app/components/loadingScreen';
import AnalysisLoadingOverlay from '@/app/components/analysisLoadingOverlay';
import AnalysisResultCard from '@/app/components/analysisResultCard';

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function CameraPage() {
  const [facing, setFacing] = useState<CameraFacing>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedImage, setCapturedImage] = useState<CapturedPhoto | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [queuedScan, setQueuedScan] = useState<NutritionScan | null>(null);

  const cameraRef = useRef<CameraView>(null);

  const { isAnalyzing, analyzePhoto, clearAnalysisResult } = useCart();
  const { showToast, ToastContainer } = useToast();

  // Animations
  const scaleButton = useSharedValue(1);
  const opacityFlash = useSharedValue(0);

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleButton.value }],
  }));

  const flashAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacityFlash.value,
  }));

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------

  useEffect(() => {
    // Request gallery permission on mount
    CameraService.requestGalleryPermission();

    // Check network status
    NetInfo.fetch().then((state) => {
      setIsOnline(state.isConnected === true && state.isInternetReachable === true);
    });

    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected === true && state.isInternetReachable === true);
    });

    return () => unsubscribe();
  }, []);

  // ---------------------------------------------------------------------------
  // Guards
  // ---------------------------------------------------------------------------

  if (!permission) {
    return <LoadingScreen message="Memuat..." />;
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 bg-background items-center justify-center p-6">
        <Ionicons name="camera-outline" size={64} color="#999" />
        <Text className="text-text-primary text-lg font-semibold mt-4 text-center">
          Izin Kamera Diperlukan
        </Text>
        <Text className="text-text-secondary text-sm mt-2 text-center">
          Aplikasi membutuhkan akses ke kamera untuk mengambil foto makanan
        </Text>
        <TouchableOpacity
          onPress={requestPermission}
          className="mt-6 bg-primary rounded-xl px-6 py-3"
          activeOpacity={0.75}
        >
          <Text className="text-text-inverse font-semibold">Berikan Izin</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleShowFoodList = () => {
    router.push('/laukList');
  };

  const handleTakePhoto = async () => {
    if (!cameraRef.current) return;

    try {
      scaleButton.value = withSequence(
        withSpring(0.9, { damping: 10 }),
        withSpring(1, { damping: 10 })
      );
      opacityFlash.value = withSequence(
        withTiming(1, { duration: 100 }),
        withTiming(0, { duration: 300 })
      );

      const photo = await CameraService.takePhoto(cameraRef.current);
      if (photo) {
        setCapturedImage(photo);
        setShowCamera(false);
      }
    } catch (error) {
      console.error('[CameraPage] Error mengambil foto:', error);
      showToast({ type: 'error', title: 'Gagal mengambil foto', message: 'Silakan coba lagi.' });
    }
  };

  const handlePickImage = async () => {
    try {
      const photo = await CameraService.pickImageFromGallery();
      if (photo) {
        setCapturedImage(photo);
        setShowCamera(false);
      }
    } catch (error) {
      console.error('[CameraPage] Error memilih gambar:', error);
      showToast({ type: 'error', title: 'Gagal memilih gambar', message: 'Silakan coba lagi.' });
    }
  };

  const handleOpenCamera = () => {
    setShowCamera(true);
    setCapturedImage(null);
    setQueuedScan(null);
    clearAnalysisResult();
  };

  const toggleCameraFacing = () => {
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
  };

  /**
   * v3.1: After analysis, sets queuedScan to show AnalysisResultCard.
   */
  const handleAnalyzePhoto = async () => {
    if (!capturedImage) return;

    try {
      const result = await analyzePhoto(capturedImage.uri);

      if (!result) {
        showToast({
          type: 'error',
          title: 'Analisis Gagal',
          message: 'Tidak dapat memproses foto. Silakan coba lagi.',
          actions: [
            { label: 'Coba Lagi', onPress: handleAnalyzePhoto },
            { label: 'Batal', variant: 'ghost' },
          ],
        });
        return;
      }

      // ✅ Show analysis result card
      setQueuedScan(result.scan);

      showToast({
        type: isOnline ? 'success' : 'warning',
        title: isOnline ? 'Analisis selesai!' : 'Tersimpan (offline)',
        message: result.message,
        duration: 4000,
      });
    } catch (error) {
      console.error('[CameraPage] Error analyzing photo:', error);
      showToast({
        type: 'error',
        title: 'Terjadi Kesalahan',
        message: 'Gagal memproses foto. Silakan coba lagi.',
      });
    }
  };

  const handleRetake = () => {
    setQueuedScan(null);
    setCapturedImage(null);
    clearAnalysisResult();
  };

  const handleViewHistory = () => {
    setQueuedScan(null);
    setCapturedImage(null);
    clearAnalysisResult();
    router.push('/history');
  };

  /** Called when user taps "Simpan ke Riwayat" on the result card */
  const handleSaveFromResult = () => {
    // Scan is already auto-saved by the offline-first flow.
    // Show confirmation and navigate to history.
    showToast({
      type: 'success',
      title: 'Tersimpan!',
      message: 'Hasil analisis sudah masuk ke riwayat.',
      duration: 2000,
    });
    setTimeout(() => {
      handleViewHistory();
    }, 1500);
  };

  // ---------------------------------------------------------------------------
  // RENDER: Analysis Result Screen (via AnalysisResultCard)
  // ---------------------------------------------------------------------------

  if (queuedScan && capturedImage) {
    // NutritionScan has flat fields (calories, protein, carbs, fats, foodName).
    // Map them to AnalysisResultCard's expected props.
    const totalNutrition = {
      calories: queuedScan.calories,
      protein: queuedScan.protein,
      carbs: queuedScan.carbs,
      fats: queuedScan.fats,
    };
    const mealDescription = queuedScan.foodName ?? '';
    // Create a single detected food entry from the scan data
    const foods: AIDetectedFood[] = queuedScan.foodName
      ? [
          {
            name: queuedScan.foodName,
            estimatedGrams: 0,
            confidence: 1,
            nutrition: totalNutrition,
          },
        ]
      : [];

    return (
      <View className="flex-1">
        <AnalysisResultCard
          photoUri={capturedImage.uri}
          foods={foods}
          totalNutrition={totalNutrition}
          mealDescription={mealDescription}
          onSave={handleSaveFromResult}
          onRetake={handleRetake}
          onDismiss={handleRetake}
          onViewHistory={handleViewHistory}
        />
        <ToastContainer />
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER: Camera Mode
  // ---------------------------------------------------------------------------

  if (showCamera && !capturedImage) {
    return (
      <View className="flex-1 bg-black">
        <CameraView ref={cameraRef} style={{ flex: 1 }} facing={facing} />

        {/* Flash overlay */}
        <Animated.View
          style={flashAnimatedStyle}
          className="absolute inset-0 bg-white"
          pointerEvents="none"
        />

        {/* Top Controls */}
        <View className="absolute top-0 left-0 right-0 pt-12 px-6 flex-row justify-between items-center z-10">
          <TouchableOpacity
            onPress={() => setShowCamera(false)}
            className="bg-black/50 rounded-full p-3"
            activeOpacity={0.75}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={toggleCameraFacing}
            className="bg-black/50 rounded-full p-3"
            activeOpacity={0.75}
          >
            <Ionicons name="camera-reverse" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Scan Frame */}
        <View className="absolute inset-0 items-center justify-center px-8">
          <View
            className="w-full border-4 border-dashed border-white rounded-2xl opacity-60"
            style={{ height: 256 }}
          />
        </View>

        {/* Bottom Controls */}
        <View className="absolute bottom-0 left-0 right-0 pb-12 px-6">
          <Animated.View style={buttonAnimatedStyle}>
            <TouchableOpacity
              onPress={handleTakePhoto}
              className="w-20 h-20 rounded-full border-4 border-white bg-white/30 self-center items-center justify-center"
              activeOpacity={0.75}
            >
              <View className="w-16 h-16 rounded-full bg-white" />
            </TouchableOpacity>
          </Animated.View>

          <TouchableOpacity
            onPress={handlePickImage}
            className="mt-6 bg-white/90 rounded-xl py-3 flex-row items-center justify-center gap-2"
            activeOpacity={0.75}
          >
            <Ionicons name="image" size={20} color="#333333" />
            <Text className="text-gray-900 font-semibold text-base">Pilih dari Galeri</Text>
          </TouchableOpacity>
        </View>

        <AnalysisLoadingOverlay visible={isAnalyzing} />
        <ToastContainer />
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER: Default View
  // ---------------------------------------------------------------------------

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingBottom: 80 }}
    >
      {/* Header */}
      <View className="bg-surface px-6 py-4 shadow-sm">
        <Text className="text-2xl font-bold text-text-primary">Pindai Makanan</Text>
        <Text className="text-sm text-text-secondary mt-1">Ambil foto untuk analisis nutrisi AI</Text>
      </View>

      {/* Camera Preview Area */}
      <View className="flex-1 items-center p-6">
        <View className="w-full max-w-md bg-surface rounded-3xl shadow-lg overflow-hidden">
          {/* Viewfinder or Captured Image */}
          <View className="relative bg-gray-900" style={{ aspectRatio: 3 / 4 }}>
            {capturedImage ? (
              <Image
                source={{ uri: capturedImage.uri }}
                className="w-full h-full"
                resizeMode="cover"
              />
            ) : (
              <>
                <View className="absolute inset-0 items-center justify-center px-8">
                  <View
                    className="w-full border-4 border-dashed border-white rounded-2xl opacity-60"
                    style={{ height: 256 }}
                  />
                </View>
                <View className="absolute inset-0 items-center justify-center">
                  <MaterialIcons name="document-scanner" size={64} color="rgba(255,255,255,0.7)" />
                </View>
              </>
            )}
          </View>

          {/* Controls */}
          <View className="p-6 bg-surface">
            {capturedImage ? (
              <>
                <TouchableOpacity
                  onPress={handleAnalyzePhoto}
                  disabled={isAnalyzing}
                  className={`w-full rounded-xl py-4 flex-row items-center justify-center gap-2 ${
                    isAnalyzing ? 'bg-green-400' : 'bg-green-600'
                  }`}
                  activeOpacity={0.75}
                >
                  <Ionicons name="sparkles" size={22} color="#fff" />
                  <Text className="text-white font-semibold text-base">
                    {isAnalyzing ? 'Menganalisis...' : 'Analisis dengan AI'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setCapturedImage(null)}
                  className="w-full mt-3 bg-overlay rounded-xl py-3 flex-row items-center justify-center gap-2"
                  activeOpacity={0.75}
                >
                  <Ionicons name="trash" size={20} color="#333333" />
                  <Text className="text-text-primary font-semibold text-base">Hapus Foto</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  onPress={handleOpenCamera}
                  className="w-full bg-primary rounded-xl py-4 flex-row items-center justify-center gap-2"
                  activeOpacity={0.75}
                >
                  <Ionicons name="camera" size={22} color="#fff" />
                  <Text className="text-text-inverse font-semibold text-base">Ambil Foto</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handlePickImage}
                  className="w-full mt-3 bg-overlay rounded-xl py-3 flex-row items-center justify-center gap-2"
                  activeOpacity={0.75}
                >
                  <Ionicons name="image" size={20} color="#333333" />
                  <Text className="text-text-primary font-semibold text-base">Pilih dari Galeri</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleShowFoodList}
                  className="w-full mt-3 bg-overlay rounded-xl py-3 flex-row items-center justify-center gap-2"
                  activeOpacity={0.75}
                >
                  <Ionicons name="search" size={20} color="#333333" />
                  <Text className="text-text-primary font-semibold text-base">
                    Cari Lauk-Pauk Manual
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* Offline indicator */}
        {!isOnline && (
          <View className="mt-4 w-full max-w-md bg-yellow-50 border border-yellow-300 rounded-xl px-4 py-3 flex-row items-center gap-3">
            <Ionicons name="cloud-offline-outline" size={18} color="#ffa726" />
            <Text className="text-yellow-800 text-xs flex-1">
              Mode offline — foto akan dianalisis saat kembali online
            </Text>
          </View>
        )}

        {/* Tips box */}
        <View className="mt-4 w-full max-w-md bg-input border border-border rounded-xl p-4 flex-row">
          <Ionicons
            name="information-circle"
            size={20}
            color="#1F78FF"
            style={{ marginTop: 2, marginRight: 12, flexShrink: 0 }}
          />
          <View className="flex-1">
            <Text className="text-text-primary font-semibold text-sm mb-1">
              Tips untuk hasil terbaik:
            </Text>
            <Text className="text-text-secondary text-xs">• Pastikan pencahayaan baik</Text>
            <Text className="text-text-secondary text-xs">• Pusatkan makanan dalam bingkai</Text>
            <Text className="text-text-secondary text-xs">• Tangkap seluruh makanan</Text>
            <Text className="text-text-secondary text-xs">• Hindari bayangan dan silau</Text>
          </View>
        </View>
      </View>

      <AnalysisLoadingOverlay visible={isAnalyzing} />
      <ToastContainer />
    </ScrollView>
  );
}