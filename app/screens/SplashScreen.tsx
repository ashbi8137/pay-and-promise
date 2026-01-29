import { useRouter } from 'expo-router';
import * as SplashScreenModule from 'expo-splash-screen';
import { useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { supabase } from '../../lib/supabase';

// Prevent native splash screen from autohiding
// REMOVED: Moved to _layout.tsx to avoid race conditions

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // 1. Hide the NATIVE splash screen immediately so our custom design is visible
        await SplashScreenModule.hideAsync();

        // 2. Minimum delay for custom splash (e.g. 2 seconds)
        const minDelayPromise = new Promise(resolve => setTimeout(resolve, 2000));

        // 3. Auth check with timeout (using getUser for server validation)
        const userCheck = supabase.auth.getUser().then(res => ({ ...res, isTimeout: false }));

        const timeoutCheck = new Promise<{ isTimeout: true; data: null; error: null }>((resolve) =>
          setTimeout(() => resolve({ isTimeout: true, data: null, error: null }), 5000)
        );

        // Race them
        const result = await Promise.race([userCheck, timeoutCheck]);

        // Wait for the minimum animation delay
        await minDelayPromise;

        if (result.isTimeout) {
          console.warn('Auth check timed out, defaulting to Landing');
          router.replace({
            pathname: '/screens/LandingScreen',
            params: { isAuthenticated: 'false' }
          });
          return;
        }

        const { data, error } = result;

        const isAuthenticated = !!(data?.user && !error);

        if (isAuthenticated) {
          // DIRECT NAVIGATION TO HOME if authenticated
          console.log('User authenticated, skipping Landing...');
          router.replace('/screens/HomeScreen');
        } else {
          // Explicitly sign out to clear any stale local state and show Landing
          await supabase.auth.signOut();
          router.replace({
            pathname: '/screens/LandingScreen',
            params: { isAuthenticated: 'false' }
          });
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        await SplashScreenModule.hideAsync();
        // Default to not authenticated
        router.replace({
          pathname: '/screens/LandingScreen',
          params: { isAuthenticated: 'false' }
        });
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
