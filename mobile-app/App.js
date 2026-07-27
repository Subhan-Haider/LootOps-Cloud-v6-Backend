import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Image, ActivityIndicator, View } from 'react-native';
import { Image as ImageIcon, Settings, LayoutGrid, Users, Search } from 'lucide-react-native';

import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, onAuthStateChanged } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

import LoginScreen from './src/screens/LoginScreen';
import TimelineScreen from './src/screens/TimelineScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import AlbumsScreen from './src/screens/AlbumsScreen';
import SharedScreen from './src/screens/SharedScreen';
import ImageEditorScreen from './src/screens/ImageEditorScreen';
import SearchScreen from './src/screens/SearchScreen';

// Initialize background tasks
import './src/services/BackgroundSync';

// Initialize Firebase — same project as the web dashboard (server-storage-2027)
// The old project (storage-server-2025) had no Authentication configured.
const firebaseConfig = {
  apiKey: "AIzaSyD97kZ5nbdb3Y2x8D4mCSLwv-ldIz61PkQ",
  authDomain: "server-storage-2027.firebaseapp.com",
  projectId: "server-storage-2027",
  storageBucket: "server-storage-2027.firebasestorage.app",
  messagingSenderId: "32146521208",
  appId: "1:32146521208:web:6ca69a20eb70e2abac418d",
};
const app = initializeApp(firebaseConfig);
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#ffffff', borderTopColor: '#e2e8f0' },
        tabBarActiveTintColor: '#4f46e5',
        tabBarInactiveTintColor: '#64748b',
      }}
    >
      <Tab.Screen 
        name="Photos" 
        component={TimelineScreen} 
        options={{ tabBarIcon: ({ color }) => <ImageIcon size={24} color={color} /> }}
      />
      <Tab.Screen 
        name="Search" 
        component={SearchScreen} 
        options={{ tabBarIcon: ({ color }) => <Search size={24} color={color} /> }}
      />
      <Tab.Screen 
        name="Albums" 
        component={AlbumsScreen} 
        options={{ tabBarIcon: ({ color }) => <LayoutGrid size={24} color={color} /> }}
      />
      <Tab.Screen 
        name="Shared" 
        component={SharedScreen} 
        options={{ tabBarIcon: ({ color }) => <Users size={24} color={color} /> }}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen} 
        options={{ tabBarIcon: ({ color }) => <Settings size={24} color={color} /> }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="Main" component={TabNavigator} />
            <Stack.Screen name="ImageEditor" component={ImageEditorScreen} />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
