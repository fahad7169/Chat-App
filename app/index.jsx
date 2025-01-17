import { View, ActivityIndicator } from 'react-native';
import React, { useEffect, useState } from 'react';
import OnBoarding from '../components/OnBoarding';
import { useRouter } from 'expo-router';
import { auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import * as BackgroundFetch from 'expo-background-fetch';



const App = () => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const router = useRouter();



  useEffect(() => {
    // Listen for authentication state changes
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      setUser(authUser);
      setLoading(false);
    });

    return () => unsubscribe(); // Clean up the listener when the component is unmounted
  }, []);

  useEffect(() => {
    if (!loading && user) {
      router.replace('/messaging'); // Redirect after auth state is resolved
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-[#1F2833]">
        <ActivityIndicator size="large" color="white" />
      </View>
    );
  }

  if (!user) {
    return <OnBoarding />;
  }

  // The return below is just a fallback (it will never render due to router.replace)
  return null;
};

export default App;
