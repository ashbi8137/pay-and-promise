
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

/**
 * Cleanup old proof images from Supabase Storage to save space.
 * Deletes all proof images from dates before today.
 * Should be called once when app loads.
 */
export const cleanupOldProofImages = async (): Promise<{ deleted: number; errors: number }> => {
    try {
        const today = new Date().toISOString().split('T')[0];

        // 1. Find all old submissions with image URLs (before today)
        const { data: oldSubmissions, error: fetchError } = await supabase
            .from('promise_submissions')
            .select('id, image_url')
            .lt('date', today)
            .neq('image_url', 'manual_fail')
            .neq('image_url', 'auto_fail_placeholder')
            .not('image_url', 'is', null);

        if (fetchError) {
            console.error('Cleanup: Error fetching old submissions:', fetchError);
            return { deleted: 0, errors: 1 };
        }

        if (!oldSubmissions || oldSubmissions.length === 0) {
            console.log('Cleanup: No old proof images to delete');
            return { deleted: 0, errors: 0 };
        }

        let deletedCount = 0;
        let errorCount = 0;
        const filesToDelete: string[] = [];

        // 2. Extract file paths from public URLs
        for (const sub of oldSubmissions) {
            const url = sub.image_url;
            // URL format: https://xxx.supabase.co/storage/v1/object/public/proofs/userId/timestamp.ext
            const pathMatch = url.match(/\/proofs\/(.+)$/);
            if (pathMatch) {
                filesToDelete.push(pathMatch[1]);
            }
        }

        if (filesToDelete.length > 0) {
            // 3. Batch delete from storage (Supabase allows batch delete)
            const { error: deleteError } = await supabase.storage
                .from('proofs')
                .remove(filesToDelete);

            if (deleteError) {
                console.error('Cleanup: Error deleting files from storage:', deleteError);
                errorCount = filesToDelete.length;
            } else {
                deletedCount = filesToDelete.length;
                console.log(`Cleanup: Successfully deleted ${deletedCount} old proof images`);
            }
        }

        return { deleted: deletedCount, errors: errorCount };
    } catch (error) {
        console.error('Cleanup: Unexpected error:', error);
        return { deleted: 0, errors: 1 };
    }
};
