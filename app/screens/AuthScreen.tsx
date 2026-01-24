import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import { supabase } from '../../lib/supabase';

// Initialize WebBrowser for OAuth
WebBrowser.maybeCompleteAuthSession();

export default function AuthScreen() {
  const router = useRouter();

  // Form State - No input needed for Google auth

  // UX State
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('AuthScreen: Checking session on mount', session?.user?.id);
      if (session) {
        router.replace('/screens/HomeScreen');
      }
    };
    checkSession();
  }, [router]);

  const signInWithGoogle = async () => {
    setErrorMessage(null);
    Keyboard.dismiss();

    setLoading(true);

    try {
      // Use the app's custom URL scheme
      const redirectUrl = 'payandpromise://';

      console.log('Starting Google OAuth...');
      console.log('Redirect URL:', redirectUrl);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        setLoading(false);
        console.error('OAuth initiation error:', error);
        setErrorMessage(error.message || 'Failed to initiate Google Sign-In.');
        return;
      }

      if (data?.url) {
        console.log('Opening auth URL in browser...');

        // Open the browser for OAuth
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUrl,
          {
            showInRecents: true,
            preferEphemeralSession: false,
          }
        );

        console.log('WebBrowser result type:', result.type);

        if (result.type === 'success' && result.url) {
          console.log('Callback URL received:', result.url);

          // Parse the callback URL
          const hashPart = result.url.split('#')[1];
          if (hashPart) {
            const params = new URLSearchParams(hashPart);
            const accessToken = params.get('access_token');
            const refreshToken = params.get('refresh_token');

            console.log('Tokens received:', {
              hasAccessToken: !!accessToken,
              hasRefreshToken: !!refreshToken
            });

            if (accessToken && refreshToken) {
              console.log('Setting session...');
              const { error: sessionError } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });

              if (sessionError) {
                setLoading(false);
                console.error('Session error:', sessionError);
                setErrorMessage('Failed to complete sign-in. Please try again.');
                return;
              }

              console.log('Session set successfully!');

              // Update profile with full name from Google metadata
              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                console.log('Updating profile for user:', user.id);
                const googleName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
                await supabase.from('profiles').upsert({
                  id: user.id,
                  full_name: googleName,
                  updated_at: new Date().toISOString(),
                });
              }

              setLoading(false);
              console.log('Navigating to HomeScreen...');
              router.replace('/screens/HomeScreen');
              return;
            }
          }

          // If we got here, something went wrong with the tokens
          setLoading(false);
          console.error('No tokens in callback URL');
          setErrorMessage('Authentication incomplete. Please try again.');

        } else if (result.type === 'cancel' || result.type === 'dismiss') {
          setLoading(false);
          console.log('User cancelled authentication');
        } else {
          setLoading(false);
          console.log('Authentication failed:', result.type);
          setErrorMessage('Authentication was not completed. Please try again.');
        }
      }
    } catch (err) {
      setLoading(false);
      console.error('Google Sign-In Error:', err);
      setErrorMessage('An unexpected error occurred. Please try again.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <TouchableWithoutFeedback onPress={Platform.OS === 'web' ? undefined : Keyboard.dismiss}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo Section */}
          <View style={styles.logoContainer}>
            <Image
              source={require('../../assets/images/icon.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>Welcome to Pay & Promise</Text>
            <Text style={styles.subtitle}>
              Sign in with Google to get started
            </Text>

            {/* Error Message Display */}
            {errorMessage && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color="#EF4444" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            <View style={styles.buttonContainer}>
              {/* Google Sign-In Button */}
              <TouchableOpacity
                style={[styles.googleButton, loading && styles.googleButtonDisabled]}
                onPress={signInWithGoogle}
                disabled={loading}
              >
                {loading ? (
                  <View style={styles.buttonContent}>
                    <ActivityIndicator color="#4285F4" size="small" />
                    <Text style={styles.googleButtonText}>Signing in...</Text>
                  </View>
                ) : (
                  <View style={styles.buttonContent}>
                    <View style={styles.googleIconContainer}>
                      <Text style={styles.googleIconText}>G</Text>
                    </View>
                    <Text style={styles.googleButtonText}>Continue with Google</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Info Text */}
              <Text style={styles.infoText}>
                By continuing, you agree to our Terms of Service and Privacy Policy
              </Text>
            </View>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 0,
  },
  logoImage: {
    width: 100,
    height: 100,
    borderRadius: 24,
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#64748B',
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 22,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: '#FECACA'
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F8FAFC',
    color: '#0F172A',
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  buttonContainer: {
    gap: 16,
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 30,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  googleButtonDisabled: {
    opacity: 0.7,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  googleIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4285F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIconText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  googleButtonText: {
    color: '#1E293B',
    fontSize: 16,
    fontWeight: '600',
  },
  infoText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 8,
  },
});
