import React, { useState } from 'react';
import { View, TextInput } from 'react-native';

export default function SearchBox() {
    const [searchText, setSearchText] = useState('');

    const handleSearch = (text: string) => {
        setSearchText(text);
    };

    const handleClear = () => {
        setSearchText('');
    };

    return (
        <View>
            <TextInput
                placeholder="Search..."
                value={searchText}
                onChangeText={handleSearch}
            />
        </View>
    );
}