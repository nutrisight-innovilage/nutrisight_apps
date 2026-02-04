import { View, Text } from 'react-native'
import React, { useEffect } from 'react'
import { Tabs } from 'expo-router'
import { HeaderShownContext } from '@react-navigation/elements'
import { BottomTabBar } from '@react-navigation/bottom-tabs'
import { Ionicons } from '@expo/vector-icons';
import TabItem from "../components/tabItem"
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const _layout = () => {
    const insets = useSafeAreaInsets();
  
    return (
        
        <Tabs
        screenOptions={{
            headerShown:false,
            tabBarShowLabel:false,
            tabBarHideOnKeyboard: true,
            tabBarStyle: {
                backgroundColor: "transparent",
                borderTopWidth: 0,
                elevation: 0,
                shadowOpacity: 0,
                height: 60 + insets.bottom, // tambah space untuk safe area
                padding:10 + insets.bottom, // atau set 0 jika mau tanpa safe area
            },
        }}
        
        >
            <Tabs.Screen
                name='index'
                options={{
                    title: "beranda",
                    tabBarIcon: ({focused}) => {
                        
                        return <>
                        
                            <TabItem focused={focused} label="Beranda" >
                                <Ionicons name={focused ? "home-sharp" : "home-outline" } size={30} className={focused ? "text-green-600" : "text-neutral-700"} />
                            </TabItem>

                            
                        </>
                    }
                }}
            />
            <Tabs.Screen
                name='makan'
                options={{
                    title: "makan",
                    tabBarIcon: ({focused}) => {
                        return <>
                        <TabItem focused={focused} label="makanan">
                                <Ionicons name={focused ? "fast-food-sharp" : "fast-food-outline" } size={30} className={focused ? "text-green-600" : "text-neutral-700"}/>
                        </TabItem>
                        </>
                    }
                }}
            />
            <Tabs.Screen
                name='pengaturan'
                options={{
                    title: "pengaturan",
                    tabBarIcon: ({focused}) => {
                        return <>
                        <TabItem focused={focused} label="pengaturan">
                                <Ionicons name={focused ? "settings-sharp" : "settings-outline"} size={30} className={focused ? "text-green-600" : "text-neutral-700"}/>
                            </TabItem>
                        </>
                    }
                }}
            />
            
        </Tabs>
    )
}

export default _layout