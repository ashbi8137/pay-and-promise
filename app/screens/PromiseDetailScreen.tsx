import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
    Alert,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { supabase } from '../../lib/supabase';

export default function PromiseDetailScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();

    // Parse the promise data from params
    const promiseData = params.promise ? JSON.parse(params.promise as string) : null;

    if (!promiseData) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>Promise details not found.</Text>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Text style={styles.backButtonText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    // Removed description from destructuring
    const { title, duration, numPeople, amountPerPerson, totalAmount, participants, invite_code } = promiseData;

    const [updating, setUpdating] = React.useState(false);
    const [checkins, setCheckins] = React.useState<{ date: string, status: string }[]>([]);
    const [todayStatus, setTodayStatus] = React.useState<'done' | 'failed' | null>(null);
    const [realParticipantCount, setRealParticipantCount] = React.useState(numPeople); // Default to created number

    React.useEffect(() => {
        fetchCheckins();
        fetchParticipantCount();
    }, []);

    const fetchParticipantCount = async () => {
        const { count } = await supabase
            .from('promise_participants')
            .select('*', { count: 'exact', head: true })
            .eq('promise_id', promiseData.id);

        if (count !== null) setRealParticipantCount(count);
    };

    const fetchCheckins = async () => {
        try {
            const { data, error } = await supabase
                .from('daily_checkins')
                .select('date, status')
                .eq('promise_id', promiseData.id)
                .order('date', { ascending: false });

            if (data) {
                setCheckins(data);

                // Check if checked in today
                const todayStr = new Date().toISOString().split('T')[0];
                const todayEntry = data.find(c => c.date === todayStr);
                if (todayEntry) {
                    setTodayStatus(todayEntry.status as 'done' | 'failed');
                }
            }
        } catch (e) {
            console.error('Error fetching checkins:', e);
        }
    };

    const handleCheckIn = async (status: 'done' | 'failed') => {
        if (updating) return;

        const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

        // Survivor Calculation Logic
        // 1. Daily Stake
        const dailyStake = amountPerPerson / duration;

        Alert.alert(
            status === 'done' ? 'Mark as Done?' : 'Mark as Failed?',
            status === 'done'
                ? 'Great job! You kept your stake.'
                : `You missed it. You will lose ₹${dailyStake.toFixed(0)} to the pool.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Confirm',
                    style: status === 'failed' ? 'destructive' : 'default',
                    onPress: async () => {
                        setUpdating(true);
                        try {
                            const { data: { user } } = await supabase.auth.getUser();
                            if (!user) return;

                            // 1. Record Check-in
                            const { error: checkinError } = await supabase
                                .from('daily_checkins')
                                .insert({
                                    promise_id: promiseData.id,
                                    user_id: user.id,
                                    date: dateStr,
                                    status: status
                                });

                            if (checkinError) {
                                if (checkinError.code === '23505') { // Unique violation
                                    Alert.alert('Already Updated', 'You have already checked in for this promise today.');
                                } else {
                                    throw checkinError;
                                }
                            } else {
                                // 2. If Failed -> Handle Penalty & Redistribution (Survivor Mode)
                                if (status === 'failed') {
                                    // A. Record Penalty for ME
                                    await supabase.from('ledger').insert({
                                        promise_id: promiseData.id,
                                        user_id: user.id,
                                        amount: -dailyStake,
                                        type: 'penalty'
                                    });

                                    // B. Calculate Redistribution
                                    // Get other ACTIVE participants (who haven't failed *today*? Or just all others?)
                                    // Simplest Survivor: Split among all OTHER participants.
                                    // Better: Split among those who marked 'done' today? 
                                    // MVP: Split among all other participants currently in the promise.

                                    const { data: others } = await supabase
                                        .from('promise_participants')
                                        .select('user_id')
                                        .eq('promise_id', promiseData.id)
                                        .neq('user_id', user.id);

                                    if (others && others.length > 0) {
                                        const share = dailyStake / others.length;
                                        const winningsInserts = others.map(p => ({
                                            promise_id: promiseData.id,
                                            user_id: p.user_id,
                                            amount: share,
                                            type: 'winnings'
                                        }));

                                        await supabase.from('ledger').insert(winningsInserts);
                                    }
                                }

                                setTodayStatus(status);
                                fetchCheckins();
                                // Optionally show success feedback
                            }
                        } catch (e) {
                            Alert.alert('Error', 'An unexpected error occurred.');
                            console.error(e);
                        } finally {
                            setUpdating(false);
                        }
                    }
                }
            ]
        );
    };

    const renderAnalytics = () => {
        // Last 7 Days Logic
        const days = [];
        const today = new Date();

        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(today.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];

            // Find status
            // Note: DB dates are YYYY-MM-DD. 
            // In a real app we might need timezone awareness, assuming UTC for now or local string match
            const checkin = checkins.find(c => c.date === dateStr);

            days.push({
                date: dateStr,
                dayLabel: d.toLocaleDateString('en-US', { weekday: 'narrow' }), // M, T, W
                status: checkin ? checkin.status : 'pending',
                isFuture: false // simplified, we are iterating backwards from today
            });
        }

        return (
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Weekly Progress</Text>
                <View style={styles.analyticsCard}>
                    <View style={styles.chartRow}>
                        {days.map((day, index) => (
                            <View key={index} style={styles.dayColumn}>
                                <View style={[
                                    styles.chartBar,
                                    day.status === 'done' && styles.barDone,
                                    day.status === 'failed' && styles.barFailed,
                                    day.status === 'pending' && styles.barPending
                                ]} />
                                <Text style={styles.dayLabel}>{day.dayLabel}</Text>
                            </View>
                        ))}
                    </View>
                    <Text style={styles.analyticsFooter}>Last 7 Days</Text>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.headerBackButton}>
                        <Ionicons name="arrow-back" size={24} color="#334155" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
                    <View style={{ width: 24 }} />
                </View>

                {/* Invite Code Card (NEW) */}
                {invite_code && (
                    <View style={styles.inviteCard}>
                        <View>
                            <Text style={styles.inviteLabel}>Invite Code</Text>
                            <Text style={styles.inviteCode}>{invite_code}</Text>
                        </View>
                        <Ionicons name="copy-outline" size={24} color="#64748B" />
                    </View>
                )}

                {/* Main Details Card */}
                <View style={styles.card}>
                    <View style={styles.row}>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Duration</Text>
                            <Text style={styles.statValue}>{duration} Days</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Stake / Person</Text>
                            <Text style={styles.statValue}>₹ {amountPerPerson}</Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.totalContainer}>
                        <Text style={styles.totalLabel}>Total Pool</Text>
                        <Text style={styles.totalValue}>₹ {totalAmount}</Text>
                    </View>
                </View>

                {/* Analytics Section */}
                {renderAnalytics()}

                {/* Participants */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Participants ({realParticipantCount})</Text>
                    <View style={styles.participantsList}>
                        {participants?.map((p: any, index: number) => (
                            <View key={index} style={styles.participantChip}>
                                <Ionicons name="person-circle" size={20} color="#64748B" />
                                <Text style={styles.participantText}>{p.name || p}</Text>
                            </View>
                        ))}
                    </View>
                </View>


                {/* Daily Check-in */}
                <View style={styles.checkInSection}>
                    <Text style={styles.checkInTitle}>Daily Check-in</Text>

                    {todayStatus ? (
                        <View style={[
                            styles.statusCard,
                            todayStatus === 'done' ? styles.statusCardSuccess : styles.statusCardFail
                        ]}>
                            <Ionicons
                                name={todayStatus === 'done' ? "checkmark-circle" : "alert-circle"}
                                size={32}
                                color={todayStatus === 'done' ? "#166534" : "#991B1B"}
                            />
                            <View>
                                <Text style={[
                                    styles.statusTitle,
                                    { color: todayStatus === 'done' ? "#166534" : "#991B1B" }
                                ]}>
                                    {todayStatus === 'done' ? "Completed" : "Failed"}
                                </Text>
                                <Text style={[
                                    styles.statusSubtitle,
                                    { color: todayStatus === 'done' ? "#15803d" : "#b91c1c" }
                                ]}>
                                    {todayStatus === 'done' ? "You kept your promise today!" : "Better luck tomorrow."}
                                </Text>
                            </View>
                        </View>
                    ) : (
                        <>
                            <Text style={styles.checkInSubtitle}>Have you stuck to your promise today?</Text>
                            <View style={styles.checkInButtons}>
                                <TouchableOpacity
                                    style={[styles.checkInButton, styles.successButton]}
                                    onPress={() => handleCheckIn('done')}
                                >
                                    <Ionicons name="checkmark-circle-outline" size={24} color="#FFFFFF" />
                                    <Text style={styles.buttonText}>Mark as Done</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.checkInButton, styles.failButton]}
                                    onPress={() => handleCheckIn('failed')}
                                >
                                    <Ionicons name="close-circle-outline" size={24} color="#FFFFFF" />
                                    <Text style={styles.buttonText}>Mark as Failed</Text>
                                </TouchableOpacity>
                            </View>
                        </>
                    )}
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
    scrollContent: {
        padding: 24,
        paddingTop: 80, // Increased top spacing
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    headerBackButton: {
        padding: 8,
        marginLeft: -8,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0F172A',
        flex: 1,
        textAlign: 'center',
        marginHorizontal: 16,
    },
    inviteCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F1F5F9',
        padding: 16,
        borderRadius: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    inviteLabel: {
        fontSize: 12,
        color: '#64748B',
        textTransform: 'uppercase',
        fontWeight: '600',
        marginBottom: 4,
    },
    inviteCode: {
        fontSize: 20,
        fontWeight: '800',
        color: '#0F172A',
        letterSpacing: 2,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 24,
        marginBottom: 24,
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 2,
    },
    divider: {
        height: 1,
        backgroundColor: '#F1F5F9',
        marginVertical: 20,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    statItem: {
        flex: 1,
    },
    statLabel: {
        fontSize: 12,
        color: '#64748B',
        marginBottom: 4,
    },
    statValue: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0F172A',
    },
    totalContainer: {
        alignItems: 'center',
        backgroundColor: '#F1F5F9',
        padding: 16,
        borderRadius: 12,
    },
    totalLabel: {
        fontSize: 12,
        color: '#64748B',
        marginBottom: 4,
    },
    totalValue: {
        fontSize: 24,
        fontWeight: '800',
        color: '#0F172A',
    },
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 16,
    },
    participantsList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    participantChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        gap: 6,
    },
    participantText: {
        fontSize: 14,
        color: '#334155',
        fontWeight: '500',
    },
    checkInSection: {
        marginTop: 8,
    },
    checkInTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 8,
        textAlign: 'center',
    },
    checkInSubtitle: {
        fontSize: 14,
        color: '#64748B',
        textAlign: 'center',
        marginBottom: 24,
    },
    checkInButtons: {
        flexDirection: 'row',
        gap: 16,
    },
    checkInButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 16,
        gap: 8,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    successButton: {
        backgroundColor: '#22C55E', // Green
    },
    failButton: {
        backgroundColor: '#EF4444', // Red
    },
    buttonText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 15,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        fontSize: 16,
        color: '#64748B',
        marginBottom: 16,
    },
    backButton: {
        padding: 12,
        backgroundColor: '#E2E8F0',
        borderRadius: 8,
    },
    backButtonText: {
        color: '#334155',
        fontWeight: '600',
    },
    // Analytics
    analyticsCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 20,
        marginBottom: 24,
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 2,
    },
    chartRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        height: 60,
        marginBottom: 12,
    },
    dayColumn: {
        alignItems: 'center',
        gap: 8,
    },
    chartBar: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    barDone: {
        backgroundColor: '#22C55E',
        height: 40, // Taller bar for done
    },
    barFailed: {
        backgroundColor: '#EF4444',
        height: 20,
    },
    barPending: {
        backgroundColor: '#E2E8F0',
        height: 4,
    },
    dayLabel: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '500',
    },
    analyticsFooter: {
        textAlign: 'center',
        fontSize: 12,
        color: '#94A3B8',
        fontWeight: '600',
        marginTop: 4,
    },
    // Status Card
    statusCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        borderRadius: 16,
        gap: 16,
        marginTop: 8,
    },
    statusCardSuccess: {
        backgroundColor: '#DCFCE7', // Light green
    },
    statusCardFail: {
        backgroundColor: '#FEE2E2', // Light red
    },
    statusTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    statusSubtitle: {
        fontSize: 14,
        fontWeight: '500',
    }
});
