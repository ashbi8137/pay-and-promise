import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
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
    FadeInDown,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming
} from 'react-native-reanimated';
import { GridOverlay } from '../../components/LuxuryVisuals';
import { useAlert } from '../../context/AlertContext';
import { supabase } from '../../lib/supabase';

import { scaleFont } from '../utils/layout';

const { width } = Dimensions.get('window');
const SLIDER_WIDTH = width - scaleFont(48);
const KNOB_SIZE = scaleFont(44);
const MAX_STAKE = 2000;

export default function CreatePromiseScreen() {
    const router = useRouter();
    const { showAlert } = useAlert();
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

    const successIconStyle = useAnimatedStyle(() => ({
        transform: [{ scale: successScale.value }],
        opacity: successOpacity.value
    }));

    useEffect(() => {
        if (step === 3) {
            successScale.value = withSpring(1, { damping: 12 });
            successOpacity.value = withTiming(1, { duration: 600 });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
    }, [step]);

    // Slider State
    const translateX = useSharedValue(0);

    const handleTemplateSelect = (selectedTitle: string, id: string) => {
        setCategory(id);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        if (id === 'custom') {
            setTitle('');
        } else {
            setTitle(selectedTitle);
            setStep(1);
            setAmountPerPerson('500'); // Sync state with visual slider
            const defaultX = (500 / MAX_STAKE) * (SLIDER_WIDTH - KNOB_SIZE);
            translateX.value = withSpring(defaultX);
        }
    };

    const updateStake = (x: number) => {
        const percent = x / (SLIDER_WIDTH - KNOB_SIZE);
        const rawValue = percent * MAX_STAKE;
        const snapped = Math.round(rawValue / 20) * 20;
        const final = Math.max(20, Math.min(snapped, MAX_STAKE));

        if (final !== parseInt(amountPerPerson)) {
            setAmountPerPerson(final.toString());
            Haptics.selectionAsync();
        }
    };

    const handleQuickSelect = (amount: number) => {
        setAmountPerPerson(amount.toString());
        const x = (amount / MAX_STAKE) * (SLIDER_WIDTH - KNOB_SIZE);
        translateX.value = withSpring(x);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const context = useSharedValue(0);
    const panGesture = Gesture.Pan()
        .onStart(() => { context.value = translateX.value; })
        .onUpdate((event) => {
            let nextX = context.value + event.translationX;
            if (nextX < 0) nextX = 0;
            if (nextX > (SLIDER_WIDTH - KNOB_SIZE)) nextX = (SLIDER_WIDTH - KNOB_SIZE);
            translateX.value = nextX;
            // Debounce or optimize this if lagging, but for simple slider JS thread is fine usually
            runOnJS(updateStake)(nextX);
        });

    const knobStyle = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }] }));
    const activeTrackStyle = useAnimatedStyle(() => ({ width: translateX.value + KNOB_SIZE / 2 }));

    const handleCreatePromiseReal = async () => {
        setLoading(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                showAlert({ title: 'Error', message: 'You must be logged in.', type: 'error' });
                return;
            }

            if (parseInt(numPeople) < 2) {
                showAlert({ title: 'Attention', message: 'At least 2 people required.', type: 'warning' });
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
                    participants: [{
                        name: user.user_metadata?.full_name || 'Creator',
                        id: user.id,
                        avatar_url: user.user_metadata?.avatar_url || null
                    }],
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

            setStep(3);
        } catch (e) {
            console.error(e);
            showAlert({ title: 'Error', message: 'Failed to launch promise.', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const renderTemplateSelector = () => (
        <Animated.View entering={FadeInDown} style={styles.wizardContainer}>
            <Text style={styles.wizardSubtitle}>STEP 1</Text>
            <Text style={styles.wizardTitle}>What's the goal?</Text>

            {category === 'custom' ? (
                <View style={styles.customInputContainer}>
                    <TextInput
                        style={styles.customInput}
                        placeholder="e.g. Morning Yoga"
                        placeholderTextColor="#94A3B8"
                        autoFocus
                        value={title}
                        onChangeText={setTitle}
                    />
                    <TouchableOpacity style={styles.nextBtn} onPress={() => {
                        if (!title.trim()) return showAlert({ title: 'Missing Name', message: 'Please name your goal.', type: 'warning' });
                        setStep(1);
                        translateX.value = withSpring((500 / MAX_STAKE) * (SLIDER_WIDTH - KNOB_SIZE));
                    }}>
                        <Text style={styles.nextBtnText}>Set Stake</Text>
                        <Ionicons name="arrow-forward" size={scaleFont(20)} color="#FFF" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setCategory(null)} style={styles.backLink}>
                        <Text style={styles.backLinkText}>Choose Template</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={styles.gridContainer}>
                    {[
                        { id: 'gym', label: 'Gym', icon: 'barbell', color: '#5B2DAD' },
                        { id: 'code', label: 'Code', icon: 'code-slash', color: '#5B2DAD' },
                        { id: 'read', label: 'Read', icon: 'book', color: '#5B2DAD' },
                        { id: 'water', label: 'Hydrate', icon: 'water', color: '#5B2DAD' },
                        { id: 'wake', label: 'Wake', icon: 'alarm', color: '#5B2DAD' },
                        { id: 'meditate', label: 'Meditate', icon: 'leaf', color: '#5B2DAD' },
                        { id: 'walk', label: 'Walk', icon: 'walk', color: '#5B2DAD' },
                        { id: 'study', label: 'Study', icon: 'school', color: '#5B2DAD' },
                        { id: 'custom', label: 'Other', icon: 'sparkles', color: '#5B2DAD' },
                    ].map((tpl) => (
                        <TouchableOpacity key={tpl.id} style={styles.templateCard} onPress={() => handleTemplateSelect(tpl.label, tpl.id)}>
                            <View style={styles.tplIconCircle}>
                                <Ionicons name={tpl.icon as any} size={scaleFont(28)} color={tpl.color} />
                            </View>
                            <Text style={styles.tplLabel}>{tpl.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}
        </Animated.View>
    );

    const renderStakeStep = () => (
        <Animated.View entering={FadeInDown} style={styles.wizardContainer}>
            <Text style={styles.wizardSubtitle}>STEP 2</Text>
            <Text style={styles.wizardTitle}>Commit your share</Text>
            <View style={styles.stakeDisplay}>
                <Text style={styles.currency}>₹</Text>
                <Text style={styles.stakeValue}>{amountPerPerson}</Text>
            </View>
            <View style={styles.quickSelectRow}>
                {[50, 100, 200, 500].map(amt => (
                    <TouchableOpacity
                        key={amt}
                        style={[styles.quickCard, amountPerPerson === amt.toString() && styles.quickCardActive]}
                        onPress={() => handleQuickSelect(amt)}
                    >
                        <Text style={[styles.quickText, amountPerPerson === amt.toString() && styles.quickTextActive]}>
                            ₹{amt}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <View style={styles.sliderContainer}>
                <View style={styles.sliderTrack} />
                <Animated.View style={[styles.sliderTrackActive, activeTrackStyle]} />
                <GestureDetector gesture={panGesture}>
                    <Animated.View style={[styles.sliderKnob, knobStyle]}>
                        <View style={styles.knobInner} />
                    </Animated.View>
                </GestureDetector>
            </View>
            <View style={styles.sliderLabels}>
                <Text style={styles.sliderLabel}>₹20</Text>
                <Text style={styles.sliderLabel}>₹2000</Text>
            </View>
            <TouchableOpacity style={styles.nextBtn} onPress={() => setStep(2)}>
                <Text style={styles.nextBtnText}>Define Terms</Text>
                <Ionicons name="arrow-forward" size={scaleFont(20)} color="#FFF" />
            </TouchableOpacity>
        </Animated.View>
    );

    const renderDetailsStep = () => (
        <Animated.View entering={FadeInDown} style={styles.wizardContainer}>
            <Text style={styles.wizardSubtitle}>STEP 3</Text>
            <Text style={styles.wizardTitle}>The Fine Print</Text>
            <View style={styles.detailBox}>
                <Text style={styles.boxLabel}>DURATION</Text>
                <View style={styles.chipRow}>
                    {['1', '7', '14', '30'].map(d => (
                        <TouchableOpacity key={d} style={[styles.chip, duration === d && styles.chipActive]} onPress={() => setDuration(d)}>
                            <Text style={[styles.chipText, duration === d && styles.chipTextActive]}>{d} Days</Text>
                        </TouchableOpacity>
                    ))}
                </View>
                <TextInput style={styles.daysInput} placeholder="Custom Days" keyboardType="numeric" value={duration} onChangeText={setDuration} />
            </View>
            <View style={styles.detailBox}>
                <Text style={styles.boxLabel}>PARTICIPANTS</Text>
                <View style={styles.counter}>
                    <TouchableOpacity style={styles.counterAction} onPress={() => setNumPeople(Math.max(2, parseInt(numPeople) - 1).toString())}>
                        <Ionicons name="remove" size={scaleFont(20)} color="#1E293B" />
                    </TouchableOpacity>
                    <Text style={styles.counterVal}>{numPeople}</Text>
                    <TouchableOpacity style={styles.counterAction} onPress={() => setNumPeople(Math.min(10, parseInt(numPeople) + 1).toString())}>
                        <Ionicons name="add" size={scaleFont(20)} color="#1E293B" />
                    </TouchableOpacity>
                </View>
                <Text style={styles.counterHint}>Min 2 • Max 10</Text>
            </View>
            <TouchableOpacity style={[styles.nextBtn, { backgroundColor: '#5B2DAD' }]} onPress={handleCreatePromiseReal} disabled={loading}>
                {loading ? <ActivityIndicator color="#FFF" /> : (
                    <>
                        <Text style={styles.nextBtnText}>Launch Promise</Text>
                        <Ionicons name="rocket" size={scaleFont(20)} color="#FFF" />
                    </>
                )}
            </TouchableOpacity>
        </Animated.View>
    );

    const renderSuccessStep = () => (
        <View style={styles.successContainer}>
            <Animated.View style={[styles.successIconBox, successIconStyle]}>
                <LinearGradient colors={['#10B981', '#059669']} style={StyleSheet.absoluteFill} />
                <Ionicons name="checkmark" size={scaleFont(60)} color="#FFF" />
            </Animated.View>
            <Text style={styles.successTitle}>You're Bound</Text>
            <Text style={styles.successSub}>Commitment is now live on the chain.</Text>
            <View style={styles.codeCard}>
                <Text style={styles.codeLabel}>INVITE YOUR CREW</Text>
                <Text style={styles.codeValue}>{inviteCode}</Text>
                <TouchableOpacity style={styles.copyBtn} onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    showAlert({ title: 'Copied', message: 'Invite code copied!', type: 'success' });
                }}>
                    <Ionicons name="copy-outline" size={scaleFont(18)} color="#5B2DAD" />
                    <Text style={styles.copyBtnText}>Copy Code</Text>
                </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.doneBtn} onPress={() => router.replace('/(tabs)')}>
                <Text style={styles.doneBtnText}>Return to Dashboard</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            <GridOverlay />

            {/* Ambient Depth removed for focus */}

            <SafeAreaView style={{ flex: 1 }}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => step > 0 && step < 3 ? setStep(step - 1) : router.back()} style={styles.backBtn} disabled={step === 3}>
                        <Ionicons name={step === 3 ? "close" : "chevron-back"} size={scaleFont(24)} color="#0F172A" />
                    </TouchableOpacity>
                    <View style={styles.progressContainer}>
                        <View style={styles.progressTrack} />
                        <Animated.View style={[styles.progressFill, { width: `${(step + 1) * 33.3}%` }]} />
                    </View>
                </View>
                <ScrollView contentContainerStyle={styles.scrollContent} scrollEnabled={step !== 1} showsVerticalScrollIndicator={false}>
                    {step === 0 && renderTemplateSelector()}
                    {step === 1 && renderStakeStep()}
                    {step === 2 && renderDetailsStep()}
                    {step === 3 && renderSuccessStep()}
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: scaleFont(20), paddingTop: Platform.OS === 'android' ? scaleFont(40) : scaleFont(10), paddingBottom: scaleFont(20) },
    backBtn: { width: scaleFont(44), height: scaleFont(44), borderRadius: scaleFont(12), backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
    progressContainer: { flex: 1, marginLeft: scaleFont(20), height: scaleFont(4), borderRadius: scaleFont(2), overflow: 'hidden' },
    progressTrack: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(79, 70, 229, 0.1)' },
    progressFill: { height: '100%', backgroundColor: '#5B2DAD', borderRadius: scaleFont(2) },
    scrollContent: { flexGrow: 1, paddingHorizontal: scaleFont(24), paddingBottom: scaleFont(40) },
    wizardContainer: { flex: 1, paddingTop: scaleFont(20) },
    wizardSubtitle: { fontSize: scaleFont(12), fontWeight: '800', color: '#5B2DAD', letterSpacing: scaleFont(1.5), marginBottom: scaleFont(8), fontFamily: 'Outfit_800ExtraBold' },
    wizardTitle: { fontSize: scaleFont(32), fontWeight: '900', color: '#1E293B', marginBottom: scaleFont(32), letterSpacing: scaleFont(-1), fontFamily: 'Outfit_800ExtraBold' },
    gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    templateCard: {
        width: '30%', // Three cards per row for a more compact look
        alignItems: 'center',
        marginBottom: scaleFont(32),
        padding: scaleFont(10),
    },
    tplGradient: { ...StyleSheet.absoluteFillObject },
    tplIconCircle: {
        width: scaleFont(64),
        height: scaleFont(64),
        borderRadius: scaleFont(32),
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: scaleFont(12),
        backgroundColor: '#FFF',
        shadowColor: '#5B2DAD',
        shadowOffset: { width: 0, height: scaleFont(6) },
        shadowOpacity: 0.2,
        shadowRadius: scaleFont(10),
        elevation: scaleFont(5),
    },
    tplLabel: {
        fontSize: scaleFont(13),
        fontWeight: '700',
        color: '#475569',
        textAlign: 'center',
        letterSpacing: scaleFont(-0.2),
        fontFamily: 'Outfit_700Bold',
    },
    customInputContainer: { width: '100%', gap: scaleFont(24) },
    customInput: { fontSize: scaleFont(28), fontWeight: '800', color: '#1E293B', borderBottomWidth: 2, borderBottomColor: '#E2E8F0', paddingVertical: scaleFont(12), fontFamily: 'Outfit_800ExtraBold' },
    nextBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0F172A',
        paddingVertical: scaleFont(20),
        borderRadius: scaleFont(24),
        gap: scaleFont(12),
        elevation: scaleFont(12),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: scaleFont(8) },
        shadowOpacity: 0.3,
        shadowRadius: scaleFont(15)
    },
    nextBtnText: { color: '#FFF', fontSize: scaleFont(18), fontWeight: '800', letterSpacing: scaleFont(0.5), fontFamily: 'Outfit_800ExtraBold' },
    backLink: { alignSelf: 'center', marginTop: scaleFont(12) },
    backLinkText: { fontSize: scaleFont(14), color: '#64748B', fontWeight: '600', fontFamily: 'Outfit_400Regular' },
    // STAKE
    stakeDisplay: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: scaleFont(40) },
    currency: { fontSize: scaleFont(32), fontWeight: '700', color: '#94A3B8', marginRight: scaleFont(4), marginTop: scaleFont(12), fontFamily: 'Outfit_700Bold' },
    stakeValue: { fontSize: scaleFont(80), fontWeight: '900', color: '#1E293B', letterSpacing: scaleFont(-2), fontFamily: 'Outfit_800ExtraBold' },
    sliderContainer: { height: scaleFont(44), justifyContent: 'center', width: '100%' },
    sliderTrack: { height: scaleFont(8), backgroundColor: '#F1F5F9', borderRadius: scaleFont(4), width: '100%' },
    sliderTrackActive: { height: scaleFont(8), backgroundColor: '#5B2DAD', borderRadius: scaleFont(4), position: 'absolute' },
    sliderKnob: { width: KNOB_SIZE, height: KNOB_SIZE, borderRadius: KNOB_SIZE / 2, backgroundColor: '#FFF', position: 'absolute', alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#5B2DAD', shadowOffset: { width: 0, height: scaleFont(4) }, shadowOpacity: 0.3, shadowRadius: scaleFont(8), borderWidth: 1, borderColor: '#F1F5F9' },
    knobInner: { width: scaleFont(14), height: scaleFont(14), borderRadius: scaleFont(7), backgroundColor: '#5B2DAD' },
    sliderLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: scaleFont(12), marginBottom: scaleFont(40) },
    sliderLabel: { fontSize: scaleFont(12), fontWeight: '700', color: '#94A3B8', fontFamily: 'Outfit_700Bold' },
    // QUICK SELECT
    quickSelectRow: { flexDirection: 'row', justifyContent: 'center', gap: scaleFont(12), marginBottom: scaleFont(40) },
    quickCard: {
        paddingHorizontal: scaleFont(16),
        paddingVertical: scaleFont(12),
        borderRadius: scaleFont(16),
        backgroundColor: '#F1F5F9',
        borderWidth: 1,
        borderColor: 'transparent',
        minWidth: scaleFont(70),
        alignItems: 'center'
    },
    quickCardActive: {
        backgroundColor: '#EEF2FF',
        borderColor: '#5B2DAD',
    },
    quickText: {
        fontSize: scaleFont(14),
        fontWeight: '800',
        color: '#64748B',
        fontFamily: 'Outfit_700Bold'
    },
    quickTextActive: {
        color: '#5B2DAD',
    },
    // DETAILS
    detailBox: { marginBottom: scaleFont(32) },
    boxLabel: { fontSize: scaleFont(11), fontWeight: '800', color: '#94A3B8', letterSpacing: scaleFont(1.5), marginBottom: scaleFont(16), fontFamily: 'Outfit_800ExtraBold' },
    chipRow: { flexDirection: 'row', gap: scaleFont(10), marginBottom: scaleFont(16) },
    chip: { paddingHorizontal: scaleFont(16), paddingVertical: scaleFont(10), borderRadius: scaleFont(14), backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' },
    chipActive: { backgroundColor: '#EEF2FF', borderColor: '#5B2DAD' },
    chipText: { fontSize: scaleFont(14), fontWeight: '700', color: '#64748B', fontFamily: 'Outfit_700Bold' },
    chipTextActive: { color: '#5B2DAD' },
    daysInput: { backgroundColor: '#F8FAFC', borderRadius: scaleFont(16), padding: scaleFont(16), fontSize: scaleFont(16), fontWeight: '600', color: '#1E293B', borderWidth: 1, borderColor: '#E2E8F0', fontFamily: 'Outfit_400Regular' },
    counter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC', borderRadius: scaleFont(20), padding: scaleFont(12), borderWidth: 1, borderColor: '#E2E8F0' },
    counterAction: { width: scaleFont(44), height: scaleFont(44), borderRadius: scaleFont(14), backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', elevation: scaleFont(2) },
    counterVal: { fontSize: scaleFont(24), fontWeight: '900', color: '#1E293B', fontFamily: 'Outfit_800ExtraBold' },
    counterHint: { fontSize: scaleFont(12), color: '#94A3B8', textAlign: 'center', marginTop: scaleFont(10), fontWeight: '600', fontFamily: 'Outfit_400Regular' },
    // SUCCESS
    successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: scaleFont(40) },
    successIconBox: { width: scaleFont(100), height: scaleFont(100), borderRadius: scaleFont(32), alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: scaleFont(24), elevation: scaleFont(10), shadowColor: '#10B981', shadowOffset: { width: 0, height: scaleFont(10) }, shadowOpacity: 0.3, shadowRadius: scaleFont(15) },
    successTitle: { fontSize: scaleFont(32), fontWeight: '900', color: '#1E293B', marginBottom: scaleFont(8), fontFamily: 'Outfit_800ExtraBold' },
    successSub: { fontSize: scaleFont(16), color: '#64748B', marginBottom: scaleFont(40), textAlign: 'center', fontFamily: 'Outfit_400Regular' },
    codeCard: { width: '100%', backgroundColor: '#F8FAFC', borderRadius: scaleFont(28), padding: scaleFont(32), alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', marginBottom: scaleFont(40) },
    codeLabel: { fontSize: scaleFont(11), fontWeight: '900', color: '#94A3B8', letterSpacing: scaleFont(2), marginBottom: scaleFont(12), fontFamily: 'Outfit_800ExtraBold' },
    codeValue: { fontSize: scaleFont(48), fontWeight: '900', color: '#1E293B', letterSpacing: scaleFont(4), marginBottom: scaleFont(24), fontFamily: 'Outfit_800ExtraBold' },
    copyBtn: { flexDirection: 'row', alignItems: 'center', gap: scaleFont(8), backgroundColor: '#EEF2FF', paddingHorizontal: scaleFont(20), paddingVertical: scaleFont(12), borderRadius: scaleFont(14) },
    copyBtnText: { color: '#5B2DAD', fontWeight: '800', fontSize: scaleFont(14), fontFamily: 'Outfit_800ExtraBold' },
    doneBtn: { width: '100%', backgroundColor: '#1E293B', paddingVertical: scaleFont(18), borderRadius: scaleFont(20), alignItems: 'center' },
    doneBtnText: { color: '#FFF', fontSize: scaleFont(17), fontWeight: '800', fontFamily: 'Outfit_800ExtraBold' }
});
