import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import { supabase } from '../../lib/supabase';

export default function JoinPromiseScreen() {
    const router = useRouter();
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);

    const handleJoin = async () => {
        if (!code || code.length < 6) {
            Alert.alert('Invalid Code', 'Please enter a valid 6-character invite code.', [{ text: 'OK' }]);
            return;
        }

        setLoading(true);
        Keyboard.dismiss();

        try {
            // 1. Find Promise by Invite Code
            const { data: promise, error: fetchError } = await supabase
                .from('promises')
                .select('id, title, number_of_people')
                .eq('invite_code', code.toUpperCase())
                .single();

            if (fetchError || !promise) {
                Alert.alert('Not Found', 'No promise found with this code. Please check and try again.');
                setLoading(false);
                return;
            }

            // 2. Alert Confirmation (The "Review" Step)
            Alert.alert(
                'Join Promise?',
                `Do you want to join "${promise.title}" with other participants?`,
                [
                    {
                        text: 'Cancel',
                        style: 'cancel',
                        onPress: () => setLoading(false)
                    },
                    {
                        text: 'Join Now',
                        style: 'default',
                        onPress: async () => {
                            try {
                                const { data: { user } } = await supabase.auth.getUser();
                                if (!user) {
                                    setLoading(false);
                                    return;
                                }

                                const { error: joinError } = await supabase
                                    .from('promise_participants')
                                    .insert({
                                        promise_id: promise.id,
                                        user_id: user.id
                                    });

                                if (joinError) {
                                    if (joinError.code === '23505') { // Unique violation
                                        Alert.alert('Already Joined', 'You are already a participant in this promise.');
                                    } else {
                                        Alert.alert('Error', 'Failed to join promise.');
                                        console.error(joinError);
                                    }
                                } else {
                                    Alert.alert(
                                        'Success!',
                                        `You have successfully joined "${promise.title}".`,
                                        [{ text: 'Let\'s Go', onPress: () => router.navigate('/screens/HomeScreen') }]
                                    );
                                }
                            } catch (e) {
                                console.error(e);
                            } finally {
                                setLoading(false);
                            }
                        }
                    }
                ]
            );

        } catch (e) {
            console.error(e);
            Alert.alert('Error', 'An unexpected error occurred.');
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={styles.content}>
                        {/* Header */}
                        <View style={styles.header}>
                            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                                <Ionicons name="arrow-back" size={24} color="#334155" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.title}>Join a Promise</Text>
                        <Text style={styles.subtitle}>Join a challenge safely and confidently.</Text>

                        <View style={styles.form}>
                            <View style={styles.trustHeader}>
                                <Ionicons name="shield-checkmark-outline" size={16} color="#4338ca" />
                                <Text style={styles.trustHeaderText}>You’ll see all details before confirming.</Text>
                            </View>

                            <Text style={styles.label}>Invite Code</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter 6-char code"
                                placeholderTextColor="#94A3B8"
                                value={code}
                                onChangeText={(text) => {
                                    // Auto uppercase and remove spaces
                                    const cleaned = text.toUpperCase().replace(/\s/g, '');
                                    if (cleaned.length <= 6) {
                                        setCode(cleaned);
                                    }
                                }}
                                autoCapitalize="characters"
                                maxLength={6}
                                autoCorrect={false}
                            />
                            <Text style={styles.helperText}>Get the 6-character invite code from your friend who created the promise.</Text>

                            <TouchableOpacity
                                onPress={handleJoin}
                                disabled={loading || code.length < 6}
                                activeOpacity={0.8}
                            >
                                {(code.length === 6 && !loading) ? (
                                    <LinearGradient
                                        colors={['#4F46E5', '#4338ca']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={styles.joinButton}
                                    >
                                        <Text style={styles.joinButtonText}>Review & Join</Text>
                                    </LinearGradient>
                                ) : (
                                    <View style={[styles.joinButton, styles.disabledButton]}>
                                        {loading ? (
                                            <ActivityIndicator color="#94A3B8" />
                                        ) : (
                                            <Text style={styles.joinButtonTextDisabled}>Join Promise</Text>
                                        )}
                                    </View>
                                )}
                            </TouchableOpacity>

                            <Text style={styles.nextStepHint}>You’ll review the promise details before joining.</Text>
                        </View>

                        {/* Motivational Footer */}
                        <View style={styles.footerContainer}>
                            <View style={styles.iconGroup}>
                                <Ionicons name="people-circle" size={40} color="#CBD5E1" style={{ marginRight: -12 }} />
                                <Ionicons name="people-circle" size={40} color="#94A3B8" style={{ zIndex: 1 }} />
                                <Ionicons name="people-circle" size={40} color="#CBD5E1" style={{ marginLeft: -12 }} />
                            </View>
                            <Text style={styles.footerText}>Join your friends and stay accountable together.</Text>
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    content: {
        flex: 1,
        padding: 24,
    },
    header: {
        marginBottom: 20,
        alignItems: 'flex-start', // Align back button to left
    },
    backButton: {
        padding: 10,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        color: '#0F172A',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#64748B',
        marginBottom: 32,
        lineHeight: 24,
    },
    form: {
        backgroundColor: '#FFFFFF',
        padding: 24,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 2,
    },
    trustHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        backgroundColor: '#EEF2FF',
        padding: 10,
        borderRadius: 12,
        gap: 6,
    },
    trustHeaderText: {
        fontSize: 12,
        color: '#4338ca',
        fontWeight: '600',
    },
    label: {
        fontSize: 14,
        fontWeight: '700',
        color: '#334155',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    input: {
        backgroundColor: '#F1F5F9',
        borderWidth: 2,
        borderColor: '#E2E8F0',
        borderRadius: 16,
        padding: 20,
        fontSize: 24,
        fontWeight: '700',
        color: '#0F172A',
        textAlign: 'center',
        letterSpacing: 6,
    },
    helperText: {
        fontSize: 13,
        color: '#64748B',
        marginTop: 12,
        textAlign: 'center',
        lineHeight: 20,
    },
    joinButton: {
        paddingVertical: 18,
        borderRadius: 16,
        alignItems: 'center',
        marginTop: 24,
        width: '100%',
    },
    disabledButton: {
        backgroundColor: '#F1F5F9',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    joinButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
    },
    joinButtonTextDisabled: {
        color: '#94A3B8',
        fontSize: 18,
        fontWeight: '700',
    },
    nextStepHint: {
        textAlign: 'center',
        fontSize: 12,
        color: '#94A3B8',
        marginTop: 16,
    },
    // Footer
    footerContainer: {
        marginTop: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconGroup: {
        flexDirection: 'row',
        marginBottom: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    footerText: {
        fontSize: 14,
        color: '#64748B',
        fontWeight: '500',
    }
});
