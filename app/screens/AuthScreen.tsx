import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Keyboard,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../../lib/supabase';

// Initialize WebBrowser for OAuth
WebBrowser.maybeCompleteAuthSession();

export default function AuthScreen() {
  const router = useRouter();

  // UX State
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('AuthScreen: Checking session on mount', session?.user?.id);
      if (session) {
        // router.replace('/screens/HomeScreen'); // HANDLED BY GLOBAL LISTENER
      }
    };
    checkSession();
  }, [router]);

  const signInWithGoogle = async () => {
    setErrorMessage(null);
    Keyboard.dismiss();

    setLoading(true);

    try {
      // Use the app's custom URL scheme (Required for Dev Build / Native)
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

              console.log('Profile updated/verified.');

              // Explicitly navigate to ensure we don't get stuck
              // router.replace('/screens/HomeScreen'); // HANDLED BY GLOBAL LISTENER
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
    <SafeAreaView style={styles.container}>
      <View style={styles.contentContainer}>

        {/* Branding Section */}
        <View style={styles.brandingSection}>
          <View style={styles.logoShadow}>
            <Image
              source={require('../../assets/images/icon.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.appName}>Pay & Promise</Text>
          <Text style={styles.tagline}>Where discipline begins.</Text>
        </View>

        {/* Auth Section */}
        <View style={styles.authSection}>
          {errorMessage && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={20} color="#EF4444" />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          <View style={styles.actionContainer}>
            <Text style={styles.subtitle}>Sign in using your Google account to continue.</Text>

            <TouchableOpacity
              style={[
                styles.googleButton,
                loading && styles.googleButtonDisabled
              ]}
              onPress={signInWithGoogle}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <View style={styles.buttonContent}>
                  <ActivityIndicator color="#4285F4" size="small" />
                  <Text style={styles.googleButtonText}>Signing in...</Text>
                </View>
              ) : (
                <View style={styles.buttonContent}>
                  <View style={styles.googleIconContainer}>
                    <Text style={styles.googleIconFormatted}>G</Text>
                  </View>
                  <Text style={styles.googleButtonText}>Continue with Google</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Terms Links */}
            <View style={styles.termsContainer}>
              <Text style={styles.termsText}>
                By continuing, you agree to our{' '}
                <Text
                  style={styles.linkText}
                  onPress={() => router.push('/screens/TermsScreen')}
                >
                  Terms of Service
                </Text>{' '}
                and{' '}
                <Text
                  style={styles.linkText}
                  onPress={() => router.push('/screens/PrivacyPolicyScreen')}
                >
                  Privacy Policy
                </Text>.
              </Text>
            </View>
          </View>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  brandingSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
  },
  logoShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
    marginBottom: 24,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 24,
  },
  appName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '500',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  authSection: {
    paddingBottom: 40,
  },
  actionContainer: {
    width: '100%',
  },
  subtitle: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: '500',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 12,
    marginBottom: 24,
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
  googleButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 24,
  },
  googleButtonDisabled: {
    opacity: 0.7,
    backgroundColor: '#F8FAFC',
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
    backgroundColor: '#4285F4', // Google Blue
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIconFormatted: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
  googleButtonText: {
    color: '#1E293B',
    fontSize: 16,
    fontWeight: '600',
  },
  termsContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  termsText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
  },
  linkText: {
    color: '#0F172A',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
