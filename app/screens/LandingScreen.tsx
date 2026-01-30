import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as SplashScreenModule from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
    Image,
    StyleSheet,
    Text,
    View,
    useColorScheme
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
import { Colors } from '../../constants/theme';
import { supabase } from '../../lib/supabase';

export default function LandingScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    // Auth State Check
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

    // Theme-derived shared values if needed, but for now we use style updates
    const [step, setStep] = useState(0);

    // Animation Values
    const scale = useSharedValue(1);
    const shake = useSharedValue(0);
    const glowOpacity = useSharedValue(0);
    const borderColor = useSharedValue(theme.border); // Initial border

    useEffect(() => {
        // 1. Hide Native Splash immediately so animation starts
        SplashScreenModule.hideAsync().catch(() => { });

        // 2. Check Auth in Background
        const checkAuth = async () => {
            const { data, error } = await supabase.auth.getUser();
            setIsAuthenticated(!!(data?.user && !error));
        };
        checkAuth();

        // Animation Sequence
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

        // Step 2: "So make them expensive." (4.5s -> 8s)
        const t2 = setTimeout(() => {
            setStep(2);
            glowOpacity.value = withTiming(1, { duration: 1000 });
            borderColor.value = withTiming(theme.tint, { duration: 1000 });
            scale.value = withSpring(1.1); // Scale up
        }, 4500);

        // Final: Navigate based on Auth Status (8s)
        const t3 = setTimeout(() => {
            if (isAuthenticated === true) {
                router.replace('/screens/HomeScreen');
            } else {
                router.replace('/screens/AuthScreen');
            }
        }, 8000);

        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
            clearTimeout(t3);
        };
    }, [isAuthenticated]); // Re-run if auth completes late? No, this might cause multiple timeouts.

    const animatedCardStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: shake.value },
            { scale: scale.value }
        ],
        // Step 3: Make card transparent/invisible effectively
        backgroundColor: step === 3 ? 'transparent' : theme.card,
        shadowOpacity: step === 3 ? 0 : (glowOpacity.value ? 0.3 : 0.08),
        elevation: step === 3 ? 0 : 4,
        borderColor: step === 3 ? 'transparent' : borderColor.value,
        shadowColor: step === 3 ? 'transparent' : theme.icon,
        // Force reset other shadow props
        shadowRadius: step === 3 ? 0 : 24,
        shadowOffset: step === 3 ? { width: 0, height: 0 } : { width: 0, height: 12 },
    }), [step, theme]);

    const renderTextContent = () => {
        switch (step) {
            case 0:
                return (
                    <Animated.Text
                        entering={FadeIn.duration(800)}
                        style={[styles.textEasy, { color: theme.icon }]}
                    >
                        Promises are easy...
                    </Animated.Text>
                );
            case 1:
                return (
                    <Animated.Text
                        entering={FadeInDown.springify().damping(12)}
                        style={[styles.textHard, { color: theme.text }]}
                    >
                        Keeping them is hard.
                    </Animated.Text>
                );
            case 2:
                return (
                    <View style={{ alignItems: 'center' }}>
                        <Animated.Text
                            entering={FadeInDown.duration(600)}
                            style={[styles.textSoMakeThem, { color: theme.icon }]}
                        >
                            So make them
                        </Animated.Text>

                        <Animated.View entering={FadeInDown.delay(200).springify()}>
                            <LinearGradient
                                colors={[theme.gold, '#B45309']} // Gold Gradient using theme
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
            default: return null;
        }
    };

    return (
        <View style={[styles.background, { backgroundColor: theme.background }]}>
            <StatusBar style={colorScheme === 'dark' ? "light" : "dark"} />

            <SafeAreaView style={styles.container}>
                {/* Main Content Centered */}
                <View style={styles.centerContent}>

                    {/* The Morphing Card */}
                    {/* In step 3, background is transparent, essentially removing the "shape" */}
                    <Animated.View
                        style={[
                            styles.card,
                            // Base style needs dynamic border/bg but processed in animated style
                            // We can set static defaults here if needed
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
                                    source={require('../../assets/images/icon.png')} // Changed to correct icon
                                    style={styles.logoImage}
                                    resizeMode="contain"
                                />
                            </Animated.View>
                        )}

                        {renderTextContent()}

                    </Animated.View>

                </View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    background: {
        flex: 1,
        // backgroundColor: '#F3F4F6', // Handled via theme
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
        paddingVertical: 48,
        paddingHorizontal: 24,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1, // Ensure default width for animation
        // Colors handled by animated style

        // Base Shadow
        shadowOffset: { width: 0, height: 12 },
        shadowRadius: 24,
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
        fontWeight: '300',
        fontStyle: 'italic',
        textAlign: 'center',
    },
    textHard: {
        fontSize: 28,
        fontWeight: '900',
        textAlign: 'center',
        letterSpacing: -0.5,
    },

    // Step 2 Styles
    textSoMakeThem: {
        fontSize: 20,
        fontWeight: '500',
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
        transform: [{ rotate: '-2deg' }],
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
        color: '#B45309', // Keep dark gold
        textAlign: 'center',
        fontStyle: 'italic',
        marginTop: 8,
    },
});
