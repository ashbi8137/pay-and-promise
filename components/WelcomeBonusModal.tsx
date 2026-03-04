import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { Easing, FadeOutDown, ZoomIn, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { scaleFont } from '../utils/layout';

const { width, height } = Dimensions.get('window');
const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

interface WelcomeBonusProps {
    visible: boolean;
    onClose: () => void;
    onClaim: () => Promise<void>;
}

const ConfettiPiece = ({ index }: { index: number }) => {
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const rotation = useSharedValue(0);
    const scale = useSharedValue(0);
    const opacity = useSharedValue(1);
    const shimmer = useSharedValue(1);

    const color = COLORS[index % COLORS.length];
    const size = Math.random() * 8 + 6;
    const isCircle = Math.random() > 0.5;

    useEffect(() => {
        const angle = (Math.random() * Math.PI * 2);
        const velocity = Math.random() * 250 + 100;
        const x = Math.cos(angle) * velocity;
        const y = -Math.abs(Math.sin(angle)) * velocity - 100;

        scale.value = withTiming(1, { duration: 300 });

        // Glitter effect (Shimmer)
        shimmer.value = withRepeat(
            withSequence(
                withTiming(0.6, { duration: 200 }),
                withTiming(1, { duration: 200 }),
            ),
            -1,
            true
        );

        translateX.value = withTiming(x, { duration: 1200, easing: Easing.out(Easing.cubic) });

        translateY.value = withSequence(
            withTiming(y, { duration: 500, easing: Easing.out(Easing.cubic) }),
            withTiming(height, { duration: 1500, easing: Easing.in(Easing.quad) })
        );

        rotation.value = withTiming(Math.random() * 360 * 5, { duration: 2000 });
        opacity.value = withDelay(1200, withTiming(0, { duration: 800 }));
    }, [scale, translateX, translateY, rotation, opacity, shimmer]);

    const style = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
            { rotate: `${rotation.value}deg` },
            { scale: scale.value * shimmer.value }
        ],
        opacity: opacity.value,
        position: 'absolute',
        top: height / 2,
        left: width / 2,
        width: size,
        height: size,
        backgroundColor: color,
        borderRadius: isCircle ? size / 2 : 0,
        zIndex: 1000,
    }));

    return <Animated.View style={style} />;
};

const ConfettiExplosion = () => {
    const pieces = Array.from({ length: 120 }).map((_, i) => i);
    return (
        <View style={[StyleSheet.absoluteFill, { zIndex: 2000 }]} pointerEvents="none">
            {pieces.map((i) => (
                <ConfettiPiece key={i} index={i} />
            ))}
        </View>
    );
};

