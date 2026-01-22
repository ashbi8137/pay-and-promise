import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { supabase } from '../../lib/supabase';

interface PromiseData {
    id: string;
    title: string;
    created_at: string;
    duration_days: number;
    number_of_people: number;
    amount_per_person: number;
    status: string;
}

interface FinancialSummary {
    totalPaid: number;
    totalEarned: number;
    netResult: number;
}

export default function PromiseReportScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();

    const [loading, setLoading] = useState(true);
    const [promiseData, setPromiseData] = useState<PromiseData | null>(null);
    const [financials, setFinancials] = useState<FinancialSummary>({
        totalPaid: 0,
        totalEarned: 0,
        netResult: 0
    });
    const [participantNames, setParticipantNames] = useState<Record<string, string>>({});

    // Parse promise from params
    const promiseId = params.promiseId as string;

    useEffect(() => {
        if (promiseId) {
            fetchReportData();
        }
    }, [promiseId]);

    const fetchReportData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Fetch Promise Details
            const { data: promise, error: promiseError } = await supabase
                .from('promises')
                .select('*')
                .eq('id', promiseId)
                .single();

            if (promiseError) throw promiseError;
            setPromiseData(promise);

            // 2. Fetch User's Ledger for this Promise
            const { data: ledger, error: ledgerError } = await supabase
                .from('ledger')
                .select('amount, type, description')
                .eq('promise_id', promiseId)
                .eq('user_id', user.id);

            if (ledgerError) throw ledgerError;

            if (ledger) {
                let totalPaid = 0;
                let totalEarned = 0;

                ledger.forEach(item => {
                    const val = Number(item.amount);
                    if (item.type === 'winnings') {
                        totalEarned += val;
                    }
                    if (item.type === 'penalty') {
                        totalPaid += Math.abs(val);
                    }
                });

                setFinancials({
                    totalPaid,
                    totalEarned,
                    netResult: totalEarned - totalPaid
                });
            }

            // 3. Fetch Participant Names for settlement info
            const { data: participants } = await supabase
                .from('promise_participants')
                .select('user_id')
                .eq('promise_id', promiseId);

            if (participants && participants.length > 0) {
                const userIds = participants.map(p => p.user_id);
                const { data: names } = await supabase
                    .rpc('get_user_names', { user_ids: userIds });

                if (names) {
                    const nameMap: Record<string, string> = {};
                    names.forEach((n: any) => {
                        nameMap[n.user_id] = n.full_name?.split(' ')[0] || 'User';
                    });
                    setParticipantNames(nameMap);
                }
            }

        } catch (error) {
            console.error('Error fetching report data:', error);
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

    const isGain = financials.netResult >= 0;

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#0F172A" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Promise Report</Text>
                    <View style={{ width: 40 }} />
                </View>

                {/* Promise Info Card */}
                <View style={styles.infoCard}>
                    <View style={styles.infoHeader}>
                        <Ionicons name="trophy" size={32} color="#4F46E5" />
                        <View style={{ marginLeft: 12, flex: 1 }}>
                            <Text style={styles.promiseTitle}>{promiseData.title}</Text>
                            <Text style={styles.dateRange}>
                                {formatDate(promiseData.created_at)} → {getEndDate(promiseData.created_at, promiseData.duration_days)}
                            </Text>
                        </View>
                    </View>
                    <View style={[
                        styles.statusBadge,
                        promiseData.status === 'completed' ? styles.badgeCompleted : styles.badgeFailed
                    ]}>
                        <Text style={[
                            styles.statusText,
                            promiseData.status === 'completed' ? styles.textCompleted : styles.textFailed
                        ]}>
                            {promiseData.status === 'completed' ? 'Completed' : 'Failed'}
                        </Text>
                    </View>
                </View>

                {/* Financial Summary */}
                <View style={styles.summaryCard}>
                    <Text style={styles.sectionTitle}>Financial Summary</Text>

                    <View style={styles.summaryRow}>
                        <View style={styles.summaryItem}>
                            <View style={[styles.iconCircle, styles.iconRed]}>
                                <Ionicons name="arrow-down" size={18} color="#991B1B" />
                            </View>
                            <View>
                                <Text style={styles.summaryLabel}>Total Paid</Text>
                                <Text style={[styles.summaryValue, { color: '#991B1B' }]}>
                                    ₹{financials.totalPaid.toFixed(0)}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.summaryItem}>
                            <View style={[styles.iconCircle, styles.iconGreen]}>
                                <Ionicons name="arrow-up" size={18} color="#166534" />
                            </View>
                            <View>
                                <Text style={styles.summaryLabel}>Total Earned</Text>
                                <Text style={[styles.summaryValue, { color: '#166534' }]}>
                                    ₹{financials.totalEarned.toFixed(0)}
                                </Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    {/* Net Result */}
                    <View style={styles.netResultContainer}>
                        <Text style={styles.netLabel}>Net Result</Text>
                        <Text style={[
                            styles.netValue,
                            { color: isGain ? '#166534' : '#991B1B' }
                        ]}>
                            {isGain ? '+' : '-'} ₹{Math.abs(financials.netResult).toFixed(0)}
                        </Text>
                        <Text style={[styles.netBadge, { backgroundColor: isGain ? '#DCFCE7' : '#FEE2E2', color: isGain ? '#166534' : '#991B1B' }]}>
                            {isGain ? 'Net Gain' : 'Net Loss'}
                        </Text>
                    </View>
                </View>

                {/* Settlement Info */}
                <View style={styles.settlementCard}>
                    <View style={styles.settlementHeader}>
                        <Ionicons name="swap-horizontal" size={24} color="#4F46E5" />
                        <Text style={styles.settlementTitle}>Settlement</Text>
                    </View>

                    {financials.netResult === 0 ? (
                        <View style={styles.settlementContent}>
                            <Text style={styles.settlementText}>
                                No settlement required. You broke even!
                            </Text>
                        </View>
                    ) : isGain ? (
                        <View style={styles.settlementContent}>
                            <View style={[styles.settlementBadge, { backgroundColor: '#DCFCE7' }]}>
                                <Ionicons name="cash-outline" size={20} color="#166534" />
                            </View>
                            <Text style={styles.settlementText}>
                                You are owed{' '}
                                <Text style={[styles.settlementAmount, { color: '#166534' }]}>
                                    ₹{financials.netResult.toFixed(0)}
                                </Text>
                                {'\n'}from the pool
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.settlementContent}>
                            <View style={[styles.settlementBadge, { backgroundColor: '#FEE2E2' }]}>
                                <Ionicons name="wallet-outline" size={20} color="#991B1B" />
                            </View>
                            <Text style={styles.settlementText}>
                                You owe{' '}
                                <Text style={[styles.settlementAmount, { color: '#991B1B' }]}>
                                    ₹{Math.abs(financials.netResult).toFixed(0)}
                                </Text>
                                {'\n'}to the pool
                            </Text>
                        </View>
                    )}
                </View>

                {/* Promise Stats */}
                <View style={styles.statsCard}>
                    <View style={styles.statRow}>
                        <Text style={styles.statLabel}>Duration</Text>
                        <Text style={styles.statValue}>{promiseData.duration_days} days</Text>
                    </View>
                    <View style={styles.statRow}>
                        <Text style={styles.statLabel}>Participants</Text>
                        <Text style={styles.statValue}>{promiseData.number_of_people}</Text>
                    </View>
                    <View style={styles.statRow}>
                        <Text style={styles.statLabel}>Stake per Person</Text>
                        <Text style={styles.statValue}>₹{promiseData.amount_per_person}</Text>
                    </View>
                </View>

                {/* Trust Footer */}
                <View style={styles.trustFooter}>
                    <Ionicons name="shield-checkmark-outline" size={14} color="#94A3B8" />
                    <Text style={styles.trustText}>All amounts calculated from verified transactions</Text>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        padding: 24,
        paddingTop: Platform.OS === 'android' ? 80 : 60,
        paddingBottom: 40,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    backButton: {
        padding: 8,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0F172A',
    },
    errorText: {
        fontSize: 16,
        color: '#64748B',
        marginBottom: 16,
    },
    backButtonAlt: {
        padding: 12,
        backgroundColor: '#4F46E5',
        borderRadius: 12,
    },
    backButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    infoCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    infoHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    promiseTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 4,
    },
    dateRange: {
        fontSize: 14,
        color: '#64748B',
        fontWeight: '500',
    },
    statusBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    badgeCompleted: {
        backgroundColor: '#DCFCE7',
    },
    badgeFailed: {
        backgroundColor: '#FEE2E2',
    },
    statusText: {
        fontSize: 12,
        fontWeight: '700',
    },
    textCompleted: {
        color: '#166534',
    },
    textFailed: {
        color: '#991B1B',
    },
    summaryCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#334155',
        marginBottom: 16,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    summaryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    iconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconRed: {
        backgroundColor: '#FEE2E2',
    },
    iconGreen: {
        backgroundColor: '#DCFCE7',
    },
    summaryLabel: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '500',
    },
    summaryValue: {
        fontSize: 18,
        fontWeight: '700',
    },
    divider: {
        height: 1,
        backgroundColor: '#F1F5F9',
        marginVertical: 16,
    },
    netResultContainer: {
        alignItems: 'center',
    },
    netLabel: {
        fontSize: 14,
        color: '#64748B',
        fontWeight: '600',
        marginBottom: 4,
    },
    netValue: {
        fontSize: 32,
        fontWeight: '800',
        marginBottom: 8,
    },
    netBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        fontSize: 12,
        fontWeight: '700',
        overflow: 'hidden',
    },
    settlementCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    settlementHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
    },
    settlementTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#334155',
    },
    settlementContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    settlementBadge: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    settlementText: {
        fontSize: 15,
        color: '#334155',
        fontWeight: '500',
        lineHeight: 22,
    },
    settlementAmount: {
        fontSize: 18,
        fontWeight: '800',
    },
    statsCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    statRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    statLabel: {
        fontSize: 14,
        color: '#64748B',
        fontWeight: '500',
    },
    statValue: {
        fontSize: 14,
        color: '#0F172A',
        fontWeight: '600',
    },
    trustFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginTop: 8,
    },
    trustText: {
        fontSize: 12,
        color: '#94A3B8',
        fontWeight: '500',
    },
});
