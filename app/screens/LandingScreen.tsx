import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Animated, {
    FadeIn,
    FadeInDown,
    FadeInUp,
    useAnimatedStyle,
    useSharedValue,
    withSequence,
    withSpring,
    withTiming
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LandingScreen() {
    const router = useRouter();
    const [step, setStep] = useState(0);

    // Animation Values
    const scale = useSharedValue(1);
    const shake = useSharedValue(0);
    const glowOpacity = useSharedValue(0);
    const borderColor = useSharedValue('#E2E8F0');

    useEffect(() => {
        // Step 0: "Promises are easy..." (0-2s)

        // Step 1: "Keeping them is hard." (2s -> 4.5s)
        const t1 = setTimeout(() => {
            setStep(1);
            // Shake effect + Zoom
            shake.value = withSequence(
                withTiming(-3, { duration: 50 }),
                withTiming(3, { duration: 50 }),
                withTiming(-3, { duration: 50 }),
                withTiming(3, { duration: 50 }),
                withTiming(0, { duration: 50 })
            );
            scale.value = withSpring(1.03); // Slight zoom
        }, 2000);

        // Step 2: "So make them expensive." (4.5s -> 7.5s)
        const t2 = setTimeout(() => {
            setStep(2);
            glowOpacity.value = withTiming(1, { duration: 1000 });
            borderColor.value = withTiming('#4F46E5', { duration: 1000 });
            scale.value = withSpring(1.1); // Scale up
        }, 4500);

        // Step 3: Final Reveal (9s+)
        const t3 = setTimeout(() => {
            setStep(3);
            scale.value = withSpring(1); // Settle
        }, 9000);

        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
            clearTimeout(t3);
        };
    }, []);

    const animatedCardStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: shake.value },
            { scale: scale.value }
        ],
        // Step 3: Make card transparent/invisible effectively
        backgroundColor: step === 3 ? 'transparent' : '#FFFFFF',
        shadowOpacity: step === 3 ? 0 : (glowOpacity.value ? 0.3 : 0.08),
        elevation: step === 3 ? 0 : 4,
        borderColor: step === 3 ? 'transparent' : borderColor.value,
        shadowColor: step === 3 ? 'transparent' : '#64748B',
        // Force reset other shadow props
        shadowRadius: step === 3 ? 0 : 24,
        shadowOffset: step === 3 ? { width: 0, height: 0 } : { width: 0, height: 12 },
    }), [step]);

    const renderTextContent = () => {
        switch (step) {
            case 0:
                return (
                    <Animated.Text
                        entering={FadeIn.duration(800)}
                        style={styles.textEasy}
                    >
                        Promises are easy...
                    </Animated.Text>
                );
            case 1:
                return (
                    <Animated.Text
                        entering={FadeInDown.springify().damping(12)}
                        style={styles.textHard}
                    >
                        Keeping them is hard.
                    </Animated.Text>
                );
            case 2:
                return (
                    <View style={{ alignItems: 'center' }}>
                        <Animated.Text
                            entering={FadeInDown.duration(600)}
                            style={styles.textSoMakeThem}
                        >
                            So make them
                        </Animated.Text>

                        <Animated.View entering={FadeInDown.delay(200).springify()}>
                            <LinearGradient
                                colors={['#F59E0B', '#B45309']} // Gold Gradient
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.expensiveBadge}
                            >
                                <Text style={styles.textExpensiveWhite}>EXPENSIVE.</Text>
                            </LinearGradient>
                        </Animated.View>

                        <Animated.Text
                            entering={FadeInUp.delay(500).springify()}
                            style={styles.textBridge}
                        >
                            Because pain creates discipline.
                        </Animated.Text>
                    </View>
                );
            case 3:
                return (
                    <Animated.Text
                        entering={FadeInDown.delay(200).springify()}
                        style={styles.textBrand}
                    >
                        Pay & Promise
                    </Animated.Text>
                );
            default: return null;
        }
    };

    const renderSubText = () => {
        if (step === 3) return "Where discipline begins.";
        return "";
    };

    return (
        <View style={styles.background}>
            <StatusBar style="dark" />

            <SafeAreaView style={styles.container}>
                {/* Main Content Centered */}
                <View style={styles.centerContent}>

                    {/* The Morphing Card */}
                    {/* In step 3, background is transparent, essentially removing the "shape" */}
                    <Animated.View
                        style={[
                            styles.card,
                            animatedCardStyle,
                            // Double-safety: force transparency via React props if step is 3
                            step === 3 && {
                                backgroundColor: 'transparent',
                                borderWidth: 0,
                                shadowOpacity: 0,
                                elevation: 0
                            }
                        ]}
                    >
                        {step === 3 && (
                            <Animated.View entering={FadeIn.duration(500)} style={styles.iconContainer}>
                                <Image
                                    source={require('../../assets/images/org_icon.png')}
                                    style={styles.logoImage}
                                    resizeMode="contain"
                                />
                            </Animated.View>
                        )}

                        {renderTextContent()}

                        {step === 3 && (
                            <Animated.Text entering={FadeInDown.delay(400)} style={styles.subText}>
                                Where discipline begins.
                            </Animated.Text>
                        )}
                    </Animated.View>

                </View>

                {/* BOTTOM SECTION: Actions (Only visible at Step 3) */}
                {step === 3 && (
                    <Animated.View entering={FadeIn.delay(400).duration(800)} style={styles.bottomSection}>
                        <TouchableOpacity
                            style={styles.primaryButton}
                            onPress={() => router.push({ pathname: '/screens/AuthScreen', params: { mode: 'signup' } })}
                        >
                            <Text style={styles.primaryButtonText}>Create Account</Text>
                            <Ionicons name="person-add-outline" size={20} color="#FFFFFF" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.secondaryButton}
                            onPress={() => router.push({ pathname: '/screens/AuthScreen', params: { mode: 'signin' } })}
                        >
                            <Text style={styles.secondaryButtonText}>I already have an account</Text>
                        </TouchableOpacity>
                    </Animated.View>
                )}
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    background: {
        flex: 1,
        backgroundColor: '#F3F4F6', // Neutral calm background
    },
    container: {
        flex: 1,
        justifyContent: 'space-between',
        paddingVertical: 24,
        paddingHorizontal: 24,
    },
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    card: {
        width: '100%',
        paddingVertical: 48, // More vertical breathing room
        paddingHorizontal: 24,
        borderRadius: 40, // Much rounder, less boring usage
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 0,
        // Background handled by animated style to ensure transparency

        // Base Shadow
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 12 }, // Deeper shadow
        shadowOpacity: 0.08,
        shadowRadius: 24, // Softer shadow
        elevation: 4,
    },
    iconContainer: {
        marginBottom: 16,
    },
    logoImage: {
        width: 84,
        height: 84,
        borderRadius: 22,
    },

    // Unique Text Styles
    textEasy: {
        fontSize: 24,
        fontWeight: '300', // Light font
        fontStyle: 'italic', // Casual feel
        color: '#9CA3AF',
        textAlign: 'center',
    },
    textHard: {
        fontSize: 28,
        fontWeight: '900', // Heavy impact
        color: '#334155',
        textAlign: 'center',
        letterSpacing: -0.5, // Tight spacing
    },

    // Step 2 Styles
    textSoMakeThem: {
        fontSize: 20,
        fontWeight: '500',
        color: '#64748B',
        marginBottom: 12,
        letterSpacing: 1,
    },
    expensiveBadge: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
        marginBottom: 16,
        shadowColor: '#F59E0B',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
        transform: [{ rotate: '-2deg' }], // Slight tilt for flair
    },
    textExpensiveWhite: {
        fontSize: 28,
        fontWeight: '800',
        color: '#FFFFFF',
        textAlign: 'center',
        letterSpacing: 4,
        textTransform: 'uppercase',
    },

    textBridge: {
        fontSize: 16,
        fontWeight: '600',
        color: '#B45309', // Dark Gold/Amber to match
        textAlign: 'center',
        fontStyle: 'italic',
        marginTop: 8,
    },
    separator: {
        width: 40,
        height: 2,
        backgroundColor: '#E2E8F0',
        marginVertical: 16,
        borderRadius: 1,
    },
    textBrand: {
        fontSize: 32,
        fontWeight: '800', // Extra-Bold
        color: '#0F172A', // App name color
        textAlign: 'center',
        letterSpacing: 0.5,
    },

    subText: {
        marginTop: 12,
        fontSize: 16,
        color: '#94A3B8', // Muted grey tagline
        fontWeight: '500',
        letterSpacing: 0.5,
    },
    bottomSection: {
        width: '100%',
        gap: 16,
        paddingBottom: 24,
    },
    primaryButton: {
        backgroundColor: '#4F46E5',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 18,
        borderRadius: 16,
        gap: 8,
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 6,
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '700',
    },
    secondaryButton: {
        alignItems: 'center',
        paddingVertical: 12,
    },
    secondaryButtonText: {
        color: '#64748B',
        fontSize: 15,
        fontWeight: '600',
    },
});
