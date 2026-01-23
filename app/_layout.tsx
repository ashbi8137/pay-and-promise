
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { cleanupOldProofImages } from '../lib/supabase';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync().catch(() => {
  /* reloading the app might trigger some race conditions, ignore them */
});

export default function RootLayout() {
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
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="screens/SplashScreen" />
      <Stack.Screen name="screens/AuthScreen" />
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
  );
}