const WelcomeBonusModal = ({ visible, onClose, onClaim }: WelcomeBonusProps) => {
    const [loading, setLoading] = useState(false);
    const [claimed, setClaimed] = useState(false);

    // Pulsating animation for the gift icon
    const iconScale = useSharedValue(1);

    useEffect(() => {
        if (visible) {
            setClaimed(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            // Start pulsating animation
            iconScale.value = withRepeat(
                withSequence(
                    withTiming(1.1, { duration: 800, easing: Easing.inOut(Easing.sin) }),
                    withTiming(1, { duration: 800, easing: Easing.inOut(Easing.sin) })
                ),
                -1,
                true
            );
        } else {
            iconScale.value = 1;
        }
    }, [visible, iconScale]);

    const iconAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: iconScale.value }]
    }));

    if (!visible) return null;

    const handleClaim = async () => {
        setLoading(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        try {
            await onClaim();
            setClaimed(true);
            setTimeout(() => {
                onClose();
            }, 500);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal transparent animationType="fade" visible={visible}>
            <View style={styles.overlay}>
                {/* 1. Glassmorphism Card Container */}
                <Animated.View
                    entering={ZoomIn.duration(800).springify()}
                    exiting={FadeOutDown}
                    style={styles.card}
                >
                    {/* Background Decorative Gradient-like circle */}
                    <View style={styles.decorCircle} />
                    <View style={[styles.decorCircle, { left: -scaleFont(50), top: scaleFont(180), backgroundColor: '#EEF2FF', width: scaleFont(120), height: scaleFont(120) }]} />

                    <View style={styles.content}>
                        {/* Pulsating Icon Wrapper */}
                        <Animated.View style={[styles.iconWrapper, iconAnimatedStyle]}>
                            <Ionicons name="gift" size={scaleFont(38)} color="#5B2DAD" />
                        </Animated.View>

                        <Text style={styles.title}>Welcome aboard!</Text>
                        <Text style={styles.subtitle}>
                            Here are some <Text style={styles.highlight}>Promise Points</Text> to{'\n'}start your journey
                        </Text>

                        <View style={styles.rewardContainer}>
                            <Text style={styles.rewardValue}>+25</Text>
                            <Text style={styles.rewardUnit}>PP</Text>
                        </View>

                        <TouchableOpacity
                            style={[styles.button, claimed && styles.buttonSuccess]}
                            onPress={handleClaim}
                            activeOpacity={0.9}
                            disabled={loading || claimed}
                        >
                            {loading ? (
                                <ActivityIndicator color="#FFF" />
                            ) : claimed ? (
                                <Ionicons name="checkmark-done" size={24} color="#FFF" />
                            ) : (
                                <Text style={styles.buttonText}>Claim & Start</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </Animated.View>

                {/* 2. Confetti bursts in foreground */}
                <ConfettiExplosion />
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.4)', // Sophisticated dark slate overlay
        justifyContent: 'center',
        alignItems: 'center',
        padding: scaleFont(24),
    },
    card: {
        width: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: scaleFont(32),
        padding: scaleFont(32),
        alignItems: 'center',
        shadowColor: '#5B2DAD',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.1,
        shadowRadius: 24,
        elevation: 10,
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.5)',
        zIndex: 5,
    },
    decorCircle: {
        position: 'absolute',
        top: -scaleFont(60),
        right: -scaleFont(40),
        width: scaleFont(150),
        height: scaleFont(150),
        borderRadius: scaleFont(75),
        backgroundColor: '#F5F3FF', // Very light purple
    },
    content: {
        alignItems: 'center',
        width: '100%',
        zIndex: 1,
    },
    iconWrapper: {
        width: scaleFont(72),
        height: scaleFont(72),
        borderRadius: scaleFont(36),
        backgroundColor: '#F5F3FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: scaleFont(24),
        borderWidth: 4,
        borderColor: '#EDE9FE',
    },
    title: {
        fontSize: scaleFont(26),
        fontFamily: 'Outfit_800ExtraBold',
        color: '#0F172A',
        marginBottom: scaleFont(12),
        textAlign: 'center',
    },
    subtitle: {
        fontSize: scaleFont(14),
        fontFamily: 'Outfit_400Regular',
        color: '#64748B',
        textAlign: 'center',
        marginBottom: scaleFont(32),
        lineHeight: scaleFont(22),
    },
    highlight: {
        color: '#5B2DAD',
        fontFamily: 'Outfit_700Bold',
    },
    rewardContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
        backgroundColor: '#F8FAFC',
        paddingVertical: scaleFont(16),
        paddingHorizontal: scaleFont(36),
        borderRadius: scaleFont(20),
        marginBottom: scaleFont(32),
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    rewardValue: {
        fontSize: scaleFont(36),
        fontFamily: 'Outfit_800ExtraBold',
        color: '#5B2DAD',
    },
    rewardUnit: {
        fontSize: scaleFont(16),
        fontFamily: 'Outfit_700Bold',
        color: '#7C3AED',
        marginLeft: scaleFont(6),
    },
    button: {
        width: '100%',
        backgroundColor: '#5B2DAD',
        paddingVertical: scaleFont(18),
        borderRadius: scaleFont(20),
        alignItems: 'center',
        shadowColor: '#5B2DAD',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonSuccess: {
        backgroundColor: '#5B2DAD',
        shadowColor: '#5B2DAD',
    },
    buttonText: {
        fontSize: scaleFont(16),
        fontFamily: 'Outfit_700Bold',
        color: '#FFFFFF',
        letterSpacing: scaleFont(0.5),
    },
});

export default WelcomeBonusModal;
