import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Platform,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { GridOverlay } from '../../components/LuxuryVisuals';
import { useAlert } from '../../context/AlertContext';
import { supabase } from '../../lib/supabase';
import { scaleFont } from '../../utils/layout';

interface PromiseData {
    id: string;
    title: string;
    created_at: string;
    duration_days: number;
    number_of_people: number;
    commitment_level?: string;
    locked_points?: number;
    status: string;
}

interface PPSummary {
    pointsLocked: number;
    pointsEarned: number;
    pointsLost: number;
    netResult: number;
    daysCompleted: number;
    daysFailed: number;
    totalDays: number;
}

export default function PromiseReportScreen() {
    const router = useRouter();
    const { showAlert } = useAlert();
    const params = useLocalSearchParams();
    const promiseId = params.promiseId as string;

    const [loading, setLoading] = useState(true);
    const [promiseData, setPromiseData] = useState<PromiseData | null>(null);
    const [ppSummary, setPpSummary] = useState<PPSummary>({
        pointsLocked: 0,
        pointsEarned: 0,
        pointsLost: 0,
        netResult: 0,
        daysCompleted: 0,
        daysFailed: 0,
        totalDays: 0,
    });
    const [participantResults, setParticipantResults] = useState<any[]>([]);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchReportData().then(() => setRefreshing(false));
    }, [promiseId]);

    useEffect(() => {
        if (promiseId) {
            fetchReportData();
        }
    }, [promiseId]);

    const fetchReportData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setCurrentUserId(user.id);

            // 1. Fetch Promise Details
            const { data: promise, error: promiseError } = await supabase
                .from('promises')
                .select('*')
                .eq('id', promiseId)
                .single();

            if (promiseError) throw promiseError;
            setPromiseData(promise);

            const lockedPoints = promise.locked_points || 10;
            const commitmentLevel = promise.commitment_level || 'medium';

            // 2. Fetch user's submissions for this promise
            const { data: submissions } = await supabase
                .from('promise_submissions')
                .select('date, status')
                .eq('promise_id', promiseId)
                .eq('user_id', user.id);

            const daysCompleted = submissions?.filter(s => s.status === 'verified').length || 0;
            const daysFailed = submissions?.filter(s => s.status === 'rejected' || s.status === 'manual_fail').length || 0;
            const totalDays = promise.duration_days;

            // Calculate PP outcome based on commitment level
            const ppPerDay = lockedPoints / totalDays;
            const pointsEarned = daysCompleted * ppPerDay * 2; // Earn double per successful day
            const pointsLost = daysFailed * ppPerDay;
            const netResult = pointsEarned - pointsLost;

            setPpSummary({
                pointsLocked: lockedPoints,
                pointsEarned: Math.round(pointsEarned),
                pointsLost: Math.round(pointsLost),
                netResult: Math.round(netResult),
                daysCompleted,
                daysFailed,
                totalDays,
            });

            // 3. Fetch all participant results
            const { data: participants } = await supabase
                .from('promise_participants')
                .select('user_id')
                .eq('promise_id', promiseId);

            if (participants && participants.length > 0) {
                const userIds = participants.map(p => p.user_id);

                // Fetch names
                const { data: names } = await supabase.rpc('get_user_names', { user_ids: userIds });
                const nameMap: Record<string, string> = {};
                if (names) {
                    names.forEach((n: any) => { nameMap[n.user_id] = n.full_name?.split(' ')[0] || 'User'; });
                }

                // Fetch each participant's submissions
                const results = [];
                for (const pid of userIds) {
                    const { data: pSubs } = await supabase
                        .from('promise_submissions')
                        .select('status')
                        .eq('promise_id', promiseId)
                        .eq('user_id', pid);

                    const completed = pSubs?.filter(s => s.status === 'verified').length || 0;
                    const failed = pSubs?.filter(s => s.status === 'rejected').length || 0;
                    const completionRate = totalDays > 0 ? Math.round((completed / totalDays) * 100) : 0;

                    results.push({
                        userId: pid,
                        name: nameMap[pid] || 'User',
                        daysCompleted: completed,
                        daysFailed: failed,
                        completionRate,
                        isCurrentUser: pid === user.id,
                    });
                }

                // Sort by completion rate (highest first)
                results.sort((a, b) => b.completionRate - a.completionRate);
                setParticipantResults(results);
            }

        } catch (error) {
            console.error('[fetchReportData] Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const getEndDate = (startDate: string, durationDays: number) => {
        const start = new Date(startDate);
        const end = new Date(start);
        end.setDate(start.getDate() + durationDays - 1);
        return formatDate(end.toISOString());
    };

    const getCommitmentLabel = (level?: string) => {
        switch (level) {
            case 'low': return 'Low';
            case 'high': return 'High';
            default: return 'Steady';
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.centerContent}>
                    <ActivityIndicator size="large" color="#4338ca" />
                </View>
            </SafeAreaView>
        );
    }

    if (!promiseData) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.centerContent}>
                    <Text style={styles.errorText}>Promise not found.</Text>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButtonAlt}>
                        <Text style={styles.backButtonText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const isGain = ppSummary.netResult >= 0;

    return (
        <View style={styles.container}>
            <GridOverlay />
            <SafeAreaView style={{ flex: 1 }}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#1E293B" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Promise Report</Text>
                    <View style={{ width: scaleFont(44) }} />
                </View>

                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#5B2DAD" />
                    }
                >
                    {/* DASHBOARD HERO */}
                    <Animated.View entering={FadeInDown.duration(800).springify()}>
                        <LinearGradient
                            colors={['#5B2DAD', '#7C3AED']}
                            style={styles.heroCard}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <View style={styles.heroOverlay}>
                                <Ionicons name="analytics" size={100} color="rgba(255,255,255,0.1)" style={styles.bgIcon} />
                                <View style={styles.heroContent}>
                                    <View style={[styles.statusBadge, promiseData.status === 'completed' ? styles.badgeSuccess : styles.badgeError]}>
                                        <Text style={styles.statusLabel}>
                                            {promiseData.status.toUpperCase()}
                                        </Text>
                                    </View>
                                    <Text style={styles.heroPromiseTitle}>{promiseData.title}</Text>
                                    <Text style={styles.heroDateRange}>
                                        {formatDate(promiseData.created_at)} — {getEndDate(promiseData.created_at, promiseData.duration_days)}
                                    </Text>
                                </View>
                            </View>
                        </LinearGradient>
                    </Animated.View>

                    {/* PP OUTCOME CARDS */}
                    <View style={styles.financialContainer}>
                        <Animated.View
                            entering={FadeInDown.delay(200).duration(800).springify()}
                            style={[styles.smallCard, { backgroundColor: '#FEF3C7', borderColor: '#FCD34D' }]}
                        >
                            <Ionicons name="lock-closed" size={20} color="#D97706" />
                            <Text style={styles.smallCardLabel}>PP Locked</Text>
                            <Text style={[styles.smallCardValue, { color: '#D97706' }]}>{ppSummary.pointsLocked}</Text>
                        </Animated.View>

                        <Animated.View
                            entering={FadeInDown.delay(300).duration(800).springify()}
                            style={[styles.smallCard, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}
                        >
                            <Ionicons name="arrow-up-circle" size={20} color="#15803D" />
                            <Text style={styles.smallCardLabel}>PP Earned</Text>
                            <Text style={[styles.smallCardValue, { color: '#15803D' }]}>{ppSummary.pointsEarned}</Text>
                        </Animated.View>
                    </View>

                    {/* NET PP RESULT */}
                    <Animated.View
                        entering={FadeInDown.delay(400).duration(800).springify()}
                        style={styles.netResultCard}
                    >
                        <View style={styles.netInfo}>
                            <Text style={styles.netResultLabel}>Net Promise Points</Text>
                            <Text style={[styles.netResultValue, { color: isGain ? '#15803D' : '#B91C1C' }]}>
                                {isGain ? '+' : ''}{ppSummary.netResult} PP
                            </Text>
                        </View>
                        <View style={[styles.netIndicator, { backgroundColor: isGain ? '#15803D' : '#B91C1C' }]}>
                            <Text style={styles.netIndicatorText}>{isGain ? 'GAINED' : 'LOST'}</Text>
                        </View>
                    </Animated.View>

                    {/* PROGRESS BREAKDOWN */}
                    <Animated.View
                        entering={FadeInDown.delay(500).duration(800).springify()}
                        style={styles.progressSection}
                    >
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Your Progress</Text>
                            <View style={styles.titleLine} />
                        </View>

                        <View style={styles.progressGrid}>
                            <View style={styles.progressItem}>
                                <Ionicons name="checkmark-circle" size={28} color="#10B981" />
                                <Text style={styles.progressValue}>{ppSummary.daysCompleted}</Text>
                                <Text style={styles.progressLabel}>Days Done</Text>
                            </View>
                            <View style={styles.progressDivider} />
                            <View style={styles.progressItem}>
                                <Ionicons name="close-circle" size={28} color="#EF4444" />
                                <Text style={styles.progressValue}>{ppSummary.daysFailed}</Text>
                                <Text style={styles.progressLabel}>Days Missed</Text>
                            </View>
                            <View style={styles.progressDivider} />
                            <View style={styles.progressItem}>
                                <Ionicons name="calendar" size={28} color="#6366F1" />
                                <Text style={styles.progressValue}>{ppSummary.totalDays}</Text>
                                <Text style={styles.progressLabel}>Total Days</Text>
                            </View>
                        </View>

                        {/* Completion Bar */}
                        <View style={styles.completionBarContainer}>
                            <View style={styles.completionBarBg}>
                                <View
                                    style={[
                                        styles.completionBarFill,
                                        {
                                            width: `${ppSummary.totalDays > 0 ? (ppSummary.daysCompleted / ppSummary.totalDays) * 100 : 0}%`,
                                            backgroundColor: ppSummary.daysCompleted >= ppSummary.totalDays * 0.7 ? '#10B981' : '#F59E0B'
                                        }
                                    ]}
                                />
                            </View>
                            <Text style={styles.completionPercent}>
                                {ppSummary.totalDays > 0 ? Math.round((ppSummary.daysCompleted / ppSummary.totalDays) * 100) : 0}% Complete
                            </Text>
                        </View>
                    </Animated.View>

                    {/* PARTICIPANT RESULTS */}
                    {participantResults.length > 1 && (
                        <Animated.View
                            entering={FadeInDown.delay(600).duration(800).springify()}
                            style={styles.participantSection}
                        >
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>Team Results</Text>
                                <View style={styles.titleLine} />
                            </View>

                            {participantResults.map((p, index) => (
                                <View key={p.userId} style={[styles.participantRow, p.isCurrentUser && styles.currentUserRow]}>
                                    <View style={styles.participantRank}>
                                        <Text style={styles.rankText}>{index + 1}</Text>
                                    </View>
                                    <View style={styles.participantAvatar}>
                                        <Text style={styles.avatarChar}>{p.name.charAt(0)}</Text>
                                    </View>
                                    <View style={styles.participantInfo}>
                                        <Text style={[styles.participantName, p.isCurrentUser && { fontWeight: '800' }]}>
                                            {p.name} {p.isCurrentUser ? '(You)' : ''}
                                        </Text>
                                        <Text style={styles.participantStats}>
                                            {p.daysCompleted}/{ppSummary.totalDays} days · {p.completionRate}%
                                        </Text>
                                    </View>
                                    <View style={[
                                        styles.rateBadge,
                                        { backgroundColor: p.completionRate >= 70 ? '#ECFDF5' : (p.completionRate >= 40 ? '#FEF9C3' : '#FEF2F2') }
                                    ]}>
                                        <Text style={[
                                            styles.rateText,
                                            { color: p.completionRate >= 70 ? '#059669' : (p.completionRate >= 40 ? '#CA8A04' : '#DC2626') }
                                        ]}>
                                            {p.completionRate}%
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </Animated.View>
                    )}

                    {/* STATS TABLE */}
                    <Animated.View
                        entering={FadeInUp.delay(700).duration(800)}
                        style={styles.statsTable}
                    >
                        <View style={styles.statRow}>
                            <Text style={styles.statKey}>Cycle Length</Text>
                            <Text style={styles.statVal}>{promiseData.duration_days} Days</Text>
                        </View>
                        <View style={styles.statRow}>
                            <Text style={styles.statKey}>Team Size</Text>
                            <Text style={styles.statVal}>{promiseData.number_of_people} Peers</Text>
                        </View>
                        <View style={styles.statRow}>
                            <Text style={styles.statKey}>Commitment Level</Text>
                            <Text style={styles.statVal}>{getCommitmentLabel(promiseData.commitment_level)}</Text>
                        </View>
                        <View style={styles.statRow}>
                            <Text style={styles.statKey}>PP Locked</Text>
                            <Text style={styles.statVal}>{promiseData.locked_points || 10} PP</Text>
                        </View>
                    </Animated.View>

                    <View style={styles.footerSpacing} />
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: scaleFont(24),
        paddingTop: Platform.OS === 'android' ? scaleFont(48) : scaleFont(16),
        paddingBottom: scaleFont(16),
        backgroundColor: '#FFF',
    },
    backButton: {
        padding: scaleFont(8),
        backgroundColor: '#F1F5F9',
        borderRadius: scaleFont(12),
    },
    headerTitle: {
        fontSize: scaleFont(18),
        fontWeight: '800',
        color: '#1E293B',
        letterSpacing: scaleFont(-0.5),
        fontFamily: 'Outfit_800ExtraBold',
    },
    scrollContent: {
        paddingHorizontal: scaleFont(20),
        paddingBottom: scaleFont(40),
    },
    heroCard: {
        height: scaleFont(180),
        borderRadius: scaleFont(24),
        overflow: 'hidden',
        marginBottom: scaleFont(24),
        elevation: scaleFont(10),
        shadowColor: '#5B2DAD',
        shadowOffset: { width: 0, height: scaleFont(10) },
        shadowOpacity: 0.3,
        shadowRadius: scaleFont(20),
    },
    heroOverlay: {
        flex: 1,
        padding: scaleFont(24),
        justifyContent: 'flex-end',
    },
    bgIcon: {
        position: 'absolute',
        right: scaleFont(-10),
        top: scaleFont(-10),
    },
    heroContent: {
        gap: scaleFont(8),
    },
    statusBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: scaleFont(12),
        paddingVertical: scaleFont(4),
        borderRadius: scaleFont(20),
    },
    badgeSuccess: {
        backgroundColor: 'rgba(16, 185, 129, 0.3)',
    },
    badgeError: {
        backgroundColor: 'rgba(239, 68, 68, 0.3)',
    },
    statusLabel: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: scaleFont(11),
        letterSpacing: 1,
        fontFamily: 'Outfit_700Bold',
    },
    heroPromiseTitle: {
        fontSize: scaleFont(22),
        fontWeight: '800',
        color: '#FFF',
        fontFamily: 'Outfit_800ExtraBold',
    },
    heroDateRange: {
        fontSize: scaleFont(12),
        color: 'rgba(255,255,255,0.7)',
        fontFamily: 'Outfit_600SemiBold',
    },
    financialContainer: {
        flexDirection: 'row',
        gap: scaleFont(12),
        marginBottom: scaleFont(16),
    },
    smallCard: {
        flex: 1,
        padding: scaleFont(16),
        borderRadius: scaleFont(16),
        borderWidth: 1,
        alignItems: 'center',
        gap: scaleFont(6),
    },
    smallCardLabel: {
        fontSize: scaleFont(11),
        fontWeight: '700',
        color: '#64748B',
        letterSpacing: 0.5,
        fontFamily: 'Outfit_700Bold',
    },
    smallCardValue: {
        fontSize: scaleFont(24),
        fontWeight: '800',
        fontFamily: 'Outfit_800ExtraBold',
    },
    netResultCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F8FAFC',
        padding: scaleFont(20),
        borderRadius: scaleFont(16),
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginBottom: scaleFont(24),
    },
    netInfo: {
        gap: scaleFont(4),
    },
    netResultLabel: {
        fontSize: scaleFont(12),
        fontWeight: '600',
        color: '#64748B',
        fontFamily: 'Outfit_600SemiBold',
    },
    netResultValue: {
        fontSize: scaleFont(28),
        fontWeight: '900',
        fontFamily: 'Outfit_800ExtraBold',
    },
    netIndicator: {
        paddingHorizontal: scaleFont(16),
        paddingVertical: scaleFont(8),
        borderRadius: scaleFont(12),
    },
    netIndicatorText: {
        color: '#FFF',
        fontWeight: '800',
        fontSize: scaleFont(12),
        letterSpacing: 1,
        fontFamily: 'Outfit_800ExtraBold',
    },
    progressSection: {
        marginBottom: scaleFont(24),
    },
    sectionHeader: {
        marginBottom: scaleFont(16),
    },
    sectionTitle: {
        fontSize: scaleFont(16),
        fontWeight: '800',
        color: '#1E293B',
        fontFamily: 'Outfit_800ExtraBold',
    },
    titleLine: {
        width: scaleFont(40),
        height: 3,
        backgroundColor: '#5B2DAD',
        borderRadius: 2,
        marginTop: scaleFont(6),
    },
    progressGrid: {
        flexDirection: 'row',
        backgroundColor: '#F8FAFC',
        borderRadius: scaleFont(16),
        padding: scaleFont(20),
        borderWidth: 1,
        borderColor: '#E2E8F0',
        alignItems: 'center',
    },
    progressItem: {
        flex: 1,
        alignItems: 'center',
        gap: scaleFont(6),
    },
    progressDivider: {
        width: 1,
        height: scaleFont(50),
        backgroundColor: '#E2E8F0',
    },
    progressValue: {
        fontSize: scaleFont(22),
        fontWeight: '800',
        color: '#1E293B',
        fontFamily: 'Outfit_800ExtraBold',
    },
    progressLabel: {
        fontSize: scaleFont(11),
        fontWeight: '600',
        color: '#64748B',
        fontFamily: 'Outfit_600SemiBold',
    },
    completionBarContainer: {
        marginTop: scaleFont(16),
        gap: scaleFont(8),
    },
    completionBarBg: {
        height: scaleFont(8),
        backgroundColor: '#E2E8F0',
        borderRadius: scaleFont(4),
        overflow: 'hidden',
    },
    completionBarFill: {
        height: '100%',
        borderRadius: scaleFont(4),
    },
    completionPercent: {
        fontSize: scaleFont(12),
        fontWeight: '700',
        color: '#64748B',
        textAlign: 'right',
        fontFamily: 'Outfit_700Bold',
    },
    participantSection: {
        marginBottom: scaleFont(24),
    },
    participantRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: scaleFont(14),
        backgroundColor: '#F8FAFC',
        borderRadius: scaleFont(14),
        marginBottom: scaleFont(8),
        borderWidth: 1,
        borderColor: '#E2E8F0',
        gap: scaleFont(12),
    },
    currentUserRow: {
        backgroundColor: '#EEF2FF',
        borderColor: '#C7D2FE',
    },
    participantRank: {
        width: scaleFont(28),
        height: scaleFont(28),
        borderRadius: scaleFont(14),
        backgroundColor: '#E2E8F0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    rankText: {
        fontSize: scaleFont(12),
        fontWeight: '800',
        color: '#64748B',
        fontFamily: 'Outfit_800ExtraBold',
    },
    participantAvatar: {
        width: scaleFont(36),
        height: scaleFont(36),
        borderRadius: scaleFont(18),
        backgroundColor: '#DDD6FE',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarChar: {
        fontSize: scaleFont(14),
        fontWeight: '800',
        color: '#5B2DAD',
        fontFamily: 'Outfit_800ExtraBold',
    },
    participantInfo: {
        flex: 1,
        gap: scaleFont(2),
    },
    participantName: {
        fontSize: scaleFont(14),
        fontWeight: '600',
        color: '#1E293B',
        fontFamily: 'Outfit_600SemiBold',
    },
    participantStats: {
        fontSize: scaleFont(11),
        color: '#64748B',
        fontFamily: 'Outfit_600SemiBold',
    },
    rateBadge: {
        paddingHorizontal: scaleFont(10),
        paddingVertical: scaleFont(4),
        borderRadius: scaleFont(8),
    },
    rateText: {
        fontSize: scaleFont(12),
        fontWeight: '800',
        fontFamily: 'Outfit_800ExtraBold',
    },
    statsTable: {
        backgroundColor: '#F8FAFC',
        borderRadius: scaleFont(16),
        padding: scaleFont(20),
        borderWidth: 1,
        borderColor: '#E2E8F0',
        gap: scaleFont(16),
    },
    statRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statKey: {
        fontSize: scaleFont(13),
        fontWeight: '600',
        color: '#64748B',
        fontFamily: 'Outfit_600SemiBold',
    },
    statVal: {
        fontSize: scaleFont(13),
        fontWeight: '700',
        color: '#1E293B',
        fontFamily: 'Outfit_700Bold',
    },
    footerSpacing: {
        height: scaleFont(40),
    },
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        fontSize: scaleFont(16),
        color: '#64748B',
        marginBottom: scaleFont(20),
        fontFamily: 'Outfit_600SemiBold',
    },
    backButtonAlt: {
        backgroundColor: '#5B2DAD',
        paddingHorizontal: scaleFont(24),
        paddingVertical: scaleFont(12),
        borderRadius: scaleFont(12),
    },
    backButtonText: {
        color: '#FFF',
        fontWeight: '700',
        fontFamily: 'Outfit_700Bold',
    },
});
