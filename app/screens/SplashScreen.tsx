
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { supabase } from '../lib/supabase';

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Wait 1-2 seconds as requested
        await new Promise(resolve => setTimeout(resolve, 1500));

        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
          router.replace('/screens/HomeScreen');
        } else {
          router.replace('/screens/AuthScreen');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        // Fallback to AuthScreen on error
        router.replace('/screens/AuthScreen');
      }
    };

    checkAuth();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pay & Promise</Text>
      <Text style={styles.subtitle}>Promises with consequences</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212', // Dark background
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#aaaaaa',
  },
});
