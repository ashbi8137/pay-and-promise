import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { GridOverlay } from '../../components/LuxuryVisuals';
import { useAlert } from '../../context/AlertContext';
import { supabase } from '../../lib/supabase';
import { scaleFont } from '../../utils/layout';

const { width } = Dimensions.get('window');

export default function JoinPromiseScreen() {
    const router = useRouter();
    const { showAlert } = useAlert();
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [promise, setPromise] = useState<any>(null);

    const handleSearch = async () => {
        if (code.length < 6) return;
        Keyboard.dismiss();
        setLoading(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        try {
            const { data, error } = await supabase
                .from('promises')
                .select('*')
                .eq('invite_code', code.toUpperCase())
                .eq('status', 'active')
                .single();

            if (error || !data) {
                showAlert({ title: 'Not Found', message: 'Invalid code or promise expired.', type: 'error' });
                setPromise(null);
            } else {
                setPromise(data);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
        } catch (e) {
            console.error(e);
            showAlert({ title: 'Error', message: 'Connection failed.', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleJoin = async () => {
        if (!promise) return;
        setLoading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const googleName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
            const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture;

            // Single atomic RPC call — handles all checks, participant insert, JSON cache, and PP lock
            const { data: result, error: rpcError } = await supabase.rpc('join_promise_atomic', {
                p_invite_code: code,
                p_joiner_name: googleName,
                p_joiner_avatar: avatarUrl || null,
            });

            if (rpcError) {
                const msg = rpcError.message || 'Failed to join.';
                if (msg.includes('Already joined')) {
                    showAlert({ title: 'Already In', message: 'You are already in this promise.', type: 'info' });
                    router.replace('/(tabs)');
                    return;
                } else if (msg.includes('full')) {
                    showAlert({ title: 'Promise Full', message: `This promise is already full.`, type: 'warning' });
                } else if (msg.includes('Insufficient')) {
                    showAlert({ title: 'Not Enough PP', message: `You need more PP to join this promise.`, type: 'warning' });
                } else if (msg.includes('not found')) {
                    showAlert({ title: 'Not Found', message: 'Promise not found or expired.', type: 'error' });
                } else {
                    showAlert({ title: 'Error', message: msg, type: 'error' });
                }
                setLoading(false);
                return;
            }

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            showAlert({ title: 'Success', message: 'You have joined the promise!', type: 'success' });
            router.replace('/(tabs)');

        } catch (e: any) {
            console.error(e);
            showAlert({ title: 'Error', message: e.message || 'Failed to join.', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <StatusBar style="dark" />
            <LinearGradient colors={['#F8FAFC', '#F1F5F9']} style={StyleSheet.absoluteFill} />
            <GridOverlay />

            <SafeAreaView style={{ flex: 1 }}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="close" size={scaleFont(24)} color="#0F172A" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Join Promise</Text>
                </View>

                <Animated.ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.content}>
                        {!promise ? (
                            <Animated.View entering={FadeInUp.delay(200)} style={styles.inputCard}>
                                <Text style={styles.label}>ENTER INVITE CODE</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="ABC-123"
                                    placeholderTextColor="#94A3B8"
                                    value={code}
                                    onChangeText={(t) => {
                                        setCode(t.toUpperCase());
                                        if (t.length >= 6) handleSearch();
                                    }}
                                    maxLength={8}
                                    autoCapitalize="characters"
                                />
                                {loading && <ActivityIndicator style={{ marginTop: 20 }} color="#5B2DAD" />}

                                <TouchableOpacity
                                    style={[styles.searchBtn, { opacity: code.length >= 6 ? 1 : 0.5 }]}
                                    onPress={handleSearch}
                                    disabled={code.length < 6 || loading}
                                >
                                    <Text style={styles.searchBtnText}>Find Promise</Text>
                                </TouchableOpacity>
                            </Animated.View>
                        ) : (
                            <Animated.View entering={FadeInDown} style={styles.promiseCard}>
                                <LinearGradient colors={['#EEF2FF', '#E0E7FF']} style={StyleSheet.absoluteFill} />

                                <View style={styles.iconBox}>
                                    <Ionicons name="sparkles" size={scaleFont(32)} color="#5B2DAD" />
                                </View>

                                <Text style={styles.pTitle}>{promise.title}</Text>
                                <Text style={styles.pSub}>Hosted by Creator</Text>

                                <View style={styles.statsRow}>
                                    <View style={styles.stat}>
                                        <Text style={styles.statVal}>{(promise.commitment_level || 'Medium').charAt(0).toUpperCase() + (promise.commitment_level || 'medium').slice(1)}</Text>
                                        <Text style={styles.statLabel}>COMMITMENT</Text>
                                    </View>
                                    <View style={styles.divider} />
                                    <View style={styles.stat}>
                                        <Text style={styles.statVal}>{promise.locked_points || 10}</Text>
                                        <Text style={styles.statLabel}>PP LOCKED</Text>
                                    </View>
                                    <View style={styles.divider} />
                                    <View style={styles.stat}>
                                        <Text style={styles.statVal}>{promise.duration_days}</Text>
                                        <Text style={styles.statLabel}>DAYS</Text>
                                    </View>
                                </View>

                                <TouchableOpacity style={styles.joinBtn} onPress={handleJoin} disabled={loading}>
                                    {loading ? <ActivityIndicator color="#FFF" /> : (
                                        <>
                                            <Text style={styles.joinBtnText}>Commit & Join</Text>
                                            <Ionicons name="arrow-forward" size={scaleFont(20)} color="#FFF" />
                                        </>
                                    )}
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.cancelLink} onPress={() => setPromise(null)}>
                                    <Text style={styles.cancelText}>Cancel</Text>
                                </TouchableOpacity>
                            </Animated.View>
                        )}
                    </View>
                </Animated.ScrollView>
            </SafeAreaView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: scaleFont(20), paddingTop: Platform.OS === 'android' ? scaleFont(40) : scaleFont(10), marginBottom: scaleFont(20) },
    backBtn: { width: scaleFont(44), height: scaleFont(44), borderRadius: scaleFont(12), backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: scaleFont(20), fontWeight: '800', color: '#0F172A', marginLeft: scaleFont(20), fontFamily: 'Outfit_800ExtraBold' },
    content: { flex: 1, paddingHorizontal: scaleFont(24), justifyContent: 'center' },
    scrollContent: { flexGrow: 1, justifyContent: 'center', paddingBottom: scaleFont(40) },
    inputCard: { backgroundColor: '#FFF', borderRadius: scaleFont(24), padding: scaleFont(32), alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
    label: { fontSize: scaleFont(12), fontWeight: '800', color: '#64748B', letterSpacing: 2, marginBottom: scaleFont(20), fontFamily: 'Outfit_800ExtraBold' },
    input: { fontSize: scaleFont(40), fontWeight: '800', color: '#5B2DAD', textAlign: 'center', letterSpacing: 4, width: '100%', fontFamily: 'Outfit_800ExtraBold', borderBottomWidth: 2, borderBottomColor: '#E2E8F0', paddingBottom: scaleFont(10) },
    searchBtn: { marginTop: scaleFont(30), backgroundColor: '#0F172A', paddingVertical: scaleFont(16), paddingHorizontal: scaleFont(32), borderRadius: scaleFont(16), width: '100%', alignItems: 'center' },
    searchBtnText: { color: '#FFF', fontSize: scaleFont(16), fontWeight: '700', fontFamily: 'Outfit_700Bold' },

    promiseCard: { width: '100%', padding: scaleFont(32), borderRadius: scaleFont(32), alignItems: 'center', overflow: 'hidden', borderWidth: 1, borderColor: '#C7D2FE' },
    iconBox: { width: scaleFont(64), height: scaleFont(64), borderRadius: scaleFont(32), backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', marginBottom: scaleFont(24), shadowColor: '#5B2DAD', shadowOpacity: 0.2, shadowRadius: 10, elevation: 5 },
    pTitle: { fontSize: scaleFont(28), fontWeight: '900', color: '#1E293B', textAlign: 'center', marginBottom: scaleFont(8), fontFamily: 'Outfit_800ExtraBold' },
    pSub: { fontSize: scaleFont(14), color: '#64748B', marginBottom: scaleFont(32), fontFamily: 'Outfit_600SemiBold' },
    statsRow: { flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: scaleFont(40) },
    stat: { flex: 1, alignItems: 'center' },
    statVal: { fontSize: scaleFont(24), fontWeight: '800', color: '#5B2DAD', fontFamily: 'Outfit_800ExtraBold' },
    statLabel: { fontSize: scaleFont(11), fontWeight: '800', color: '#94A3B8', letterSpacing: 1, marginTop: scaleFont(4), fontFamily: 'Outfit_800ExtraBold' },
    divider: { width: 1, height: scaleFont(40), backgroundColor: '#CBD5E1' },
    joinBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#5B2DAD', paddingVertical: scaleFont(20), borderRadius: scaleFont(20), width: '100%', gap: scaleFont(12), shadowColor: '#5B2DAD', shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
    joinBtnText: { color: '#FFF', fontSize: scaleFont(18), fontWeight: '800', fontFamily: 'Outfit_800ExtraBold' },
    cancelLink: { marginTop: scaleFont(20) },
    cancelText: { color: '#64748B', fontWeight: '600', fontSize: scaleFont(14), fontFamily: 'Outfit_600SemiBold' }
});
