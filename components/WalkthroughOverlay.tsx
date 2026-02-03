import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
    Dimensions,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { scaleFont } from '../app/utils/layout';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const COACH_MARKS_KEY = 'HAS_SEEN_HOME_COACH_MARKS_V1';

// Coach mark definitions with precise positioning
// Bottom navbar is at bottom: 24, height: 72
// Tab icons are evenly spaced: Home | Activity | Create(+) | Ledger | Profile
const COACH_MARKS = [
    {
        id: 'create',
        text: 'Start here to create your first promise.',
        // + button is center, elevated above navbar
        bottom: scaleFont(130),
        horizontalAlign: 'center',
        arrowDirection: 'down',
    },
    {
        id: 'join',
        text: 'Join a promise using a code shared by friends.',
        // Join Promise card is around top third (~35% from top)
        top: SCREEN_HEIGHT * 0.57,
        horizontalAlign: 'center',
        arrowDirection: 'up',
        arrowOffset: scaleFont(-200),
    },
    {
        id: 'tabs',
        text: 'View your active promises and past history here.',
        // Active/History tabs are around mid screen (~50%)
        top: SCREEN_HEIGHT * 0.67,
        horizontalAlign: 'center',
        arrowDirection: 'up',
        arrowOffset: scaleFont(-200),
    },
    {
        id: 'activity',
        text: 'Track your promise progress here.',
        // Activity icon is 2nd from left in navbar
        bottom: scaleFont(110),
        left: scaleFont(20),
        arrowDirection: 'down',
        arrowOffset: scaleFont(-30), // Offset arrow to point at icon
    },
    {
        id: 'ledger',
        text: 'Check payments and settlements here.',
        // Ledger icon is 2nd from right in navbar
        bottom: scaleFont(110),
        right: scaleFont(20),
        arrowDirection: 'down',
        arrowOffset: scaleFont(70), // Offset arrow left
    },
    {
        id: 'profile',
        text: 'Manage your profile and settings here.',
        // Profile icon is rightmost
        bottom: scaleFont(110),
        right: scaleFont(10),
        arrowDirection: 'down',
        arrowOffset: scaleFont(200),
    },
];

interface CoachMarksProps {
    onComplete?: () => void;
    forceShow?: boolean;
}

interface CoachMarksProps {
    onComplete?: () => void;
    forceShow?: boolean;
    initialVisible?: boolean; // New prop
}

