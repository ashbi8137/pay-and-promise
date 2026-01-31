import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    Alert,
    Dimensions,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming
} from 'react-native-reanimated';
import { supabase } from '../../lib/supabase';

const { width } = Dimensions.get('window');
const SLIDER_WIDTH = width - 48; // Padding 24 * 2
const KNOB_SIZE = 40;
const MAX_STAKE = 5000;

export default function CreatePromiseScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    // Wizard State
    const [step, setStep] = useState(0); // 0: Templates, 1: Stake, 2: Details, 3: Invite

    // Form State
    const [title, setTitle] = useState('');
    const [duration, setDuration] = useState('7');
    const [numPeople, setNumPeople] = useState('2');
    const [amountPerPerson, setAmountPerPerson] = useState('20');
    const [category, setCategory] = useState<string | null>(null);
    const [inviteCode, setInviteCode] = useState('');

    // Success Animation States
    const successScale = useSharedValue(0);
    const successOpacity = useSharedValue(0);
    const titleTranslateY = useSharedValue(20);

    const successIconStyle = useAnimatedStyle(() => ({
        transform: [{ scale: successScale.value }],
        opacity: successOpacity.value
    }));

    const successContentStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: titleTranslateY.value }],
        opacity: successOpacity.value
    }));

    const successCardStyle = useAnimatedStyle(() => ({
        opacity: successOpacity.value
    }));

    useEffect(() => {
        if (step === 3) {
            successScale.value = withSpring(1, { damping: 12 });
            successOpacity.value = withTiming(1, { duration: 600 });
            titleTranslateY.value = withSpring(0, { damping: 15 });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
    }, [step]);

    // Slider State
    const translateX = useSharedValue(0);

    // Logic
    const handleTemplateSelect = (selectedTitle: string, id: string) => {
        setCategory(id);
        if (id === 'custom') {
            setTitle(''); // Let user type it
            // Stay on step 0 but UI will swap to input
        } else {
            setTitle(selectedTitle);
            setStep(1); // Go to next step
            const defaultX = (500 / MAX_STAKE) * (SLIDER_WIDTH - KNOB_SIZE);
            translateX.value = withSpring(defaultX);
        }
    };

    const updateStake = (x: number) => {
        const percent = x / (SLIDER_WIDTH - KNOB_SIZE);
        const rawValue = Math.round(percent * MAX_STAKE);
        // Snap to nearest 10
        const snapped = Math.round(rawValue / 10) * 10;
        const final = Math.max(20, Math.min(snapped, MAX_STAKE));

        if (final !== parseInt(amountPerPerson)) {
            setAmountPerPerson(final.toString());
            Haptics.selectionAsync();
        }
    };

    // Gesture Logic (Modern API)
    const context = useSharedValue(0);

    const panGesture = Gesture.Pan()
        .onStart(() => {
            context.value = translateX.value;
        })
        .onUpdate((event) => {
            let nextX = context.value + event.translationX;
            // Clamp
            if (nextX < 0) nextX = 0;
            if (nextX > (SLIDER_WIDTH - KNOB_SIZE)) nextX = (SLIDER_WIDTH - KNOB_SIZE);

            translateX.value = nextX;
            runOnJS(updateStake)(nextX);
        });

    const knobStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateX: translateX.value }]
        };
    });

    const activeTrackStyle = useAnimatedStyle(() => {
        return {
            width: translateX.value + KNOB_SIZE / 2
        };
    });

    const renderStakeStep = () => (
        <View style={styles.wizardContainer}>
            <Text style={styles.wizardTitle}>How much is on the line?</Text>
            <Text style={styles.wizardSubtitle}>Set the stake per person. 💸</Text>

            <View style={styles.stakeDisplay}>
                <Text style={styles.currencySymbol}>₹</Text>
                <Text style={styles.stakeValue}>{amountPerPerson}</Text>
            </View>

            <View style={styles.sliderContainer}>
                <View style={styles.sliderTrack} />
                <Animated.View style={[styles.sliderTrackActive, activeTrackStyle]} />
                <GestureDetector gesture={panGesture}>
                    <Animated.View style={[styles.sliderKnob, knobStyle]}>
                        <View style={styles.knobDot} />
                    </Animated.View>
                </GestureDetector>
            </View>
            <View style={styles.sliderLabels}>
                <Text style={styles.sliderLabel}>₹0</Text>
                <Text style={styles.sliderLabel}>₹5000</Text>
            </View>

            <TouchableOpacity
                style={styles.continueButton}
                onPress={() => setStep(2)}
            >
                <Text style={styles.continueButtonText}>Continue</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFF" />
            </TouchableOpacity>
        </View>
    );

    const renderDetailsStep = () => (
        <View style={styles.wizardContainer}>
            <Text style={styles.wizardTitle}>The Details</Text>
            <Text style={styles.wizardSubtitle}>How long and with how many?</Text>

            <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Duration (Days)</Text>
                <View style={styles.chipContainer}>
                    {['1', '7', '14', '30'].map(d => (
                        <TouchableOpacity
                            key={d}
                            style={[styles.chip, duration === d && styles.chipActive]}
                            onPress={() => setDuration(d)}
                        >
                            <Text style={[styles.chipText, duration === d && styles.chipTextActive]}>{d} Days</Text>
                        </TouchableOpacity>
                    ))}
                </View>
                <TextInput
                    style={styles.detailInput}
                    placeholder="Custom Days"
                    keyboardType="numeric"
                    value={duration}
                    onChangeText={setDuration}
                />
            </View>

            <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Participants</Text>
                <View style={styles.counterContainer}>
                    <TouchableOpacity
                        style={styles.counterBtn}
                        onPress={() => setNumPeople(Math.max(2, parseInt(numPeople) - 1).toString())}
                    >
                        <Ionicons name="remove" size={24} color="#1E293B" />
                    </TouchableOpacity>
                    <Text style={styles.counterValue}>{numPeople}</Text>
                    <TouchableOpacity
                        style={styles.counterBtn}
                        onPress={() => setNumPeople(Math.min(10, parseInt(numPeople) + 1).toString())}
                    >
                        <Ionicons name="add" size={24} color="#1E293B" />
                    </TouchableOpacity>
                </View>
                <Text style={styles.counterHelper}>Min 2 • Max 10 (including you)</Text>
            </View>

            <TouchableOpacity
                style={styles.continueButton}
                onPress={handleCreatePromiseReal} // Changed from handleCreatePromise
                disabled={loading}
            >
                <Text style={styles.continueButtonText}>{loading ? 'Creating...' : 'Launch Promise'}</Text>
                {!loading && <Ionicons name="rocket" size={20} color="#FFF" />}
            </TouchableOpacity>
        </View>
    );

    const renderInviteStep = () => (
        <View style={styles.wizardContainer}>
            <View style={styles.successIconContainer}>
                <Animated.View style={[
                    styles.successCircle,
                    successIconStyle
                ]}>
                    <Ionicons name="checkmark" size={60} color="#10B981" />
                </Animated.View>
            </View>
            <Animated.View style={successContentStyle}>
                <Text style={[styles.wizardTitle, { textAlign: 'center' }]}>You're Bound!</Text>
                <Text style={[styles.wizardSubtitle, { textAlign: 'center' }]}>The promise is active. Now, bring your crew.</Text>
            </Animated.View>

            <Animated.View style={[styles.inviteCard, successCardStyle]}>
                <Text style={styles.inviteLabel}>Invite Code</Text>
                <Text style={styles.inviteCode}>{inviteCode || 'GENERATING...'}</Text>
                <TouchableOpacity
                    style={styles.copyButton}
                    onPress={() => {
                        Alert.alert('Copied!', 'Invite code copied to clipboard.');
                    }}
                >
                    <Ionicons name="copy-outline" size={18} color="#4F46E5" />
                    <Text style={styles.copyText}>Copy Link</Text>
                </TouchableOpacity>
            </Animated.View>

            <TouchableOpacity
                style={[styles.continueButton, { marginTop: 40, backgroundColor: '#4F46E5' }]}
                onPress={() => router.navigate('/(tabs)')}
            >
                <Text style={styles.continueButtonText}>Done</Text>
            </TouchableOpacity>
        </View>
    );

    const handleCreatePromiseReal = async () => {
        setLoading(true);
        try {
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user) {
                Alert.alert('Error', 'You must be logged in.');
                return;
            }

            // Enforce Business Rules
            if (parseInt(numPeople) < 2) {
                Alert.alert('Participants Required', 'A promise requires at least 2 people.');
                setLoading(false);
                return;
            }
            if (parseInt(amountPerPerson) < 20) {
                Alert.alert('Minimum Stake', 'The minimum stake must be at least ₹20.');
                setLoading(false);
                return;
            }

            const code = Math.random().toString(36).substring(2, 8).toUpperCase();
            setInviteCode(code);

            const { data: promiseData, error: promiseError } = await supabase
                .from('promises')
                .insert({
                    title,
                    description: category,
                    duration_days: parseInt(duration),
                    number_of_people: parseInt(numPeople),
                    amount_per_person: parseInt(amountPerPerson),
                    total_amount: parseInt(numPeople) * parseInt(amountPerPerson),
                    stake_per_day: (parseInt(amountPerPerson) / parseInt(duration)),
                    participants: [{ name: 'You', number: 'User' }],
                    created_by: user.id,
                    status: 'active',
                    invite_code: code
                })
                .select()
                .single();

            if (promiseError) throw promiseError;

            await supabase.from('promise_participants').insert({
                promise_id: promiseData.id,
                user_id: user.id
            });

            setStep(3); // Go to Success View
        } catch (e) {
            console.error(e);
            Alert.alert('Error', 'Failed to create promise.');
        } finally {
            setLoading(false);
        }
    };

    const renderTemplateSelector = () => (
        <View style={styles.wizardContainer}>
            <Text style={styles.wizardTitle}>
                {category === 'custom' ? "Name your goal" : "What's the goal?"}
            </Text>
            <Text style={styles.wizardSubtitle}>
                {category === 'custom' ? "Be specific about your promise." : "Choose a commitment type."}
            </Text>

            {category === 'custom' ? (
                <View style={{ width: '100%', alignItems: 'center' }}>
                    <TextInput
                        style={[styles.detailInput, { width: '100%', fontSize: 24, textAlign: 'center', paddingVertical: 20 }]}
                        placeholder="e.g. No Sugar"
                        placeholderTextColor="#94A3B8"
                        autoFocus
                        value={title}
                        onChangeText={setTitle}
                    />
                    <TouchableOpacity
                        style={[styles.continueButton, { marginTop: 32 }]}
                        onPress={() => {
                            if (!title.trim()) {
                                Alert.alert('Missing Name', 'Please name your custom promise.');
                                return;
                            }
                            setStep(1);
                            const defaultX = (500 / MAX_STAKE) * (SLIDER_WIDTH - KNOB_SIZE);
                            translateX.value = withSpring(defaultX);
                        }}
                    >
                        <Text style={styles.continueButtonText}>Set Stake</Text>
                        <Ionicons name="arrow-forward" size={20} color="#FFF" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={{ marginTop: 20 }}
                        onPress={() => setCategory(null)}
                    >
                        <Text style={{ color: '#64748B', fontWeight: '600' }}>Back to Templates</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={styles.gridContainer}>
                    {[
                        { id: 'gym', label: 'Hit the Gym', icon: 'barbell', color: '#F43F5E' },
                        { id: 'code', label: 'Code Session', icon: 'code-slash', color: '#8B5CF6' },
                        { id: 'read', label: 'Read Books', icon: 'book', color: '#10B981' },
                        { id: 'water', label: 'Drink Water', icon: 'water', color: '#0EA5E9' },
                        { id: 'wake', label: 'Wake Early', icon: 'alarm', color: '#F59E0B' },
                        { id: 'custom', label: 'Custom', icon: 'sparkles', color: '#64748B' },
                    ].map((template) => (
                        <TouchableOpacity
                            key={template.id}
                            style={styles.templateCard}
                            onPress={() => handleTemplateSelect(template.id === 'custom' ? '' : template.label, template.id)}
                            activeOpacity={0.8}
                        >
                            <View style={[styles.iconCircle, { backgroundColor: `${template.color}20` }]}>
                                <Ionicons name={template.icon as any} size={28} color={template.color} />
                            </View>
                            <Text style={styles.templateLabel}>{template.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}
        </View>
    );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
            {/* Header with Progress */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => step > 0 && step < 3 ? setStep(step - 1) : router.back()}
                    style={styles.backButton}
                    disabled={step === 3}
                >
                    <Ionicons name={step === 3 ? "close" : "arrow-back"} size={24} color="#1E293B" />
                </TouchableOpacity>
                <View style={styles.progressBar}>
                    {/* Progress Fill: step 0 = 25%, step 1 = 50% etc */}
                    <View style={[styles.progressFill, { width: `${(step + 1) * 25}%` }]} />
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} scrollEnabled={step !== 1}>
                {step === 0 && renderTemplateSelector()}
                {step === 1 && renderStakeStep()}
                {step === 2 && renderDetailsStep()}
                {step === 3 && renderInviteStep()}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'android' ? 40 : 10,
        marginBottom: 20,
    },
    backButton: {
        padding: 8,
        marginRight: 16,
    },
    progressBar: {
        flex: 1,
        height: 6,
        backgroundColor: '#F1F5F9',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#4F46E5', // Theme Violet
        borderRadius: 3,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 40,
    },
    wizardContainer: {
        flex: 1,
        width: '100%',
        justifyContent: 'center', // Vertically center within the flex container
        alignItems: 'center',
    },
    wizardTitle: {
        fontSize: 28, // Slightly smaller for header feel
        fontWeight: '800',
        color: '#1E293B',
        marginBottom: 4,
        textAlign: 'center',
    },
    wizardSubtitle: {
        fontSize: 16,
        color: '#64748B',
        marginBottom: 32,
        textAlign: 'center',
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        width: '100%',
    },
    templateCard: {
        width: '48%', // Ensure it fits 2 per row
        backgroundColor: '#F8FAFC',
        borderRadius: 20,
        padding: 16, // Reduced padding
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    iconCircle: {
        width: 48, // Reduced from 56
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    templateLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#334155',
    },
    // SECTION: STAKE SLIDER
    stakeDisplay: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 40,
        marginTop: 20,
        width: '100%',
    },
    currencySymbol: {
        fontSize: 32,
        fontWeight: '700',
        color: '#64748B',
        marginRight: 4,
        marginTop: 8,
    },
    stakeValue: {
        fontSize: 64,
        fontWeight: '800',
        color: '#1E293B',
    },
    sliderContainer: {
        height: 40,
        justifyContent: 'center',
        marginBottom: 8,
        width: '100%',
    },
    sliderTrack: {
        position: 'absolute',
        width: '100%',
        height: 8,
        backgroundColor: '#E2E8F0',
        borderRadius: 4,
    },
    sliderTrackActive: {
        position: 'absolute',
        height: 8,
        backgroundColor: '#4F46E5',
        borderRadius: 4,
    },
    sliderKnob: {
        width: KNOB_SIZE,
        height: KNOB_SIZE,
        borderRadius: KNOB_SIZE / 2,
        backgroundColor: '#FFFFFF',
        position: 'absolute',
        justifyContent: 'center',
        alignItems: 'center',
        // Shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    knobDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#4F46E5',
    },
    sliderLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 40,
        width: '100%',
    },
    sliderLabel: {
        color: '#94A3B8',
        fontWeight: '600',
    },
    continueButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1E293B',
        paddingVertical: 18,
        borderRadius: 16,
        gap: 8,
        width: '100%',
        shadowColor: '#1E293B',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 4,
    },
    continueButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
    },
    // DETAILS
    detailSection: {
        marginBottom: 32,
        width: '100%',
    },
    detailLabel: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 16,
        textAlign: 'center',
    },
    chipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 12,
        justifyContent: 'center',
    },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    chipActive: {
        backgroundColor: '#EEF2FF',
        borderColor: '#4F46E5',
    },
    chipText: {
        color: '#64748B',
        fontWeight: '600',
    },
    chipTextActive: {
        color: '#4F46E5',
    },
    detailInput: {
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        color: '#0F172A',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    counterContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 30,
        backgroundColor: '#F8FAFC',
        paddingVertical: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        width: '100%',
    },
    counterBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    counterValue: {
        fontSize: 32,
        fontWeight: '800',
        color: '#1E293B',
        minWidth: 40,
        textAlign: 'center',
    },
    counterHelper: {
        textAlign: 'center',
        marginTop: 12,
        color: '#94A3B8',
        fontSize: 14,
    },
    // INVITE
    successIconContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 40,
    },
    successCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#ECFDF5',
        alignItems: 'center',
        justifyContent: 'center',
    },
    inviteCard: {
        backgroundColor: '#F8FAFC',
        borderRadius: 24,
        padding: 24,
        marginTop: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    inviteLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748B',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    inviteCode: {
        fontSize: 42,
        fontWeight: '900',
        color: '#1E293B',
        letterSpacing: 2,
        marginBottom: 20,
    },
    copyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 10,
        paddingHorizontal: 20,
        backgroundColor: '#EEF2FF',
        borderRadius: 20,
    },
    copyText: {
        color: '#4F46E5',
        fontWeight: '700',
    },
});
