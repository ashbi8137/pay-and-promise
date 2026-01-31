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
import { useAlert } from '../../context/AlertContext';
import { supabase } from '../../lib/supabase';

const { width } = Dimensions.get('window');
const SLIDER_WIDTH = width - 48;
const KNOB_SIZE = 44;
const MAX_STAKE = 5000;

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
            const defaultX = (500 / MAX_STAKE) * (SLIDER_WIDTH - KNOB_SIZE);
            translateX.value = withSpring(defaultX);
        }
    };

    const updateStake = (x: number) => {
        const percent = x / (SLIDER_WIDTH - KNOB_SIZE);
        const rawValue = Math.round(percent * MAX_STAKE);
        const snapped = Math.round(rawValue / 10) * 10;
        const final = Math.max(20, Math.min(snapped, MAX_STAKE));

        if (final !== parseInt(amountPerPerson)) {
            setAmountPerPerson(final.toString());
            Haptics.selectionAsync();
        }
    };

    const context = useSharedValue(0);
    const panGesture = Gesture.Pan()
        .onStart(() => { context.value = translateX.value; })
        .onUpdate((event) => {
            let nextX = context.value + event.translationX;
            if (nextX < 0) nextX = 0;
            if (nextX > (SLIDER_WIDTH - KNOB_SIZE)) nextX = (SLIDER_WIDTH - KNOB_SIZE);
            translateX.value = nextX;
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
                        <Ionicons name="arrow-forward" size={20} color="#FFF" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setCategory(null)} style={styles.backLink}>
                        <Text style={styles.backLinkText}>Choose Template</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={styles.gridContainer}>
                    {[
                        { id: 'gym', label: 'Hit the Gym', icon: 'barbell', color: '#4F46E5' },
                        { id: 'code', label: 'Code Session', icon: 'code-slash', color: '#6366F1' },
                        { id: 'read', label: 'Read Books', icon: 'book', color: '#8B5CF6' },
                        { id: 'water', label: 'Drink Water', icon: 'water', color: '#7C3AED' },
                        { id: 'wake', label: 'Wake Early', icon: 'alarm', color: '#4338CA' },
                        { id: 'custom', label: 'Custom', icon: 'sparkles', color: '#6D28D9' },
                    ].map((tpl) => (
                        <TouchableOpacity key={tpl.id} style={styles.templateCard} onPress={() => handleTemplateSelect(tpl.label, tpl.id)}>
                            <LinearGradient colors={[`${tpl.color}15`, `${tpl.color}05`]} style={styles.tplGradient} />
                            <View style={[styles.tplIconCircle, { backgroundColor: `${tpl.color}20` }]}>
                                <Ionicons name={tpl.icon as any} size={28} color={tpl.color} />
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
                <Text style={styles.sliderLabel}>₹5000</Text>
            </View>
            <TouchableOpacity style={styles.nextBtn} onPress={() => setStep(2)}>
                <Text style={styles.nextBtnText}>Define Terms</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFF" />
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
                        <Ionicons name="remove" size={20} color="#1E293B" />
                    </TouchableOpacity>
                    <Text style={styles.counterVal}>{numPeople}</Text>
                    <TouchableOpacity style={styles.counterAction} onPress={() => setNumPeople(Math.min(10, parseInt(numPeople) + 1).toString())}>
                        <Ionicons name="add" size={20} color="#1E293B" />
                    </TouchableOpacity>
                </View>
                <Text style={styles.counterHint}>Min 2 • Max 10</Text>
            </View>
            <TouchableOpacity style={[styles.nextBtn, { backgroundColor: '#4F46E5' }]} onPress={handleCreatePromiseReal} disabled={loading}>
                {loading ? <ActivityIndicator color="#FFF" /> : (
                    <>
                        <Text style={styles.nextBtnText}>Launch Promise</Text>
                        <Ionicons name="rocket" size={20} color="#FFF" />
                    </>
                )}
            </TouchableOpacity>
        </Animated.View>
    );

    const renderSuccessStep = () => (
        <View style={styles.successContainer}>
            <Animated.View style={[styles.successIconBox, successIconStyle]}>
                <LinearGradient colors={['#10B981', '#059669']} style={StyleSheet.absoluteFill} />
                <Ionicons name="checkmark" size={60} color="#FFF" />
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
                    <Ionicons name="copy-outline" size={18} color="#4F46E5" />
                    <Text style={styles.copyBtnText}>Copy Code</Text>
                </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.doneBtn} onPress={() => router.replace('/(tabs)')}>
                <Text style={styles.doneBtnText}>Return to Dashboard</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => step > 0 && step < 3 ? setStep(step - 1) : router.back()} style={styles.backBtn} disabled={step === 3}>
                    <Ionicons name={step === 3 ? "close" : "chevron-back"} size={24} color="#1E293B" />
                </TouchableOpacity>
                <View style={styles.progressContainer}>
                    <View style={styles.progressTrack} />
                    <Animated.View style={[styles.progressFill, { width: `${(step + 1) * 33.3}%` }]} />
                </View>
            </View>
            <ScrollView contentContainerStyle={styles.scrollContent} scrollEnabled={step !== 1}>
                {step === 0 && renderTemplateSelector()}
                {step === 1 && renderStakeStep()}
                {step === 2 && renderDetailsStep()}
                {step === 3 && renderSuccessStep()}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 40 : 10, paddingBottom: 20 },
    backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
    progressContainer: { flex: 1, marginLeft: 20, height: 4, borderRadius: 2, overflow: 'hidden' },
    progressTrack: { ...StyleSheet.absoluteFillObject, backgroundColor: '#F1F5F9' },
    progressFill: { height: '100%', backgroundColor: '#4F46E5' },
    scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },
    wizardContainer: { flex: 1, paddingTop: 20 },
    wizardSubtitle: { fontSize: 12, fontWeight: '800', color: '#4F46E5', letterSpacing: 1.5, marginBottom: 8 },
    wizardTitle: { fontSize: 32, fontWeight: '900', color: '#1E293B', marginBottom: 32, letterSpacing: -1 },
    gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    templateCard: { width: '48%', height: 160, borderRadius: 24, padding: 20, marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#F1F5F9', backgroundColor: '#FFF' },
    tplGradient: { ...StyleSheet.absoluteFillObject },
    tplIconCircle: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    tplLabel: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
    customInputContainer: { width: '100%', gap: 24 },
    customInput: { fontSize: 28, fontWeight: '800', color: '#1E293B', borderBottomWidth: 2, borderBottomColor: '#E2E8F0', paddingVertical: 12 },
    nextBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1E293B', paddingVertical: 18, borderRadius: 20, gap: 10, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 10 },
    nextBtnText: { color: '#FFF', fontSize: 17, fontWeight: '800' },
    backLink: { alignSelf: 'center', marginTop: 12 },
    backLinkText: { fontSize: 14, color: '#64748B', fontWeight: '600' },
    // STAKE
    stakeDisplay: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 40 },
    currency: { fontSize: 32, fontWeight: '700', color: '#94A3B8', marginRight: 4, marginTop: 12 },
    stakeValue: { fontSize: 80, fontWeight: '900', color: '#1E293B', letterSpacing: -2 },
    sliderContainer: { height: 44, justifyContent: 'center', width: '100%' },
    sliderTrack: { height: 8, backgroundColor: '#F1F5F9', borderRadius: 4, width: '100%' },
    sliderTrackActive: { height: 8, backgroundColor: '#4F46E5', borderRadius: 4, position: 'absolute' },
    sliderKnob: { width: KNOB_SIZE, height: KNOB_SIZE, borderRadius: KNOB_SIZE / 2, backgroundColor: '#FFF', position: 'absolute', alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, borderWidth: 1, borderColor: '#F1F5F9' },
    knobInner: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#4F46E5' },
    sliderLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, marginBottom: 40 },
    sliderLabel: { fontSize: 12, fontWeight: '700', color: '#94A3B8' },
    // DETAILS
    detailBox: { marginBottom: 32 },
    boxLabel: { fontSize: 11, fontWeight: '800', color: '#94A3B8', letterSpacing: 1.5, marginBottom: 16 },
    chipRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' },
    chipActive: { backgroundColor: '#EEF2FF', borderColor: '#4F46E5' },
    chipText: { fontSize: 14, fontWeight: '700', color: '#64748B' },
    chipTextActive: { color: '#4F46E5' },
    daysInput: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, fontSize: 16, fontWeight: '600', color: '#1E293B', borderWidth: 1, borderColor: '#E2E8F0' },
    counter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC', borderRadius: 20, padding: 12, borderWidth: 1, borderColor: '#E2E8F0' },
    counterAction: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', elevation: 2 },
    counterVal: { fontSize: 24, fontWeight: '900', color: '#1E293B' },
    counterHint: { fontSize: 12, color: '#94A3B8', textAlign: 'center', marginTop: 10, fontWeight: '600' },
    // SUCCESS
    successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 40 },
    successIconBox: { width: 100, height: 100, borderRadius: 32, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 24, elevation: 10, shadowColor: '#10B981', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 15 },
    successTitle: { fontSize: 32, fontWeight: '900', color: '#1E293B', marginBottom: 8 },
    successSub: { fontSize: 16, color: '#64748B', marginBottom: 40, textAlign: 'center' },
    codeCard: { width: '100%', backgroundColor: '#F8FAFC', borderRadius: 28, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 40 },
    codeLabel: { fontSize: 11, fontWeight: '900', color: '#94A3B8', letterSpacing: 2, marginBottom: 12 },
    codeValue: { fontSize: 48, fontWeight: '900', color: '#1E293B', letterSpacing: 4, marginBottom: 24 },
    copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#EEF2FF', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14 },
    copyBtnText: { color: '#4F46E5', fontWeight: '800', fontSize: 14 },
    doneBtn: { width: '100%', backgroundColor: '#1E293B', paddingVertical: 18, borderRadius: 20, alignItems: 'center' },
    doneBtnText: { color: '#FFF', fontSize: 17, fontWeight: '800' }
});
