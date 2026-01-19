
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
        // Authenticate session
        const { data: { session } } = await supabase.auth.getSession();

        // 1. Hide the NATIVE splash screen immediately so our custom design is visible
        await SplashScreenModule.hideAsync();

        // 2. Show OUR custom splash screen for 3 seconds (User requested 3 sec)
        await new Promise(resolve => setTimeout(resolve, 3000));

        if (session) {
          router.replace('/screens/HomeScreen');
        } else {
          router.replace('/screens/LandingScreen');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        await SplashScreenModule.hideAsync();
        router.replace('/screens/AuthScreen');
      }
    };

    checkAuth();
  }, []);

  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/images/logo.jpg')}
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
