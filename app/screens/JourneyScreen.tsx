
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { supabase } from '../../lib/supabase';

const { width } = Dimensions.get('window');

interface Checkin {
    promise_id: string;
    status: string; // 'done', 'failed', 'pending'
    date: string;
}

interface JourneyItem {
    id: string;
    title: string;
    created_at: string;
    duration_days: number;
    status: string;
    days_data: string[]; // ['done', 'failed', 'pending', ...]
    winnings: number;
    penalties: number;
    net: number;
}

export default function JourneyScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [history, setHistory] = useState<JourneyItem[]>([]);

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

            // 1. Fetch User's Promises
            const { data: participations } = await supabase
                .from('promise_participants')
                .select('promise_id')
                .eq('user_id', user.id);

            if (!participations || participations.length === 0) {
                setLoading(false);
                return;
            }

            const promiseIds = participations.map(p => p.promise_id);

            // 2. Fetch Promise Metadata
            const { data: promises } = await supabase
                .from('promises')
                .select('*')
                .in('id', promiseIds)
                .order('created_at', { ascending: false });

            if (!promises) {
                setLoading(false);
                return;
            }

            // 3. Fetch Checkins for ALL these promises
            const { data: checkins } = await supabase
                .from('daily_checkins')
                .select('promise_id, status, date')
                .in('promise_id', promiseIds)
                .eq('user_id', user.id);

            // 4. Fetch Ledger for Financials
            const { data: ledger } = await supabase
                .from('ledger')
                .select('amount, type, promise_id')
                .eq('user_id', user.id)
                .in('promise_id', promiseIds);


            // Process Data
            const processed: JourneyItem[] = promises.map(p => {
                // Days Data (The "Story Graph")
                const pCheckins = checkins?.filter(c => c.promise_id === p.id) || [];

                // Construct day-by-day array based on duration
                const daysData: string[] = [];
                let doneCount = 0;
                let failedCount = 0;

                // Sort checkins by date
                pCheckins.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                // We can't perfectly reconstruct the exact sequence if dates are missing, 
                // but we can map existing checkins and fill the rest.
                // Or better: just map the checkins we have.
                // Assuming 1 checkin per day represented.

                // Strategy: Create an array of size 'duration_days'.
                // Fill it with the status of checkins found.
                // This assumes checkins correspond to days 1..N roughly.

                // Actually, the user wants "Done days" and "Failed days".
                // Let's just create a visual representation of the *results*.
                // If there are 5 done and 2 failed, show 5 green blocks and 2 red blocks?
                // Or try to map them to the actual timeline?
                // Let's go with mapping the checkins we found.

                pCheckins.forEach(c => {
                    if (c.status === 'done') daysData.push('done');
                    else if (c.status === 'failed') daysData.push('failed');
                });

                // Fill the rest with 'pending' or 'skipped' if the promise is completed/failed 
                // but checkins are missing (implied failure/skip or just not recorded?).
                // If the promise is OVER, missing checkins usually mean failure in some logic, 
                // but let's stick to what we have recorded to be safe.
                // If the array is shorter than duration_days, maybe pad it?
                // Visual consistency: Let's show up to duration_days blocks.

                while (daysData.length < p.duration_days) {
                    // For completed/failed promises, missing days might imply 'failed' or just 'no_status'
                    // Let's mark them as 'neutral' or check promise status. 
                    // If promise is 'failed', maybe the rest are red?
                    // Let's just leave them empty/gray for visual clarity of what *actually* happened.
                    daysData.push('empty');
                }

                // Financials
                let winnings = 0;
                let penalties = 0;
                const pLedger = ledger?.filter(l => l.promise_id === p.id) || [];
                pLedger.forEach(l => {
                    const amt = Number(l.amount);
                    if (l.type === 'winnings') winnings += amt;
                    if (l.type === 'penalty') penalties += Math.abs(amt);
                });

                return {
                    id: p.id,
                    title: p.title,
                    created_at: p.created_at,
                    duration_days: p.duration_days,
                    status: p.status,
                    days_data: daysData,
                    winnings,
                    penalties,
                    net: winnings - penalties
                };
            });

            setHistory(processed);

        } catch (error) {
            console.error('Error fetching journey:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Your Journey</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {loading ? (
                    <ActivityIndicator size="large" color="#4F46E5" style={{ marginTop: 50 }} />
                ) : (
                    <View style={styles.timeline}>
                        {history.map((item, index) => (
                            <Animated.View
                                key={item.id}
                                entering={FadeInDown.delay(index * 100).springify()}
                                style={styles.timelineItem}
                            >
                                {/* Date Line */}
                                <View style={styles.dateColumn}>
                                    <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
                                    <View style={[
                                        styles.lineNode,
                                        { backgroundColor: item.net >= 0 ? '#10B981' : '#EF4444' }
                                    ]} />
                                    {index !== history.length - 1 && <View style={styles.lineConnector} />}
                                </View>

                                {/* Card */}
                                <View style={styles.cardContainer}>
                                    {(() => {
                                        // LOGIC: Check if Fully Completed
                                        // Note: days_data contains 'done', 'failed', 'empty' etc.
                                        // We assume 'done' + 'failed' + maybe specific 'skipped' = duration? 
                                        // Simpler check: if Status is 'completed' OR 'failed' (meaning time is up) 
                                        // AND we want to check strict duration matching if needed.
                                        // User said: "When completedDays == totalDays".

                                        // Let's count actual recorded days (done + failed)
                                        const totalRecordedDays = item.days_data.filter(d => d === 'done' || d === 'failed').length;

                                        // Robust Check: 
                                        // 1. Check if days match duration (Calculated completion)
                                        // 2. OR Check if global status is 'completed' or 'failed' (Backend/Logic completion)
                                        const isFullyCompleted = totalRecordedDays >= item.duration_days || item.status === 'completed' || item.status === 'failed';

                                        // Financial State
                                        const isLoss = item.net < 0;
                                        const isGain = item.net > 0;
                                        // Mock Payment Status
                                        const paymentStatus = 'Pending'; // Default to Pending for now
                                        const isSettled = false; // Mock

                                        // Determine Visual Style
                                        // explicitly type as any to avoid strict "missing properties" errors with array styles
                                        let cardStyle: any = styles.card;
                                        let badgeStyle = styles.bgBlue;
                                        let textStyle = styles.textBlue;
                                        let badgeText = 'Active';

                                        if (isFullyCompleted) {
                                            if (isLoss && !isSettled) {
                                                // Loss + Pending
                                                cardStyle = [styles.card, styles.cardLoss]; // Yellow/Orange Border
                                                badgeStyle = styles.bgOrange;
                                                textStyle = styles.textOrange;
                                                badgeText = 'Completed';
                                            } else if (isGain) {
                                                // Gain
                                                cardStyle = [styles.card, styles.cardGain]; // Blue/Neutral Border
                                                badgeStyle = styles.bgGreen;
                                                textStyle = styles.textGreen;
                                                badgeText = 'Completed';
                                            } else if (isSettled) {
                                                // Paid / Settled
                                                cardStyle = [styles.card, styles.cardSettled]; // Green BG
                                                badgeStyle = styles.bgGreen;
                                                textStyle = styles.textGreen;
                                                badgeText = 'Settled';
                                            } else {
                                                // Default Completed (e.g. Net 0)
                                                badgeStyle = styles.bgGreen;
                                                textStyle = styles.textGreen;
                                                badgeText = 'Completed';
                                            }
                                        } else {
                                            // Active / Incomplete
                                            if (item.status === 'failed') {
                                                badgeStyle = styles.bgRed;
                                                textStyle = styles.textRed;
                                                badgeText = 'Failed';
                                            }
                                        }

                                        return (
                                            <View style={cardStyle}>
                                                <View style={styles.cardHeader}>
                                                    <Text style={styles.cardTitle}>{item.title}</Text>
                                                    <View style={[styles.statusBadge, badgeStyle]}>
                                                        <Text style={[styles.statusText, textStyle]}>{badgeText}</Text>
                                                    </View>
                                                </View>

                                                {/* The Story Graph */}
                                                <Text style={styles.sectionLabel}>Daily Progress</Text>
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

                                                {/* Stats */}
                                                <View style={styles.statsRow}>
                                                    <View style={styles.stat}>
                                                        <Text style={styles.statLabel}>Days</Text>
                                                        <View style={{ flexDirection: 'row', gap: 4 }}>
                                                            <Text style={[styles.statValue, { color: '#10B981' }]}>
                                                                {item.days_data.filter(d => d === 'done').length}
                                                            </Text>
                                                            <Text style={{ color: '#94A3B8' }}>|</Text>
                                                            <Text style={[styles.statValue, { color: '#EF4444' }]}>
                                                                {item.days_data.filter(d => d === 'failed').length}
                                                            </Text>
                                                        </View>
                                                    </View>

                                                    <View style={styles.stat}>
                                                        <Text style={styles.statLabel}>Outcome</Text>
                                                        <View style={{ flexDirection: 'row', gap: 4 }}>
                                                            {item.winnings > 0 &&
                                                                <Text style={[styles.statValue, { color: '#10B981' }]}>
                                                                    +₹{item.winnings}
                                                                </Text>
                                                            }
                                                            {item.penalties > 0 &&
                                                                <Text style={[styles.statValue, { color: '#EF4444' }]}>
                                                                    -₹{item.penalties}
                                                                </Text>
                                                            }
                                                            {item.winnings === 0 && item.penalties === 0 &&
                                                                <Text style={[styles.statValue, { color: '#94A3B8' }]}>-</Text>
                                                            }
                                                        </View>
                                                    </View>
                                                </View>

                                                {/* PAYMENT SECTION (Only for Fully Completed) */}
                                                {isFullyCompleted && (
                                                    <View style={styles.paymentSection}>
                                                        {isLoss && !isSettled && (
                                                            <View>
                                                                <View style={styles.paymentRow}>
                                                                    <Text style={styles.paymentLabel}>Payment Status:</Text>
                                                                    <Text style={styles.paymentValuePending}>Pending</Text>
                                                                </View>
                                                                <View style={styles.paymentRow}>
                                                                    <Text style={styles.paymentLabel}>Amount to Pay:</Text>
                                                                    <Text style={styles.paymentValueAmount}>₹{Math.abs(item.net)}</Text>
                                                                </View>
                                                                <TouchableOpacity style={styles.payNowButton}>
                                                                    <Text style={styles.payNowText}>Pay Now</Text>
                                                                </TouchableOpacity>
                                                            </View>
                                                        )}

                                                        {isGain && (
                                                            <View>
                                                                <View style={styles.paymentRow}>
                                                                    <Text style={styles.paymentLabel}>You will receive:</Text>
                                                                    <Text style={styles.paymentValueGain}>₹{item.winnings}</Text>
                                                                </View>
                                                                <Text style={styles.paymentStatusGain}>Status: Awaiting peer payment</Text>
                                                            </View>
                                                        )}

                                                        {isSettled && (
                                                            <View style={styles.settledContainer}>
                                                                <Text style={styles.settledText}>Payment Settled ✔</Text>
                                                            </View>
                                                        )}
                                                    </View>
                                                )}

                                            </View>
                                        );
                                    })()}
                                </View>
                            </Animated.View>
                        ))}
                        {history.length === 0 && (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyText}>No journey history yet.</Text>
                            </View>
                        )}
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingTop: Platform.OS === 'android' ? 40 : 20,
        paddingBottom: 20,
    },
    backButton: {
        padding: 8,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#0F172A',
    },
    scrollContent: {
        padding: 24,
    },
    timeline: {
        paddingLeft: 8,
    },
    timelineItem: {
        flexDirection: 'row',
        marginBottom: 32,
    },
    dateColumn: {
        width: 80,
        alignItems: 'flex-end',
        paddingRight: 16,
        position: 'relative',
    },
    dateText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#64748B',
        marginBottom: 4,
        textAlign: 'right',
    },
    lineNode: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#CBD5E1',
        position: 'absolute',
        right: -6,
        top: 6,
        zIndex: 10,
        borderWidth: 2,
        borderColor: '#F8FAFC',
    },
    lineConnector: {
        position: 'absolute',
        right: -1,
        top: 20,
        bottom: -50, // Extend to next item
        width: 2,
        backgroundColor: '#E2E8F0',
    },
    cardContainer: {
        flex: 1,
        paddingLeft: 16,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0F172A',
        flex: 1,
        marginRight: 8,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
    },
    bgGreen: { backgroundColor: '#DCFCE7' },
    bgRed: { backgroundColor: '#FEF2F2' },
    bgBlue: { backgroundColor: '#EFF6FF' },
    textGreen: { color: '#166534', fontSize: 10, fontWeight: '700' },
    textRed: { color: '#991B1B', fontSize: 10, fontWeight: '700' },
    textBlue: { color: '#1E40AF', fontSize: 10, fontWeight: '700' },
    statusText: { fontSize: 10, fontWeight: '700' },

    sectionLabel: {
        fontSize: 11,
        color: '#94A3B8',
        fontWeight: '600',
        marginTop: 4,
        marginBottom: 6,
        textTransform: 'uppercase',
    },
    storyGraph: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 4,
        marginBottom: 16,
    },
    storyBlock: {
        width: 14,
        height: 14,
        borderRadius: 3,
    },
    blockGreen: { backgroundColor: '#22C55E' },
    blockRed: { backgroundColor: '#EF4444' },
    blockGray: { backgroundColor: '#F1F5F9' },

    statsRow: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        paddingTop: 12,
    },
    stat: {
        marginRight: 24,
    },
    statLabel: {
        fontSize: 10,
        color: '#94A3B8',
        fontWeight: '600',
        marginBottom: 2,
    },
    statValue: {
        fontSize: 14,
        fontWeight: '700',
        color: '#334155',
    },
    emptyState: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        color: '#94A3B8',
        fontSize: 14,
    },
    // NEW CARD STYLES
    cardLoss: {
        borderColor: '#FDBA74', // Soft Orange
        borderWidth: 1.5,
    },
    cardGain: {
        borderColor: '#94A3B8', // Neutral/Blueish
    },
    cardSettled: {
        backgroundColor: '#F0FDF4', // Soft Green BG
        borderColor: '#BBF7D0',
    },
    bgOrange: { backgroundColor: '#FFEDD5' },
    textOrange: { color: '#C2410C', fontSize: 10, fontWeight: '700' },

    paymentSection: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    paymentRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    paymentLabel: {
        color: '#64748B',
        fontSize: 14,
    },
    paymentValuePending: {
        color: '#F59E0B', // Amber
        fontWeight: '700',
    },
    paymentValueAmount: {
        color: '#0F172A',
        fontWeight: '800',
        fontSize: 16,
    },
    payNowButton: {
        backgroundColor: '#0F172A',
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: 'center',
        marginTop: 8,
    },
    payNowText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 14,
    },
    paymentValueGain: {
        color: '#166534',
        fontWeight: '800',
        fontSize: 16,
    },
    paymentStatusGain: {
        color: '#64748B',
        fontSize: 12,
        fontStyle: 'italic',
        marginTop: 4,
    },
    settledContainer: {
        alignItems: 'center',
        paddingVertical: 8,
    },
    settledText: {
        color: '#166534',
        fontWeight: '700',
        fontSize: 14,
    }
});
