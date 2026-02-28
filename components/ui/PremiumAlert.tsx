import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect } from 'react';
import {
    Dimensions,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, {
    FadeIn,
    FadeInDown,
    FadeOut,
} from 'react-native-reanimated';
import { useAlert } from '../../context/AlertContext';
import { scaleFont } from '../../utils/layout';

const { width } = Dimensions.get('window');

const PremiumAlert: React.FC = () => {
    const { alertState, hideAlert } = useAlert();

    useEffect(() => {
        if (alertState?.visible) {
            // Trigger haptic based on type
            switch (alertState.type) {
                case 'error':
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                    break;
                case 'warning':
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                    break;
                case 'success':
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    break;
                default:
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
        }
    }, [alertState?.visible, alertState?.type]);

    if (!alertState) return null;

    const { title, message, buttons, type, visible } = alertState;

    const handleButtonPress = (onPress?: () => void) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (onPress) onPress();
        hideAlert();
    };

    const getIcon = () => {
        switch (type) {
            case 'error': return 'close-circle';
            case 'warning': return 'warning';
            case 'success': return 'checkmark-circle';
            default: return 'information-circle';
        }
    };

    const getIconColor = () => {
        switch (type) {
            case 'error': return '#EF4444';
            case 'warning': return '#F59E0B';
            case 'success': return '#10B981';
            default: return '#8B5CF6';
        }
    };

    return (
        <Modal
            transparent
            visible={visible}
            animationType="none"
            onRequestClose={hideAlert}
        >
            <Pressable style={styles.backdrop} onPress={() => { }}>
                <Animated.View
                    entering={FadeIn.duration(200)}
                    exiting={FadeOut.duration(200)}
                    style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(15, 23, 42, 0.6)' }]}
                />

                <Animated.View
                    entering={FadeInDown.duration(400)}
                    exiting={FadeOut.duration(200)}
                    style={styles.alertCard}
                >
                    <View style={styles.iconContainer}>
                        <View style={[styles.iconBg, { backgroundColor: getIconColor() + '15' }]}>
                            <Ionicons name={getIcon() as any} size={36} color={getIconColor()} />
                        </View>
                    </View>

                    <View style={styles.titleAccent} />
                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.message}>{message}</Text>

                    <View style={styles.buttonContainer}>
                        {buttons && buttons.length > 0 ? (
                            buttons.map((btn, index) => {
                                const isDestructive = btn.style === 'destructive';
                                const isCancel = btn.style === 'cancel';

                                return (
                                    <TouchableOpacity
                                        key={index}
                                        activeOpacity={0.8}
                                        style={[
                                            styles.button,
                                            index === buttons.length - 1 && !isCancel ? styles.primaryBtn : styles.secondaryBtn,
                                            isDestructive && styles.destructiveBtn,
                                            buttons.length > 2 && styles.verticalBtn
                                        ]}
                                        onPress={() => handleButtonPress(btn.onPress)}
                                    >
                                        <Text style={[
                                            styles.buttonText,
                                            index === buttons.length - 1 && !isCancel ? styles.primaryBtnText : styles.secondaryBtnText,
                                            isDestructive && styles.destructiveBtnText
                                        ]}>
                                            {btn.text}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })
                        ) : (
                            <TouchableOpacity
                                activeOpacity={0.8}
                                style={[styles.button, styles.primaryBtn]}
                                onPress={() => handleButtonPress()}
                            >
                                <Text style={[styles.buttonText, styles.primaryBtnText]}>OK</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </Animated.View>
            </Pressable>
        </Modal>
    );
};

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: scaleFont(24),
    },
    alertCard: {
        width: '100%',
        maxWidth: scaleFont(340),
        backgroundColor: '#FFFFFF',
        borderRadius: scaleFont(32),
        padding: scaleFont(24),
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: scaleFont(20) },
        shadowOpacity: 0.15,
        shadowRadius: scaleFont(30),
        elevation: scaleFont(10),
    },
    iconContainer: {
        marginBottom: scaleFont(20),
    },
    iconBg: {
        width: scaleFont(72),
        height: scaleFont(72),
        borderRadius: scaleFont(36),
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    titleAccent: {
        width: scaleFont(30),
        height: scaleFont(3),
        backgroundColor: '#E2E8F0',
        borderRadius: scaleFont(2),
        marginBottom: scaleFont(12),
    },
    title: {
        fontSize: scaleFont(24),
        fontWeight: '900',
        color: '#0F172A',
        textAlign: 'center',
        marginBottom: scaleFont(12),
        letterSpacing: scaleFont(-0.5),
        fontFamily: 'Outfit_800ExtraBold',
    },
    message: {
        fontSize: scaleFont(15),
        fontWeight: '500',
        color: '#475569', // Slightly darker for better contrast
        textAlign: 'center',
        lineHeight: scaleFont(24), // Increased line height for breathability
        marginBottom: scaleFont(28),
        fontFamily: 'Outfit_400Regular',
        paddingHorizontal: scaleFont(10), // Prevent text from hitting edges
    },
    buttonContainer: {
        width: '100%',
        flexDirection: 'row',
        gap: scaleFont(12),
    },
    verticalBtn: {
        width: '100%',
    },
    button: {
        flex: 1,
        paddingVertical: scaleFont(14),
        borderRadius: scaleFont(16),
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryBtn: {
        backgroundColor: '#0F172A',
    },
    secondaryBtn: {
        backgroundColor: '#F1F5F9',
    },
    destructiveBtn: {
        backgroundColor: '#FEF2F2',
    },
    buttonText: {
        fontSize: scaleFont(15),
        fontWeight: '800',
        fontFamily: 'Outfit_800ExtraBold',
        letterSpacing: scaleFont(0.5),
    },
    primaryBtnText: {
        color: '#FFFFFF',
    },
    secondaryBtnText: {
        color: '#64748B',
    },
    destructiveBtnText: {
        color: '#EF4444',
    },
});

export default PremiumAlert;
