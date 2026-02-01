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
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    useColorScheme
} from 'react-native';

import * as Haptics from 'expo-haptics';
import Animated, {
    Easing,
    Extrapolation,
    FadeInDown,
    interpolate,
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
import { scaleFont } from '../utils/layout';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// --- LUXURY COMPONENTS ---





export default function LandingScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    // Auth State Check
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
    const [isImageReady, setIsImageReady] = useState(false);
    const [step, setStep] = useState(0); // 0 = Splash, 1 = Content

    // Animation Values
    const scrollX = useSharedValue(0);
    const logoScale = useSharedValue(0.8);
    const logoOpacity = useSharedValue(0);

    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (event) => {
            scrollX.value = event.contentOffset.x;
        },
    });

    useEffect(() => {
        if (isImageReady) {
            SplashScreenModule.hideAsync().catch(() => { });
            logoScale.value = withTiming(1, { duration: 1000, easing: Easing.out(Easing.back(1.5)) });
            logoOpacity.value = withTiming(1, { duration: 800 });
        }
    }, [isImageReady]);

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
        }, 2500);

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
            color: "#4F46E5",
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
        const animatedStyle = useAnimatedStyle(() => {
            const inputRange = [
                (index - 1) * SCREEN_WIDTH,
                index * SCREEN_WIDTH,
                (index + 1) * SCREEN_WIDTH
            ];

            // Unique "Depth Stack" Animation
            const scale = interpolate(
                scrollX.value,
                inputRange,
                [0.8, 1, 0.8],
                Extrapolation.CLAMP
            );

            const opacity = interpolate(
                scrollX.value,
                inputRange,
                [0.5, 1, 0.5],
                Extrapolation.CLAMP
            );

            const rotateY = interpolate(
                scrollX.value,
                inputRange,
                [45, 0, -45], // degrees
                Extrapolation.CLAMP
            );

            const translateX = interpolate(
                scrollX.value,
                inputRange,
                [-scaleFont(100), 0, scaleFont(100)], // overlap effect scaled
                Extrapolation.CLAMP
            );

            return {
                transform: [
                    { perspective: 1000 },
                    { scale },
                    { rotateY: `${rotateY}deg` },
                    { translateX }
                ],
                opacity
            };
        });

        // Split title to highlight executive words
        const titleParts = item.title.split(item.highlight);

        return (
            <View style={{ width: SCREEN_WIDTH, alignItems: 'center', justifyContent: 'center', paddingHorizontal: scaleFont(30) }}>
                <Animated.View style={[styles.slideCard, animatedStyle]}>
                    <View style={styles.glassEffect} />
                    <LinearGradient colors={[`${item.color}15`, 'transparent']} style={StyleSheet.absoluteFill} />

                    {/* Reduced Icon Container Size */}
                    <View style={[styles.iconContainer, { backgroundColor: `${item.color}10` }]}>
                        {/* Reduced Icon Size from 54 to 42 */}
                        <Ionicons name={item.icon as any} size={scaleFont(42)} color={item.color} />
                    </View>

                    <Text style={styles.slideTitle} allowFontScaling={false}>
                        {titleParts[0]}
                        <Text style={{ color: item.color }}>{item.highlight}</Text>
                        {titleParts[1]}
                    </Text>
                    <Text style={styles.slideSubtitle} allowFontScaling={false}>{item.subtitle}</Text>

                    <View style={[styles.accentLine, { backgroundColor: item.color }]} />
                </Animated.View>
            </View>
        );
    };

    const Pagination = () => (
        <View style={styles.pagination}>
            {slides.map((_, index) => {
                const dotStyle = useAnimatedStyle(() => {
                    const width = interpolate(scrollX.value, [(index - 1) * SCREEN_WIDTH, index * SCREEN_WIDTH, (index + 1) * SCREEN_WIDTH], [scaleFont(8), scaleFont(28), scaleFont(8)], Extrapolation.CLAMP);
                    const opacity = interpolate(scrollX.value, [(index - 1) * SCREEN_WIDTH, index * SCREEN_WIDTH, (index + 1) * SCREEN_WIDTH], [0.2, 1, 0.2], Extrapolation.CLAMP);
                    return { width, opacity, backgroundColor: '#4F46E5' };
                });
                return <Animated.View key={index} style={[styles.dot, dotStyle]} />;
            })}
        </View>
    );

    if (step === 0) {
        return (
            <View style={styles.splashContainer}>
                <LinearGradient colors={['#F8FAFC', '#F1F5F9']} style={StyleSheet.absoluteFill} />
                <Animated.View style={[styles.logoWrapper, { transform: [{ scale: logoScale }], opacity: logoOpacity }]}>
                    <View style={styles.logoRing}>
                        <Image
                            source={require('../../assets/images/icon.png')}
                            style={styles.splashLogo}
                            resizeMode="contain"
                            onLoadEnd={() => setIsImageReady(true)}
                        />
                    </View>
                    <Text style={styles.splashBrand} allowFontScaling={false}>Pay & Promise</Text>
                    <Text style={styles.splashTagline} allowFontScaling={false}>Where discipline begins</Text>
                </Animated.View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            <LinearGradient colors={['#F8FAFC', '#F1F5F9', '#EAEEF3']} style={StyleSheet.absoluteFill} />

            <GridOverlay />

            <SafeAreaView style={{ flex: 1 }}>
                <View style={styles.content}>
                    {/* Header Removed as requested */}

                    <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.sliderContainer}>
                        <Animated.ScrollView
                            horizontal
                            pagingEnabled
                            showsHorizontalScrollIndicator={false}
                            onScroll={scrollHandler}
                            scrollEventThrottle={16}
                            contentContainerStyle={{ alignItems: 'center' }}
                            decelerationRate="fast"
                        >
                            {slides.map((item, index) => (
                                <SlideItem key={item.id} item={item} index={index} />
                            ))}
                        </Animated.ScrollView>
                        <Pagination />
                    </Animated.View>

                    <Animated.View entering={FadeInDown.delay(700).springify()} style={styles.footer}>
                        <View style={styles.portalWrapper}>
                            <Animated.View style={[styles.portalHalo, animatedHaloStyle]} />
                            <Animated.View style={animatedPortalStyle}>
                                <TouchableOpacity
                                    style={styles.portalAction}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                                        router.replace('/screens/AuthScreen');
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <LinearGradient
                                        colors={['#4F46E5', '#312E81']}
                                        style={styles.portalGradient}
                                    >
                                        <Ionicons name="arrow-forward" size={scaleFont(36)} color="#FFF" />
                                    </LinearGradient>
                                    <View style={styles.portalInnerRing} />
                                </TouchableOpacity>
                            </Animated.View>
                        </View>
                        <Text style={styles.portalLabel} allowFontScaling={false}>INITIATE JOURNEY</Text>
                        <Text style={styles.footNote} allowFontScaling={false}>Join the 1% of disciplined achievers.</Text>
                    </Animated.View>
                </View>
            </SafeAreaView>
        </View>
    );
}

