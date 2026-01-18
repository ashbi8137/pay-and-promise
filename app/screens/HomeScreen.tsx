import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { supabase } from '../../lib/supabase';

// Data Interface matching Supabase Schema
interface PromiseItem {
    id: string;
    title: string;
    description?: string;
    duration_days: number;
    number_of_people: number;
    amount_per_person: number;
    total_amount: number;
    participants: any[]; // jsonb 
    status: string;
    created_at: string;
}

export default function HomeScreen() {
    const router = useRouter();
    const [firstName, setFirstName] = useState<string>('Ashbin');
    const [activePromises, setActivePromises] = useState<PromiseItem[]>([]);
    const [completedPromises, setCompletedPromises] = useState<PromiseItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Fetch User and Promises when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [])
    );

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                // Set Name
                const metadataName = user.user_metadata?.full_name;
                if (metadataName) {
                    setFirstName(metadataName.split(' ')[0]);
                } else if (user.email) {
                    setFirstName(user.email.split('@')[0]);
                }

                // 1. Fetch Promsie IDs where user is a participant
                const { data: myParticipations, error: partError } = await supabase
                    .from('promise_participants')
                    .select('promise_id')
                    .eq('user_id', user.id);

                if (partError) {
                    console.error('Participant fetch error:', partError);
                }

                let promises: PromiseItem[] = [];

                if (myParticipations && myParticipations.length > 0) {
                    const promiseIds = myParticipations.map(p => p.promise_id);

                    // 2. Fetch Promise Details for these IDs
                    const { data: fetchedPromises, error: promiseError } = await supabase
                        .from('promises')
                        .select('*')
                        .in('id', promiseIds)
                        .eq('status', 'active') // Only fetch active promises
                        .order('created_at', { ascending: false });

                    if (promiseError) console.error('Promise details error:', promiseError);

                    if (fetchedPromises) {
                        promises = fetchedPromises;
                    }
                }

                // 2. Fetch Today's Checkins
                const today = new Date().toISOString().split('T')[0];
                const { data: checkins, error: checkinError } = await supabase
                    .from('daily_checkins')
                    .select('promise_id, status')
                    .eq('user_id', user.id)
                    .eq('date', today);

                // Removed duplicate error check

                if (checkinError) console.error('Checkin fetch error:', checkinError);

                if (promises) {
                    const todayCheckinMap = new Map();
                    checkins?.forEach(c => todayCheckinMap.set(c.promise_id, c.status));

                    const pending = [];
                    const doneToday = [];

                    for (const p of promises) {
                        if (todayCheckinMap.has(p.id)) {
                            // It has been checked in today
                            const status = todayCheckinMap.get(p.id);
                            // Attach temporary status for display
                            doneToday.push({ ...p, status: status === 'done' ? 'completed' : 'failed' });
                        } else {
                            // Not checked in yet
                            pending.push(p);
                        }
                    }

                    setActivePromises(pending);
                    setCompletedPromises(doneToday);
                }
            }
        } catch (error) {
            console.log('Error fetching data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchData();
    }, []);

    const handleCreatePromise = () => {
        router.push('/screens/CreatePromiseScreen');
    };

    const handlePromisePress = (item: PromiseItem) => {
        const mappedItem = {
            ...item,
            duration: item.duration_days,
            numPeople: item.number_of_people,
            amountPerPerson: item.amount_per_person,
            totalAmount: item.total_amount,
        };

        router.push({
            pathname: '/screens/PromiseDetailScreen',
            params: { promise: JSON.stringify(mappedItem) }
        });
    };



    const renderCard = (item: PromiseItem, isHistory: boolean) => {
        const currentDay = 1;
        const totalDays = item.duration_days;
        const progressPercent = isHistory ? 100 : (currentDay / totalDays) * 100;
        const isFailed = item.status === 'failed';

        return (
            <TouchableOpacity
                key={item.id}
                activeOpacity={0.9}
                onPress={() => handlePromisePress(item)}
            >
                <View style={[styles.card, isHistory && styles.completedCard]}>
                    <View style={styles.cardHeader}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                            <Text style={[styles.cardTitle, isHistory && styles.completedText]}>{item.title}</Text>
                            <Text style={styles.cardSubtitle}>
                                {isHistory ? (isFailed ? 'Failed' : 'Completed') : `Day ${currentDay} of ${totalDays}`}
                            </Text>
                            <Text style={styles.cardMeta}>
                                ₹{item.amount_per_person}/person • {item.participants?.length || 0} participants
                            </Text>
                        </View>
                        <View style={
                            item.status === 'active' ? styles.activeBadge :
                                item.status === 'failed' ? styles.failedBadge : styles.completedBadge
                        }>
                            <Text style={
                                item.status === 'active' ? styles.activeBadgeText :
                                    item.status === 'failed' ? styles.failedBadgeText : styles.completedBadgeText
                            }>
                                {item.status === 'active' ? 'Active' : (item.status === 'failed' ? 'Failed' : 'Done')}
                            </Text>
                        </View>
                    </View>

                    {/* Progress Bar */}
                    <View style={styles.progressBarContainer}>
                        <View
                            style={[
                                styles.progressBarFill,
                                { width: `${progressPercent}%` },
                                item.status === 'completed' && { backgroundColor: '#94A3B8' }, // Grey for completed
                                isFailed && { backgroundColor: '#EF4444' } // Red for failed
                            ]}
                        />
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >

                {/* Header Section */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.greetingText}>Good Morning, {firstName} 👋</Text>
                        <Text style={styles.subGreetingText}>
                            {activePromises.length > 0
                                ? `You have ${activePromises.length} active promise${activePromises.length > 1 ? 's' : ''} today.`
                                : "You have 0 active promises today. Let's create one!"}
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={styles.iconButton}
                        onPress={() => router.push('/screens/ProfileScreen')}
                    >
                        <Ionicons name="person-circle-outline" size={28} color="#334155" />
                    </TouchableOpacity>
                </View>

                {/* Dashboard Stats (New) */}
                <View style={styles.statsContainer}>
                    <View style={styles.statCard}>
                        <View style={[styles.iconCircle, { backgroundColor: '#E0E7FF' }]}>
                            <Ionicons name="flame" size={20} color="#4338ca" />
                        </View>
                        <View>
                            <Text style={styles.statLabel}>Active Goals</Text>
                            <Text style={styles.statValue}>{activePromises.length}</Text>
                        </View>
                    </View>
                    <View style={styles.statCard}>
                        <View style={[styles.iconCircle, { backgroundColor: '#DCFCE7' }]}>
                            <Ionicons name="checkmark-circle" size={20} color="#166534" />
                        </View>
                        <View>
                            <Text style={styles.statLabel}>Done Today</Text>
                            <Text style={styles.statValue}>{completedPromises.length}</Text>
                        </View>
                    </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionContainer}>
                    <TouchableOpacity onPress={handleCreatePromise} activeOpacity={0.8} style={styles.primaryButtonWrapper}>
                        <LinearGradient
                            colors={['#4F46E5', '#4338ca']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.primaryButton}
                        >
                            <Ionicons name="add-circle" size={24} color="#FFFFFF" style={{ marginRight: 8 }} />
                            <Text style={styles.primaryButtonText}>Create a Promise</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => router.push('/screens/JoinPromiseScreen')}
                        activeOpacity={0.7}
                        style={styles.secondaryButtonWrapper}
                    >
                        <View style={styles.secondaryButton}>
                            <Ionicons name="enter-outline" size={20} color="#4338ca" style={{ marginRight: 6 }} />
                            <Text style={styles.secondaryButtonText}>Join a Promise</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Trust Indicator */}
                <View style={styles.trustContainer}>
                    <Ionicons name="shield-checkmark-outline" size={14} color="#64748B" />
                    <Text style={styles.trustText}>Your promises are safe & tracked</Text>
                </View>

                {/* Active Section */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Active Promises</Text>
                </View>

                {activePromises.length > 0 ? (
                    activePromises.map(item => renderCard(item, false))
                ) : (
                    <View style={styles.emptyStateContainer}>
                        <View style={styles.emptyIconCircle}>
                            <Ionicons name="calendar-outline" size={32} color="#94A3B8" />
                        </View>
                        <Text style={styles.emptyStateTitle}>You're free right now</Text>
                        <Text style={styles.emptyStateText}>Start a new promise and stay accountable.</Text>

                    </View>
                )}

                {/* Completed Section using new "History" style */}
                {completedPromises.length > 0 && (
                    <View style={{ marginTop: 24 }}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Today's Progress</Text>
                        </View>
                        {completedPromises.map(item => renderCard(item, true))}
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
    scrollContent: {
        padding: 24,
        paddingTop: 60,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 32,
        marginTop: 10,
    },
    greetingText: {
        fontSize: 16,
        color: '#64748B',
        fontWeight: '500',
        marginBottom: 4,
    },
    nameText: {
        fontSize: 30,
        fontWeight: '800',
        color: '#0F172A',
        letterSpacing: -0.5,
    },
    iconButton: {
        padding: 8,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    ctaButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 16,
        shadowColor: '#4338ca',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },



    ctaText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
    },
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#334155',
        marginBottom: 16,
        paddingLeft: 4,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 4,
    },
    cardSubtitle: {
        fontSize: 14,
        color: '#64748B',
        fontWeight: '500',
        marginBottom: 4,
    },
    cardMeta: {
        fontSize: 12,
        color: '#94A3B8',
        fontWeight: '500',
    },
    activeBadge: {
        backgroundColor: '#DCFCE7', // Light Green
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    activeBadgeText: {
        color: '#166534', // Dark Green
        fontSize: 12,
        fontWeight: '700',
    },
    progressBarContainer: {
        height: 6,
        backgroundColor: '#F1F5F9',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#22C55E', // Green Accent
        borderRadius: 3,
    },
    emptyText: {
        color: '#94A3B8',
        fontStyle: 'italic',
        textAlign: 'center',
        marginTop: 8,
    },
    // Completed Styles
    completedCard: {
        opacity: 0.8,
        backgroundColor: '#F8FAFC',
    },
    completedText: {
        textDecorationLine: 'line-through',
        color: '#94A3B8',
    },
    completedBadge: {
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    completedBadgeText: {
        color: '#64748B',
        fontSize: 12,
        fontWeight: '700',
    },
    // Failed Styles
    failedBadge: {
        backgroundColor: '#FEF2F2',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    failedBadgeText: {
        color: '#EF4444',
        fontSize: 12,
        fontWeight: '700',
    },
    trustIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 16,
        marginBottom: 8,
        gap: 6,
        backgroundColor: '#F1F5F9', // Subtle background
        alignSelf: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },

    // New Styles for Overhaul
    subGreetingText: {
        fontSize: 14,
        color: '#64748B',
        marginTop: 4,
    },
    // Dashboard Stats
    statsContainer: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 24,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '600',
    },
    statValue: {
        fontSize: 20,
        fontWeight: '700',
        color: '#0F172A',
    },
    // Buttons Hierarchy
    actionContainer: {
        gap: 12,
        marginBottom: 8,
    },
    primaryButtonWrapper: {
        width: '100%',
    },
    primaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 18,
        borderRadius: 20,
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 6,
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
    },
    secondaryButtonWrapper: {
        width: '100%',
    },
    secondaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 20,
        backgroundColor: '#F8FAFC',
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
    },
    secondaryButtonText: {
        color: '#4338ca',
        fontSize: 16,
        fontWeight: '700',
    },
    // Refined Trust Indicator
    trustContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 12,
        marginBottom: 32,
        gap: 6,
    },
    trustText: {
        fontSize: 13,
        color: '#64748B',
        fontWeight: '500',
    },
    // Section Headers
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    // Empty States
    emptyStateContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 32,
        alignItems: 'center',
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: '#CBD5E1',
    },
    emptyIconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    emptyStateTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#334155',
        marginBottom: 8,
    },
    emptyStateText: {
        fontSize: 14,
        color: '#64748B',
        textAlign: 'center',
        marginBottom: 16,
    },
    miniCreateButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        backgroundColor: '#EFF6FF',
        borderRadius: 20,
    },
    miniCreateText: {
        color: '#4338ca',
        fontWeight: '700',
        fontSize: 13,
    },
});
