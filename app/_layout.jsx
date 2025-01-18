import React, { useEffect, useState } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { Stack, useRootNavigationState, useRouter } from 'expo-router';
import { useFonts } from 'expo-font';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { ChatProvider } from '../context/ChatContext';
import { NotificationProvider } from '../context/NotificationContext';
import { auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({
  fade: true,
});

const RootLayout = () => {
  const [fontsLoaded, error] = useFonts({
    'Poppins-Black': require('../assets/fonts/Poppins-Black.ttf'),
    'Poppins-Bold': require('../assets/fonts/Poppins-Bold.ttf'),
    'Poppins-ExtraBold': require('../assets/fonts/Poppins-ExtraBold.ttf'),
    'Poppins-ExtraLight': require('../assets/fonts/Poppins-ExtraLight.ttf'),
    'Poppins-Light': require('../assets/fonts/Poppins-Light.ttf'),
    'Poppins-Medium': require('../assets/fonts/Poppins-Medium.ttf'),
    'Poppins-Regular': require('../assets/fonts/Poppins-Regular.ttf'),
    'Poppins-SemiBold': require('../assets/fonts/Poppins-SemiBold.ttf'),
    'Poppins-Thin': require('../assets/fonts/Poppins-Thin.ttf'),
    'Inter-Regular': require('../assets/fonts/Inter-Regular.ttf'),
    'Inter-Bold': require('../assets/fonts/Inter-Bold.ttf'),
    'Inter-Semi': require('../assets/fonts/Inter-SemiBold.ttf'),
    'Inter-Black': require('../assets/fonts/Inter-Black.ttf'),
  });

  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [user, setUser] = useState(null);
  const navigationState = useRootNavigationState();

  useEffect(() => {
    // Listen for authentication state changes
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      setUser(authUser);
      setLoading(false);
    });

    return () => unsubscribe(); // Clean up the listener when the component is unmounted
  }, []);

  useEffect(() => {
  
    
      if(navigationState?.key){
        console.log('Navigation state is  ready yet.');
      }

      if (user && fontsLoaded) {
        // Navigate to `/messaging` if the user is authenticated
        console.log('User authenticated and fonts loaded. Redirecting to /messaging.');
        router.replace('/messaging');
      
      } else if (fontsLoaded && !loading) {
        // Hide the splash screen if not authenticated
    
        SplashScreen.hideAsync();
      }
   
  }, [navigationState?.key, fontsLoaded, user, loading, router]);



  if (loading || !fontsLoaded) {
    // Keep the splash screen visible while loading authentication and fonts
    return null; // Alternatively, render a <LoadingScreen /> component
  }

 
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ChatProvider>
        <NotificationProvider>
          <Stack
            screenOptions={{
              contentStyle: { backgroundColor: '#1F2833' }, // Dark background
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="chats/[roomId]" options={{ headerShown: false }} />
            <Stack.Screen name="contacts/index" options={{ headerShown: false }} />
          </Stack>
          <StatusBar style="light" />
        </NotificationProvider>
      </ChatProvider>
    </GestureHandlerRootView>
  );
};

export default RootLayout;
