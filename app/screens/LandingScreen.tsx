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
    withTiming
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/theme';
import { supabase } from '../../lib/supabase';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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
        const checkState = async () => {
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

            const { data, error } = await supabase.auth.getUser();
            const hasUser = !!(data?.user && !error);
            setIsAuthenticated(hasUser);

            if (hasUser) {
                router.replace('/(tabs)');
            }
        };

        checkState();

        const timer = setTimeout(() => {
            setStep(1);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }, 2500);

        return () => clearTimeout(timer);
    }, []);

    const slides = [
        {
            id: 1,
            title: "Executive Stakes",
            subtitle: "Commit financial assets to your personal milestones. Integrity is non-negotiable.",
            icon: "diamond-outline",
            color: "#4F46E5",
            gradient: ['#4F46E5', '#3730A3']
        },
        {
            id: 2,
            title: "Peer Verification",
            subtitle: "Your progress is audited by the community. Real proof, real accountability.",
            icon: "shield-checkmark",
            color: "#7C3AED",
            gradient: ['#7C3AED', '#5B21B6']
        },
        {
            id: 3,
            title: "Compounding Trust",
            subtitle: "Build your reputation on the ledger of honor. Success breeds discipline.",
            icon: "infinite",
            color: "#6366F1",
            gradient: ['#6366F1', '#4338CA']
        }
    ];

    const SlideItem = ({ item, index }: { item: any, index: number }) => {
        const animatedStyle = useAnimatedStyle(() => {
            const inputRange = [(index - 1) * SCREEN_WIDTH, index * SCREEN_WIDTH, (index + 1) * SCREEN_WIDTH];
            const scale = interpolate(scrollX.value, inputRange, [0.85, 1, 0.85], Extrapolation.CLAMP);
            const opacity = interpolate(scrollX.value, inputRange, [0.4, 1, 0.4], Extrapolation.CLAMP);
            return { transform: [{ scale }], opacity };
        });

        return (
            <View style={{ width: SCREEN_WIDTH, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}>
                <Animated.View style={[styles.slideCard, animatedStyle]}>
                    <View style={styles.glassEffect} />
                    <LinearGradient colors={[`${item.color}20`, 'transparent']} style={StyleSheet.absoluteFill} />

                    <View style={[styles.iconContainer, { backgroundColor: `${item.color}15` }]}>
                        <Ionicons name={item.icon as any} size={48} color={item.color} />
                    </View>

                    <Text style={styles.slideTitle}>{item.title}</Text>
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
                    const width = interpolate(scrollX.value, [(index - 1) * SCREEN_WIDTH, index * SCREEN_WIDTH, (index + 1) * SCREEN_WIDTH], [8, 24, 8], Extrapolation.CLAMP);
                    const opacity = interpolate(scrollX.value, [(index - 1) * SCREEN_WIDTH, index * SCREEN_WIDTH, (index + 1) * SCREEN_WIDTH], [0.3, 1, 0.3], Extrapolation.CLAMP);
                    return { width, opacity };
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
            <LinearGradient colors={['#F8FAFC', '#F1F5F9', '#E2E8F0']} style={StyleSheet.absoluteFill} />

            <View style={styles.ambientGlow} />

            <SafeAreaView style={{ flex: 1 }}>
                <View style={styles.content}>
                    <Animated.View entering={FadeInDown.delay(200)} style={styles.header}>
                        <Text style={styles.headerTitle}>Pay & Promise</Text>
                        <View style={styles.headerDivider} />
                        <Text style={styles.headerTagline}>THE EXECUTIVE STANDARD</Text>
                    </Animated.View>

                    <View style={styles.sliderContainer}>
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
                    </View>

                    <Animated.View entering={FadeInDown.delay(600)} style={styles.footer}>
                        <TouchableOpacity
                            style={styles.ctaButton}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                                router.replace('/screens/AuthScreen');
                            }}
                            activeOpacity={0.9}
                        >
                            <LinearGradient
                                colors={['#1E293B', '#0F172A']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.ctaGradient}
                            >
                                <Text style={styles.ctaText}>Enter Dashboard</Text>
                                <Ionicons name="arrow-forward" size={20} color="#FFF" />
                            </LinearGradient>
                        </TouchableOpacity>
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
    content: { flex: 1, justifyContent: 'space-between', paddingVertical: 40 },
    header: { alignItems: 'center', marginTop: 20 },
    headerTitle: { fontSize: 36, fontWeight: '900', color: '#1E293B', letterSpacing: -1.5 },
    headerDivider: { width: 30, height: 4, backgroundColor: '#4F46E5', borderRadius: 2, marginVertical: 12 },
    headerTagline: { fontSize: 10, fontWeight: '800', color: '#94A3B8', letterSpacing: 4 },
    sliderContainer: { height: SCREEN_HEIGHT * 0.5, justifyContent: 'center' },
    slideCard: { width: SCREEN_WIDTH - 80, height: 360, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.7)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', padding: 32, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 20 },
    glassEffect: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.4)', opacity: 0.5 },
    iconContainer: { width: 100, height: 100, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
    slideTitle: { fontSize: 26, fontWeight: '900', color: '#1E293B', marginBottom: 16, textAlign: 'center' },
    slideSubtitle: { fontSize: 15, color: '#64748B', textAlign: 'center', lineHeight: 22, fontWeight: '500' },
    accentLine: { width: 40, height: 3, borderRadius: 1.5, marginTop: 32, opacity: 0.3 },
    pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', bottom: -10 },
    dot: { height: 6, borderRadius: 3, backgroundColor: '#1E293B', marginHorizontal: 4 },
    footer: { paddingHorizontal: 40, alignItems: 'center' },
    ctaButton: { width: '100%', height: 64, borderRadius: 20, overflow: 'hidden', elevation: 12, shadowColor: '#1E293B', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 15 },
    ctaGradient: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
    ctaText: { color: '#FFF', fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },
    footNote: { fontSize: 12, color: '#94A3B8', fontWeight: '700', marginTop: 24, letterSpacing: 0.5 },
    ambientGlow: { position: 'absolute', top: SCREEN_HEIGHT * 0.2, right: -100, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(79, 70, 229, 0.08)', filter: 'blur(80px)' as any }
});