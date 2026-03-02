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
import { BlurView } from 'expo-blur';
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

const SparkleBackground = () => {
    const sparkles = Array.from({ length: 30 }).map((_, i) => ({
        id: i,
        size: Math.random() * 4 + 2,
        x: Math.random() * SCREEN_WIDTH,
        y: Math.random() * SCREEN_HEIGHT,
        delay: Math.random() * 5000,
        duration: 3000 + Math.random() * 4000,
    }));

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {sparkles.map((s) => (
                <SparklePoint key={s.id} sparkle={s} />
            ))}
        </View>
    );
};

const SparklePoint = ({ sparkle }: { sparkle: any }) => {
    const opacity = useSharedValue(0);
    const scale = useSharedValue(0.5);

    useEffect(() => {
        opacity.value = withRepeat(
            withTiming(Math.random() * 0.7 + 0.2, { duration: sparkle.duration, easing: Easing.inOut(Easing.quad) }),
            -1,
            true
        );
        scale.value = withRepeat(
            withTiming(1.5, { duration: sparkle.duration * 1.2, easing: Easing.inOut(Easing.quad) }),
            -1,
            true
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        position: 'absolute',
        left: sparkle.x,
        top: sparkle.y,
        width: sparkle.size,
        height: sparkle.size,
        borderRadius: sparkle.size / 2,
        backgroundColor: '#FFFFFF',
        opacity: opacity.value,
        transform: [{ scale: scale.value }],
        shadowColor: '#FFFFFF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 4,
    }));

    return <Animated.View style={animatedStyle} />;
};





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
            subtitle: "Set a goal and make it happen",
            icon: "flash-outline",
            color: "#5B2DAD",
        },
        {
            id: 2,
            title: "Friends Verify",
            highlight: "Trust",
            subtitle: "Friends help you stay on track",
            icon: "people-circle-outline",
            color: "#7C3AED",
        },
        {
            id: 3,
            title: "Build Trust",
            highlight: "Legacy",
            subtitle: "Keep promises and grow your trust",
            icon: "ribbon-outline",
            color: "#6366F1",
        }
    ];

    const SlideItem = ({ item, index }: { item: any, index: number }) => {
        const animatedContainerStyle = useAnimatedStyle(() => {
            const inputRange = [(index - 1) * SCREEN_WIDTH, index * SCREEN_WIDTH, (index + 1) * SCREEN_WIDTH];

            // Perspective & Scale for 3D feel
            const scale = interpolate(scrollX.value, inputRange, [0.85, 1, 0.85], Extrapolation.CLAMP);
            const rotateY = interpolate(scrollX.value, inputRange, [30, 0, -30], Extrapolation.CLAMP);
            const opacity = interpolate(scrollX.value, inputRange, [0.4, 1, 0.4], Extrapolation.CLAMP);

            return {
                transform: [
                    { perspective: 1000 },
                    { scale },
                    { rotateY: `${rotateY}deg` }
                ],
                opacity
            };
        });

        // Floating animation for icon
        const floatingAnim = useSharedValue(0);
        useEffect(() => {
            floatingAnim.value = withRepeat(
                withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.sin) }),
                -1,
                true
            );
        }, []);

        const animatedIconStyle = useAnimatedStyle(() => ({
            transform: [{ translateY: interpolate(floatingAnim.value, [0, 1], [0, -8]) }]
        }));

        const isSecondSlide = index === 1;

        return (
            <View style={{ width: SCREEN_WIDTH, height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                <Animated.View style={[styles.showcaseContainer, animatedContainerStyle]}>
                    <BlurView intensity={70} tint="light" style={StyleSheet.absoluteFill} />

                    {/* THIN WHITE GLASS BORDER */}
                    <View style={[StyleSheet.absoluteFill, {
                        borderWidth: 1.5,
                        borderColor: 'rgba(255, 255, 255, 0.6)',
                        borderRadius: scaleFont(32)
                    }]} />

                    {/* INTERNAL CARD SURFACE WITH SOFT TOP GRADING */}
                    <View style={[StyleSheet.absoluteFill, { margin: 1, backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: scaleFont(31) }]}>
                        <LinearGradient
                            colors={[item.color + '10', 'rgba(255, 255, 255, 0)']}
                            style={{ height: '35%', width: '100%', borderRadius: scaleFont(31) }}
                        />
                    </View>

                    <Animated.View style={[styles.iconWrapper, animatedIconStyle]}>
                        <View style={styles.iconGlowContainer}>
                            <LinearGradient
                                colors={[item.color + '30', 'transparent']}
                                style={styles.iconGlow}
                            />
                        </View>

                        {/* FLOATING AVATARS (Only for Slide 2) */}
                        {isSecondSlide && (
                            <View style={StyleSheet.absoluteFill}>
                                <View style={[styles.floatingAvatar, { top: -20, left: -40, opacity: 0.4 }]}>
                                    <Ionicons name="person-circle" size={scaleFont(36)} color="rgba(255,255,255,0.8)" />
                                </View>
                                <View style={[styles.floatingAvatar, { top: 10, left: 130, opacity: 0.3 }]}>
                                    <Ionicons name="person-circle" size={scaleFont(32)} color="rgba(255,255,255,0.8)" />
                                </View>
                                <View style={[styles.floatingAvatar, { top: 70, left: -60, opacity: 0.2 }]}>
                                    <Ionicons name="person-circle" size={scaleFont(40)} color="rgba(255,255,255,0.8)" />
                                </View>
                            </View>
                        )}

                        <View style={[styles.iconCircle, { backgroundColor: 'rgba(255,255,255,0.4)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' }]}>
                            <Ionicons
                                name={item.icon as any}
                                size={scaleFont(64)}
                                color={item.color}
                            />
                        </View>
                    </Animated.View>

                    <GradientText
                        colors={[item.color, '#1E293B']}
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

                    <View style={styles.cardPagination}>
                        <Pagination />
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
                    // Active is elongated pill, inactive is small circle
                    const width = interpolate(scrollX.value, inputRange, [scaleFont(8), scaleFont(24), scaleFont(8)], Extrapolation.CLAMP);
                    const opacity = interpolate(scrollX.value, inputRange, [0.3, 1, 0.3], Extrapolation.CLAMP);
                    return {
                        width,
                        opacity,
                        backgroundColor: '#6C5CE7',
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
            ['#F6F7FB', '#F8F9FF', '#EEF1FF'] // Soft neutral and blue-tinted gradients
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
            <SparkleBackground />

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
                            {/* Slide 1 & 2: Normal Arrows */}
                            {currentIndex < 2 && (
                                <View style={styles.navRow}>
                                    {currentIndex > 0 && (
                                        <TouchableOpacity onPress={goToPrevSlide} style={styles.secondaryNavButton}>
                                            <Ionicons name="arrow-back" size={scaleFont(24)} color="#64748B" />
                                        </TouchableOpacity>
                                    )}
                                    <TouchableOpacity onPress={goToNextSlide} style={styles.primaryNavButton}>
                                        <LinearGradient
                                            colors={['#6C5CE7', '#8E7CFF']}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 1 }}
                                            style={[StyleSheet.absoluteFill, { borderRadius: scaleFont(26) }]}
                                        />
                                        <Ionicons name="arrow-forward" size={scaleFont(24)} color="#FFFFFF" />
                                    </TouchableOpacity>
                                </View>
                            )}

                            {/* Slide 3: Get Started CTA (No Prev button) */}
                            {currentIndex === 2 && (
                                <View style={styles.navRow}>
                                    <TouchableOpacity
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                                            router.replace('/screens/AuthScreen');
                                        }}
                                        style={styles.ctaButton}
                                        activeOpacity={0.8}
                                    >
                                        <LinearGradient
                                            colors={['#6C5CE7', '#8E7CFF']}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 1 }}
                                            style={[StyleSheet.absoluteFill, { borderRadius: scaleFont(26) }]}
                                        />
                                        <Text style={styles.ctaText}>Get Started</Text>
                                        <Ionicons name="chevron-forward" size={scaleFont(18)} color="#FFFFFF" style={{ marginLeft: 8 }} />
                                    </TouchableOpacity>
                                </View>
                            )}
                        </Animated.View>


                    </Animated.View>
                </View>

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
    showcaseContainer: {
        width: SCREEN_WIDTH * 0.85,
        borderRadius: scaleFont(32),
        paddingVertical: scaleFont(48),
        paddingHorizontal: scaleFont(24),
        alignItems: 'center',
        shadowColor: 'rgba(108, 92, 231, 0.2)',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 1,
        shadowRadius: 40,
        elevation: 15,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        overflow: 'hidden',
    },
    iconWrapper: {
        marginBottom: scaleFont(40),
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconGlowContainer: {
        position: 'absolute',
        top: -scaleFont(20),
        width: scaleFont(160),
        height: scaleFont(160),
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconGlow: {
        width: '100%',
        height: '100%',
        borderRadius: scaleFont(80),
    },
    iconCircle: {
        width: scaleFont(120),
        height: scaleFont(120),
        borderRadius: scaleFont(60),
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#FFFFFF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
    },
    floatingAvatar: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
    },
    slideTitle: {
        fontSize: scaleFont(34),
        fontWeight: '900',
        color: '#1E293B',
        textAlign: 'center',
        fontFamily: 'Outfit_800ExtraBold',
        marginBottom: scaleFont(12),
        letterSpacing: -0.5,
    },
    subtitleWrapper: {
        width: '90%',
        alignSelf: 'center',
        marginTop: scaleFont(4),
    },
    slideSubtitle: {
        fontSize: scaleFont(16),
        color: '#64748B',
        textAlign: 'center',
        fontFamily: 'Outfit_400Regular',
        lineHeight: scaleFont(24),
        letterSpacing: 0.3,
    },
    cardPagination: {
        marginTop: scaleFont(40),
        width: '100%',
        alignItems: 'center',
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
    navRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: scaleFont(24),
    },
    primaryNavButton: {
        width: scaleFont(52),
        height: scaleFont(52),
        borderRadius: scaleFont(26),
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 12,
        shadowColor: 'rgba(108, 92, 231, 0.4)',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
        overflow: 'hidden',
    },
    secondaryNavButton: {
        width: scaleFont(52),
        height: scaleFont(52),
        borderRadius: scaleFont(26),
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 10,
        shadowColor: 'rgba(0, 0, 0, 0.1)',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 15,
    },
    ctaButton: {
        width: scaleFont(180),
        height: scaleFont(52),
        borderRadius: scaleFont(26),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 15,
        shadowColor: 'rgba(108, 92, 231, 0.4)',
        shadowOffset: { width: 0, height: 15 },
        shadowOpacity: 0.4,
        shadowRadius: 25,
        overflow: 'hidden',
    },
    ctaText: {
        color: '#FFFFFF',
        fontSize: scaleFont(16),
        fontFamily: 'Outfit_600SemiBold',
    },
    pagination: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    dot: {
        height: scaleFont(8),
        borderRadius: scaleFont(4),
        marginHorizontal: scaleFont(6),
    },
    skipButton: {
        position: 'absolute',
        top: scaleFont(60),
        right: scaleFont(24),
        zIndex: 50,
        padding: scaleFont(8),
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        borderRadius: scaleFont(20),
    },
    skipText: {
        fontSize: scaleFont(14),
        fontFamily: 'Outfit_600SemiBold',
        color: '#64748B',
    },
});


