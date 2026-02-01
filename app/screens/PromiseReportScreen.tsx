import { Ionicons } from '@expo/vector-icons';
import { setStringAsync } from 'expo-clipboard';
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
import { scaleFont } from '../utils/layout';

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
    const { showAlert } = useAlert();
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

                    console.log('[UPIDebug] UPI Map:', JSON.stringify(upiMap));
                    console.log('[NameDebug] Profiles Loaded:', profiles.length, JSON.stringify(localNameMap));
                }
            }

            // 5. SETTLEMENT LOGIC
            // Display Existing Settlements
            if (existingSettlements && existingSettlements.length > 0) {
                // Deduplicate logic: Map Key -> Settlement
                // Key: `${ s.from_user_id } -${ s.to_user_id } `
                // If collision, prefer status != pending
                const uniqueSettlementsMap = new Map<string, Settlement>();

                existingSettlements.forEach((s: any) => {
                    const key = `${s.from_user_id} -${s.to_user_id} `;
                    const current = uniqueSettlementsMap.get(key);

                    if (!current) {
                        uniqueSettlementsMap.set(key, s);
                    } else {
                        // Conflict resolution: Keep the one that is NOT pending, or just the first one
                        const score = (status: string) => {
                            if (status === 'confirmed') return 3;
                            if (status === 'marked_paid') return 2;
                            return 1;
                        };
                        if (score(s.status) > score(current.status)) {
                            uniqueSettlementsMap.set(key, s);
                        }
                    }
                });

                const uniqueSettlements = Array.from(uniqueSettlementsMap.values());

                const enriched = uniqueSettlements.map(s => {
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
                    // RACE CONDITION MITIGATION:
                    // 1. Random delay (0-200ms) to desync simultaneous requests
                    await new Promise(r => setTimeout(r, Math.random() * 200));

                    // 2. DOUBLE CHECK: Did someone else insert while we were calculating?
                    const { count } = await supabase
                        .from('settlements')
                        .select('*', { count: 'exact', head: true })
                        .eq('promise_id', promiseId);

                    if (count && count > 0) {
                        console.log("Collision avoided! Another user generated settlements.");
                        // Just re-fetch
                        fetchReportData();
                        return;
                    }

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
        showAlert({
            title: "Almost there! ",
            message: "Direct in-app payments are coming soon!\n\nPlease settle externally for now.\n\nOnce done, tap “Mark as Paid” to verify your integrity.",
            type: "info"
        });
    };

    const handleMarkPaid = async (settlementId: string) => {
        const { error } = await supabase
            .from('settlements')
            .update({ status: 'marked_paid' })
            .eq('id', settlementId);

        if (error) {
            console.error('[handleMarkPaid] Error:', error);
            showAlert({
                title: "Error",
                message: "Could not update status",
                type: "error"
            });
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

        if (error) showAlert({
            title: "Error",
            message: "Could not confirm",
            type: "error"
        });
        else fetchReportData();
    };

    const handleReject = async (settlementId: string) => {
        showAlert({
            title: "Reject Payment",
            message: "Are you sure? This will ask the other user to pay again.",
            type: "warning",
            buttons: [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Reject",
                    style: "destructive",
                    onPress: async () => {
                        const { error } = await supabase
                            .from('settlements')
                            .update({ status: 'rejected' })
                            .eq('id', settlementId);

                        if (error) {
                            showAlert({
                                title: "Error",
                                message: "Could not reject",
                                type: "error"
                            });
                        } else {
                            fetchReportData();
                        }
                    }
                }
            ]
        });
    };

    const handleCopy = async (text: string) => {
        await setStringAsync(text);
        // Using Alert for simplicity, or could be a toast if you have one
        if (Platform.OS === 'android') {
            const ToastAndroid = require('react-native').ToastAndroid;
            ToastAndroid.show('UPI ID Copied', ToastAndroid.SHORT);
        } else {
            showAlert({
                title: "Copied",
                message: "UPI ID copied to clipboard",
                type: "success"
            });
        }
    };

    return (
        <View style={styles.container}>
            <GridOverlay />
            <SafeAreaView style={{ flex: 1 }}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#1E293B" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Executive Report</Text>
                    <View style={{ width: 44 }} />
                </View>

                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" />
                    }
                >
                    {/* DASHBOARD HERO */}
                    <Animated.View entering={FadeInDown.duration(800).springify()}>
                        <LinearGradient
                            colors={['#4F46E5', '#7C3AED']}
                            style={styles.heroCard}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <View style={styles.heroOverlay}>
                                <Ionicons name="receipt" size={100} color="rgba(255,255,255,0.1)" style={styles.bgIcon} />
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

                    {/* FINANCIAL SUMMARY CARDS */}
                    <View style={styles.financialContainer}>
                        <Animated.View
                            entering={FadeInDown.delay(200).duration(800).springify()}
                            style={[styles.smallCard, { backgroundColor: '#F0F9FF', borderColor: '#BAE6FD' }]}
                        >
                            <Text style={styles.smallCardLabel}>Paid Out</Text>
                            <Text style={[styles.smallCardValue, { color: '#0369A1' }]}>₹{financials.totalPaid.toFixed(0)}</Text>
                            <Ionicons name="arrow-down-circle" size={20} color="#0369A1" />
                        </Animated.View>

                        <Animated.View
                            entering={FadeInDown.delay(300).duration(800).springify()}
                            style={[styles.smallCard, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}
                        >
                            <Text style={styles.smallCardLabel}>Earned</Text>
                            <Text style={[styles.smallCardValue, { color: '#15803D' }]}>₹{financials.totalEarned.toFixed(0)}</Text>
                            <Ionicons name="arrow-up-circle" size={20} color="#15803D" />
                        </Animated.View>
                    </View>

                    {/* NET RESULT SECTION */}
                    <Animated.View
                        entering={FadeInDown.delay(400).duration(800).springify()}
                        style={styles.netResultCard}
                    >
                        <View style={styles.netInfo}>
                            <Text style={styles.netResultLabel}>Net Result</Text>
                            <Text style={[styles.netResultValue, { color: isGain ? '#15803D' : '#B91C1C' }]}>
                                {isGain ? '+' : '-'} ₹{Math.abs(financials.netResult).toFixed(0)}
                            </Text>
                        </View>
                        <View style={[styles.netIndicator, { backgroundColor: isGain ? '#15803D' : '#B91C1C' }]}>
                            <Text style={styles.netIndicatorText}>{isGain ? 'GAIN' : 'LOSS'}</Text>
                        </View>
                    </Animated.View>

                    {/* SETTLEMENT SECTION */}
                    <Animated.View
                        entering={FadeInDown.delay(500).duration(800).springify()}
                        style={styles.settlementSection}
                    >
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Vault Settlements</Text>
                            <View style={styles.titleLine} />
                        </View>

                        {financials.netResult === 0 ? (
                            <View style={styles.emptySettlement}>
                                <Ionicons name="checkmark-circle" size={48} color="#10B981" />
                                <Text style={styles.emptyText}>Balanced Sheets. No settlements needed.</Text>
                            </View>
                        ) : isWash ? (
                            <View style={styles.washBox}>
                                <Ionicons name="information-circle" size={24} color="#64748B" />
                                <Text style={styles.washText}>
                                    The Wash Rule: Everyone failed. Punishments were refunded.
                                </Text>
                            </View>
                        ) : null}

                        {/* Payment List */}
                        {((settlements.length > 0) && (financials.netResult !== 0 || isWash)) && (
                            <View style={styles.paymentList}>
                                {settlements.filter(s => s.from_user_id === currentUserId || s.to_user_id === currentUserId).length === 0 ? (
                                    <View style={styles.emptySettlement}>
                                        <Text style={styles.emptyText}>No pending items for you.</Text>
                                    </View>
                                ) : (
                                    settlements
                                        .filter(s => s.from_user_id === currentUserId || s.to_user_id === currentUserId)
                                        .map((payment, index) => {
                                            const isPayer = payment.from_user_id === currentUserId;
                                            const displayedUpiId = isPayer
                                                ? participantUpiIds[payment.to_user_id]
                                                : participantUpiIds[payment.from_user_id];

                                            return (
                                                <View key={index} style={styles.paymentCard}>
                                                    <View style={styles.paymentMain}>
                                                        <View style={styles.userAvatar}>
                                                            <Text style={styles.avatarChar}>
                                                                {(isPayer ? payment.to_name : payment.from_name)?.charAt(0)}
                                                            </Text>
                                                        </View>
                                                        <View style={styles.paymentInfo}>
                                                            <Text style={styles.paymentUserName}>
                                                                {isPayer ? `Pay to ${payment.to_name}` : `From ${payment.from_name}`}
                                                            </Text>
                                                            <Text style={styles.paymentAmount}>₹{payment.amount}</Text>
                                                        </View>
                                                        <View style={styles.paymentMeta}>
                                                            {displayedUpiId ? (
                                                                <TouchableOpacity
                                                                    style={styles.upiBadge}
                                                                    onPress={() => handleCopy(displayedUpiId)}
                                                                >
                                                                    <Text style={styles.upiText} numberOfLines={1}>{displayedUpiId}</Text>
                                                                    <Ionicons name="copy" size={12} color="#4F46E5" />
                                                                </TouchableOpacity>
                                                            ) : (
                                                                <Text style={styles.noUpi}>No UPI ID</Text>
                                                            )}
                                                        </View>
                                                    </View>

                                                    <View style={styles.paymentActions}>
                                                        {payment.status === 'confirmed' ? (
                                                            <View style={styles.successStatus}>
                                                                <Ionicons name="checkmark-done-circle" size={20} color="#10B981" />
                                                                <Text style={styles.successStatusText}>Cleared</Text>
                                                            </View>
                                                        ) : (payment.status === 'paid' || payment.status === 'marked_paid') ? (
                                                            !isPayer ? (
                                                                <View style={styles.receiverActions}>
                                                                    <TouchableOpacity
                                                                        style={styles.confirmBtn}
                                                                        onPress={() => handleConfirm(payment.id)}
                                                                    >
                                                                        <Text style={styles.btnTextThin}>Verify Receipt</Text>
                                                                    </TouchableOpacity>
                                                                    <TouchableOpacity
                                                                        style={styles.rejectBtn}
                                                                        onPress={() => handleReject(payment.id)}
                                                                    >
                                                                        <Text style={styles.rejectText}>Reject</Text>
                                                                    </TouchableOpacity>
                                                                </View>
                                                            ) : (
                                                                <View style={styles.waitingStatus}>
                                                                    <ActivityIndicator size="small" color="#F59E0B" />
                                                                    <Text style={styles.waitingText}>Awaiting Confirmation</Text>
                                                                </View>
                                                            )
                                                        ) : (
                                                            isPayer && (
                                                                <View style={styles.payerActions}>
                                                                    <TouchableOpacity
                                                                        style={styles.payBtn}
                                                                        onPress={() => handlePay(displayedUpiId || "", payment.to_name || "User", payment.amount, payment.id)}
                                                                    >
                                                                        <Ionicons name="paper-plane" size={16} color="#FFF" />
                                                                        <Text style={styles.payBtnText}>Pay via UPI</Text>
                                                                    </TouchableOpacity>
                                                                    <TouchableOpacity
                                                                        style={styles.markPaidBtn}
                                                                        onPress={() => handleMarkPaid(payment.id)}
                                                                    >
                                                                        <Text style={styles.markPaidText}>Mark as Paid</Text>
                                                                    </TouchableOpacity>
                                                                </View>
                                                            )
                                                        )}
                                                    </View>
                                                </View>
                                            );
                                        })
                                )}
                                <View style={styles.disclaimerBox}>
                                    <Ionicons name="shield" size={14} color="#B45309" />
                                    <Text style={styles.disclaimerText}>
                                        Handled externally via UPI. Verify strictly with peers.
                                    </Text>
                                </View>
                            </View>
                        )}
                    </Animated.View>

                    {/* STATS TABLE */}
                    <Animated.View
                        entering={FadeInUp.delay(600).duration(800)}
                        style={styles.statsTable}
                    >
                        <View style={styles.statRow}>
                            <Text style={styles.statKey}>Cycle Length</Text>
                            <Text style={styles.statVal}>{promiseData.duration_days} Days</Text>
                        </View>
                        <View style={styles.statRow}>
                            <Text style={styles.statKey}>Participation</Text>
                            <Text style={styles.statVal}>{promiseData.number_of_people} Peers</Text>
                        </View>
                        <View style={styles.statRow}>
                            <Text style={styles.statKey}>Original Stake</Text>
                            <Text style={styles.statVal}>₹{promiseData.amount_per_person}</Text>
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
        paddingHorizontal: scaleFont(20),
        paddingTop: Platform.OS === 'android' ? scaleFont(40) : scaleFont(10),
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
        shadowColor: '#4F46E5',
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
        top: scaleFont(-20),
        right: scaleFont(-20),
    },
    heroContent: {
        gap: scaleFont(6),
    },
    statusBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: scaleFont(10),
        paddingVertical: scaleFont(4),
        borderRadius: scaleFont(8),
        marginBottom: scaleFont(4),
    },
    badgeSuccess: {
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
    },
    badgeError: {
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
    },
    statusLabel: {
        fontSize: scaleFont(10),
        fontWeight: '900',
        color: '#FFF',
        letterSpacing: scaleFont(1),
        fontFamily: 'Outfit_800ExtraBold',
    },
    heroPromiseTitle: {
        fontSize: scaleFont(26),
        fontWeight: '900',
        color: '#FFF',
        letterSpacing: scaleFont(-0.5),
        fontFamily: 'Outfit_800ExtraBold',
    },
    heroDateRange: {
        fontSize: scaleFont(14),
        color: 'rgba(255,255,255,0.7)',
        fontWeight: '500',
        fontFamily: 'Outfit_400Regular',
    },
    financialContainer: {
        flexDirection: 'row',
        gap: scaleFont(16),
        marginBottom: scaleFont(16),
    },
    smallCard: {
        flex: 1,
        height: scaleFont(100),
        borderRadius: scaleFont(20),
        borderWidth: 1,
        padding: scaleFont(16),
        justifyContent: 'center',
        alignItems: 'center',
        gap: scaleFont(4),
    },
    smallCardLabel: {
        fontSize: scaleFont(12),
        fontWeight: '600',
        color: '#64748B',
        fontFamily: 'Outfit_700Bold',
    },
    smallCardValue: {
        fontSize: scaleFont(22),
        fontWeight: '800',
        fontFamily: 'Outfit_800ExtraBold',
    },
    netResultCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: scaleFont(24),
        padding: scaleFont(24),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginBottom: scaleFont(32),
        elevation: scaleFont(4),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: scaleFont(4) },
        shadowOpacity: 0.05,
        shadowRadius: scaleFont(10),
    },
    netInfo: {
        gap: scaleFont(4),
    },
    netResultLabel: {
        fontSize: scaleFont(14),
        fontWeight: '600',
        color: '#64748B',
        fontFamily: 'Outfit_700Bold',
    },
    netResultValue: {
        fontSize: scaleFont(36),
        fontWeight: '900',
        letterSpacing: scaleFont(-1),
        fontFamily: 'Outfit_800ExtraBold',
    },
    netIndicator: {
        paddingHorizontal: scaleFont(16),
        paddingVertical: scaleFont(8),
        borderRadius: scaleFont(12),
    },
    netIndicatorText: {
        fontSize: scaleFont(12),
        fontWeight: '900',
        color: '#FFF',
        fontFamily: 'Outfit_800ExtraBold',
    },
    settlementSection: {
        marginBottom: scaleFont(32),
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scaleFont(12),
        marginBottom: scaleFont(20),
    },
    sectionTitle: {
        fontSize: scaleFont(18),
        fontWeight: '800',
        color: '#1E293B',
        fontFamily: 'Outfit_800ExtraBold',
    },
    titleLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#E2E8F0',
    },
    emptySettlement: {
        alignItems: 'center',
        padding: scaleFont(40),
        gap: scaleFont(12),
    },
    emptyText: {
        fontSize: scaleFont(14),
        color: '#94A3B8',
        fontWeight: '500',
        textAlign: 'center',
        fontFamily: 'Outfit_400Regular',
    },
    washBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F1F5F9',
        padding: scaleFont(16),
        borderRadius: scaleFont(16),
        gap: scaleFont(12),
    },
    washText: {
        fontSize: scaleFont(14),
        color: '#475569',
        fontWeight: '600',
        flex: 1,
        fontFamily: 'Outfit_700Bold',
    },
    paymentList: {
        gap: scaleFont(12),
    },
    paymentCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: scaleFont(20),
        borderWidth: 1,
        borderColor: '#E2E8F0',
        overflow: 'hidden',
    },
    paymentMain: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: scaleFont(16),
        gap: scaleFont(12),
    },
    userAvatar: {
        width: scaleFont(48),
        height: scaleFont(48),
        borderRadius: scaleFont(24),
        backgroundColor: '#EEF2FF',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#C7D2FE',
    },
    avatarChar: {
        fontSize: scaleFont(20),
        fontWeight: '800',
        color: '#4F46E5',
        fontFamily: 'Outfit_800ExtraBold',
    },
    paymentInfo: {
        flex: 1,
        gap: scaleFont(2),
    },
    paymentUserName: {
        fontSize: scaleFont(14),
        fontWeight: '600',
        color: '#64748B',
        fontFamily: 'Outfit_700Bold',
    },
    paymentAmount: {
        fontSize: scaleFont(18),
        fontWeight: '800',
        color: '#1E293B',
        fontFamily: 'Outfit_800ExtraBold',
    },
    paymentMeta: {
        alignItems: 'flex-end',
    },
    upiBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        paddingHorizontal: scaleFont(8),
        paddingVertical: scaleFont(4),
        borderRadius: scaleFont(8),
        gap: scaleFont(4),
        maxWidth: scaleFont(100),
    },
    upiText: {
        fontSize: scaleFont(10),
        color: '#4F46E5',
        fontWeight: '600',
        fontFamily: 'Outfit_700Bold',
    },
    noUpi: {
        fontSize: scaleFont(10),
        color: '#94A3B8',
        fontStyle: 'italic',
        fontFamily: 'Outfit_400Regular',
    },
    paymentActions: {
        backgroundColor: '#F8FAFC',
        padding: scaleFont(12),
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
    },
    successStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: scaleFont(6),
    },
    successStatusText: {
        fontSize: scaleFont(14),
        fontWeight: '700',
        color: '#10B981',
        fontFamily: 'Outfit_700Bold',
    },
    receiverActions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    confirmBtn: {
        backgroundColor: '#10B981',
        paddingHorizontal: scaleFont(16),
        paddingVertical: scaleFont(10),
        borderRadius: scaleFont(12),
    },
    btnTextThin: {
        color: '#FFF',
        fontSize: scaleFont(13),
        fontWeight: '700',
        fontFamily: 'Outfit_700Bold',
    },
    rejectBtn: {
        padding: scaleFont(8),
    },
    rejectText: {
        color: '#EF4444',
        fontSize: scaleFont(13),
        fontWeight: '600',
        fontFamily: 'Outfit_700Bold',
    },
    waitingStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: scaleFont(8),
    },
    waitingText: {
        fontSize: scaleFont(13),
        fontWeight: '600',
        color: '#F59E0B',
        fontFamily: 'Outfit_700Bold',
    },
    payerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    payBtn: {
        backgroundColor: '#4F46E5',
        flexDirection: 'row',
        alignItems: 'center',
        gap: scaleFont(8),
        paddingHorizontal: scaleFont(20),
        paddingVertical: scaleFont(12),
        borderRadius: scaleFont(14),
    },
    payBtnText: {
        color: '#FFF',
        fontSize: scaleFont(14),
        fontWeight: '800',
        fontFamily: 'Outfit_800ExtraBold',
    },
    markPaidBtn: {
        padding: scaleFont(10),
    },
    markPaidText: {
        color: '#64748B',
        fontSize: scaleFont(13),
        fontWeight: '600',
        textDecorationLine: 'underline',
        fontFamily: 'Outfit_700Bold',
    },
    disclaimerBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFBEB',
        padding: scaleFont(12),
        borderRadius: scaleFont(12),
        gap: scaleFont(8),
        marginTop: scaleFont(12),
    },
    disclaimerText: {
        fontSize: scaleFont(11),
        color: '#B45309',
        fontWeight: '500',
        flex: 1,
        fontFamily: 'Outfit_400Regular',
    },
    statsTable: {
        backgroundColor: '#F8FAFC',
        borderRadius: scaleFont(20),
        padding: scaleFont(20),
        gap: scaleFont(16),
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    statRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statKey: {
        fontSize: scaleFont(14),
        fontWeight: '600',
        color: '#64748B',
        fontFamily: 'Outfit_700Bold',
    },
    statVal: {
        fontSize: scaleFont(14),
        fontWeight: '800',
        color: '#1E293B',
        fontFamily: 'Outfit_800ExtraBold',
    },
    footerSpacing: {
        height: scaleFont(40),
    },
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFF',
    },
    errorText: {
        fontSize: scaleFont(16),
        color: '#64748B',
        marginBottom: scaleFont(20),
        fontFamily: 'Outfit_400Regular',
    },
    backButtonAlt: {
        backgroundColor: '#4F46E5',
        paddingHorizontal: scaleFont(24),
        paddingVertical: scaleFont(14),
        borderRadius: scaleFont(16),
    },
    backButtonText: {
        color: '#FFF',
        fontWeight: '700',
        fontFamily: 'Outfit_700Bold',
    }
});
