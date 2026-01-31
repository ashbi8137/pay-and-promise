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
    useColorScheme
} from 'react-native';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { Colors } from '../../constants/theme';
import { supabase } from '../../lib/supabase';

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
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];
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
            <LinearGradient colors={['#F8FAFC', '#F1F5F9']} style={StyleSheet.absoluteFill} />

            <SafeAreaView style={{ flex: 1 }}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                        <Ionicons name="chevron-back" size={24} color="#1E293B" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Executive Journey</Text>
                    <View style={{ width: 44 }} />
                </View>

                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" />}
                >
                    {!loading && history.length > 0 && (
                        <Animated.View entering={FadeInDown.duration(800)} style={styles.impactCardWrapper}>
                            <LinearGradient
                                colors={['#4F46E5', '#7C3AED']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.impactCard}
                            >
                                <Ionicons name="infinite" size={120} color="rgba(255,255,255,0.1)" style={styles.impactBgIcon} />
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

                    {loading ? (
                        <View style={styles.loaderContainer}>
                            <ActivityIndicator size="large" color="#4F46E5" />
                        </View>
                    ) : (
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
                                            <View style={styles.card}>
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

                                                {isFullyCompleted && (
                                                    <TouchableOpacity
                                                        activeOpacity={0.7}
                                                        style={styles.viewReportBtn}
                                                        onPress={() => {
                                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                                            router.push({
                                                                pathname: '/screens/PromiseReportScreen',
                                                                params: { promiseId: item.id }
                                                            });
                                                        }}
                                                    >
                                                        <Text style={styles.viewReportText}>Analyze Final Report</Text>
                                                        <Ionicons name="analytics" size={16} color="#4F46E5" />
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                        </Animated.View>
                                    </View>
                                );
                            })}
                            {history.length === 0 && (
                                <View style={styles.emptyState}>
                                    <View style={styles.emptyIconCircle}>
                                        <Ionicons name="trail-sign-outline" size={40} color="#94A3B8" />
                                    </View>
                                    <Text style={styles.emptyText}>Your legacy begins with your first promise.</Text>
                                    <TouchableOpacity
                                        style={styles.createFirstBtn}
                                        onPress={() => router.push('/(tabs)/create')}
                                    >
                                        <Text style={styles.createFirstText}>Forge New Promise</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    )}
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 40 : 10, paddingBottom: 16 },
    backButton: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B', letterSpacing: -0.5 },
    scrollContent: { padding: 20 },
    impactCardWrapper: { marginBottom: 32, borderRadius: 28, overflow: 'hidden', elevation: 12, shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20 },
    impactCard: { padding: 24 },
    impactBgIcon: { position: 'absolute', bottom: -20, right: -20 },
    impactLabel: { fontSize: 10, fontWeight: '900', color: 'rgba(255,255,255,0.6)', letterSpacing: 2, marginBottom: 20, textAlign: 'center' },
    impactGrid: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    impactItem: { flex: 1, alignItems: 'center' },
    impactVal: { fontSize: 24, fontWeight: '900', color: '#FFF', marginBottom: 4 },
    impactSub: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '700' },
    impactDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.1)' },
    loaderContainer: { marginTop: 100, alignItems: 'center' },
    timeline: { flex: 1 },
    timelineItem: { flexDirection: 'row', marginBottom: 24 },
    dateColumn: { width: 65, alignItems: 'flex-start' },
    dateText: { fontSize: 10, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 8 },
    lineTrack: { flex: 1, alignItems: 'center', width: 20 },
    lineNode: { width: 12, height: 12, borderRadius: 6, zIndex: 2, borderWidth: 2, borderColor: '#FFFFFF' },
    lineConnector: { position: 'absolute', top: 10, width: 2, bottom: -30, backgroundColor: '#F1F5F9', zIndex: 1 },
    cardContainer: { flex: 1 },
    card: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
    cardTitle: { fontSize: 17, fontWeight: '800', color: '#1E293B', letterSpacing: -0.5 },
    cardSubTitle: { fontSize: 12, color: '#94A3B8', fontWeight: '600', marginTop: 2 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
    bgSuccess: { backgroundColor: '#F0FDF4' },
    bgActive: { backgroundColor: '#EEF2FF' },
    textSuccess: { color: '#10B981', fontSize: 10, fontWeight: '900' },
    textActive: { color: '#4F46E5', fontSize: 10, fontWeight: '900' },
    statusText: { letterSpacing: 1 },
    sectionLabel: { fontSize: 10, fontWeight: '800', color: '#CBD5E1', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
    storyGraph: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 24 },
    storyBlock: { width: 18, height: 18, borderRadius: 5 },
    blockGreen: { backgroundColor: '#10B981' },
    blockRed: { backgroundColor: '#EF4444' },
    blockGray: { backgroundColor: '#F1F5F9' },
    statsGrid: { flexDirection: 'row', backgroundColor: '#F8FAFC', borderRadius: 20, padding: 16, marginBottom: 20 },
    statBox: { flex: 1, alignItems: 'center' },
    statLabel: { fontSize: 9, fontWeight: '800', color: '#94A3B8', marginBottom: 4 },
    statValue: { fontSize: 16, fontWeight: '900' },
    viewReportBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 18, backgroundColor: '#EEF2FF', gap: 10 },
    viewReportText: { fontSize: 14, fontWeight: '800', color: '#4F46E5' },
    emptyState: { paddingTop: 80, alignItems: 'center', paddingHorizontal: 40 },
    emptyIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: '#F1F5F9' },
    emptyText: { fontSize: 15, color: '#64748B', fontWeight: '600', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
    createFirstBtn: { backgroundColor: '#1E293B', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 20, elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10 },
    createFirstText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' }
});
