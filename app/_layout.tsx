
import * as Linking from 'expo-linking';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { cleanupOldProofImages, supabase } from '../lib/supabase';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync().catch(() => {
  /* reloading the app might trigger some race conditions, ignore them */
});

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [isProcessingAuth, setIsProcessingAuth] = useState(false);

  // Handle OAuth callback deep links
  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      const url = event.url;
      console.log('Deep link received in _layout:', url);

      // Check if this is an OAuth callback
      if (url.includes('access_token') || url.includes('#access_token')) {
        setIsProcessingAuth(true);
        try {
          const hashPart = url.split('#')[1];
          if (hashPart) {
            const params = new URLSearchParams(hashPart);
            const accessToken = params.get('access_token');
            const refreshToken = params.get('refresh_token');

            if (accessToken && refreshToken) {
              console.log('Setting session from OAuth callback...');
              const { error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });

              if (!error) {
                console.log('Session set successfully via Deep Link');
                router.replace('/(tabs)');
              } else {
                console.error('Error setting session:', error);
              }
            }
          }
        } catch (err) {
          console.error('Error processing OAuth callback:', err);
        }
        setIsProcessingAuth(false);
      }
    };

    // Subscribe to incoming links
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Check initial URL (in case app was opened via link)
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [router]);

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session?.user?.id);

      // Only navigate if we're not already processing auth
      if (event === 'SIGNED_IN' && session && !isProcessingAuth) {
        // Check if we're on AuthScreen only. LandingScreen handles its own navigation now.
        const currentScreen = segments[1]; // screens/AuthScreen -> AuthScreen
        if (currentScreen === 'AuthScreen') {
          console.log('User signed in, navigating to Tabs');
          router.replace('/(tabs)');
        }
      } else if (event === 'SIGNED_OUT') {
        const currentScreen = segments[1];
        // Only navigate to Landing if we are not already in the auth flow (AuthScreen or LandingScreen)
        // This prevents "ghost" redirects to Landing during the sign-in process
        if (currentScreen !== 'AuthScreen' && currentScreen !== 'LandingScreen') {
          router.replace('/screens/LandingScreen');
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, segments, isProcessingAuth]);

  useEffect(() => {
    // Safety Force-Hide: If the app hasn't hidden the splash screen in 6 seconds, do it anyway.
    // This reveals crashes that happen behind the splash screen.
    const timer = setTimeout(async () => {
      console.log('Safety Timer: Forcing Splash Screen hide.');
      await SplashScreen.hideAsync();
    }, 6000); // 6 seconds

    // Cleanup old proof images from storage (runs once on app load)
    cleanupOldProofImages().then(result => {
      if (result.deleted > 0) {
        console.log(`Cleanup: Deleted ${result.deleted} old proof images`);
      }
    }).catch(err => console.log('Cleanup failed:', err));

    return () => clearTimeout(timer);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="index" />
        <Stack.Screen name="screens/SplashScreen" />
        <Stack.Screen name="screens/AuthScreen" />
        {/* Kept for backward compat but Tabs are primary now */}
        <Stack.Screen name="screens/HomeScreen" />
        <Stack.Screen name="screens/CreatePromiseScreen" />
        <Stack.Screen name="screens/PromiseDetailScreen" />
        <Stack.Screen name="screens/JoinPromiseScreen" />
        <Stack.Screen name="screens/ProfileScreen" />
        <Stack.Screen name="screens/TransactionHistoryScreen" />
        <Stack.Screen name="screens/LandingScreen" />
        <Stack.Screen name="screens/SettingsScreen" />
        <Stack.Screen name="screens/SupportScreen" />
        <Stack.Screen name="screens/PrivacySecurityScreen" />
        <Stack.Screen name="screens/PrivacyPolicyScreen" />
        <Stack.Screen name="screens/TermsScreen" />
        <Stack.Screen name="screens/AboutScreen" />
        <Stack.Screen name="screens/PromiseReportScreen" />
        <Stack.Screen name="screens/JourneyScreen" />
      </Stack>
    </GestureHandlerRootView>
  );
}
