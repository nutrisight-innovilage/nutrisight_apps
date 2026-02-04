import React, { ReactNode } from 'react';
import { View } from 'react-native';

interface CardProps {
    children: ReactNode;
    onPress?: () => void;
}

const Card: React.FC<CardProps> = ({ children, onPress }) => {
    return (
        <View onTouchEnd={onPress}>
            {children}
        </View>
    );
};

export default Card;