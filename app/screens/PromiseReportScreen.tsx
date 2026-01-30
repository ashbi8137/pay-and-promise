import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Linking,
    Platform,
    RefreshControl,
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

interface Settlement {
    id: string;
    from_user_id: string;
    to_user_id: string;
    amount: number;
    status: 'pending' | 'paid' | 'confirmed' | 'marked_paid' | 'rejected';
    from_name?: string;
    to_name?: string;
}

export default function PromiseReportScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const promiseId = params.promiseId as string;

    const [loading, setLoading] = useState(true);
    const [promiseData, setPromiseData] = useState<PromiseData | null>(null);
    const [financials, setFinancials] = useState<FinancialSummary>({
        totalPaid: 0,
        totalEarned: 0,
        netResult: 0
    });
    const [participantNames, setParticipantNames] = useState<Record<string, string>>({});
    const [participantUpiIds, setParticipantUpiIds] = useState<Record<string, string>>({});
    const [isWash, setIsWash] = useState(false);
    const [settlements, setSettlements] = useState<Settlement[]>([]);
    const [initiatedSettlements, setInitiatedSettlements] = useState<Record<string, boolean>>({});
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchReportData().then(() => setRefreshing(false));
    }, [promiseId]);

    // Parse promise from params logic moved up


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
            setCurrentUserId(user.id);

            // 1. Fetch Promise Details

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

            let totalPaid = 0;
            let totalEarned = 0;

            if (ledger) {
                ledger.forEach(item => {
                    const val = Number(item.amount);
                    if (item.type === 'winnings') {
                        totalEarned += val;
                    } else if (item.type === 'penalty') {
                        totalPaid += Math.abs(val);
                    } else if (item.type === 'refund') {
                        // Refund reduces the total paid amount
                        totalPaid -= val;
                    }
                });

                setFinancials({
                    totalPaid,
                    totalEarned,
                    netResult: totalEarned - totalPaid
                });
            }

            // 2.5 Fetch FULL Ledger (All Participants) to determine winners/losers text
            // This is needed for settlement calculation
            const { data: fullLedger } = await supabase
                .from('ledger')
                .select('user_id, amount, type')
                .eq('promise_id', promiseId);

            // 3. New: Check for "The Wash" (Did ANYONE win?)
            const { count: verifiedCount } = await supabase
                .from('promise_submissions')
                .select('*', { count: 'exact', head: true })
                .eq('promise_id', promiseId)
                .eq('status', 'verified');

            const isWashCondition = (verifiedCount || 0) === 0;
            setIsWash(isWashCondition);

            // AUTO-REFUND LOGIC (Wash Rule)
            // If it is a Wash, and I have paid penalties (and not sufficiently refunded), trigger a refund.
            if (isWashCondition && ledger) {
                let paid = 0;
                let refunded = 0;
                ledger.forEach(item => {
                    if (item.type === 'penalty') paid += Math.abs(Number(item.amount));
                    if (item.type === 'refund') refunded += Number(item.amount);
                });

                if (paid > refunded) {
                    // Need to refund the difference
                    const amountToRefund = paid - refunded;
                    console.log('Wash Rule: Auto-refunding penalties...', amountToRefund);

                    const { error: refundError } = await supabase.from('ledger').insert({
                        promise_id: promiseId,
                        user_id: user.id,
                        amount: amountToRefund,
                        type: 'refund',
                        description: 'Wash Rule Refund: Everyone Failed'
                    });

                    if (!refundError) {
                        // Update local financials immediately to reflect refund
                        setFinancials({
                            totalPaid: 0, // Effectively 0 after refund
                            totalEarned: totalEarned, // Use local variable
                            netResult: 0
                        });
                    } else {
                        console.error('Failed to insert refund:', refundError);
                    }
                }
            }

            // 4. Fetch Participant Names AND Settlements
            const { data: participants } = await supabase
                .from('promise_participants')
                .select('user_id, status')
                .eq('promise_id', promiseId);

            // Fetch Settlements EARLY to get all possible user IDs
            const { data: existingSettlements } = await supabase
                .from('settlements')
                .select('*')
                .eq('promise_id', promiseId);

            let localNameMap: Record<string, string> = {};
            const allUserIds = new Set<string>();

            if (participants) participants.forEach(p => allUserIds.add(p.user_id));
            if (existingSettlements) existingSettlements.forEach(s => {
                allUserIds.add(s.from_user_id);
                allUserIds.add(s.to_user_id);
            });

            if (allUserIds.size > 0) {
                const userIds = Array.from(allUserIds);
                console.log('[NameDebug] Fetching profiles for:', userIds);

                // Fetch Profiles (Name + UPI) directly
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('id, upi_id, full_name')
                    .in('id', userIds);

                if (profiles) {
                    const upiMap: Record<string, string> = {};
                    profiles.forEach((p: any) => {
                        // Map Name
                        localNameMap[p.id] = p.full_name?.split(' ')[0] || 'User';
                        // Map UPI
                        if (p.upi_id) upiMap[p.id] = p.upi_id;
                    });

                    setParticipantNames(localNameMap);
                    setParticipantUpiIds(upiMap);

                    console.log('[NameDebug] Profiles Loaded:', profiles.length, JSON.stringify(localNameMap));
                }
            }

            // 5. SETTLEMENT LOGIC
            // Display Existing Settlements
            if (existingSettlements && existingSettlements.length > 0) {
                // Already generated, just display
                const enriched = existingSettlements.map(s => {
                    return {
                        ...s,
                        from_name: localNameMap[s.from_user_id] || 'User',
                        to_name: localNameMap[s.to_user_id] || 'User'
                    };
                });
                // Sort: Pending first, then marked_paid, then others
                enriched.sort((a, b) => {
                    const score = (s: string) => {
                        if (s === 'pending') return 1;
                        if (s === 'marked_paid') return 2;
                        return 3;
                    };
                    return score(a.status) - score(b.status);
                });
                setSettlements(enriched);
            } else {

                // 5.1 Calculate Net Results from Ledger
                const balances: Record<string, number> = {};
                if (fullLedger) {
                    fullLedger.forEach(item => {
                        const uid = item.user_id;
                        const amt = Number(item.amount);
                        if (!balances[uid]) balances[uid] = 0;
                        if (item.type === 'winnings') balances[uid] += amt;
                        if (item.type === 'penalty') balances[uid] -= Math.abs(amt);
                    });
                }

                const winners: { id: string; amount: number }[] = [];
                const losers: { id: string; amount: number }[] = [];

                Object.entries(balances).forEach(([uid, amount]) => {
                    const val = Number(amount.toFixed(2));
                    if (val > 0) winners.push({ id: uid, amount: val });
                    if (val < 0) losers.push({ id: uid, amount: Math.abs(val) });
                });

                winners.sort((a, b) => b.amount - a.amount);
                losers.sort((a, b) => b.amount - a.amount);

                const newSettlements = [];
                let wIdx = 0;
                let lIdx = 0;

                while (wIdx < winners.length && lIdx < losers.length) {
                    const winner = winners[wIdx];
                    const loser = losers[lIdx];

                    const amount = Math.min(winner.amount, loser.amount);
                    if (amount > 0.01) {
                        newSettlements.push({
                            promise_id: promiseId,
                            from_user_id: loser.id,
                            to_user_id: winner.id,
                            amount: Number(amount.toFixed(2)),
                            status: 'pending'
                        });
                    }

                    winner.amount -= amount;
                    loser.amount -= amount;

                    if (winner.amount < 0.01) wIdx++;
                    if (loser.amount < 0.01) lIdx++;
                }

                if (newSettlements.length > 0) {
                    const { data: inserted, error: insertError } = await supabase
                        .from('settlements')
                        .insert(newSettlements)
                        .select();

                    if (!insertError && inserted) {
                        const enriched = inserted.map((s: any) => ({
                            ...s,
                            from_name: localNameMap[s.from_user_id] || 'User',
                            to_name: localNameMap[s.to_user_id] || 'User'
                        }));
                        setSettlements(enriched);
                    }
                }
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

    const handlePay = async (upiId: string, name: string, amount: number, settlementId: string) => {
        if (!upiId) {
            Alert.alert("No UPI ID", `${name} has not linked their UPI ID yet. Please contact them directly.`);
            return;
        }

        const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(name)}&am=${amount}&cu=INR&tn=Promise%20Settlement`;

        try {
            const supported = await Linking.canOpenURL(upiUrl);
            if (supported) {
                await Linking.openURL(upiUrl);
                // Mark locally that we initiated payment, to show "Mark as Paid" button
                setInitiatedSettlements(prev => ({ ...prev, [settlementId]: true }));
            } else {
                Alert.alert("Error", "No UPI apps installed found to handle this request.");
            }
        } catch (err) {
            Alert.alert("Error", "Could not open UPI app.");
        }
    };

    const handleMarkPaid = async (settlementId: string) => {
        const { error } = await supabase
            .from('settlements')
            .update({ status: 'marked_paid' })
            .eq('id', settlementId);

        if (error) {
            console.error('[handleMarkPaid] Error:', error);
            Alert.alert("Error", "Could not update status");
        } else {
            console.log('[handleMarkPaid] Success, refreshing report...');
            fetchReportData();
        }
    };

    const handleConfirm = async (settlementId: string) => {
        const { error } = await supabase
            .from('settlements')
            .update({ status: 'confirmed' })
            .eq('id', settlementId);

        if (error) Alert.alert("Error", "Could not confirm");
        else fetchReportData();
    };

    const handleReject = async (settlementId: string) => {
        Alert.alert("Reject Payment", "Are you sure? This will ask the other user to pay again.", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Reject",
                style: "destructive",
                onPress: async () => {
                    const { error } = await supabase
                        .from('settlements')
                        .update({ status: 'rejected' })
                        .eq('id', settlementId);

                    if (error) Alert.alert("Error", "Could not reject");
                    else fetchReportData();
                }
            }
        ]);
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >

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
                    ) : isWash ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: '#F1F5F9', borderRadius: 12 }}>
                            <View style={[styles.settlementBadge, { backgroundColor: '#E2E8F0' }]}>
                                <Ionicons name="alert-circle-outline" size={24} color="#64748B" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.settlementText}>
                                    Everyone failed to keep the promise perfectly.
                                    {'\n'}No money is exchanged.
                                </Text>
                            </View>
                        </View>
                    ) : null}

                    {/* Settlement List - Rendered for EVERYONE involved in a settlement */}
                    {((settlements.length > 0) && (financials.netResult !== 0 || isWash)) && (
                        <View>
                            {/* DISCLAIMER - Always Visible when settlements involved */}
                            <View style={styles.disclaimerBox}>
                                <Text style={styles.disclaimerText}>
                                    "Payments are handled outside the app using UPI. Please verify strictly with peers."
                                </Text>
                            </View>

                            <Text style={styles.subHeader}>Pending Payments</Text>

                            {settlements.filter(s => s.from_user_id === currentUserId || s.to_user_id === currentUserId).length === 0 ? (
                                <Text style={{ color: '#64748B', textAlign: 'center', marginBottom: 20 }}>No pending payments found.</Text>
                            ) : (
                                settlements.map((payment, index) => {
                                    // Robust ID check
                                    const currentId = currentUserId;
                                    const isPayer = payment.from_user_id === currentId;
                                    const isReceiver = payment.to_user_id === currentId;

                                    const displayedUpiId = isPayer
                                        ? participantUpiIds[payment.to_user_id]
                                        : participantUpiIds[payment.from_user_id];

                                    if (!isPayer && !isReceiver) return null;

                                    return (
                                        <View key={index} style={styles.paymentRow}>
                                            <View style={styles.userRow}>
                                                <View style={styles.avatarPlaceholder}>
                                                    <Text style={styles.avatarText}>
                                                        {(isPayer ? payment.to_name : payment.from_name)?.charAt(0) || '?'}
                                                    </Text>
                                                </View>
                                                <View>
                                                    <Text style={styles.userName}>
                                                        {isPayer ? `Pay to ${payment.to_name}` : `From ${payment.from_name}`}
                                                    </Text>
                                                    <Text style={styles.amountText}>₹{payment.amount}</Text>
                                                    <Text style={{ fontSize: 10, color: '#94A3B8' }}>{displayedUpiId || 'No UPI ID Linked'}</Text>
                                                </View>
                                            </View>

                                            {/* STATUS & ACTIONS */}
                                            {payment.status === 'confirmed' ? (
                                                <View style={[styles.statusPill, { backgroundColor: '#DCFCE7' }]}>
                                                    <Text style={[styles.pillText, { color: '#166534' }]}>{isReceiver ? 'Received' : 'Paid & Confirmed'}</Text>
                                                </View>
                                            ) : (payment.status === 'paid' || payment.status === 'marked_paid') ? (
                                                isReceiver ? (
                                                    <View style={{ gap: 8 }}>
                                                        <TouchableOpacity
                                                            style={[styles.actionButton, { backgroundColor: '#166534' }]}
                                                            onPress={() => handleConfirm(payment.id)}
                                                        >
                                                            <Text style={styles.btnText}>Confirm Received @ ₹{payment.amount}</Text>
                                                        </TouchableOpacity>
                                                        <TouchableOpacity
                                                            onPress={() => handleReject(payment.id)}
                                                            style={{ alignSelf: 'center', padding: 8 }}
                                                        >
                                                            <Text style={{ color: '#991B1B', fontSize: 12, fontWeight: '600' }}>Reject & Request Retry</Text>
                                                        </TouchableOpacity>
                                                    </View>
                                                ) : (
                                                    <View style={[styles.statusPill, { backgroundColor: '#FEF3C7' }]}>
                                                        <Text style={[styles.pillText, { color: '#B45309' }]}>Waiting Confirmation</Text>
                                                    </View>
                                                )
                                            ) : payment.status === 'rejected' ? (
                                                <View style={{ gap: 8 }}>
                                                    <View style={[styles.statusPill, { backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#EF4444' }]}>
                                                        <Text style={[styles.pillText, { color: '#B91C1C' }]}>Payment Rejected. Retry!</Text>
                                                    </View>
                                                    {isPayer && (
                                                        <TouchableOpacity
                                                            style={styles.actionButton}
                                                            onPress={() => handlePay(displayedUpiId || "", payment.to_name || "User", payment.amount, payment.id)}
                                                        >
                                                            <Text style={styles.btnText}>Pay Again via UPI</Text>
                                                        </TouchableOpacity>
                                                    )}
                                                </View>
                                            ) : isPayer ? (
                                                <View style={{ gap: 6, alignItems: 'flex-end' }}>
                                                    <TouchableOpacity
                                                        style={styles.actionButton}
                                                        onPress={() => handlePay(displayedUpiId || "", payment.to_name || "User", payment.amount, payment.id)}
                                                    >
                                                        <Text style={styles.btnText}>Pay via UPI</Text>
                                                    </TouchableOpacity>

                                                    {/* Show Mark Paid button if payment initiated OR just always available as fallback */}
                                                    <TouchableOpacity
                                                        onPress={() => handleMarkPaid(payment.id)}
                                                    >
                                                        <Text style={{ fontSize: 11, color: '#64748B', textDecorationLine: 'underline' }}>
                                                            Mark as Paid
                                                        </Text>
                                                    </TouchableOpacity>
                                                </View>
                                            ) : (
                                                <View style={styles.statusPill}>
                                                    <Text style={styles.pillText}>Pending</Text>
                                                </View>
                                            )}
                                        </View>
                                    );
                                })
                            )}
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
    disclaimerBox: {
        backgroundColor: '#FFFBEB',
        padding: 12,
        borderRadius: 12,
        marginBottom: 16,
    },
    disclaimerText: {
        fontSize: 12,
        color: '#B45309',
        fontStyle: 'italic',
        textAlign: 'center',
    },
    subHeader: {
        fontSize: 14,
        fontWeight: '700',
        color: '#64748B',
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    paymentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F8FAFC',
        padding: 12,
        borderRadius: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    userRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    avatarPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#E0E7FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#4F46E5',
    },
    userName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#0F172A',
    },
    amountText: {
        fontSize: 13,
        color: '#64748B',
        fontWeight: '600',
    },
    actionButton: {
        backgroundColor: '#4F46E5',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    btnText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '600',
    },
    statusPill: {
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    pillText: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '600',
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
    payButton: {
        backgroundColor: '#EF4444', // Red for payment action
        marginTop: 8,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'flex-start', // Don't stretch
    },
    payButtonText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 14,
    },
});
