import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import * as SplashScreenModule from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
    Dimensions,
    Image,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    useColorScheme
} from 'react-native';

import MaskedView from '@react-native-masked-view/masked-view';
import * as Haptics from 'expo-haptics';
import Animated, {
    Easing,
    Extrapolation,
    FadeInDown,
    interpolate,
    interpolateColor,
    runOnJS,
    useAnimatedReaction,
    useAnimatedScrollHandler,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GridOverlay } from '../../components/LuxuryVisuals';
import { Colors } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import { scaleFont } from '../../utils/layout';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// --- LUXURY COMPONENTS ---





// --- GRADIENT TEXT COMPONENT ---
const GradientText = ({ colors, style, children, ...props }: any) => {
    return (
        <MaskedView
            style={{ height: scaleFont(120), width: '100%', flexDirection: 'row', justifyContent: 'center' }}
            maskElement={
                <View style={{ backgroundColor: 'transparent', flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={[style, { opacity: 1 }]} {...props}>
                        {children}
                    </Text>
                </View>
            }
        >
            <LinearGradient
                colors={colors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ flex: 1 }}
            />
        </MaskedView>
    );
};

export default function LandingScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    // Auth State Check
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
    const [isImageReady, setIsImageReady] = useState(false);
    const [step, setStep] = useState(0); // 0 = Splash, 1 = Content
    const [isButtonActive, setIsButtonActive] = useState(false); // Controls footer interactivity
    const [showSwipeHint, setShowSwipeHint] = useState(true);

    // Animation Values
    const scrollX = useSharedValue(0);
    const logoScale = useSharedValue(0.8);
    const logoOpacity = useSharedValue(0);

    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (event) => {
            scrollX.value = event.contentOffset.x;
        },
    });

    // Monitor scroll for button activation & swipe hint
    useAnimatedReaction(
        () => scrollX.value,
        (currentScrollX: number) => {
            // Button Logic
            const shouldBeActive = currentScrollX > SCREEN_WIDTH * 1.5;
            if (shouldBeActive !== isButtonActive) {
                runOnJS(setIsButtonActive)(shouldBeActive);
            }

            // Swipe Hint Logic (Hide as soon as we start scrolling significanlty)
            const shouldShowHint = currentScrollX < 20;
            if (shouldShowHint !== showSwipeHint) {
                runOnJS(setShowSwipeHint)(shouldShowHint);
            }
        },
        [isButtonActive, showSwipeHint]
    );

    useEffect(() => {
        if (isImageReady) {
            SplashScreenModule.hideAsync().catch(() => { });
            logoScale.value = withTiming(1, { duration: 1000, easing: Easing.out(Easing.back(1.5)) });
            logoOpacity.value = withTiming(1, { duration: 800 });
        }
    }, [isImageReady]);

    // ... (rest of imports and useEffects remain same until animatedFooterStyle)

    const footerAnimatedStyle = useAnimatedStyle(() => {
        const opacity = interpolate(
            scrollX.value,
            [SCREEN_WIDTH * 1.3, SCREEN_WIDTH * 1.8], // Fade in as we approach the 3rd slide
            [0, 1],
            Extrapolation.CLAMP
        );
        const translateY = interpolate(
            scrollX.value,
            [SCREEN_WIDTH * 1.3, SCREEN_WIDTH * 1.8],
            [20, 0],
            Extrapolation.CLAMP
        );

        return {
            opacity,
            transform: [{ translateY }],
            // Removed display: 'none' to preserve layout space and prevent jumps
        };
    });

    useEffect(() => {
        const checkDeepLink = async () => {
            const initialUrl = await Linking.getInitialURL();
            const isDeepLinkDetected = initialUrl && (initialUrl.includes('access_token') || initialUrl.includes('#access_token'));

            if (isDeepLinkDetected) {
                const { data, error } = await supabase.auth.getUser();
                if (data?.user && !error) {
                    router.replace('/(tabs)');
                } else {
                    router.replace('/screens/AuthScreen');
                }
                return;
            }

            // LandingScreen is only shown to unauthenticated users (index.tsx handles auth check)
            // Just show the landing content
            setIsAuthenticated(false);
        };

        checkDeepLink();

        const timer = setTimeout(() => {
            setStep(1);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }, 3000);

        return () => clearTimeout(timer);
    }, []);

    // Button Pulse Animation
    const buttonPulse = useSharedValue(1);
    const haloRot = useSharedValue(0);

    useEffect(() => {
        if (step === 1) {
            buttonPulse.value = withRepeat(
                withTiming(1.08, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
                -1,
                true
            );
            haloRot.value = withRepeat(
                withTiming(360, { duration: 8000, easing: Easing.linear }),
                -1,
                false
            );
        }
    }, [step]);

    const animatedPortalStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: buttonPulse.value }],
        };
    });

    const animatedHaloStyle = useAnimatedStyle(() => {
        return {
            transform: [{ rotate: `${haloRot.value}deg` }],
        };
    });

    const slides = [
        {
            id: 1,
            title: "Stake Your Goal",
            highlight: "Stake",
            subtitle: "Put real money on your goals so you actually show up.",
            icon: "wallet-outline",
            color: "#5B2DAD",
        },
        {
            id: 2,
            title: "Friends Verify",
            highlight: "Verify",
            subtitle: "Your progress is confirmed by others.",
            icon: "people-circle-outline",
            color: "#7C3AED",
        },
        {
            id: 3,
            title: "Build Trust",
            highlight: "Trust",
            subtitle: "Stay consistent, build trust, and grow stronger every day.",
            icon: "star-outline",
            color: "#6366F1",
        }
    ];

    const SlideItem = ({ item, index }: { item: any, index: number }) => {
        // 3D Glassmorphism Carousel
        const animatedContainerStyle = useAnimatedStyle(() => {
            const inputRange = [(index - 1) * SCREEN_WIDTH, index * SCREEN_WIDTH, (index + 1) * SCREEN_WIDTH];

            // 3D ROTATION & DEPTH
            // Scale: Active is big, sides are smaller
            const scale = interpolate(scrollX.value, inputRange, [0.85, 1, 0.85], Extrapolation.CLAMP);

            // Opacity: Sides fade out slightly
            const opacity = interpolate(scrollX.value, inputRange, [0.6, 1, 0.6], Extrapolation.CLAMP);

            // Perspective Rotate: Simulate flipping through a deck
            const rotateY = interpolate(scrollX.value, inputRange, [45, 0, -45], Extrapolation.CLAMP);

            // TranslateX: Bring sides closer to center for "stack" feel? Or keep standard?
            // Standard parallax spacing feels safer for now, but let's add slight negative margin?
            // No, keep standard spacing but use perspective to sell the depth.

            return {
                transform: [
                    { perspective: 1000 },
                    { scale },
                    { rotateY: `${rotateY}deg` },
                ],
                opacity
            };
        });

        return (
            <View style={{ width: SCREEN_WIDTH, height: '100%', alignItems: 'center', justifyContent: 'center' }}>

                {/* GLASS CARD CONTAINER */}
                <Animated.View
                    style={[
                        styles.glassCard,
                        { shadowColor: item.color },
                        animatedContainerStyle
                    ]}
                >
                    {/* Inner Gradient Tint */}
                    <LinearGradient
                        colors={[item.color, 'transparent']}
                        style={[StyleSheet.absoluteFill, { opacity: 0.15 }]}
                        start={{ x: 0.5, y: 0 }}
                        end={{ x: 0.5, y: 0.6 }}
                    />

                    {/* CONTENT */}
                    <View style={styles.cardContent}>
                        <View style={[styles.iconCircle, { backgroundColor: item.color + '20' }]}>
                            <Ionicons name={item.icon as any} size={scaleFont(64)} color={item.color} />
                        </View>

                        <GradientText
                            colors={[item.color, '#0F172A']}
                            style={styles.slideTitle}
                            allowFontScaling={false}
                        >
                            {item.title}
                        </GradientText>

                        <Text style={styles.slideSubtitle} allowFontScaling={false}>
                            {item.subtitle}
                        </Text>
                    </View>
                </Animated.View>
            </View>
        );
    };



    const Pagination = () => (
        <View style={styles.pagination}>
            {slides.map((_, index) => {
                const dotStyle = useAnimatedStyle(() => {
                    const inputRange = [(index - 1) * SCREEN_WIDTH, index * SCREEN_WIDTH, (index + 1) * SCREEN_WIDTH];
                    const width = interpolate(scrollX.value, inputRange, [scaleFont(8), scaleFont(32), scaleFont(8)], Extrapolation.CLAMP);
                    const opacity = interpolate(scrollX.value, inputRange, [0.35, 1, 0.35], Extrapolation.CLAMP);
                    const scale = interpolate(scrollX.value, inputRange, [0.9, 1.1, 0.9], Extrapolation.CLAMP);
                    return {
                        width,
                        opacity,
                        backgroundColor: '#5B2DAD',
                        transform: [{ scale }]
                    };
                });
                return <Animated.View key={index} style={[styles.dot, dotStyle]} />;
            })}
        </View>
    );

    const backgroundAnimatedStyle = useAnimatedStyle(() => {
        const backgroundColor = interpolateColor(
            scrollX.value,
            [0, SCREEN_WIDTH, SCREEN_WIDTH * 2],
            ['#F8FAFC', '#EEF2FF', '#E0E7FF'] // Lighter tints of slide colors
        );
        return { backgroundColor };
    });

    if (step === 0) {
        return (
            <View style={styles.splashContainer}>
                <LinearGradient colors={['#F8FAFC', '#F1F5F9']} style={StyleSheet.absoluteFill} />
                <Animated.View style={[styles.logoWrapper, { transform: [{ scale: logoScale }], opacity: logoOpacity }]}>
                    <Image
                        source={require('../../assets/images/icon_transparent.png')}
                        style={{ width: scaleFont(220), height: scaleFont(220), marginBottom: scaleFont(10) }}
                        resizeMode="contain"
                        onLoadEnd={() => setIsImageReady(true)}
                    />
                </Animated.View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            {/* Dynamic Background */}
            <Animated.View style={[StyleSheet.absoluteFill, backgroundAnimatedStyle]} />

            <GridOverlay />

            <SafeAreaView style={{ flex: 1 }}>
                <View style={styles.content}>
                    {/* Header Removed as requested */}

                    <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.sliderContainer}>
                        <Animated.ScrollView
                            style={StyleSheet.absoluteFill}
                            horizontal
                            pagingEnabled
                            showsHorizontalScrollIndicator={false}
                            onScroll={scrollHandler}
                            scrollEventThrottle={16}
                            contentContainerStyle={{ alignItems: 'center' }}
                            decelerationRate="fast"
                            bounces={true}
                            overScrollMode="always"
                            removeClippedSubviews={Platform.OS === 'android'}
                        >
                            {slides.map((item, index) => (
                                <SlideItem key={item.id} item={item} index={index} />
                            ))}
                        </Animated.ScrollView>

                        <View style={styles.controlsContainer} pointerEvents="box-none">
                            <Pagination />
                        </View>

                        <Animated.View
                            style={[
                                styles.swipeHintContainer,
                                {
                                    opacity: interpolate(
                                        scrollX.value,
                                        [0, SCREEN_WIDTH * 0.2, SCREEN_WIDTH * 0.8, SCREEN_WIDTH, SCREEN_WIDTH * 1.2, SCREEN_WIDTH * 2],
                                        [0.8, 0, 0, 0.8, 0, 0],
                                        Extrapolation.CLAMP
                                    )
                                }
                            ]}
                            pointerEvents="none"
                        >
                            <Text style={styles.swipeHintText} allowFontScaling={false}>Swipe left to explore</Text>
                            <Ionicons name="arrow-forward" size={scaleFont(16)} color="#64748B" style={{ opacity: 0.3 }} />
                        </Animated.View>
                    </Animated.View>

                    <Animated.View
                        style={[styles.footer, footerAnimatedStyle]}
                        pointerEvents="box-none" // Allow swipes in empty areas
                    >
                        <View
                            style={styles.portalWrapper}
                            pointerEvents={isButtonActive ? 'auto' : 'none'} // Only button catches touches when active
                        >
                            <Animated.View style={[styles.portalHalo, animatedHaloStyle]} />
                            <Animated.View style={animatedPortalStyle}>
                                <TouchableOpacity
                                    style={styles.portalAction}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                                        router.replace('/screens/AuthScreen');
                                    }}
                                    activeOpacity={0.7}
                                    disabled={!isButtonActive}
                                >
                                    <LinearGradient
                                        colors={['#5B2DAD', '#312E81']}
                                        style={styles.portalGradient}
                                    >
                                        <Ionicons name="arrow-forward" size={scaleFont(22)} color="#FFF" />
                                    </LinearGradient>
                                    <View style={styles.portalInnerRing} />
                                </TouchableOpacity>
                            </Animated.View>
                        </View>
                        <Text
                            style={styles.portalLabel}
                            allowFontScaling={false}
                            pointerEvents="none" // Pass swipe touches through text
                        >
                            INITIATE JOURNEY
                        </Text>
                    </Animated.View>

                    <TouchableOpacity
                        style={styles.skipButton}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            router.replace('/screens/AuthScreen');
                        }}
                        hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                    >
                        <Text style={styles.skipText}>Skip</Text>
                    </TouchableOpacity>
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
    splashContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        flex: 1,
    },
    sliderContainer: {
        ...StyleSheet.absoluteFillObject,
    },
    controlsContainer: {
        position: 'absolute',
        bottom: scaleFont(170), // Move Pagination UP further
        width: '100%',
        alignItems: 'center',
        zIndex: 30,
    },
    slideCard: {
        width: SCREEN_WIDTH,
        height: '100%',
        backgroundColor: 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
    },
    slideContent: {
        width: '100%',
        alignItems: 'center', // Back to Center
        justifyContent: 'center',
        paddingHorizontal: scaleFont(24),
        paddingBottom: scaleFont(80), // Lift content slightly above center
    },
    newIconWrapper: {
        marginBottom: scaleFont(80),
        alignItems: 'center',
        justifyContent: 'center',
    },
    slideTitle: {
        fontSize: scaleFont(40),
        fontWeight: '900',
        color: '#1E293B',
        textAlign: 'center', // Back to Center
        fontFamily: 'Outfit_800ExtraBold',
        marginBottom: scaleFont(16),
        textShadowColor: 'rgba(255,255,255,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 10,
    },
    subtitleWrapper: {
        width: '85%',
        alignSelf: 'center',
    },
    slideSubtitle: {
        fontSize: scaleFont(18),
        color: '#475569',
        textAlign: 'center', // Back to Center
        fontFamily: 'Outfit_400Regular',
        lineHeight: scaleFont(28),
    },
    glassEffect: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255,255,255,0.4)',
        opacity: 0.7,
    },
    pagination: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        // Removed marginTop
    },
    dot: {
        height: scaleFont(8),
        borderRadius: scaleFont(4),
        marginHorizontal: scaleFont(6),
    },
    swipeHintContainer: {
        position: 'absolute',
        bottom: scaleFont(100), // Move Swipe Hint DOWN clearly below pagination
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: scaleFont(8),
        zIndex: 15,
    },
    swipeHintText: {
        fontSize: scaleFont(14),
        color: '#64748B',
        fontFamily: 'Outfit_500Medium',
        letterSpacing: 0.3,
        opacity: 0.3,
    },
    skipButton: {
        position: 'absolute',
        top: scaleFont(60), // Adjust for status bar
        right: scaleFont(24),
        zIndex: 50,
        padding: scaleFont(8),
        backgroundColor: 'rgba(255,255,255,0.8)',
        borderRadius: scaleFont(20),
    },
    skipText: {
        fontSize: scaleFont(14),
        fontFamily: 'Outfit_600SemiBold',
        color: '#64748B',
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingBottom: '8%',
        zIndex: 30,
    },
    portalWrapper: {
        width: scaleFont(80),
        height: scaleFont(80),
        justifyContent: 'center',
        alignItems: 'center',
    },
    portalHalo: {
        position: 'absolute',
        width: scaleFont(72),
        height: scaleFont(72),
        borderRadius: scaleFont(36),
        borderWidth: scaleFont(2),
        borderColor: '#4F46E5',
        borderStyle: 'dashed',
        opacity: 0.2,
    },
    portalAction: {
        width: scaleFont(56),
        height: scaleFont(56),
        borderRadius: scaleFont(28),
        justifyContent: 'center',
        alignItems: 'center',
        elevation: scaleFont(20),
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: scaleFont(8) },
        shadowRadius: scaleFont(16),
    },
    portalGradient: {
        width: scaleFont(56),
        height: scaleFont(56),
        borderRadius: scaleFont(28),
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2,
    },
    portalInnerRing: {
        position: 'absolute',
        width: scaleFont(68),
        height: scaleFont(68),
        borderRadius: scaleFont(34),
        borderWidth: scaleFont(1.5),
        borderColor: 'rgba(79, 70, 229, 0.2)',
        zIndex: 1,
    },
    portalLabel: {
        fontSize: scaleFont(12),
        fontWeight: '900',
        color: '#4F46E5',
        marginTop: scaleFont(24),
        letterSpacing: scaleFont(2),
        opacity: 0.9,
        textTransform: 'uppercase',
    },
    // New Luxury Styles
    glassCard: {
        width: SCREEN_WIDTH * 0.82,
        height: SCREEN_HEIGHT * 0.6,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: scaleFont(32),
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.8)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: scaleFont(20) },
        shadowOpacity: 0.15,
        shadowRadius: scaleFont(30),
        elevation: 10,
        overflow: 'hidden',
        alignItems: 'center',
        paddingVertical: scaleFont(40),
    },
    cardContent: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: scaleFont(24),
        width: '100%',
    },
    iconCircle: {
        width: scaleFont(120),
        height: scaleFont(120),
        borderRadius: scaleFont(60),
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: scaleFont(40),
    },
});


