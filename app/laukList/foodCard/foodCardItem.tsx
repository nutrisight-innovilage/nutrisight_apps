import React, { useState, memo } from 'react';
import { View, Text, Image, Pressable, ActivityIndicator } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { FoodCardItemProps } from '@/app/types/components';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const FoodCardItem: React.FC<FoodCardItemProps> = memo(({
    id,
    name,
    description,
    imageUrl,
}) => {
    const scale = useSharedValue(1);

    // FIX: Start as false — Image component fires onLoadEnd/onError
    // reliably; starting as true caused the placeholder to permanently
    // block the image when onLoadStart was skipped (cached images).
    const [imageLoading, setImageLoading] = useState(false);
    const [imageError, setImageError] = useState(false);

    const cardAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handlePressIn = () => {
        scale.value = withSpring(0.97, { damping: 15, stiffness: 200 });
    };

    const handlePressOut = () => {
        scale.value = withSpring(1, { damping: 15, stiffness: 200 });
    };

    return (
        <AnimatedPressable
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={cardAnimatedStyle}
        >
            <View className="bg-surface rounded-xl overflow-hidden shadow-lg border border-border/10">

                {/* ── Image Container ── */}
                <View className="h-48 bg-overlay-light">

                    {imageError ? (
                        /* Error state */
                        <View className="flex-1 items-center justify-center">
                            <View className="bg-surface-light rounded-full p-4 mb-2">
                                <Ionicons name="image-outline" size={32} color="#B0BEC5" />
                            </View>
                            <Text className="text-text-secondary-light text-xs">
                                Gambar tidak tersedia
                            </Text>
                        </View>

                    ) : (
                        <>
                            {/* FIX: Image renders first, not behind an absolute overlay.
                                It is always visible once loaded; the spinner sits on top
                                only while loading, then disappears. */}
                            <Image
                                source={{ uri: imageUrl }}
                                className="w-full h-full"
                                resizeMode="cover"
                                // FIX: onLoadStart sets loading true reliably
                                onLoadStart={() => {
                                    setImageLoading(true);
                                    setImageError(false);
                                }}
                                onLoad={() => setImageLoading(false)}
                                onLoadEnd={() => setImageLoading(false)}
                                onError={() => {
                                    setImageLoading(false);
                                    setImageError(true);
                                    console.warn(`[FoodCardItem] Image failed to load: ${imageUrl}`);
                                }}
                            />

                            {/* Spinner overlay — only shown while loading */}
                            {imageLoading && (
                                <View className="absolute inset-0 bg-overlay-light items-center justify-center">
                                    <View className="bg-surface-light rounded-full p-4 mb-2">
                                        <Ionicons name="restaurant-outline" size={32} color="#B0BEC5" />
                                    </View>
                                    <ActivityIndicator size="small" color="#B0BEC5" />
                                </View>
                            )}

                            {/* Subtle gradient — only when fully loaded */}
                            {!imageLoading && (
                                <View
                                    className="absolute inset-0"
                                    pointerEvents="none"
                                    style={{ backgroundColor: 'rgba(0,0,0,0.05)' }}
                                />
                            )}
                        </>
                    )}
                </View>

                {/* ── Content ── */}
                <View className="p-4">
                    <Text
                        className="text-text-primary text-lg font-semibold mb-2"
                        numberOfLines={2}
                    >
                        {name}
                    </Text>
                    <Text
                        className="text-text-secondary text-sm leading-5"
                        numberOfLines={3}
                    >
                        {description}
                    </Text>
                </View>

            </View>
        </AnimatedPressable>
    );
});

FoodCardItem.displayName = 'FoodCardItem';

export default FoodCardItem;