export default function WalkthroughOverlay({ onComplete, forceShow = false, initialVisible = false }: CoachMarksProps) {
    const [visible, setVisible] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);

    useEffect(() => {
        if (forceShow) {
            setVisible(true);
        } else if (initialVisible) {
            // Delay slightly for smooth entrance
            setTimeout(() => setVisible(true), 1500);
        }
    }, [forceShow, initialVisible]);

    const handleNext = () => {
        if (currentStep < COACH_MARKS.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            completeCoachMarks();
        }
    };

    const completeCoachMarks = async () => {
        setVisible(false);
        onComplete?.(); // Parent handles Supabase update
    };

    if (!visible) return null;

    const mark = COACH_MARKS[currentStep];

    // Build position style from mark properties
    const getPositionStyle = (): any => {
        const style: any = { position: 'absolute' };

        if (mark.top !== undefined) style.top = mark.top;
        if (mark.bottom !== undefined) style.bottom = mark.bottom;
        if (mark.left !== undefined) style.left = mark.left;
        if (mark.right !== undefined) style.right = mark.right;

        if (mark.horizontalAlign === 'center') {
            style.left = 24;
            style.right = 24;
            style.alignItems = 'center';
        }

        return style;
    };

    // Arrow with optional offset
    const Arrow = ({ direction, offset = 0 }: { direction: string; offset?: number }) => {
        const arrowStyle = direction === 'down' ? styles.arrowDown : styles.arrowUp;
        return (
            <View style={[arrowStyle, offset !== 0 && { marginLeft: offset }]} />
        );
    };

    return (
        <>
            {/* Light dim overlay */}
            <TouchableWithoutFeedback onPress={handleNext}>
                <Animated.View
                    entering={FadeIn.duration(150)}
                    exiting={FadeOut.duration(100)}
                    style={styles.lightOverlay}
                />
            </TouchableWithoutFeedback>

            {/* Floating Coach Mark - No slide animation */}
            <View style={[styles.coachMarkContainer, getPositionStyle()]} pointerEvents="box-none">
                <Animated.View
                    key={currentStep}
                    entering={FadeIn.duration(150)}
                    exiting={FadeOut.duration(100)}
                    style={styles.coachMark}
                >
                    {/* Arrow pointing up */}
                    {mark.arrowDirection === 'up' && (
                        <Arrow direction="up" offset={(mark as any).arrowOffset || 0} />
                    )}

                    {/* Text Card */}
                    <View style={styles.textCard}>


                        <Text style={styles.coachText}>{mark.text}</Text>

                        {/* Footer: Skip | Dots | Got It */}
                        <View style={styles.footer}>

                            {/* Skip (Left) */}
                            <TouchableOpacity
                                onPress={completeCoachMarks}
                                style={styles.footerSkipBtn}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <Text style={styles.footerSkipText}>
                                    {currentStep < COACH_MARKS.length - 1 ? 'Skip' : ''}
                                </Text>
                            </TouchableOpacity>

                            {/* Dots (Center) */}
                            <View style={styles.dotsContainer}>
                                {COACH_MARKS.map((_, index) => (
                                    <View
                                        key={index}
                                        style={[
                                            styles.dot,
                                            index === currentStep && styles.dotActive,
                                            index < currentStep && styles.dotCompleted
                                        ]}
                                    />
                                ))}
                            </View>
                            <TouchableOpacity style={styles.gotItBtn} onPress={handleNext}>
                                <Text style={styles.gotItText}>
                                    {currentStep < COACH_MARKS.length - 1 ? 'Got it' : 'Done'}
                                </Text>
                                <Ionicons
                                    name={currentStep < COACH_MARKS.length - 1 ? "chevron-forward" : "checkmark"}
                                    size={14}
                                    color="#5B2DAD"
                                />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Arrow pointing down */}
                    {mark.arrowDirection === 'down' && (
                        <Arrow direction="down" offset={(mark as any).arrowOffset || 0} />
                    )}
                </Animated.View>
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    lightOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(15, 23, 42, 0.4)',
        zIndex: 998,
    },
    coachMarkContainer: {
        zIndex: 999,
    },
    coachMark: {
        alignItems: 'center',
        maxWidth: SCREEN_WIDTH - scaleFont(48),
    },
    textCard: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: scaleFont(20),
        paddingVertical: scaleFont(16),
        borderRadius: scaleFont(16),
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: scaleFont(8) },
        shadowOpacity: 0.15,
        shadowRadius: scaleFont(16),
        elevation: scaleFont(12),
        borderWidth: 1, // keeping 1 for crispness, or scaleFont(1)
        borderColor: 'rgba(79, 70, 229, 0.1)',
    },
    coachText: {
        fontSize: scaleFont(15),
        fontWeight: '600',
        color: '#1E293B',
        textAlign: 'center',
        lineHeight: scaleFont(22),
        marginBottom: scaleFont(12),
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    dotsContainer: {
        flexDirection: 'row',
        gap: 6,
    },
    dot: {
        width: scaleFont(6),
        height: scaleFont(6),
        borderRadius: scaleFont(3),
        backgroundColor: '#E2E8F0',
    },
    dotActive: {
        backgroundColor: '#4F46E5',
        width: scaleFont(16),
    },
    dotCompleted: {
        backgroundColor: '#A5B4FC',
    },
    gotItBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scaleFont(4),
        paddingVertical: scaleFont(6),
        paddingHorizontal: scaleFont(12),
        backgroundColor: '#EEF2FF',
        borderRadius: scaleFont(20),
    },
    gotItText: {
        fontSize: scaleFont(13),
        fontWeight: '700',
        color: '#4F46E5',
    },
    arrowUp: {
        width: 0,
        height: 0,
        borderLeftWidth: scaleFont(10),
        borderRightWidth: scaleFont(10),
        borderBottomWidth: scaleFont(12),
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderBottomColor: '#FFFFFF',
        marginBottom: -1,
    },
    arrowDown: {
        width: 0,
        height: 0,
        borderLeftWidth: scaleFont(10),
        borderRightWidth: scaleFont(10),
        borderTopWidth: scaleFont(12),
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderTopColor: '#FFFFFF',
        marginTop: -1,
    },
    footerSkipBtn: {
        padding: scaleFont(4),
        minWidth: scaleFont(40), // Reserve space even if empty to keep dots centered
    },
    footerSkipText: {
        fontSize: scaleFont(13),
        fontWeight: '500',
        color: '#94A3B8',
    },
});
