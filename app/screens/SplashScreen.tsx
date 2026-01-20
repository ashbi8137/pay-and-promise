import { useRouter } from 'expo-router';
import * as SplashScreenModule from 'expo-splash-screen';
import { useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { supabase } from '../../lib/supabase';

// Prevent native splash screen from autohiding
SplashScreenModule.preventAutoHideAsync();

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // 1. Hide the NATIVE splash screen immediately so our custom design is visible
        await SplashScreenModule.hideAsync();

        // 2. Minimum delay for custom splash (e.g. 2 seconds)
        const minDelayPromise = new Promise(resolve => setTimeout(resolve, 2000));

        // 3. Auth check with timeout
        // We create a wrapper for the session promise to distinguish it
        const sessionCheck = supabase.auth.getSession().then(res => ({ ...res, isTimeout: false }));

        const timeoutCheck = new Promise<{ isTimeout: true; data: null; error: null }>((resolve) =>
          setTimeout(() => resolve({ isTimeout: true, data: null, error: null }), 5000)
        );

        // Race them
        const result = await Promise.race([sessionCheck, timeoutCheck]);

        // Wait for the minimum animation delay
        await minDelayPromise;

        if (result.isTimeout) {
          console.warn('Auth check timed out, defaulting to Landing');
          router.replace('/screens/LandingScreen');
          return;
        }

        const { data, error } = result;

        if (error) {
          throw error;
        }

        if (data?.session) {
          router.replace('/screens/HomeScreen');
        } else {
          router.replace('/screens/LandingScreen');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        // Ensure native splash is hidden if we crash early
        await SplashScreenModule.hideAsync();
        router.replace('/screens/AuthScreen');
      }
    };

    checkAuth();
  }, []);

  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/images/icon.png')}
        style={styles.logo}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 200,
    height: 200,
  },
});
