import { useState, useRef, useEffect } from 'react';
import { router } from 'expo-router';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
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

import { CameraFacing, CapturedPhoto } from '@/app/types/camera';
import { CameraService } from '@/app/services/cameraAPI';
import LoadingScreen from '@/app/components/loadingScreen';

export default function CameraPage() {
  const [facing, setFacing] = useState<CameraFacing>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedImage, setCapturedImage] = useState<CapturedPhoto | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  // Animasi
  const scaleButton = useSharedValue(1);
  const opacityFlash = useSharedValue(0);

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleButton.value }],
  }));

  const flashAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacityFlash.value,
  }));

  useEffect(() => {
    // Request gallery permissions on mount
    (async () => {
      await CameraService.requestGalleryPermission();
    })();
  }, []);

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

  const handleShowFoodList = () => {
    router.push('/laukList');
  };

  const handleTakePhoto = async () => {
    if (!cameraRef.current) return;

    try {
      // Animasi tombol
      scaleButton.value = withSequence(
        withSpring(0.9, { damping: 10 }),
        withSpring(1, { damping: 10 })
      );

      // Animasi flash
      opacityFlash.value = withSequence(
        withTiming(1, { duration: 100 }),
        withTiming(0, { duration: 300 })
      );

      const photo = await CameraService.takePhoto(cameraRef.current);

      if (photo) {
        setCapturedImage(photo);
        setShowCamera(false);

        Alert.alert(
          'Foto Berhasil Diambil!',
          'Foto siap untuk dianalisis. Anda bisa menambahkan logika analisis nutrisi di sini.',
          [
            { text: 'Ambil Ulang', onPress: () => setCapturedImage(null) },
            { text: 'OK', style: 'cancel' },
          ]
        );
      }
    } catch (error) {
      console.error('Error mengambil foto:', error);
    }
  };

  const handlePickImage = async () => {
    try {
      const photo = await CameraService.pickImageFromGallery();

      if (photo) {
        setCapturedImage(photo);
        setShowCamera(false);

        Alert.alert(
          'Gambar Berhasil Dipilih!',
          'Gambar siap untuk dianalisis. Anda bisa menambahkan logika analisis nutrisi di sini.',
          [
            { text: 'Pilih Ulang', onPress: () => setCapturedImage(null) },
            { text: 'OK', style: 'cancel' },
          ]
        );
      }
    } catch (error) {
      console.error('Error memilih gambar:', error);
    }
  };

  const handleOpenCamera = () => {
    setShowCamera(true);
    setCapturedImage(null);
  };

  const toggleCameraFacing = () => {
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
  };

  const handleAnalyzePhoto = async () => {
    if (!capturedImage) return;
    await CameraService.analyzeFood(capturedImage.uri);
  };

  if (showCamera && !capturedImage) {
    return (
      <View className="flex-1 bg-black">
        {/* Camera View - TANPA CHILDREN */}
        <CameraView ref={cameraRef} style={{ flex: 1 }} facing={facing} />

        {/* Overlay UI - DI LUAR CameraView dengan position absolute */}
        {/* Flash overlay */}
        <Animated.View
          style={flashAnimatedStyle}
          className="absolute inset-0 bg-white"
          pointerEvents="none"
        />

        {/* Top Controls */}
        <View className="absolute top-0 left-0 right-0 pt-12 px-6 flex-row justify-between items-center z-10">
          <TouchableOpacity
            onPress={() => {
              setShowCamera(false);
              console.log('Tutup kamera');
            }}
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

        {/* Scan Frame Overlay */}
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
            <Text className="text-gray-900 font-semibold text-base">
              Pilih dari Galeri
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingBottom: 80 }}
    >
      {/* Header */}
      <View className="bg-surface px-6 py-4 shadow-sm">
        <Text className="text-2xl font-bold text-text-primary">
          Pindai Makanan
        </Text>
        <Text className="text-sm text-text-secondary mt-1">
          Ambil foto untuk analisis nutrisi
        </Text>
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
                {/* Scan Frame */}
                <View className="absolute inset-0 items-center justify-center px-8">
                  <View
                    className="w-full border-4 border-dashed border-white rounded-2xl opacity-60"
                    style={{ height: 256 }}
                  />
                </View>

                {/* Scan Icon */}
                <View className="absolute inset-0 items-center justify-center">
                  <MaterialIcons
                    name="document-scanner"
                    size={64}
                    color="rgba(255,255,255,0.7)"
                  />
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
                  className="w-full bg-green-600 rounded-xl py-4 flex-row items-center justify-center gap-2"
                  activeOpacity={0.75}
                >
                  <Ionicons name="checkmark-circle" size={22} color="#fff" />
                  <Text className="text-white font-semibold text-base">
                    Analisis Foto
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setCapturedImage(null)}
                  className="w-full mt-3 bg-overlay rounded-xl py-3 flex-row items-center justify-center gap-2"
                  activeOpacity={0.75}
                >
                  <Ionicons name="trash" size={20} color="#333333" />
                  <Text className="text-text-primary font-semibold text-base">
                    Hapus Foto
                  </Text>
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
                  <Text className="text-text-inverse font-semibold text-base">
                    Ambil Foto
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handlePickImage}
                  className="w-full mt-3 bg-overlay rounded-xl py-3 flex-row items-center justify-center gap-2"
                  activeOpacity={0.75}
                >
                  <Ionicons name="image" size={20} color="#333333" />
                  <Text className="text-text-primary font-semibold text-base">
                    Pilih dari Galeri
                  </Text>
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

        {/* Info Box */}
        <View className="mt-6 w-full max-w-md bg-input border border-border rounded-xl p-4 flex-row">
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
            <Text className="text-text-secondary text-xs">
              • Pastikan pencahayaan baik
            </Text>
            <Text className="text-text-secondary text-xs">
              • Pusatkan makanan dalam bingkai
            </Text>
            <Text className="text-text-secondary text-xs">
              • Tangkap seluruh makanan
            </Text>
            <Text className="text-text-secondary text-xs">
              • Hindari bayangan dan silau
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}