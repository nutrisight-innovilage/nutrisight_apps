import React from 'react';
import { View, Text, Image, Pressable } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';


// TODO: pindahin interface ke types/food.ts
interface FoodCardItemProps {
    id: string;
    name: string;
    description: string;
    imageUrl: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const FoodCardItem: React.FC<FoodCardItemProps> = ({
    id,
    name,
    description,
    imageUrl,
}) => {
    const scale = useSharedValue(1);

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
            className="mb-4 mx-4"
        >
            <View className="bg-surface rounded-xl overflow-hidden shadow-lg border border-border/10">
                {/* Image Container */}
                <View className="relative h-48">
                    <Image
                        source={{ uri: imageUrl }}
                        className="w-full h-full"
                        resizeMode="cover"
                    />
                    
                    {/* Gradient Overlay */}
                    <View className="absolute inset-0 bg-gradient-to-b from-transparent to-black/10" />
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
};

export default FoodCardItem;