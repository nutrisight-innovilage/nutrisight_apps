import { View, Text, Pressable } from 'react-native'
import React from 'react'
import { Tabs, usePathname } from 'expo-router'
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import TabItem from '@/app/components/tabItem'

const _layout = () => {
    const insets = useSafeAreaInsets();
    const pathname = usePathname(); // Track current route
  
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarShowLabel: false,
                tabBarHideOnKeyboard: true,
                tabBarStyle: {
                    backgroundColor: "#ffffff",
                    borderTopWidth: 0,
                    elevation: 0,
                    shadowOpacity: 0,
                    height: 70 + insets.bottom,
                    paddingBottom: insets.bottom,
                    paddingTop: 10,
                },
            }}
        >
            <Tabs.Screen
                name='index'
                options={{
                    title: "beranda",
                    tabBarButton: (props) => {
                        const focused = pathname === '/'; // atau '/(tabs)' tergantung struktur
                        return (
                            <Pressable
                                onPress={props.onPress}
                                className='flex-1 items-center justify-center'
                            >
                                <TabItem label="Beranda" focused={focused}>
                                    <Ionicons 
                                        name={focused ? "home-sharp" : "home-outline"} 
                                        size={28} 
                                        color={focused ? "#16a34a" : "#525252"} 
                                    />
                                </TabItem>
                            </Pressable>
                        );
                    }
                }}
            />
            <Tabs.Screen
                name='makan'
                options={{
                    title: "makan",
                    tabBarButton: (props) => {
                        const focused = pathname === '/makan';
                        return (
                            <Pressable
                                onPress={props.onPress}
                                className='flex-1 items-center justify-center'
                            >
                                <TabItem label="Makanan" focused={focused}>
                                    <Ionicons 
                                        name={focused ? "fast-food-sharp" : "fast-food-outline"} 
                                        size={28} 
                                        color={focused ? "#16a34a" : "#525252"} 
                                    />
                                </TabItem>
                            </Pressable>
                        );
                    }
                }}
            />
            <Tabs.Screen
                name='pengaturan'
                options={{
                    title: "pengaturan",
                    tabBarButton: (props) => {
                        const focused = pathname === '/pengaturan';
                        return (
                            <Pressable
                                onPress={props.onPress}
                                className='flex-1 items-center justify-center'
                            >
                                <TabItem label="Pengaturan" focused={focused}>
                                    <Ionicons 
                                        name={focused ? "settings-sharp" : "settings-outline"} 
                                        size={28} 
                                        color={focused ? "#16a34a" : "#525252"} 
                                    />
                                </TabItem>
                            </Pressable>
                        );
                    }
                }}
            />
        </Tabs>
    )
}

export default _layout