import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { 
  FadeIn, 
  FadeOut,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

interface SearchBoxProps {
  value?: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  editable?: boolean;
}

export default function SearchBox({
  value: controlledValue,
  onChangeText: controlledOnChangeText,
  placeholder = 'Cari makanan...',
  autoFocus = false,
  editable = true,
}: SearchBoxProps) {
  const [internalValue, setInternalValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const isControlled = controlledValue !== undefined;
  const searchText = isControlled ? controlledValue : internalValue;

  const handleSearch = (text: string) => {
    if (!isControlled) {
      setInternalValue(text);
    }
    controlledOnChangeText?.(text);
  };

  const handleClear = () => {
    const emptyText = '';
    if (!isControlled) {
      setInternalValue(emptyText);
    }
    controlledOnChangeText?.(emptyText);
  };

  const searchIconStyle = useAnimatedStyle(() => {
    const scale = withSpring(isFocused ? 1.1 : 1, {
      damping: 12,
      stiffness: 200,
    });
    
    return {
      transform: [{ scale }],
    };
  });

  return (
    <Animated.View entering={FadeIn.duration(400).springify()}>
      <View
        className={`flex-row items-center rounded-2xl px-4 py-3.5 shadow-sm ${
          isFocused 
            ? 'bg-white border-2 border-primary/30' 
            : 'bg-gray-50 border-2 border-transparent'
        }`}
        style={{
          shadowColor: isFocused ? '#37B37E' : '#000',
          shadowOffset: { width: 0, height: isFocused ? 4 : 2 },
          shadowOpacity: isFocused ? 0.12 : 0.05,
          shadowRadius: isFocused ? 8 : 4,
          elevation: isFocused ? 4 : 2,
        }}
      >
        {/* Search Icon */}
        <Animated.View style={searchIconStyle}>
          <Ionicons 
            name="search" 
            size={22} 
            color={isFocused ? '#37B37E' : '#94A3B8'} 
          />
        </Animated.View>

        {/* Text Input */}
        <TextInput
          className="flex-1 text-gray-900 text-base ml-3 font-medium"
          
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          value={searchText}
          onChangeText={handleSearch}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          autoFocus={autoFocus}
          editable={editable}
          autoCapitalize="none"
          autoCorrect={false}
          selectionColor="#37B37E"
        />

        {/* Clear Button */}
        {searchText.length > 0 && (
          <Animated.View
            entering={FadeIn.duration(200).springify()}
            exiting={FadeOut.duration(150)}
          >
            <TouchableOpacity
              onPress={handleClear}
              className="ml-2 bg-gray-200 rounded-full p-1.5 active:bg-gray-300"
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={16} color="#64748B" />
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>
    </Animated.View>
  );
}