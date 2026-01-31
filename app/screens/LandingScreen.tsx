import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
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
    FadeOut,
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
    const [isDeepLink, setIsDeepLink] = useState(false);
    const [isImageReady, setIsImageReady] = useState(false);

    // Theme-derived shared values if needed, but for now we use style updates
    const [step, setStep] = useState(0);

    // Animation Values
    const scale = useSharedValue(1);
    const shake = useSharedValue(0);
    const glowOpacity = useSharedValue(0);
    const borderColor = useSharedValue(theme.border); // Initial border

    useEffect(() => {
        // Only hide splash when image is ready
        if (isImageReady) {
            SplashScreenModule.hideAsync().catch(() => { });
        }
    }, [isImageReady]);

    useEffect(() => {
        let t1: any, t2: any, t3: any, t4: any;

        // 2. Check Auth in Background & Check Deep Link
        const checkState = async () => {
            // Check Deep Link First
            const initialUrl = await Linking.getInitialURL();
            const isDeepLinkDetected = initialUrl && (initialUrl.includes('access_token') || initialUrl.includes('#access_token'));

            if (isDeepLinkDetected) {
                console.log('LandingScreen: Deep Link detected, skipping animation...');
                setIsDeepLink(true);
                // SKIP ANIMATION: Check auth immediately and redirect
                const { data, error } = await supabase.auth.getUser();
                if (data?.user && !error) {
                    router.replace('/screens/HomeScreen');
                } else {
                    router.replace('/screens/AuthScreen');
                }
                return; // Exit early
            }

            // Normal Flow: Check auth QUICKLY
            const { data, error } = await supabase.auth.getUser();
            const hasUser = !!(data?.user && !error);
            setIsAuthenticated(hasUser);

            if (hasUser) {
                // User is logged in? GO TO HOME IMMEDIATELY via replace
                // Small delay to ensure splash is hidden or just go?
                // If we go immediately, we might not need animation step 1, 2, 3.
                // Let's go immediately to avoid "Step 0" flicker.
                router.replace('/screens/HomeScreen');
                return;
            }

            // ONLY IF NOT AUTHENTICATED -> Play Animation
            // Step 1: "Promises are easy..." (0s -> 2s) - Start sooner
            t1 = setTimeout(() => {
                setStep(1);
            }, 1000); // 1s start

            // Step 2: "Keeping them is hard." (2s -> 4.5s)
            t2 = setTimeout(() => {
                setStep(2);
                // Shake effect + Zoom
                shake.value = withSequence(
                    withTiming(-3, { duration: 50 }),
                    withTiming(3, { duration: 50 }),
                    withTiming(-3, { duration: 50 }),
                    withTiming(3, { duration: 50 }),
                    withTiming(0, { duration: 50 })
                );
                scale.value = withSpring(1.03); // Slight zoom
            }, 3000);

            // Step 3: "So make them expensive." (4.5s -> 8s)
            t3 = setTimeout(() => {
                setStep(3);
                glowOpacity.value = withTiming(1, { duration: 1000 });
                borderColor.value = withTiming(theme.tint, { duration: 1000 });
                scale.value = withSpring(1.1); // Scale up
            }, 5500);

            // Final: Navigate to Auth (8s)
            t4 = setTimeout(() => {
                router.replace('/screens/AuthScreen');
            }, 8000);
        };

        checkState();

        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
            clearTimeout(t3);
            clearTimeout(t4);
        };
    }, []); // Run once on mount

    const animatedCardStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: shake.value },
            { scale: scale.value }
        ],
        // Step 0 (Icon) is handled by main view, card is not visible/relevant until step 1 properly?
        // Actually in Step 0 we show just the icon, Step 1 shows card.
        // We can keep card background consistent.
        backgroundColor: theme.card,
        shadowOpacity: (glowOpacity.value ? 0.3 : 0.08),
        elevation: 4,
        borderColor: borderColor.value,
        shadowColor: theme.icon,
        // Force reset other shadow props
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 12 },
    }), [step, theme]);

    const renderContent = () => {
        // Step 0: Show Icon (Matches Native Splash) -> Then fade to Text
        if (step === 0) {
            return (
                <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.centerContent}>
                    <View style={styles.logoImageLarge}>
                        <Image
                            source={require('../../assets/images/splash.png')}
                            style={{ width: '100%', height: '100%', transform: [{ scale: 1.3 }] }}
                            resizeMode="contain"
                            onLoadEnd={() => setIsImageReady(true)}
                        />
                    </View>
                </Animated.View>
            );
        }

        return (
            <View style={styles.centerContent}>
                <Animated.View
                    style={[
                        styles.card,
                        animatedCardStyle
                    ]}
                >
                    {step === 1 && (
                        <Animated.Text
                            entering={FadeIn.duration(800)}
                            style={[styles.textEasy, { color: theme.icon }]}
                        >
                            Promises are easy...
                        </Animated.Text>
                    )}
                    {step === 2 && (
                        <Animated.Text
                            entering={FadeInDown.springify().damping(12)}
                            style={[styles.textHard, { color: theme.text }]}
                        >
                            Keeping them is hard.
                        </Animated.Text>
                    )}
                    {step === 3 && (
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
                    )}
                </Animated.View>
            </View>
        );
    };

    return (
        <View style={[styles.background, { backgroundColor: theme.background }]}>
            <StatusBar style={colorScheme === 'dark' ? "light" : "dark"} />

            <SafeAreaView style={styles.container}>
                {renderContent()}
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
        justifyContent: 'center', // Changed to center to match splash alignment
        alignItems: 'center',
        paddingVertical: 24,
        paddingHorizontal: 24,
    },
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
    },
    // Use the large icon for the splash match
    logoImageLarge: {
        width: 200,
        height: 200,
        borderRadius: 48,
    },
    card: {
        width: '100%',
        maxWidth: 340, // Constrain width for better look
        paddingVertical: 48,
        paddingHorizontal: 24,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        // Colors handled by animated style
        backgroundColor: '#FFFFFF',

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

    // Unique Text Styles (From User Snippet)
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