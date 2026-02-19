import * as Linking from 'expo-linking';
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { supabase } from '../lib/supabase';

export default function Index() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // 1. Check if we are opening from a Deep Link (OAuth callback)
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl && (initialUrl.includes('access_token') || initialUrl.includes('#access_token'))) {
          console.log('Index: Deep link detected, waiting for session...');
          // Don't finish loading yet. Wait for _layout.tsx to handle the session.
          // Set up a listener to react when the session is actually set.
          // Safety timeout in case auth fails or is too slow
          const safetyTimer = setTimeout(() => {
            console.log('Index: Deep link auth timed out, falling back to unauthenticated.'); // Changed 'unstated' to 'unauthenticated'
            setIsLoading(false);
          }, 5000);

          const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session) {
              clearTimeout(safetyTimer);
              setIsAuthenticated(true);
              setIsLoading(false);
            }
          });
          return () => {
            clearTimeout(safetyTimer);
            subscription.unsubscribe();
          };
        }

        // 2. Normal check
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch (e) {
        console.error('Index Auth Check Error:', e);
        setIsAuthenticated(false);
      } finally {
        // Only stop loading if we didn't find a deep link (if deep link found, the listener handles it)
        const initialUrl = await Linking.getInitialURL();
        if (!initialUrl || (!initialUrl.includes('access_token') && !initialUrl.includes('#access_token'))) {
          setIsLoading(false);
        }
      }
    };
    checkAuth();
  }, []);

  // Show nothing while checking auth (splash screen is still visible)
  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#5B2DAD" />
      </View>
    );
  }

  // Redirect based on auth status
  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/screens/LandingScreen" />;
}
