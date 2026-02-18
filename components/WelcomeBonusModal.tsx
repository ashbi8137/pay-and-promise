import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInUp, FadeOutDown, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { scaleFont } from '../utils/layout';

interface WelcomeBonusProps {
    visible: boolean;
    onClose: () => void;
}

export default function WelcomeBonusModal({ visible, onClose }: WelcomeBonusProps) {
    const scale = useSharedValue(0.5);
    const rotate = useSharedValue(0);

    useEffect(() => {
        if (visible) {
            scale.value = withTiming(1, { duration: 600 });
            rotate.value = withRepeat(withTiming(15, { duration: 1500 }), -1, true);
        }
    }, [visible]);

    const animatedIconStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }, { rotate: `${rotate.value}deg` }]
    }));

    if (!visible) return null;

    return (
        <Modal transparent animationType="fade" visible={visible}>
            <View style={styles.overlay}>
                <Animated.View entering={FadeInUp.springify()} exiting={FadeOutDown} style={styles.card}>
                    <View style={styles.content}>
                        <Animated.View style={[styles.iconContainer, animatedIconStyle]}>
                            <Ionicons name="gift" size={scaleFont(64)} color="#FFFFFF" />
                        </Animated.View>

                        <Text style={styles.title}>Welcome Aboard!</Text>
                        <Text style={styles.subtitle}>
                            You've unlocked your first legacy reward.
                        </Text>

                        <View style={styles.rewardBox}>
                            <Ionicons name="diamond" size={scaleFont(24)} color="#E0D4F5" />
                            <Text style={styles.rewardText}>100 PP</Text>
                        </View>

                        <Text style={styles.description}>
                            This is the start of your journey. Use these points to stake on your promises.
                        </Text>

                        <TouchableOpacity style={styles.button} onPress={onClose} activeOpacity={0.9}>
                            <Text style={styles.buttonText}>Claim Bonus</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: scaleFont(24),
    },
    card: {
        width: '100%',
        backgroundColor: '#5B2DAD', // Deep Purple
        borderRadius: scaleFont(32),
        padding: scaleFont(32),
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    content: {
        alignItems: 'center',
        width: '100%',
    },
    iconContainer: {
        width: scaleFont(100),
        height: scaleFont(100),
        borderRadius: scaleFont(50),
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: scaleFont(20),
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    title: {
        fontSize: scaleFont(28),
        fontFamily: 'Outfit_800ExtraBold',
        color: '#FFFFFF',
        marginBottom: scaleFont(8),
        textAlign: 'center',
    },
    subtitle: {
        fontSize: scaleFont(16),
        fontFamily: 'Outfit_400Regular',
        color: 'rgba(255,255,255,0.8)',
        textAlign: 'center',
        marginBottom: scaleFont(24),
    },
    rewardBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: scaleFont(24),
        paddingVertical: scaleFont(12),
        borderRadius: scaleFont(20),
        gap: scaleFont(12),
        marginBottom: scaleFont(24),
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    rewardText: {
        fontSize: scaleFont(32),
        fontFamily: 'Outfit_800ExtraBold',
        color: '#FFFFFF',
    },
    description: {
        fontSize: scaleFont(14),
        fontFamily: 'Outfit_400Regular',
        color: 'rgba(255,255,255,0.6)',
        textAlign: 'center',
        marginBottom: scaleFont(32),
        lineHeight: scaleFont(20),
    },
    button: {
        backgroundColor: '#FFFFFF',
        paddingVertical: scaleFont(16),
        paddingHorizontal: scaleFont(48),
        borderRadius: scaleFont(30),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
    buttonText: {
        fontSize: scaleFont(18),
        fontFamily: 'Outfit_700Bold',
        color: '#5B2DAD',
    },
});
