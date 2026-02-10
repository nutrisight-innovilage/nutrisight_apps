import React, { useState, memo } from 'react';
import { View, Text, Image, Pressable } from 'react-native';
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
    const [imageLoading, setImageLoading] = useState(true);
    const [imageError, setImageError] = useState(false);

    const cardAnimatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: scale.value }],
        };
    });

    const handlePressIn = () => {
        scale.value = withSpring(0.97, {
            damping: 15,
            stiffness: 200,
        });
    };

    const handlePressOut = () => {
        scale.value = withSpring(1, {
            damping: 15,
            stiffness: 200,
        });
    };

    return (
        <AnimatedPressable
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={cardAnimatedStyle}
        >
            <View className="bg-surface rounded-xl overflow-hidden shadow-lg border border-border/10">
                {/* Image Container */}
                <View className="relative h-48 bg-overlay-light">
                    {!imageError ? (
                        <>
                            {/* Placeholder saat loading */}
                            {imageLoading && (
                                <View className="absolute inset-0 bg-overlay-light items-center justify-center">
                                    <View className="bg-surface-light rounded-full p-4 mb-2">
                                        <Ionicons name="restaurant-outline" size={32} color="#B0BEC5" />
                                    </View>
                                    <View className="h-2 w-24 bg-surface-light rounded-full overflow-hidden">
                                        <Animated.View 
                                            className="h-full bg-primary-light/30"
                                            style={{
                                                width: '60%',
                                            }}
                                        />
                                    </View>
                                </View>
                            )}
                            
                            {/* Actual Image */}
                            <Image
                                source={{ uri: imageUrl }}
                                className="w-full h-full"
                                resizeMode="cover"
                                onLoadStart={() => setImageLoading(true)}
                                onLoadEnd={() => setImageLoading(false)}
                                onError={() => {
                                    setImageLoading(false);
                                    setImageError(true);
                                }}
                            />
                        </>
                    ) : (
                        // Error state - gambar gagal dimuat
                        <View className="absolute inset-0 bg-overlay-light items-center justify-center">
                            <View className="bg-surface-light rounded-full p-4 mb-2">
                                <Ionicons name="image-outline" size={32} color="#B0BEC5" />
                            </View>
                            <Text className="text-text-secondary-light text-xs">Gambar tidak tersedia</Text>
                        </View>
                    )}
                    
                    {/* Gradient Overlay - hanya tampil jika gambar berhasil dimuat */}
                    {!imageError && !imageLoading && (
                        <View className="absolute inset-0 bg-gradient-to-b from-transparent to-black/10" />
                    )}
                </View>

                {/* Content Container */}
                <View className="p-4">
                    <Text className="text-text-primary text-lg font-semibold mb-2" numberOfLines={2}>
                        {name}
                    </Text>
                    <Text className="text-text-secondary text-sm leading-5" numberOfLines={3}>
                        {description}
                    </Text>
                </View>
            </View>
        </AnimatedPressable>
    );
});

FoodCardItem.displayName = 'FoodCardItem';

export default FoodCardItem;