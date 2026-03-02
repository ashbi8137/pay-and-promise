import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import * as SplashScreenModule from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
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
            style={{ height: scaleFont(60), width: '100%', flexDirection: 'row', justifyContent: 'center' }}
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
    const [currentIndex, setCurrentIndex] = useState(0);
    const scrollViewRef = useRef<any>(null);

    const goToNextSlide = () => {
        if (currentIndex < 2) {
            const nextIndex = currentIndex + 1;
            setCurrentIndex(nextIndex);
            scrollViewRef.current?.scrollTo({ x: nextIndex * SCREEN_WIDTH, animated: true });
        }
    };

    const goToPrevSlide = () => {
        if (currentIndex > 0) {
            const prevIndex = currentIndex - 1;
            setCurrentIndex(prevIndex);
            scrollViewRef.current?.scrollTo({ x: prevIndex * SCREEN_WIDTH, animated: true });
        }
    };

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
        },
        [isButtonActive]
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
            title: "Make A Promise",
            highlight: "Action",
            subtitle: "Set a goal. Commit to it.",
            icon: "flash-outline",
            color: "#5B2DAD",
        },
        {
            id: 2,
            title: "Friends Verify",
            highlight: "Trust",
            subtitle: "Your friends confirm your progress.",
            icon: "people-circle-outline",
            color: "#7C3AED",
        },
        {
            id: 3,
            title: "Build Trust",
            highlight: "Legacy",
            subtitle: "Keep promises. Earn points. Grow.",
            icon: "ribbon-outline",
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

                {/* SHOWCASE CONTAINER */}
                <Animated.View
                    style={[
                        styles.showcaseContainer,
                        animatedContainerStyle
                    ]}
                >
                    {/* Icon */}
                    <View style={styles.iconWrapper}>
                        <Ionicons
                            name={item.icon as any}
                            size={scaleFont(100)}
                            color={item.color}
                        />
                    </View>

                    <GradientText
                        colors={[item.color, '#0F172A']}
                        style={styles.slideTitle}
                        allowFontScaling={false}
                    >
                        {item.title}
                    </GradientText>

                    <View style={styles.subtitleWrapper}>
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
                            ref={scrollViewRef}
                            style={StyleSheet.absoluteFill}
                            horizontal
                            pagingEnabled
                            scrollEnabled={false}
                            showsHorizontalScrollIndicator={false}
                            onScroll={scrollHandler}
                            scrollEventThrottle={16}
                            contentContainerStyle={{ alignItems: 'center' }}
                            decelerationRate="fast"
                            bounces={false}
                            overScrollMode="never"
                            removeClippedSubviews={Platform.OS === 'android'}
                        >
                            {slides.map((item, index) => (
                                <SlideItem key={item.id} item={item} index={index} />
                            ))}
                        </Animated.ScrollView>

                        {/* PAGINATIONNNNNNNNNNNNNN */}
                        {/* <View style={styles.controlsContainer} pointerEvents="box-none">
                            <Pagination />
                        </View> */}

                        <Animated.View style={styles.unifiedNavContainer} pointerEvents="box-none">
                            {/* Slide 1: Only Next */}
                            {currentIndex === 0 && (
                                <TouchableOpacity onPress={goToNextSlide} style={styles.lightRoundButton}>
                                    <Ionicons name="chevron-forward" size={scaleFont(24)} color="#4F46E5" />
                                </TouchableOpacity>
                            )}

                            {/* Slide 2: Prev & Next */}
                            {currentIndex === 1 && (
                                <>
                                    <TouchableOpacity onPress={goToPrevSlide} style={styles.lightRoundButton}>
                                        <Ionicons name="chevron-back" size={scaleFont(24)} color="#4F46E5" />
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={goToNextSlide} style={styles.lightRoundButton}>
                                        <Ionicons name="chevron-forward" size={scaleFont(24)} color="#4F46E5" />
                                    </TouchableOpacity>
                                </>
                            )}

                            {/* Slide 3: Prev & Auth Navigate (looks like Next) */}
                            {currentIndex === 2 && (
                                <>
                                    <TouchableOpacity onPress={goToPrevSlide} style={styles.lightRoundButton}>
                                        <Ionicons name="chevron-back" size={scaleFont(24)} color="#4F46E5" />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                                            router.replace('/screens/AuthScreen');
                                        }}
                                        style={styles.lightRoundButton}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons name="chevron-forward" size={scaleFont(24)} color="#4F46E5" />
                                    </TouchableOpacity>
                                </>
                            )}
                        </Animated.View>
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
        fontSize: scaleFont(32), // Reduced to fit on a single line
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
    unifiedNavContainer: {
        position: 'absolute',
        bottom: scaleFont(90),
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: scaleFont(24),
        zIndex: 15,
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
    lightRoundButton: {
        width: scaleFont(52),
        height: scaleFont(52),
        borderRadius: scaleFont(26),
        backgroundColor: '#FFFFFF', // Light colored, not dark
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 8,
        shadowColor: 'rgba(79, 70, 229, 0.4)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        borderWidth: scaleFont(1),
        borderColor: 'rgba(79, 70, 229, 0.1)',
    },
    startButton: {
        borderWidth: scaleFont(2),
        borderColor: 'rgba(79, 70, 229, 0.3)', // Extra simple design for init button
        backgroundColor: '#EEF2FF', // Very subtle tint to distinguish it slightly but maintain light theme
    },
    // New Luxury Styles
    showcaseContainer: {
        width: SCREEN_WIDTH * 0.9,
        alignItems: 'center',
        paddingVertical: scaleFont(20),
    },
    iconWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: scaleFont(48),
    },
});


