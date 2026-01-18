import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import { supabase } from '../../lib/supabase';

export default function AuthScreen() {
  const router = useRouter();

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  // UX State
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Clear errors when switching modes
  const handleModeSwitch = () => {
    setIsSignUp(!isSignUp);
    setErrorMessage(null);
    setEmail('');
    setPassword('');
    setFullName('');
  };

  const signIn = async () => {
    setErrorMessage(null);
    Keyboard.dismiss();

    if (!email || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);

    if (error) {
      // User-friendly error message
      setErrorMessage('Email or password is incorrect. Please try again.');
    } else {
      router.replace('/screens/HomeScreen');
    }
  };

  const signUp = async () => {
    setErrorMessage(null);
    Keyboard.dismiss();

    if (!email || !password || !fullName) {
      setErrorMessage('Please enter email, password, and full name.');
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      setLoading(false);
      setErrorMessage(error.message || 'Sign up failed. Please try again.');
      return;
    }

    if (data.user) {
      console.log('User created:', data.user.id);
    }

    setLoading(false);
    Alert.alert(
      'Success',
      'Account created successfully! Please sign in.',
      [
        {
          text: 'OK',
          onPress: () => {
            setIsSignUp(false);
            setErrorMessage(null);
            setPassword('');
          }
        }
      ]
    );
  };

  const handleForgotPassword = () => {
    Alert.alert('Forgot Password', 'Password reset functionality will be available in the next update.');
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
          <Text style={styles.headerTitle}>Pay & Promise</Text>

          <View style={styles.card}>
            <Text style={styles.title}>{isSignUp ? 'Create Account' : 'Welcome Back'}</Text>
            <Text style={styles.subtitle}>
              {isSignUp ? 'Sign up to start your journey' : 'Please sign in to continue'}
            </Text>

            {/* Error Message Display */}
            {errorMessage && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color="#EF4444" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            {isSignUp && (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="John Doe"
                  placeholderTextColor="#94A3B8"
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                />
              </View>
            )}

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor="#94A3B8"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordWrapper}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="••••••••"
                  placeholderTextColor="#94A3B8"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="#64748B"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Forgot Password Link (Only for Sign In) */}
            {!isSignUp && (
              <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotButton}>
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>
            )}

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
                onPress={isSignUp ? signUp : signIn}
                disabled={loading}
              >
                {loading ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <ActivityIndicator color="#FFFFFF" size="small" />
                    <Text style={styles.primaryButtonText}>
                      {isSignUp ? 'Signing Up...' : 'Signing In...'}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.primaryButtonText}>
                    {isSignUp ? 'Sign Up' : 'Sign In'}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.toggleButton} onPress={handleModeSwitch} disabled={loading}>
                <Text style={styles.toggleButtonText}>
                  {isSignUp ? 'Already have an account? Log In' : 'Don\'t have an account? Sign Up'}
                </Text>
              </TouchableOpacity>
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
    backgroundColor: '#F1F5F9', // Light Slate background
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A', // Navy Title
    textAlign: 'center',
    marginBottom: 32,
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: '#FFFFFF', // White Card
    borderRadius: 20,
    padding: 32,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B', // Dark Slate
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B', // Muted text
    marginBottom: 24,
    textAlign: 'center',
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
    marginBottom: 20,
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
    borderColor: '#CBD5E1',
  },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingRight: 16,
  },
  passwordInput: {
    flex: 1,
    color: '#0F172A',
    padding: 16,
    fontSize: 16,
  },
  eyeIcon: {
    padding: 4,
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginBottom: 24,
    marginTop: -8,
  },
  forgotText: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonContainer: {
    marginTop: 0,
    gap: 16,
  },
  primaryButton: {
    backgroundColor: '#0F172A',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  toggleButton: {
    alignItems: 'center',
    padding: 8,
  },
  toggleButtonText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '500',
  },
});
