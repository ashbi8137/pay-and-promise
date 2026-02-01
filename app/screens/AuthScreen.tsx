import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Keyboard,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { GridOverlay } from '../../components/LuxuryVisuals';
import { useAlert } from '../../context/AlertContext';
import { supabase } from '../../lib/supabase';

const { width, height } = Dimensions.get('window');

// Initialize WebBrowser for OAuth
WebBrowser.maybeCompleteAuthSession();

export default function AuthScreen() {
  const router = useRouter();
  const { showAlert } = useAlert();

  // UX State
  const [loading, setLoading] = useState(false);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Handled by global listener
      }
    };
    checkSession();
  }, [router]);

  const signInWithGoogle = async () => {
    Keyboard.dismiss();
    setLoading(true);

    try {
      const redirectUrl = 'payandpromise://';
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        setLoading(false);
        showAlert({
          title: 'Authentication Error',
          message: error.message || 'Failed to initiate Google Sign-In.',
          type: 'error'
        });
        return;
      }

      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUrl,
          {
            showInRecents: true,
            preferEphemeralSession: false,
          }
        );

        if (result.type === 'success' && result.url) {
          const hashPart = result.url.split('#')[1];
          if (hashPart) {
            const params = new URLSearchParams(hashPart);
            const accessToken = params.get('access_token');
            const refreshToken = params.get('refresh_token');

            if (accessToken && refreshToken) {
              const { error: sessionError } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });

              if (sessionError) {
                setLoading(false);
                showAlert({
                  title: 'Session Error',
                  message: 'Failed to complete sign-in. Please try again.',
                  type: 'error'
                });
                return;
              }

              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                const googleName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
                await supabase.from('profiles').upsert({
                  id: user.id,
                  full_name: googleName,
                  updated_at: new Date().toISOString(),
                });
              }
              return;
            }
          }
          setLoading(false);
          showAlert({
            title: 'Processing Error',
            message: 'Authentication incomplete. Please try again.',
            type: 'error'
          });
        } else {
          setLoading(false);
        }
      }
    } catch (err) {
      setLoading(false);
      showAlert({
        title: 'Unexpected Error',
        message: 'An unexpected error occurred. Please try again.',
        type: 'error'
      });
    }
  };

  return (
    <View style={styles.container}>
      <GridOverlay />

      {/* Decorative background glows removed for focus */}

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>

          {/* Upper Section: Branding */}
          <Animated.View
            entering={FadeInDown.duration(1000).springify()}
            style={styles.brandingContainer}
          >
            <View style={styles.logoOuterCircle}>
              <View style={styles.logoInnerCircle}>
                <Image
                  source={require('../../assets/images/icon.png')}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>
            </View>

            <Text style={styles.appName}>Pay & Promise</Text>
            <View style={styles.taglineWrapper}>
              <View style={styles.taglineLine} />
              <Text style={styles.tagline}>Where Discipline Begins</Text>
              <View style={styles.taglineLine} />
            </View>
          </Animated.View>

          {/* Lower Section: Actions */}
          <Animated.View
            entering={FadeInUp.delay(400).duration(1000).springify()}
            style={styles.actionContainer}
          >
            <View style={styles.accessCard}>
              <View style={styles.accessHeader}>
                <View style={styles.securityIndicator} />
                <Text style={styles.authTitle}>PROTOCOL ACCESS</Text>
              </View>
              <Text style={styles.authDescription}>
                Authenticate your identity to continue to the executive dashboard.
              </Text>

              <TouchableOpacity
                style={[styles.googleButton, loading && styles.googleButtonDisabled]}
                onPress={signInWithGoogle}
                disabled={loading}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={['#4F46E5', '#6366F1']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.buttonGradient}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <View style={styles.googleIconContainer}>
                        <Ionicons name="logo-google" size={20} color="#FFFFFF" />
                      </View>
                      <Text style={styles.googleButtonText}>Continue with Google</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText} onPress={() => router.push('/screens/TermsScreen')}>Terms</Text>
              <View style={styles.footerDot} />
              <Text style={styles.footerText} onPress={() => router.push('/screens/PrivacyPolicyScreen')}>Privacy</Text>
            </View>
          </Animated.View>

        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'space-between',
    paddingVertical: 40,
  },
  brandingContainer: {
    alignItems: 'center',
    marginTop: height * 0.05,
  },
  logoOuterCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 10,
    marginBottom: 40,
  },
  logoInnerCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  welcomeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 8,
  },
  appName: {
    fontSize: 42,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -2,
  },
  taglineWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 12,
  },
  taglineLine: {
    width: 20,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  tagline: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  actionContainer: {
    width: '100%',
    paddingBottom: 20,
  },
  accessCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 32,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.1,
    shadowRadius: 30,
    elevation: 10,
  },
  accessHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  securityIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  authTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 2,
  },
  authDescription: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 22,
    fontWeight: '600',
    marginBottom: 32,
  },
  googleButton: {
    width: '100%',
    height: 64,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  buttonGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  googleButtonDisabled: {
    opacity: 0.7,
  },
  googleIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    gap: 12,
  },
  footerText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  footerDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#CBD5E1',
  }
});
