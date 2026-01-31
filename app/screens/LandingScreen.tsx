import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import * as SplashScreenModule from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    useColorScheme
} from 'react-native';

import Animated, {
    Extrapolation,
    FadeIn,
    FadeInDown,
    FadeOut,
    interpolate,
    useAnimatedScrollHandler,
    useAnimatedStyle,
    useSharedValue
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/theme';
import { supabase } from '../../lib/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SLIDE_WIDTH = SCREEN_WIDTH * 0.8;
const SLIDE_SPACING = (SCREEN_WIDTH - SLIDE_WIDTH) / 2;

export default function LandingScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    // Auth State Check
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
    const [isDeepLink, setIsDeepLink] = useState(false);
    const [isImageReady, setIsImageReady] = useState(false);
    const [step, setStep] = useState(0); // 0 = Splash, 1 = Content

    // Animation Values
    const scrollX = useSharedValue(0);

    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (event) => {
            scrollX.value = event.contentOffset.x;
        },
    });

    useEffect(() => {
        // Only hide splash when image is ready
        if (isImageReady) {
            SplashScreenModule.hideAsync().catch(() => { });
        }
    }, [isImageReady]);

    useEffect(() => {
        // 2. Check Auth in Background & Check Deep Link
        const checkState = async () => {
            const initialUrl = await Linking.getInitialURL();
            const isDeepLinkDetected = initialUrl && (initialUrl.includes('access_token') || initialUrl.includes('#access_token'));

            if (isDeepLinkDetected) {
                console.log('LandingScreen: Deep Link detected');
                setIsDeepLink(true);
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

        // Force Splash for 3 seconds
        const timer = setTimeout(() => {
            setStep(1);
        }, 3000);

        return () => clearTimeout(timer);
    }, []);

    // Intro Slider Data
    const slides = [
        {
            id: 1,
            title: "Create & Stake",
            description: "Set a goal. Pledge money. \nPut your wallet where your mouth is.",
            icon: "wallet-outline",
            color: "#F59E0B"
        },
        {
            id: 2,
            title: "Verify Daily",
            description: "Upload photo proof every day. \nAI and friends verify your progress.",
            icon: "camera-outline",
            color: "#3B82F6"
        },
        {
            id: 3,
            title: "Keep it or Lose it",
            description: "Consistency pays. \nMiss a day? Your stake goes to the pool.",
            icon: "shield-checkmark-outline",
            color: "#10B981"
        }
    ];

    // Render Slide Item with Parallax
    const SlideItem = ({ item, index }: { item: any, index: number }) => {
        const animatedStyle = useAnimatedStyle(() => {
            const inputRange = [
                (index - 1) * SCREEN_WIDTH,
                index * SCREEN_WIDTH,
                (index + 1) * SCREEN_WIDTH
            ];

            const scale = interpolate(
                scrollX.value,
                inputRange,
                [0.9, 1, 0.9],
                Extrapolation.CLAMP
            );

            const opacity = interpolate(
                scrollX.value,
                inputRange,
                [0.6, 1, 0.6],
                Extrapolation.CLAMP
            );

            const translateY = interpolate(
                scrollX.value,
                inputRange,
                [20, 0, 20], // Slight drop for inactive cards
                Extrapolation.CLAMP
            );

            return {
                transform: [{ scale }, { translateY }],
                opacity
            };
        });

        // Parallax for Icon
        const iconStyle = useAnimatedStyle(() => {
            const inputRange = [
                (index - 1) * SCREEN_WIDTH,
                index * SCREEN_WIDTH,
                (index + 1) * SCREEN_WIDTH
            ];
            const translateX = interpolate(
                scrollX.value,
                inputRange,
                [-40, 0, 40], // Move icon slightly opposite
                Extrapolation.CLAMP
            );
            return {
                transform: [{ translateX }]
            };
        });

        return (
            <View style={{ width: SCREEN_WIDTH, alignItems: 'center', justifyContent: 'center' }}>
                <Animated.View style={[styles.slideCard, { shadowColor: item.color }, animatedStyle]}>
                    <LinearGradient
                        colors={[theme.card, '#F8FAFC']}
                        style={styles.slideCardGradient}
                    >
                        <Animated.View style={[styles.iconCircle, { backgroundColor: item.color + '15' }, iconStyle]}>
                            <Ionicons name={item.icon as any} size={56} color={item.color} />
                        </Animated.View>
                        <Text style={[styles.slideTitle, { color: theme.text }]}>{item.title}</Text>
                        <Text style={[styles.slideDesc, { color: theme.icon }]}>{item.description}</Text>

                        {/* Decorative Element */}
                        <View style={[styles.decorativeLine, { backgroundColor: item.color }]} />
                    </LinearGradient>
                </Animated.View>
            </View>
        );
    };

    // Render Pagination Dots
    const Pagination = () => {
        return (
            <View style={styles.pagination}>
                {slides.map((_, index) => {
                    const dotStyle = useAnimatedStyle(() => {
                        const inputRange = [
                            (index - 1) * SCREEN_WIDTH,
                            index * SCREEN_WIDTH,
                            (index + 1) * SCREEN_WIDTH
                        ];
                        const width = interpolate(
                            scrollX.value,
                            inputRange,
                            [8, 24, 8],
                            Extrapolation.CLAMP
                        );
                        const opacity = interpolate(
                            scrollX.value,
                            inputRange,
                            [0.3, 1, 0.3],
                            Extrapolation.CLAMP
                        );
                        return {
                            width,
                            opacity,
                            backgroundColor: theme.text
                        };
                    });
                    return <Animated.View key={index} style={[styles.dot, dotStyle]} />;
                })}
            </View>
        );
    };

    const renderContent = () => {
        // Step 0: Show Icon (Matches Native Splash) -> Then fade to Text
        if (step === 0) {
            return (
                <Animated.View
                    entering={FadeIn}
                    exiting={FadeOut}
                    style={[styles.centerContent, { justifyContent: 'center' }]}
                >
                    <View style={styles.logoImageLarge}>
                        <Image
                            source={require('../../assets/images/splash.png')}
                            style={{ width: '100%', height: '100%', transform: [{ scale: 0.8 }] }}
                            resizeMode="contain"
                            onLoadEnd={() => setIsImageReady(true)}
                        />
                    </View>
                </Animated.View>
            );
        }

        if (isAuthenticated === null) {
            return (
                <View style={[styles.centerContent, { justifyContent: 'center' }]}>
                    <ActivityIndicator size="large" color={theme.text} />
                </View>
            );
        }

        if (!isAuthenticated) {
            return (
                <View style={[styles.centerContent, { justifyContent: 'space-between', paddingVertical: 20 }]}>

                    {/* Header */}
                    <Animated.View
                        entering={FadeInDown.duration(800)}
                        style={{ marginTop: 60, alignItems: 'center' }}
                    >
                        <Text style={[styles.appTitle, { color: theme.text }]}>Pay & Promise</Text>
                        <Text style={[styles.appSubtitle, { color: theme.icon }]}>Build Habits. Or Pay the Price.</Text>
                    </Animated.View>

                    {/* Slider */}
                    <View style={{ height: 380 }}>
                        <Animated.ScrollView
                            horizontal
                            pagingEnabled
                            showsHorizontalScrollIndicator={false}
                            onScroll={scrollHandler}
                            scrollEventThrottle={16}
                            decelerationRate="fast"
                            snapToInterval={SCREEN_WIDTH}
                            contentContainerStyle={{ alignItems: 'center' }}
                        >
                            {slides.map((item, index) => (
                                <SlideItem key={item.id} item={item} index={index} />
                            ))}
                        </Animated.ScrollView>

                        <Pagination />
                    </View>

                    {/* Action */}
                    <TouchableOpacity
                        style={[styles.getStartedBtn, { backgroundColor: theme.text }]}
                        onPress={() => router.replace('/screens/AuthScreen')}
                        activeOpacity={0.8}
                    >
                        <Text style={[styles.btnText, { color: theme.background }]}>Get Started</Text>
                        <Ionicons name="arrow-forward" size={20} color={theme.background} />
                    </TouchableOpacity>
                </View>
            );
        }

        return <View />;
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
    },
    container: {
        flex: 1,
    },
    centerContent: {
        flex: 1,
        alignItems: 'center',
        width: '100%',
    },
    appTitle: {
        fontSize: 36,
        fontWeight: '900',
        marginBottom: 8,
        letterSpacing: -1,
    },
    appSubtitle: {
        fontSize: 16,
        fontWeight: '500',
    },
    slideCard: {
        width: SLIDE_WIDTH,
        height: 340,
        borderRadius: 40,
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.2, // Stronger shadow for depth
        shadowRadius: 32,
        elevation: 12,
        backgroundColor: 'white',
        overflow: 'visible', // Let shadow breath
    },
    slideCardGradient: {
        flex: 1,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    iconCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 32,
    },
    slideTitle: {
        fontSize: 28,
        fontWeight: '800',
        marginBottom: 16,
        textAlign: 'center',
        letterSpacing: -0.5,
    },
    slideDesc: {
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
        opacity: 0.8,
    },
    decorativeLine: {
        width: 40,
        height: 4,
        borderRadius: 2,
        marginTop: 32,
        opacity: 0.5,
    },
    pagination: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 0, // Adjusted
        position: 'absolute',
        bottom: 0,
        width: '100%',
    },
    dot: {
        height: 8,
        borderRadius: 4,
        marginHorizontal: 4,
    },
    getStartedBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 18,
        paddingHorizontal: 40,
        borderRadius: 100,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 6,
    },
    btnText: {
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    // Legacy support to avoid crashes if referenced elsewhere (though unnecessary)
    logoImageLarge: { width: 200, height: 200, justifyContent: 'center', alignItems: 'center' },
    // card: { width: 300 },
    // textEasy: {},
    // textHard: {},
    // textSoMakeThem: {},
    // expensiveBadge: {},
    // textExpensiveWhite: {},
    // textBridge: {}
});