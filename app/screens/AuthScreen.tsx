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
      {/* Ambient Background Gradients */}
      <View style={styles.ambientContainer}>
        <View style={styles.ambientCircle1} />
        <View style={styles.ambientCircle2} />
      </View>

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

            <Text style={styles.welcomeText}>Welcome to</Text>
            <Text style={styles.appName}>Pay & Promise</Text>
            <View style={styles.divider} />
            <Text style={styles.tagline}>"Where discipline begins"</Text>
          </Animated.View>

          {/* Lower Section: Actions */}
          <Animated.View
            entering={FadeInUp.delay(400).duration(1000).springify()}
            style={styles.actionContainer}
          >
            {/* <View style={styles.glassCard}> */}
            <Text style={styles.authTitle}>Secure Access</Text>
            <Text style={styles.authDescription}>
              Join a community of honorable individuals committed to their goals.
            </Text>

            <TouchableOpacity
              style={[styles.googleButton, loading && styles.googleButtonDisabled]}
              onPress={signInWithGoogle}
              disabled={loading}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#4F46E5', '#7C3AED']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <View style={styles.whiteBadge}>
                      <Ionicons name="logo-google" size={18} color="#4F46E5" />
                    </View>
                    <Text style={styles.googleButtonText}>Continue with Google</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.termsContainer}>
              <Text style={styles.termsText}>
                By continuing, you agree to our{' '}
                <Text style={styles.linkText} onPress={() => router.push('/screens/TermsScreen')}>Terms</Text>
                {' '}and{' '}
                <Text style={styles.linkText} onPress={() => router.push('/screens/PrivacyPolicyScreen')}>Privacy</Text>
              </Text>
            </View>
            {/* </View> */}

            <View style={styles.footer}>
              <TouchableOpacity style={styles.footerLink}>
                <Text style={styles.footerText}>Need Help?</Text>
              </TouchableOpacity>
              <View style={styles.footerDot} />
              <TouchableOpacity style={styles.footerLink}>
                <Text style={styles.footerText}>About Us</Text>
              </TouchableOpacity>
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
  ambientContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  ambientCircle1: {
    position: 'absolute',
    top: -height * 0.1,
    right: -width * 0.2,
    width: width * 1.5,
    height: width * 1.5,
    borderRadius: width * 0.75,
    backgroundColor: 'rgba(79, 70, 229, 0.05)',
  },
  ambientCircle2: {
    position: 'absolute',
    bottom: -height * 0.2,
    left: -width * 0.4,
    width: width * 1.2,
    height: width * 1.2,
    borderRadius: width * 0.6,
    backgroundColor: 'rgba(124, 58, 237, 0.05)',
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
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 20,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    marginBottom: 32,
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
    fontSize: 40,
    fontWeight: '900',
    color: '#1E293B',
    letterSpacing: -1,
  },
  divider: {
    width: 40,
    height: 4,
    backgroundColor: '#4F46E5',
    borderRadius: 2,
    marginVertical: 16,
  },
  tagline: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '500',
    fontStyle: 'italic',
  },
  actionContainer: {
    width: '100%',
    paddingBottom: 20,
  },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 32,
    padding: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
  },
  authTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 8,
  },
  authDescription: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 22,
    marginBottom: 32,
  },
  googleButton: {
    width: '100%',
    height: 64,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
  },
  buttonGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  googleButtonDisabled: {
    opacity: 0.7,
  },
  whiteBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  termsContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  termsText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
  },
  linkText: {
    color: '#4F46E5',
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
    gap: 12,
  },
  footerLink: {
    padding: 4,
  },
  footerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  footerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
  }
});