// ... existing imports

// ... (rest of the file content until scaleFont definition)

// Removed local scaleFont definition

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },

    // Splash Styles
    splashContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    logoWrapper: { alignItems: 'center' },
    logoRing: {
        width: scaleFont(140),
        height: scaleFont(140),
        borderRadius: scaleFont(70),
        backgroundColor: '#FFF',
        padding: scaleFont(20),
        elevation: scaleFont(20),
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: scaleFont(15) },
        shadowOpacity: 0.1,
        shadowRadius: scaleFont(25),
        justifyContent: 'center',
        alignItems: 'center'
    },
    splashLogo: { width: '100%', height: '100%' },
    splashBrand: {
        fontSize: scaleFont(32),
        fontWeight: '900',
        color: '#1E293B',
        marginTop: scaleFont(32),
        letterSpacing: scaleFont(-1),
        fontFamily: 'Outfit_800ExtraBold'
    },
    splashTagline: {
        fontSize: scaleFont(16),
        color: '#64748B',
        marginTop: scaleFont(8),
        fontWeight: '600',
        fontFamily: 'Outfit_400Regular' // Changed to Regular as requested for common text
    },

    // --- MAIN CONTENT ---
    content: { flex: 1, justifyContent: 'space-evenly', paddingBottom: '5%' },

    sliderContainer: { height: '60%', justifyContent: 'center' },
    slideCard: {
        width: SCREEN_WIDTH * 0.85,
        height: '85%',
        borderRadius: scaleFont(44),
        backgroundColor: 'rgba(255,255,255,0.92)',
        padding: '8%',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        elevation: scaleFont(12),
        shadowColor: 'rgba(79, 70, 229, 0.15)',
        shadowOffset: { width: 0, height: scaleFont(24) },
        shadowOpacity: 0.3,
        shadowRadius: scaleFont(36)
    },
    glassEffect: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.4)', opacity: 0.7 },

    iconContainer: {
        width: scaleFont(80),
        height: scaleFont(80),
        borderRadius: scaleFont(28),
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '8%'
    },
    slideTitle: {
        fontSize: scaleFont(32),
        color: '#0F172A',
        marginBottom: scaleFont(12),
        textAlign: 'center',
        letterSpacing: scaleFont(-1),
        fontFamily: 'Outfit_800ExtraBold'
    },
    slideSubtitle: {
        fontSize: scaleFont(17),
        color: '#64748B',
        textAlign: 'center',
        lineHeight: scaleFont(26),
        fontWeight: '500',
        paddingHorizontal: scaleFont(10),
        fontFamily: 'Outfit_300Light' // Changed to Light/Thin as requested
    },

    accentLine: {
        width: scaleFont(60),
        height: scaleFont(5),
        borderRadius: scaleFont(2.5),
        marginTop: '10%',
        opacity: 0.2
    },

    pagination: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: scaleFont(20)
    },
    dot: {
        height: scaleFont(7),
        borderRadius: scaleFont(3.5),
        marginHorizontal: scaleFont(5)
    },

    footer: {
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingBottom: '5%'
    },
    portalWrapper: {
        width: scaleFont(120),
        height: scaleFont(120),
        justifyContent: 'center',
        alignItems: 'center'
    },
    portalHalo: {
        position: 'absolute',
        width: scaleFont(110),
        height: scaleFont(110),
        borderRadius: scaleFont(55),
        borderWidth: scaleFont(2),
        borderColor: '#4F46E5',
        borderStyle: 'dashed',
        opacity: 0.2
    },
    portalAction: {
        width: scaleFont(90),
        height: scaleFont(90),
        borderRadius: scaleFont(45),
        justifyContent: 'center',
        alignItems: 'center',
        elevation: scaleFont(25),
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: scaleFont(12) },
        shadowRadius: scaleFont(24),
    },
    portalGradient: {
        width: scaleFont(90),
        height: scaleFont(90),
        borderRadius: scaleFont(45),
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2
    },
    portalInnerRing: {
        position: 'absolute',
        width: scaleFont(106),
        height: scaleFont(106),
        borderRadius: scaleFont(53),
        borderWidth: scaleFont(1.5),
        borderColor: 'rgba(79, 70, 229, 0.2)',
        zIndex: 1
    },
    portalLabel: {
        fontSize: scaleFont(11),
        fontWeight: '900',
        color: '#4F46E5',
        marginTop: scaleFont(18),
        letterSpacing: scaleFont(4),
        opacity: 0.9,
        textTransform: 'uppercase'
    },
    footNote: {
        fontSize: scaleFont(12),
        color: '#94A3B8',
        fontWeight: '700',
        marginTop: scaleFont(20),
        letterSpacing: scaleFont(0.6),
        fontFamily: 'Outfit_300Light' // Changed to Light
    },
});
