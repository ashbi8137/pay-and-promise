import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ImageBackground, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
    FadeInDown,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming
} from 'react-native-reanimated';

export default function LandingScreen() {
    const router = useRouter();

    // Pulse Animation for Icon
    const scale = useSharedValue(1);

    useEffect(() => {
        scale.value = withRepeat(
            withSequence(
                withTiming(1.05, { duration: 2000 }),
                withTiming(1, { duration: 2000 })
            ),
            -1, // Infinite
            true // Reverse
        );
    }, []);

    const animatedIconStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    return (
        <ImageBackground
            source={require('../../assets/landing-bg-dark.png')}
            style={styles.background}
            resizeMode="cover"
        >
            <StatusBar style="light" />

            {/* Subtle Gradient Overlay for Depth */}
            <LinearGradient
                colors={['rgba(10, 22, 51, 0.4)', 'rgba(2, 6, 23, 0.8)']}
                style={styles.overlay}
            >
                <SafeAreaView style={styles.container}>

                    {/* TOP SECTION: Identity */}
                    <View style={styles.topSection}>
                        <Animated.View
                            entering={FadeInDown.delay(300).springify()}
                            style={[styles.iconContainer, animatedIconStyle]}
                        >
                            <View style={styles.iconCircle}>
                                <FontAwesome5 name="handshake" size={48} color="#FFFFFF" />
                            </View>
                        </Animated.View>

                        <Animated.View entering={FadeInDown.delay(400).springify()}>
                            <Text style={styles.appName}>Pay & Promise</Text>
                        </Animated.View>
                    </View>

                    {/* MIDDLE SECTION: Hero Text */}
                    <View style={styles.heroSection}>
                        <Animated.View entering={FadeInDown.delay(500).springify()}>
                            <Text style={styles.mainTitle}>Make Promises{"\n"}That Matter</Text>
                        </Animated.View>

                        <Animated.View entering={FadeInDown.delay(600).springify()}>
                            <Text style={styles.subtitle}>
                                Create accountability using real commitment.
                            </Text>
                        </Animated.View>
                    </View>

                    {/* BOTTOM SECTION: Actions */}
                    <View style={styles.bottomSection}>
                        <Animated.View entering={FadeInDown.delay(700).springify()} style={{ width: '100%' }}>
                            <TouchableOpacity
                                activeOpacity={0.9}
                                onPress={() => router.push('/screens/AuthScreen')}
                                style={styles.buttonWrapper}
                            >
                                <LinearGradient
                                    colors={['#FF9A9E', '#FECFEF']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.primaryButton}
                                >
                                    <Text style={styles.primaryButtonText}>Get Started</Text>
                                    <Ionicons name="arrow-forward" size={20} color="#FFFFFF" style={{ marginLeft: 8 }} />
                                </LinearGradient>
                            </TouchableOpacity>
                        </Animated.View>

                        <Animated.View entering={FadeInDown.delay(800).springify()}>
                            <TouchableOpacity
                                activeOpacity={0.7}
                                onPress={() => router.push({ pathname: '/screens/AuthScreen', params: { mode: 'signup' } })}
                                style={styles.secondaryButton}
                            >
                                <Text style={styles.secondaryButtonText}>Don’t have an account? Sign up</Text>
                            </TouchableOpacity>
                        </Animated.View>
                    </View>

                </SafeAreaView>
            </LinearGradient>
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    background: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    overlay: {
        flex: 1,
    },
    container: {
        flex: 1,
        justifyContent: 'space-between',
        paddingVertical: 40,
        paddingHorizontal: 32,
    },

    // Top Section
    topSection: {
        alignItems: 'center',
        marginTop: 60,
    },
    iconContainer: {
        marginBottom: 16,
    },
    iconCircle: {
        // Soft glass circle if needed, or just let it float
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    appName: {
        fontSize: 24,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.9)',
        letterSpacing: 1,
    },

    // Hero Section
    heroSection: {
        alignItems: 'center',
        marginBottom: 20, // Push slightly up from bottom
    },
    mainTitle: {
        fontSize: 32,
        fontWeight: '700',
        color: '#FFFFFF',
        textAlign: 'center',
        marginBottom: 16,
        lineHeight: 40,
    },
    subtitle: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.7)',
        textAlign: 'center',
        lineHeight: 24,
        maxWidth: 280,
    },

    // Bottom Section
    bottomSection: {
        alignItems: 'center',
        gap: 24,
        paddingBottom: 20,
    },
    buttonWrapper: {
        width: '100%',
        shadowColor: '#FF9A9E',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
    },
    primaryButton: {
        width: '100%',
        height: 56,
        borderRadius: 28,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    secondaryButton: {
        padding: 8,
    },
    secondaryButtonText: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 15,
        fontWeight: '500',
    },
});
