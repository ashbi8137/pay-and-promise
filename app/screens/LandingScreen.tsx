import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
    Image,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, {
    FadeIn,
    FadeInDown,
    useAnimatedStyle,
    useSharedValue,
    withSequence,
    withSpring,
    withTiming
} from 'react-native-reanimated';

export default function LandingScreen() {
    const router = useRouter();
    const [step, setStep] = useState(0);

    // Animation Values
    const scale = useSharedValue(1);
    const shake = useSharedValue(0);
    const glowOpacity = useSharedValue(0);
    const borderColor = useSharedValue('#E2E8F0');

    useEffect(() => {
        // Step 0: "Promises are easy..." (0s)

        // Step 1: "Keeping them is hard." (2.5s)
        const t1 = setTimeout(() => {
            setStep(1);
            // Shake effect
            shake.value = withSequence(
                withTiming(-5, { duration: 50 }),
                withTiming(5, { duration: 50 }),
                withTiming(-5, { duration: 50 }),
                withTiming(5, { duration: 50 }),
                withTiming(0, { duration: 50 })
            );
        }, 2500);

        // Step 2: "So make them expensive." (5.0s)
        const t2 = setTimeout(() => {
            setStep(2);
            glowOpacity.value = withTiming(1, { duration: 1000 });
            // Remove border color animation or keep as accent but remove width if needed
            // User requested removing border "around the icon...". 
            // We'll keep the glow but make the borderWidth 0 in the style definition or animate it.
            // Let's just animate the color for the glow effect but remove the physical border width in CSS if plausible.
            // Or better, let's keep the glow logic but make the final state borderless.

            borderColor.value = withTiming('#4F46E5', { duration: 1000 });
            scale.value = withSpring(1.05);
        }, 5000);

        // Step 3: Final Reveal (7.5s)
        const t3 = setTimeout(() => {
            setStep(3);
        }, 7500);

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
        shadowOpacity: step === 3 ? 0 : (glowOpacity.value ? 0.3 : 0.1),
        elevation: step === 3 ? 0 : 4,
    }));

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
                    <Animated.Text
                        entering={FadeIn.duration(1000)}
                        style={styles.textExpensive}
                    >
                        So make them expensive.
                    </Animated.Text>
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
                    <Animated.View style={[styles.card, animatedCardStyle]}>
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
                    <Animated.View entering={FadeIn.duration(1000)} style={styles.bottomSection}>
                        <TouchableOpacity
                            style={styles.primaryButton}
                            onPress={() => router.push('/screens/CreatePromiseScreen')}
                        >
                            <Text style={styles.primaryButtonText}>Start My Promise</Text>
                            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.secondaryButton}
                            onPress={() => router.push('/screens/AuthScreen')}
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
        backgroundColor: '#F8FAFC', // Clean slate background
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
        paddingVertical: 40,
        paddingHorizontal: 24,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        // Shadow/BG handled by animated style
        shadowColor: '#64748B',
    },
    iconContainer: {
        marginBottom: 16,
    },
    logoImage: {
        width: 84, // Slightly larger final icon
        height: 84,
        borderRadius: 22,
    },

    // Unique Text Styles
    textEasy: {
        fontSize: 22,
        fontWeight: '300', // Light font
        fontStyle: 'italic', // Casual feel
        color: '#94A3B8',
        textAlign: 'center',
    },
    textHard: {
        fontSize: 26,
        fontWeight: '900', // Heavy impact
        color: '#475569',
        textAlign: 'center',
        letterSpacing: -0.5, // Tight spacing
    },
    textExpensive: {
        fontSize: 24,
        fontWeight: '700',
        color: '#4F46E5', // Brand Color
        textAlign: 'center',
        letterSpacing: 1.5, // Wide, premium spacing
        textTransform: 'uppercase', // Serious
    },
    textBrand: {
        fontSize: 32,
        fontWeight: '800',
        color: '#0F172A',
        textAlign: 'center',
        letterSpacing: 0.5,
    },

    subText: {
        marginTop: 12,
        fontSize: 16,
        color: '#64748B',
        fontWeight: '500',
        letterSpacing: 1,
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
