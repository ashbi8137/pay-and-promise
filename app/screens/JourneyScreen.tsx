import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Platform,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { GridOverlay } from '../../components/LuxuryVisuals';
import { supabase } from '../../lib/supabase';
import { scaleFont } from '../utils/layout';

const { width } = Dimensions.get('window');

interface Checkin {
    promise_id: string;
    status: string;
    date: string;
}

interface JourneyItem {
    id: string;
    title: string;
    created_at: string;
    duration_days: number;
    status: string;
    days_data: string[];
    winnings: number;
    penalties: number;
    net: number;
    amount_per_person: number;
    failed_days_count: number;
}

export default function JourneyScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [history, setHistory] = useState<JourneyItem[]>([]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchJourneyAttributes().then(() => setRefreshing(false));
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchJourneyAttributes();
        }, [])
    );

    const fetchJourneyAttributes = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: participations } = await supabase
                .from('promise_participants')
                .select('promise_id')
                .eq('user_id', user.id);

            if (!participations || participations.length === 0) {
                setLoading(false);
                return;
            }

            const promiseIds = participations.map((p: { promise_id: string }) => p.promise_id);

            const { data: promises } = await supabase
                .from('promises')
                .select('*')
                .in('id', promiseIds)
                .order('created_at', { ascending: false });

            if (!promises) {
                setLoading(false);
                return;
            }

            const { data: checkins } = await supabase
                .from('daily_checkins')
                .select('promise_id, status, date')
                .in('promise_id', promiseIds)
                .eq('user_id', user.id);

            const { data: ledger } = await supabase
                .from('ledger')
                .select('amount, type, promise_id')
                .eq('user_id', user.id)
                .in('promise_id', promiseIds);

            const processed: JourneyItem[] = promises.map((p: any) => {
                const pCheckins = checkins?.filter((c: Checkin) => c.promise_id === p.id) || [];
                const daysData: string[] = [];

                pCheckins.sort((a: Checkin, b: Checkin) => new Date(a.date).getTime() - new Date(b.date).getTime());

                pCheckins.forEach((c: Checkin) => {
                    if (c.status === 'done') daysData.push('done');
                    else if (c.status === 'failed') daysData.push('failed');
                });

                while (daysData.length < p.duration_days) {
                    daysData.push('empty');
                }

                let winnings = 0;
                let penalties = 0;
                const pLedger = ledger?.filter((l: { promise_id: string; amount: number; type: string }) => l.promise_id === p.id) || [];
                pLedger.forEach((l: { promise_id: string; amount: number; type: string }) => {
                    const amt = Number(l.amount);
                    if (l.type === 'winnings') winnings += amt;
                    if (l.type === 'penalty') penalties += Math.abs(amt);
                    if (l.type === 'refund') penalties -= Math.abs(amt);
                });

                const failedDaysCount = daysData.filter(d => d === 'failed').length;
                const stakePerDay = (p.amount_per_person || 0) / (p.duration_days || 1);

                if (penalties === 0 && failedDaysCount > 0) {
                    penalties = failedDaysCount * stakePerDay;
                }

                winnings = Math.round(winnings * 100) / 100;
                penalties = Math.round(penalties * 100) / 100;
                const net = Math.round((winnings - penalties) * 100) / 100;

                return {
                    id: p.id,
                    title: p.title,
                    created_at: p.created_at,
                    duration_days: p.duration_days,
                    status: p.status,
                    days_data: daysData,
                    winnings,
                    penalties,
                    net,
                    amount_per_person: p.amount_per_person || 0,
                    failed_days_count: failedDaysCount
                };
            });

            setHistory(processed);

        } catch (error) {
            console.error('Error fetching journey:', error);
        } finally {
            setLoading(false);
        }
    };

    const globalStats = useMemo(() => {
        let totalNet = 0;
        let totalDone = 0;
        let totalFailed = 0;
        history.forEach(item => {
            totalNet += item.net;
            totalDone += item.days_data.filter(d => d === 'done').length;
            totalFailed += item.days_data.filter(d => d === 'failed').length;
        });
        const totalAttempts = totalDone + totalFailed;
        const successRate = totalAttempts > 0 ? Math.round((totalDone / totalAttempts) * 100) : 0;

        return { totalNet, successRate, totalPromises: history.length };
    }, [history]);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    };

    const handleBack = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.back();
    };

    return (
        <View style={styles.container}>
            <GridOverlay />

            {/* Background elements removed for focus */}

            <SafeAreaView style={{ flex: 1 }}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                        <Ionicons name="chevron-back" size={24} color="#0F172A" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Journey Atlas</Text>
                    <View style={{ width: scaleFont(44) }} />
                </View>

                {loading ? (
                    <View style={styles.loaderContainer}>
                        <ActivityIndicator size="large" color="#4F46E5" />
                        <Text style={styles.loadingText}>Synchronizing Ledger...</Text>
                    </View>
                ) : (
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" />}
                    >
                        {history.length > 0 && (
                            <Animated.View entering={FadeInDown.duration(800)} style={styles.impactCardWrapper}>
                                <LinearGradient
                                    colors={['#0F172A', '#1E293B']}
                                    style={styles.impactCard}
                                >
                                    <Ionicons name="infinite" size={120} color="rgba(255,255,255,0.03)" style={styles.impactBgIcon} />
                                    <Text style={styles.impactLabel}>LIFETIME PERFORMANCE</Text>
                                    <View style={styles.impactGrid}>
                                        <View style={styles.impactItem}>
                                            <Text style={styles.impactVal}>{globalStats.totalPromises}</Text>
                                            <Text style={styles.impactSub}>Promises</Text>
                                        </View>
                                        <View style={styles.impactDivider} />
                                        <View style={styles.impactItem}>
                                            <Text style={styles.impactVal}>₹{Math.abs(globalStats.totalNet).toFixed(0)}</Text>
                                            <Text style={styles.impactSub}>{globalStats.totalNet >= 0 ? 'Surplus' : 'Deficit'}</Text>
                                        </View>
                                        <View style={styles.impactDivider} />
                                        <View style={styles.impactItem}>
                                            <Text style={styles.impactVal}>{globalStats.successRate}%</Text>
                                            <Text style={styles.impactSub}>Integrity</Text>
                                        </View>
                                    </View>
                                </LinearGradient>
                            </Animated.View>
                        )}

                        <View style={styles.timeline}>
                            {history.map((item, index) => {
                                const totalRecordedDays = item.days_data.filter(d => d === 'done' || d === 'failed').length;
                                const isFullyCompleted = totalRecordedDays >= item.duration_days || item.status === 'completed' || item.status === 'failed';

                                return (
                                    <View key={item.id} style={styles.timelineItem}>
                                        <View style={styles.dateColumn}>
                                            <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
                                            <View style={styles.lineTrack}>
                                                <LinearGradient
                                                    colors={item.net >= 0 ? ['#10B981', '#34D399'] : ['#EF4444', '#F87171']}
                                                    style={styles.lineNode}
                                                />
                                                {index !== history.length - 1 && <View style={styles.lineConnector} />}
                                            </View>
                                        </View>

                                        <Animated.View
                                            entering={FadeInRight.delay(index * 150).springify()}
                                            style={styles.cardContainer}
                                        >
                                            <TouchableOpacity
                                                activeOpacity={0.9}
                                                style={styles.card}
                                                onPress={() => {
                                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                                    router.push({
                                                        pathname: '/screens/PromiseReportScreen',
                                                        params: { promiseId: item.id }
                                                    });
                                                }}
                                            >
                                                <View style={styles.cardHeader}>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={styles.cardTitle}>{item.title}</Text>
                                                        <Text style={styles.cardSubTitle}>Waypoint {history.length - index}</Text>
                                                    </View>
                                                    <View style={[styles.statusBadge, isFullyCompleted ? styles.bgSuccess : styles.bgActive]}>
                                                        <Text style={[styles.statusText, isFullyCompleted ? styles.textSuccess : styles.textActive]}>
                                                            {isFullyCompleted ? 'ARCHIVED' : 'ACTIVE'}
                                                        </Text>
                                                    </View>
                                                </View>

                                                <Text style={styles.sectionLabel}>Carbon Grid Progress</Text>
                                                <View style={styles.storyGraph}>
                                                    {item.days_data.map((dayStatus, i) => (
                                                        <View
                                                            key={i}
                                                            style={[
                                                                styles.storyBlock,
                                                                dayStatus === 'done' ? styles.blockGreen :
                                                                    dayStatus === 'failed' ? styles.blockRed : styles.blockGray
                                                            ]}
                                                        />
                                                    ))}
                                                </View>

                                                <View style={styles.statsGrid}>
                                                    <View style={styles.statBox}>
                                                        <Text style={styles.statLabel}>STREAK</Text>
                                                        <Text style={[styles.statValue, { color: '#10B981' }]}>
                                                            {item.days_data.filter(d => d === 'done').length}d
                                                        </Text>
                                                    </View>
                                                    <View style={styles.statBox}>
                                                        <Text style={styles.statLabel}>OUTCOME</Text>
                                                        <Text style={[styles.statValue, { color: item.net >= 0 ? '#10B981' : '#EF4444' }]}>
                                                            {item.net >= 0 ? '+' : '-'}₹{Math.abs(item.net).toFixed(0)}
                                                        </Text>
                                                    </View>
                                                    <View style={styles.statBox}>
                                                        <Text style={styles.statLabel}>EFFICIENCY</Text>
                                                        <Text style={[styles.statValue, { color: '#6366F1' }]}>
                                                            {Math.round((item.days_data.filter(d => d === 'done').length / item.duration_days) * 100)}%
                                                        </Text>
                                                    </View>
                                                </View>
                                            </TouchableOpacity>
                                        </Animated.View>
                                    </View>
                                );
                            })}
                        </View>
                        {history.length === 0 && (
                            <View style={styles.emptyState}>
                                <View style={styles.emptyIconCircle}>
                                    <Ionicons name="trail-sign-outline" size={40} color="#94A3B8" />
                                </View>
                                <Text style={styles.emptyText}>Your legacy begins with your first promise.</Text>
                                <TouchableOpacity
                                    style={styles.createFirstBtn}
                                    onPress={() => router.push('/screens/CreatePromiseScreen')}
                                >
                                    <Text style={styles.createFirstText}>Forge New Promise</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </ScrollView>
                )}
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: scaleFont(28), paddingTop: Platform.OS === 'android' ? scaleFont(40) : scaleFont(10), paddingBottom: scaleFont(24) },
    backButton: { width: scaleFont(44), height: scaleFont(44), borderRadius: scaleFont(12), backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: scaleFont(24), fontWeight: '900', color: '#0F172A', letterSpacing: scaleFont(-1), fontFamily: 'Outfit_800ExtraBold' },
    scrollContent: { paddingHorizontal: scaleFont(28), paddingBottom: scaleFont(40) },
    loaderContainer: { marginTop: scaleFont(100), alignItems: 'center' },
    loadingText: { marginTop: scaleFont(16), fontSize: scaleFont(14), fontWeight: '700', color: '#4F46E5', fontFamily: 'Outfit_700Bold' },
    impactCardWrapper: { marginBottom: scaleFont(32), borderRadius: scaleFont(28), overflow: 'hidden', elevation: scaleFont(12), shadowColor: '#4F46E5', shadowOffset: { width: 0, height: scaleFont(10) }, shadowOpacity: 0.2, shadowRadius: scaleFont(20) },
    impactCard: { padding: scaleFont(24) },
    impactBgIcon: { position: 'absolute', bottom: scaleFont(-20), right: scaleFont(-20) },
    impactLabel: { fontSize: scaleFont(10), fontWeight: '900', color: 'rgba(255,255,255,0.6)', letterSpacing: scaleFont(2), marginBottom: scaleFont(20), textAlign: 'center', fontFamily: 'Outfit_800ExtraBold' },
    impactGrid: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    impactItem: { flex: 1, alignItems: 'center' },
    impactVal: { fontSize: scaleFont(24), fontWeight: '900', color: '#FFF', marginBottom: scaleFont(4), fontFamily: 'Outfit_800ExtraBold' },
    impactSub: { fontSize: scaleFont(11), color: 'rgba(255,255,255,0.7)', fontWeight: '700', fontFamily: 'Outfit_700Bold' },
    impactDivider: { width: 1, height: scaleFont(32), backgroundColor: 'rgba(255,255,255,0.1)' },
    timeline: { flex: 1 },
    timelineItem: { flexDirection: 'row', marginBottom: scaleFont(28) },
    dateColumn: { width: scaleFont(60), alignItems: 'flex-start' },
    dateText: { fontSize: scaleFont(10), fontWeight: '900', color: '#94A3B8', textTransform: 'uppercase', marginBottom: scaleFont(8), letterSpacing: scaleFont(0.5), fontFamily: 'Outfit_800ExtraBold' },
    lineTrack: { flex: 1, alignItems: 'center', width: scaleFont(24) },
    lineNode: { width: scaleFont(14), height: scaleFont(14), borderRadius: scaleFont(7), zIndex: 2, borderWidth: 3, borderColor: '#FFFFFF', elevation: scaleFont(4), shadowColor: '#000', shadowOffset: { width: 0, height: scaleFont(2) }, shadowOpacity: 0.1, shadowRadius: scaleFont(4) },
    lineConnector: { position: 'absolute', top: scaleFont(12), width: scaleFont(2), bottom: scaleFont(-32), backgroundColor: 'rgba(0,0,0,0.05)', zIndex: 1 },
    cardContainer: { flex: 1 },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: scaleFont(28),
        padding: scaleFont(24),
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.6)',
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: scaleFont(12) },
        shadowOpacity: 0.08,
        shadowRadius: scaleFont(16),
        elevation: scaleFont(8)
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: scaleFont(20) },
    cardTitle: { fontSize: scaleFont(19), fontWeight: '800', color: '#0F172A', letterSpacing: scaleFont(-0.5), fontFamily: 'Outfit_800ExtraBold' },
    cardSubTitle: { fontSize: scaleFont(11), color: '#94A3B8', fontWeight: '700', marginTop: scaleFont(3), textTransform: 'uppercase', letterSpacing: scaleFont(0.5), fontFamily: 'Outfit_700Bold' },
    statusBadge: { paddingHorizontal: 0, paddingVertical: 0, borderRadius: 0 },
    bgSuccess: { backgroundColor: 'transparent' },
    bgActive: { backgroundColor: 'transparent' },
    textSuccess: { color: '#10B981', fontSize: scaleFont(12), fontWeight: '900', fontFamily: 'Outfit_800ExtraBold' },
    textActive: { color: '#4F46E5', fontSize: scaleFont(12), fontWeight: '900', fontFamily: 'Outfit_800ExtraBold' },
    statusText: { letterSpacing: scaleFont(1) },
    sectionLabel: { fontSize: scaleFont(10), fontWeight: '900', color: '#CBD5E1', textTransform: 'uppercase', letterSpacing: scaleFont(1.5), marginBottom: scaleFont(14), fontFamily: 'Outfit_800ExtraBold' },
    storyGraph: { flexDirection: 'row', flexWrap: 'wrap', gap: scaleFont(6), marginBottom: scaleFont(28) },
    storyBlock: { width: scaleFont(20), height: scaleFont(20), borderRadius: scaleFont(6) },
    blockGreen: { backgroundColor: '#10B981' },
    blockRed: { backgroundColor: '#EF4444' },
    blockGray: { backgroundColor: 'rgba(0,0,0,0.05)' },
    statsGrid: { flexDirection: 'row', alignItems: 'center', marginTop: scaleFont(10), marginBottom: scaleFont(10) },
    statBox: { flex: 1, alignItems: 'flex-start' },
    statLabel: { fontSize: scaleFont(9), fontWeight: '800', color: '#94A3B8', marginBottom: scaleFont(4), letterSpacing: scaleFont(1), fontFamily: 'Outfit_800ExtraBold' },
    statValue: { fontSize: scaleFont(18), fontWeight: '900', fontFamily: 'Outfit_800ExtraBold' },
    emptyState: { paddingTop: scaleFont(60), alignItems: 'center', paddingHorizontal: scaleFont(40) },
    emptyIconCircle: { width: scaleFont(88), height: scaleFont(88), borderRadius: scaleFont(44), backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', marginBottom: scaleFont(28), elevation: scaleFont(8), shadowColor: '#000', shadowOffset: { width: 0, height: scaleFont(8) }, shadowOpacity: 0.1, shadowRadius: scaleFont(12) },
    emptyText: { fontSize: scaleFont(16), color: '#64748B', fontWeight: '600', textAlign: 'center', lineHeight: scaleFont(24), marginBottom: scaleFont(32), fontFamily: 'Outfit_700Bold' },
    createFirstBtn: { backgroundColor: '#0F172A', paddingVertical: scaleFont(18), paddingHorizontal: scaleFont(36), borderRadius: scaleFont(24), elevation: scaleFont(12), shadowColor: '#000', shadowOffset: { width: 0, height: scaleFont(10) }, shadowOpacity: 0.2, shadowRadius: scaleFont(15) },
    createFirstText: { color: '#FFFFFF', fontSize: scaleFont(16), fontWeight: '800', letterSpacing: scaleFont(0.5), fontFamily: 'Outfit_800ExtraBold' }
});
