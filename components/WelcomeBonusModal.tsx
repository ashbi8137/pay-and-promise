import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { scaleFont } from '../utils/layout';

interface WelcomeBonusProps {
    visible: boolean;
    onClose: () => void;
    onClaim: () => Promise<void>;
}

export default function WelcomeBonusModal({ visible, onClose, onClaim }: WelcomeBonusProps) {
    const [loading, setLoading] = useState(false);

    // Haptics on Mount
    useEffect(() => {
        if (visible) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
    }, [visible]);

    if (!visible) return null;

    const handleClaim = async () => {
        setLoading(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        try {
            await onClaim();
            // Wait a small moment for effect? No, user wants instant update.
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            onClose();
        }
    };

    return (
        <Modal transparent animationType="fade" visible={visible}>
            <View style={styles.overlay}>
                {/* Static Card as requested (No entering/exiting animations) */}
                <View style={styles.card}>
                    <View style={styles.content}>
                        {/* Icon */}
                        <View style={styles.iconContainer}>
                            <Ionicons name="gift" size={scaleFont(48)} color="#FFFFFF" />
                        </View>

                        <Text style={styles.title}>Welcome Aboard!</Text>
                        <Text style={styles.subtitle}>
                            Here's a little something to start your journey.
                        </Text>

                        {/* Reward */}
                        <View style={styles.rewardBox}>
                            <Text style={styles.rewardText}>100 PP</Text>
                        </View>

                        <Text style={styles.description}>
                            Use these points to stake on your first promise.
                        </Text>

                        <TouchableOpacity
                            style={styles.button}
                            onPress={handleClaim}
                            activeOpacity={0.8}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <Text style={styles.buttonText}>Claim Gift</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: scaleFont(32),
    },
    card: {
        width: '100%',
        backgroundColor: 'rgba(91, 45, 173, 0.95)',
        borderRadius: scaleFont(24),
        padding: scaleFont(32),
        alignItems: 'center',
        shadowColor: '#5B2DAD',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 8,
    },
    content: {
        alignItems: 'center',
        width: '100%',
    },
    iconContainer: {
        marginBottom: scaleFont(20),
        shadowColor: '#fff',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
    },
    title: {
        fontSize: scaleFont(26),
        fontFamily: 'Outfit_800ExtraBold',
        color: '#FFFFFF',
        marginBottom: scaleFont(8),
        textAlign: 'center',
    },
    subtitle: {
        fontSize: scaleFont(16),
        fontFamily: 'Outfit_400Regular',
        color: 'rgba(255,255,255,0.9)',
        textAlign: 'center',
        marginBottom: scaleFont(28),
    },
    rewardBox: {
        backgroundColor: '#FFFFFF',
        paddingVertical: scaleFont(12),
        paddingHorizontal: scaleFont(32),
        borderRadius: scaleFont(50),
        marginBottom: scaleFont(28),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    rewardText: {
        fontSize: scaleFont(28),
        fontFamily: 'Outfit_800ExtraBold',
        color: '#5B2DAD',
    },
    description: {
        fontSize: scaleFont(14),
        fontFamily: 'Outfit_400Regular',
        color: 'rgba(255,255,255,0.7)',
        textAlign: 'center',
        marginBottom: scaleFont(32),
        lineHeight: scaleFont(20),
    },
    button: {
        width: '100%',
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingVertical: scaleFont(16),
        borderRadius: scaleFont(16),
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    buttonText: {
        fontSize: scaleFont(16),
        fontFamily: 'Outfit_700Bold',
        color: '#FFFFFF',
        letterSpacing: 0.5,
    },
});
