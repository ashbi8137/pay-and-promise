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
            title: "Executive Stakes",
            highlight: "Executive",
            subtitle: "Commit financial assets to your personal milestones. Integrity is non-negotiable.",
            icon: "diamond-outline",
            color: "#4F46E5",
        },
        {
            id: 2,
            title: "Peer Verification",
            highlight: "Verification",
            subtitle: "Your progress is audited by the community. Real proof, real accountability.",
            icon: "shield-checkmark",
            color: "#7C3AED",
        },
        {
            id: 3,
            title: "Compounding Trust",
            highlight: "Trust",
            subtitle: "Build your reputation on the ledger of honor. Success breeds discipline.",
            icon: "infinite",
            color: "#6366F1",
        }
    ];

    const SlideItem = ({ item, index }: { item: any, index: number }) => {
        const animatedStyle = useAnimatedStyle(() => {
            const inputRange = [(index - 1) * SCREEN_WIDTH, index * SCREEN_WIDTH, (index + 1) * SCREEN_WIDTH];
            const scale = interpolate(scrollX.value, inputRange, [0.88, 1, 0.88], Extrapolation.CLAMP);
            const opacity = interpolate(scrollX.value, inputRange, [0.4, 1, 0.4], Extrapolation.CLAMP);
            return { transform: [{ scale }], opacity };
        });

        // Split title to highlight executive words
        const titleParts = item.title.split(item.highlight);

        return (
            <View style={{ width: SCREEN_WIDTH, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 }}>
                <Animated.View style={[styles.slideCard, animatedStyle]}>
                    <View style={styles.glassEffect} />
                    <LinearGradient colors={[`${item.color}15`, 'transparent']} style={StyleSheet.absoluteFill} />

                    <View style={[styles.iconContainer, { backgroundColor: `${item.color}10` }]}>
                        <Ionicons name={item.icon as any} size={54} color={item.color} />
                    </View>

                    <Text style={styles.slideTitle}>
                        {titleParts[0]}
                        <Text style={{ color: item.color }}>{item.highlight}</Text>
                        {titleParts[1]}
                    </Text>
                    <Text style={styles.slideSubtitle}>{item.subtitle}</Text>

                    <View style={[styles.accentLine, { backgroundColor: item.color }]} />
                </Animated.View>
            </View>
        );
    };

    const Pagination = () => (
        <View style={styles.pagination}>
            {slides.map((_, index) => {
                const dotStyle = useAnimatedStyle(() => {
                    const width = interpolate(scrollX.value, [(index - 1) * SCREEN_WIDTH, index * SCREEN_WIDTH, (index + 1) * SCREEN_WIDTH], [8, 28, 8], Extrapolation.CLAMP);
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
                    <Text style={styles.splashBrand}>Pay & Promise</Text>
                    <Text style={styles.splashTagline}>Where discipline begins</Text>
                </Animated.View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            <LinearGradient colors={['#F8FAFC', '#F1F5F9', '#EAEEF3']} style={StyleSheet.absoluteFill} />

            <GridOverlay />

            {/* Background glows removed for focus */}

            <SafeAreaView style={{ flex: 1 }}>
                <View style={styles.content}>
                    <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.header}>
                        <Text style={styles.headerTitle}>Pay & Promise</Text>
                        <View style={styles.headerDivider} />
                        <Text style={styles.headerTagline}>THE EXECUTIVE STANDARD</Text>
                    </Animated.View>

                    <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.sliderContainer}>
                        <Animated.ScrollView
                            horizontal
                            pagingEnabled
                            showsHorizontalScrollIndicator={false}
                            onScroll={scrollHandler}
                            scrollEventThrottle={16}
                            contentContainerStyle={{ alignItems: 'center' }}
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
                                        <Ionicons name="arrow-forward" size={36} color="#FFF" />
                                    </LinearGradient>
                                    <View style={styles.portalInnerRing} />
                                </TouchableOpacity>
                            </Animated.View>
                        </View>
                        <Text style={styles.portalLabel}>INITIATE JOURNEY</Text>
                        <Text style={styles.footNote}>Join the 1% of disciplined achievers.</Text>
                    </Animated.View>
                </View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    splashContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    logoWrapper: { alignItems: 'center' },
    logoRing: { width: 140, height: 140, borderRadius: 70, backgroundColor: '#FFF', padding: 20, elevation: 20, shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 15 }, shadowOpacity: 0.1, shadowRadius: 25, justifyContent: 'center', alignItems: 'center' },
    splashLogo: { width: '100%', height: '100%' },
    splashBrand: { fontSize: 32, fontWeight: '900', color: '#1E293B', marginTop: 32, letterSpacing: -1 },
    splashTagline: { fontSize: 16, color: '#64748B', marginTop: 8, fontWeight: '600' },

    // --- LUXURY BACKGROUND ---
    content: { flex: 1, justifyContent: 'space-between', paddingVertical: 30 },
    header: { alignItems: 'center', marginTop: 10 },
    headerTitle: { fontSize: 38, fontWeight: '900', color: '#0F172A', letterSpacing: -1.8 },
    headerDivider: { width: 34, height: 5, backgroundColor: '#4F46E5', borderRadius: 3, marginVertical: 14 },
    headerTagline: { fontSize: 11, fontWeight: '900', color: '#94A3B8', letterSpacing: 5 },

    sliderContainer: { height: SCREEN_HEIGHT * 0.52, justifyContent: 'center' },
    slideCard: {
        width: SCREEN_WIDTH - 64,
        height: 400,
        borderRadius: 44,
        backgroundColor: 'rgba(255,255,255,0.92)',
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        elevation: 12,
        shadowColor: 'rgba(79, 70, 229, 0.15)',
        shadowOffset: { width: 0, height: 24 },
        shadowOpacity: 0.3,
        shadowRadius: 36
    },
    glassEffect: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.4)', opacity: 0.7 },
    iconContainer: { width: 120, height: 120, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 36 },
    slideTitle: { fontSize: 30, fontWeight: '900', color: '#0F172A', marginBottom: 18, textAlign: 'center', letterSpacing: -0.8 },
    slideSubtitle: { fontSize: 17, color: '#64748B', textAlign: 'center', lineHeight: 26, fontWeight: '500', paddingHorizontal: 10 },
    accentLine: { width: 60, height: 5, borderRadius: 2.5, marginTop: 36, opacity: 0.2 },

    pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 30 },
    dot: { height: 7, borderRadius: 3.5, marginHorizontal: 5 },

    footer: { paddingHorizontal: 40, alignItems: 'center', paddingBottom: 10 },
    portalWrapper: { width: 120, height: 120, justifyContent: 'center', alignItems: 'center' },
    portalHalo: {
        position: 'absolute',
        width: 110,
        height: 110,
        borderRadius: 55,
        borderWidth: 2,
        borderColor: '#4F46E5',
        borderStyle: 'dashed',
        opacity: 0.2
    },
    portalAction: {
        width: 90,
        height: 90,
        borderRadius: 45,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 25,
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 12 },
        shadowRadius: 24,
    },
    portalGradient: {
        width: 90,
        height: 90,
        borderRadius: 45,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2
    },
    portalInnerRing: {
        position: 'absolute',
        width: 106,
        height: 106,
        borderRadius: 53,
        borderWidth: 1.5,
        borderColor: 'rgba(79, 70, 229, 0.2)',
        zIndex: 1
    },
    portalLabel: {
        fontSize: 11,
        fontWeight: '900',
        color: '#4F46E5',
        marginTop: 18,
        letterSpacing: 4,
        opacity: 0.9,
        textTransform: 'uppercase'
    },
    footNote: {
        fontSize: 12,
        color: '#94A3B8',
        fontWeight: '700',
        marginTop: 20,
        letterSpacing: 0.6
    },
});