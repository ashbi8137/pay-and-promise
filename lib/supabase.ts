
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

if (!process.env.EXPO_PUBLIC_SUPABASE_URL || !process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) {
    console.error("Missing Supabase URL or Key in .env file");
}

// Check if we're in a React Native environment (not SSR/Node.js during export)
const isReactNative = Platform.OS === 'android' || Platform.OS === 'ios';

export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        storage: isReactNative ? AsyncStorage : undefined,
        autoRefreshToken: true,
        persistSession: isReactNative,
        detectSessionInUrl: false,
    },
});
