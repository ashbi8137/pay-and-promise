import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
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
import Animated, {
    FadeInDown
} from 'react-native-reanimated';
import { GridOverlay } from '../../components/LuxuryVisuals';
import { useAlert } from '../../context/AlertContext';
import { supabase } from '../../lib/supabase';

import { scaleFont } from '../../utils/layout';

const { width } = Dimensions.get('window');

// PP Commitment Level definitions
const COMMITMENT_LEVELS = [
    { id: 'low', label: 'Low', points: 5, earn: 10, icon: 'leaf-outline' as const, color: '#10B981', bgColor: '#ECFDF5', desc: 'Casual commitment' },
    { id: 'medium', label: 'Medium', points: 10, earn: 25, icon: 'flame-outline' as const, color: '#F59E0B', bgColor: '#FFFBEB', desc: 'Balanced challenge' },
    { id: 'high', label: 'High', points: 20, earn: 50, icon: 'flash-outline' as const, color: '#EF4444', bgColor: '#FEF2F2', desc: 'Maximum stakes' },
];

export default function CreatePromiseScreen() {
    const router = useRouter();
    const { showAlert } = useAlert();
    const [loading, setLoading] = useState(false);

    // Wizard State
    const [step, setStep] = useState(0); // 0: Templates, 1: Commitment, 2: Details, 3: Invite

    // Form State
    const [title, setTitle] = useState('');
    const [duration, setDuration] = useState('7');
    const [numPeople, setNumPeople] = useState('2');
    const [commitmentLevel, setCommitmentLevel] = useState('medium');
    const [category, setCategory] = useState<string | null>(null);
    const [inviteCode, setInviteCode] = useState('');
    const [userPP, setUserPP] = useState<number | null>(null);

    // Reset state when screen is focused
    useFocusEffect(
        useCallback(() => {
            setStep(0);
            setTitle('');
            setCategory(null);
            setDuration('7');
            setNumPeople('2');
            setCommitmentLevel('medium');
            setLoading(false);
            fetchUserPP();
        }, [])
    );

    useEffect(() => {
        if (step === 3) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
    }, [step]);

    const fetchUserPP = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const { data } = await supabase
                .from('profiles')
                .select('promise_points')
                .eq('id', user.id)
                .single();
            if (data) setUserPP(data.promise_points);
        } catch (e) {
            console.error('Error fetching PP:', e);
        }
    };

    const selectedLevel = COMMITMENT_LEVELS.find(l => l.id === commitmentLevel)!;

    const handleTemplateSelect = (selectedTitle: string, id: string) => {
        setCategory(id);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        if (id === 'custom') {
            setTitle('');
        } else {
            setTitle(selectedTitle);
            setStep(1);
        }
    };

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

            if (parseInt(duration) > 30) {
                showAlert({ title: 'Attention', message: 'Duration must be less than 30 days.', type: 'warning' });
                setLoading(false);
                return;
            }

            // Check user has enough PP
            if (userPP !== null && userPP < selectedLevel.points) {
                showAlert({ title: 'Not Enough Points', message: `You need ${selectedLevel.points} PP but only have ${userPP} PP.`, type: 'warning' });
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
                    commitment_level: commitmentLevel,
                    locked_points: selectedLevel.points,
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

            // Lock PP: deduct from user balance and log in ledger
            await supabase.rpc('award_promise_points', {
                p_user_id: user.id,
                p_promise_id: promiseData.id,
                p_points: -selectedLevel.points,
                p_reason: 'commitment_lock',
                p_description: `PP locked for: ${title}`
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
                    }}>
                        <Text style={styles.nextBtnText}>Set Commitment</Text>
                        <Ionicons name="arrow-forward" size={scaleFont(20)} color="#FFF" />
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
                        { id: 'run', label: 'Run', icon: 'run', color: '#5B2DAD', iconSet: 'MaterialCommunityIcons' },
                        { id: 'walk', label: 'Walk', icon: 'walk', color: '#5B2DAD' },
                        { id: 'study', label: 'Study', icon: 'school', color: '#5B2DAD' },
                        { id: 'custom', label: 'Other', icon: 'layers', color: '#5B2DAD' },
                    ].map((tpl) => (
                        <TouchableOpacity key={tpl.id} style={styles.templateCard} onPress={() => handleTemplateSelect(tpl.label, tpl.id)}>
                            <View style={styles.tplIconCircle}>
                                {tpl.iconSet === 'MaterialCommunityIcons' ? (
                                    <MaterialCommunityIcons name={tpl.icon as any} size={scaleFont(28)} color={tpl.color} />
                                ) : (
                                    <Ionicons name={tpl.icon as any} size={scaleFont(28)} color={tpl.color} />
                                )}
                            </View>
                            <Text style={styles.tplLabel}>{tpl.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}
        </Animated.View>
    );

    const renderCommitmentStep = () => (
        <Animated.View entering={FadeInDown} style={styles.wizardContainer}>
            <Text style={styles.wizardSubtitle}>STEP 2</Text>
            <Text style={styles.wizardTitle}>Set your commitment</Text>

            {/* PP Balance */}
            {userPP !== null && (
                <View style={styles.ppBalanceCard}>
                    <Ionicons name="diamond" size={scaleFont(16)} color="#5B2DAD" />
                    <Text style={styles.ppBalanceText}>Your Balance: <Text style={styles.ppBalanceValue}>{userPP} PP</Text></Text>
                </View>
            )}

            {/* Commitment Level Cards */}
            <View style={styles.commitmentGrid}>
                {COMMITMENT_LEVELS.map((level) => {
                    const isSelected = commitmentLevel === level.id;
                    const isDisabled = userPP !== null && userPP < level.points;
                    return (
                        <TouchableOpacity
                            key={level.id}
                            style={[
                                styles.commitmentCard,
                                isSelected && { borderColor: level.color, borderWidth: 2, backgroundColor: level.bgColor },
                                isDisabled && { opacity: 0.5 }
                            ]}
                            onPress={() => {
                                if (isDisabled) {
                                    showAlert({ title: 'Not Enough PP', message: `You need ${level.points} PP for this level.`, type: 'warning' });
                                    return;
                                }
                                setCommitmentLevel(level.id);
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            }}
                            disabled={isDisabled}
                        >
                            <View style={[styles.commitmentIconBox, { backgroundColor: level.bgColor }]}>
                                <Ionicons name={level.icon} size={scaleFont(24)} color={level.color} />
                            </View>
                            <Text style={[styles.commitmentPoints, { color: level.color }]}>{level.points} PP</Text>
                            <Text style={styles.commitmentLabel}>{level.label}</Text>

                            {isSelected && (
                                <View style={[styles.selectedBadge, { backgroundColor: level.color }]}>
                                    <Ionicons name="checkmark" size={scaleFont(10)} color="#FFF" />
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })}
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
                    {['1', '7', '14', '21'].map(d => (
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

            {/* Commitment Summary */}
            <View style={styles.commitmentSummary}>
                <View style={[styles.summaryIcon, { backgroundColor: selectedLevel.bgColor }]}>
                    <Ionicons name={selectedLevel.icon} size={scaleFont(20)} color={selectedLevel.color} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.summaryLabel}>{selectedLevel.label} Commitment</Text>
                    <Text style={styles.summaryDetail}>Locking {selectedLevel.points} PP • Earn up to {selectedLevel.earn} PP</Text>
                </View>
            </View>

            <TouchableOpacity style={[styles.nextBtn, { backgroundColor: '#5B2DAD' }]} onPress={handleCreatePromiseReal} disabled={loading}>
                {loading ? <ActivityIndicator color="#FFF" /> : (
                    <>
                        <Text style={styles.nextBtnText}>Launch Promise</Text>
                    </>
                )}
            </TouchableOpacity>
        </Animated.View>
    );

    const renderSuccessStep = () => (
        <View style={styles.successContainer}>
            <View style={styles.successIconBox}>
                <LinearGradient colors={['#5B2DAD', '#7C3AED']} style={StyleSheet.absoluteFill} />
                <View style={styles.successIconInner}>
                    <Ionicons name="shield-checkmark" size={scaleFont(50)} color="#FFF" />
                </View>
            </View>

            <Text style={styles.successTitle}>Promise Active</Text>
            <Text style={styles.successSub}>Your commitment is now live. {selectedLevel.points} PP locked.</Text>

            <View style={styles.codeCard}>
                <Text style={styles.codeLabel}>INVITE YOUR CREW</Text>
                <Text style={styles.codeValue}>{inviteCode}</Text>
                <TouchableOpacity style={styles.copyBtn} onPress={async () => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    await Clipboard.setStringAsync(inviteCode);
                    showAlert({ title: 'Copied', message: 'Invite code copied!', type: 'success' });
                }}>
                    <Ionicons name="copy-outline" size={scaleFont(18)} color="#5B2DAD" />
                    <Text style={styles.copyBtnText}>Copy Code</Text>
                </TouchableOpacity>
            </View>

        </View>
    );

    return (
        <View style={styles.container}>
            <GridOverlay />

            <SafeAreaView style={{ flex: 1 }}>
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={() => {
                            if (step === 3) {
                                router.replace('/(tabs)');
                            } else if (step > 0) {
                                setStep(step - 1);
                            } else {
                                router.back();
                            }
                        }}
                        style={styles.backBtn}
                    >
                        <Ionicons name={step === 3 ? "close" : "chevron-back"} size={scaleFont(24)} color="#0F172A" />
                    </TouchableOpacity>
                    <View style={styles.progressContainer}>
                        <View style={styles.progressTrack} />
                        <Animated.View style={[styles.progressFill, { width: `${(step + 1) * 33.3}%` }]} />
                    </View>
                </View>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    {step === 0 && renderTemplateSelector()}
                    {step === 1 && renderCommitmentStep()}
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
    scrollContent: { flexGrow: 1, paddingHorizontal: scaleFont(24), paddingBottom: scaleFont(100) },
    wizardContainer: { flex: 1, paddingTop: scaleFont(20) },
    wizardSubtitle: { fontSize: scaleFont(12), fontWeight: '800', color: '#5B2DAD', letterSpacing: scaleFont(1.5), marginBottom: scaleFont(8), fontFamily: 'Outfit_800ExtraBold' },
    wizardTitle: { fontSize: scaleFont(32), fontWeight: '900', color: '#1E293B', marginBottom: scaleFont(32), letterSpacing: scaleFont(-1), fontFamily: 'Outfit_800ExtraBold' },
    gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    templateCard: {
        width: '30%',
        alignItems: 'center',
        marginBottom: scaleFont(32),
        padding: scaleFont(10),
    },
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
    // COMMITMENT STEP
    ppBalanceCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scaleFont(8),
        backgroundColor: '#F5F3FF',
        paddingHorizontal: scaleFont(16),
        paddingVertical: scaleFont(12),
        borderRadius: scaleFont(16),
        marginBottom: scaleFont(24),
    },
    ppBalanceText: { fontSize: scaleFont(14), fontWeight: '600', color: '#64748B', fontFamily: 'Outfit_700Bold' },
    ppBalanceValue: { color: '#5B2DAD', fontWeight: '800' },
    commitmentGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: scaleFont(32) },
    commitmentCard: {
        width: '30%',
        backgroundColor: '#FFF',
        borderRadius: scaleFont(16),
        padding: scaleFont(12),
        borderWidth: 1,
        borderColor: '#F1F5F9',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
    },
    commitmentIconBox: {
        width: scaleFont(40),
        height: scaleFont(40),
        borderRadius: scaleFont(20),
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: scaleFont(8),
    },
    commitmentPoints: { fontSize: scaleFont(15), fontWeight: '900', fontFamily: 'Outfit_800ExtraBold', marginBottom: scaleFont(2) },
    commitmentLabel: { fontSize: scaleFont(12), fontWeight: '700', color: '#64748B', fontFamily: 'Outfit_700Bold' },
    commitmentDesc: { fontSize: scaleFont(13), color: '#94A3B8', marginBottom: scaleFont(12), fontFamily: 'Outfit_400Regular' },
    commitmentStats: { gap: scaleFont(6) },
    commitmentStatRow: { flexDirection: 'row', alignItems: 'center', gap: scaleFont(6) },
    commitmentStatText: { fontSize: scaleFont(12), fontWeight: '700', color: '#64748B', fontFamily: 'Outfit_700Bold' },
    selectedBadge: {
        position: 'absolute',
        top: scaleFont(16),
        right: scaleFont(16),
        width: scaleFont(28),
        height: scaleFont(28),
        borderRadius: scaleFont(14),
        alignItems: 'center',
        justifyContent: 'center',
    },
    // COMMITMENT SUMMARY (in details step)
    commitmentSummary: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scaleFont(12),
        backgroundColor: '#FFF',
        borderRadius: scaleFont(16),
        padding: scaleFont(16),
        marginBottom: scaleFont(24),
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    summaryIcon: {
        width: scaleFont(40),
        height: scaleFont(40),
        borderRadius: scaleFont(12),
        alignItems: 'center',
        justifyContent: 'center',
    },
    summaryLabel: { fontSize: scaleFont(15), fontWeight: '800', color: '#1E293B', fontFamily: 'Outfit_800ExtraBold' },
    summaryDetail: { fontSize: scaleFont(12), color: '#64748B', fontFamily: 'Outfit_400Regular', marginTop: scaleFont(2) },
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
    successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: scaleFont(140) },
    successIconBox: { width: scaleFont(120), height: scaleFont(120), borderRadius: scaleFont(60), alignItems: 'center', justifyContent: 'center', marginBottom: scaleFont(32), elevation: scaleFont(15), shadowColor: '#5B2DAD', shadowOffset: { width: 0, height: scaleFont(12) }, shadowOpacity: 0.3, shadowRadius: scaleFont(20), overflow: 'hidden' },
    successIconInner: { width: scaleFont(90), height: scaleFont(90), borderRadius: scaleFont(45), backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
    successTitle: { fontSize: scaleFont(34), fontWeight: '900', color: '#1E293B', marginBottom: scaleFont(12), fontFamily: 'Outfit_800ExtraBold', letterSpacing: scaleFont(-1) },
    successSub: { fontSize: scaleFont(15), color: '#64748B', marginBottom: scaleFont(48), textAlign: 'center', fontFamily: 'Outfit_400Regular', paddingHorizontal: scaleFont(20) },
    codeCard: { width: '100%', backgroundColor: '#FFFFFF', borderRadius: scaleFont(32), padding: scaleFont(36), alignItems: 'center', borderWidth: 1, borderColor: 'rgba(91, 45, 173, 0.1)', marginBottom: scaleFont(48), shadowColor: '#5B2DAD', shadowOffset: { width: 0, height: scaleFont(12) }, shadowOpacity: 0.05, shadowRadius: scaleFont(20), elevation: scaleFont(4) },
    codeLabel: { fontSize: scaleFont(12), fontWeight: '900', color: '#94A3B8', letterSpacing: scaleFont(2.5), marginBottom: scaleFont(16), fontFamily: 'Outfit_800ExtraBold' },
    codeValue: { fontSize: scaleFont(52), fontWeight: '900', color: '#5B2DAD', letterSpacing: scaleFont(6), marginBottom: scaleFont(28), fontFamily: 'Outfit_800ExtraBold' },
    copyBtn: { flexDirection: 'row', alignItems: 'center', gap: scaleFont(10), backgroundColor: '#F5F3FF', paddingHorizontal: scaleFont(24), paddingVertical: scaleFont(14), borderRadius: scaleFont(16) },
    copyBtnText: { color: '#5B2DAD', fontWeight: '800', fontSize: scaleFont(15), fontFamily: 'Outfit_800ExtraBold' },
});
