
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    Platform,
    Pressable,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
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
        const currentDay = 1; // Logic placeholder - ideally calculate from created_at
        const totalDays = item.duration_days;
        const progressPercent = isHistory ? 100 : (currentDay / totalDays) * 100;
        const isFailed = item.status === 'failed';

        return (
            <Animated.View
                entering={FadeInDown.delay(isHistory ? 400 : 300).springify()}
                key={item.id}
            >
                <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => handlePromisePress(item)}
                >
                    <View style={[styles.card, isHistory && styles.completedCard]}>
                        <View style={styles.cardHeader}>
                            <View style={{ flex: 1, marginRight: 8 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                                    <Text style={[styles.cardTitle, isHistory && styles.completedText]}>{item.title}</Text>
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

                                <Text style={styles.cardSubtitle}>
                                    {isHistory ? (isFailed ? 'Failed' : 'Completed') : `${currentDay} of ${totalDays} days completed`}
                                </Text>
                                <Text style={styles.cardMeta}>
                                    ₹{item.amount_per_person}/person • {item.participants?.length || 0} participants
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
            </Animated.View>
        );
    };

    return (
        <View style={styles.container}>
            <SafeAreaView style={{ flex: 1 }}>
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                >

                    {/* Header Section */}
                    <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.header}>
                        <View style={styles.headerColumn}>
                            <Text style={styles.dateText}>
                                {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short' }).toUpperCase()}
                            </Text>
                            <View style={styles.greetingRow}>
                                <Text style={styles.greetingText}>Welcome back, </Text>
                                <Text style={styles.nameText}>{firstName}</Text>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.profileButton}
                            onPress={() => router.push('/screens/ProfileScreen')}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={['#4F46E5', '#4338ca']}
                                style={styles.profileGradient}
                            >
                                <Text style={styles.profileInitials}>{firstName.charAt(0)}</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </Animated.View>

                    {/* ACTION SURFACE (Grouped Actions) */}
                    <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.actionSurface}>
                        <View>
                            <Text style={styles.actionSurfaceTitle}>Start a new promise</Text>
                            <Text style={styles.actionSurfaceSubtitle}>Stay accountable with real stakes</Text>
                        </View>

                        {/* Primary Trigger */}
                        <Pressable
                            onPress={handleCreatePromise}
                            android_ripple={{ color: 'rgba(255,255,255,0.2)', borderless: false }}
                            style={({ pressed }) => [
                                styles.primaryButtonWrapper,
                                Platform.OS === 'ios' && pressed && { opacity: 0.7 }
                            ]}
                        >
                            <LinearGradient
                                colors={['#4F46E5', '#4338ca']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.primaryButton}
                            >
                                <Ionicons name="add-circle" size={24} color="#FFFFFF" style={{ marginRight: 8 }} />
                                <Text style={styles.primaryButtonText}>Create a Promise</Text>
                            </LinearGradient>
                        </Pressable>

                        <View style={styles.divider} />

                        {/* Secondary Trigger */}
                        <TouchableOpacity
                            onPress={() => router.push('/screens/JoinPromiseScreen')}
                            activeOpacity={0.7}
                            style={styles.secondaryButtonRow}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Ionicons name="enter-outline" size={20} color="#64748B" style={{ marginRight: 8 }} />
                                <Text style={styles.secondaryButtonText}>Join an existing promise</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
                        </TouchableOpacity>

                        {/* Integrated Trust Footer */}
                        <View style={styles.trustFooter}>
                            <Ionicons name="lock-closed-outline" size={12} color="#94A3B8" />
                            <Text style={styles.trustText}>Secure & Private</Text>
                        </View>
                    </Animated.View>

                    {/* STATS ROW (If Data Exists) */}
                    {(activePromises.length > 0 || completedPromises.length > 0) && (
                        <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.statsRow}>
                            <View style={styles.statPill}>
                                <View style={[styles.statPillIcon, { backgroundColor: '#EEF2FF' }]}>
                                    <Ionicons name="flame" size={18} color="#4F46E5" />
                                </View>
                                <View>
                                    <Text style={styles.statPillLabel}>Active</Text>
                                    <Text style={styles.statPillValue}>{activePromises.length > 0 ? activePromises.length : '-'}</Text>
                                </View>
                            </View>
                            <View style={styles.statPill}>
                                <View style={[styles.statPillIcon, { backgroundColor: '#F0FDF4' }]}>
                                    <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
                                </View>
                                <View>
                                    <Text style={styles.statPillLabel}>Done Today</Text>
                                    <Text style={styles.statPillValue}>{completedPromises.length > 0 ? completedPromises.length : '-'}</Text>
                                </View>
                            </View>
                        </Animated.View>
                    )}

                    {/* Active Section Header */}
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Your Promises</Text>
                    </View>

                    {/* Active Promises List or Empty Card */}
                    {activePromises.length > 0 ? (
                        activePromises.map(item => renderCard(item, false))
                    ) : (
                        <View style={styles.emptyStateCard}>
                            <View style={styles.emptyStateIcon}>
                                <Ionicons name="compass-outline" size={32} color="#94A3B8" />
                            </View>
                            <Text style={styles.emptyStateTitle}>Ready when you are</Text>
                            <Text style={styles.emptyStateText}>
                                Your active promises will appear here.{"\n"}
                                Create one to get started.
                            </Text>
                        </View>
                    )}

                    {/* Completed Section (History) */}
                    {completedPromises.length > 0 && (
                        <View style={{ marginTop: 24 }}>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>Today's Wins</Text>
                            </View>
                            {completedPromises.map(item => renderCard(item, true))}
                        </View>
                    )}
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC', // Clean solid background
    },
    scrollContent: {
        padding: 24,
        paddingTop: 60,
        paddingBottom: 40,
    },
    // COMPACT HEADER
    // PROFESSIONAL HEADER
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 28,
    },
    headerColumn: {
        flex: 1,
        justifyContent: 'center',
    },
    dateText: {
        fontSize: 10, // Smaller
        fontWeight: '600',
        color: '#CBD5E1', // Lighter
        letterSpacing: 0.5,
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    greetingRow: {
        flexDirection: 'row', // Keep them on one line if possible, or wrap naturally
        alignItems: 'baseline',
        flexWrap: 'wrap',
    },
    greetingText: {
        fontSize: 20,
        color: '#64748B',
        fontWeight: '400',
    },
    nameText: {
        fontSize: 20,
        fontWeight: '700',
        color: '#0F172A',
    },
    profileButton: {
        // Removed relative position for dot
    },
    profileGradient: {
        width: 42,
        height: 42,
        borderRadius: 14, // Squircle-ish
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    profileInitials: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
    },
    // Removed notificationDot style

    // ACTION SURFACE (New Hero Card)
    actionSurface: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 24,
        marginBottom: 32,
        shadowColor: '#4F46E5', // Colored shadow for premium feel
        shadowOffset: { width: 0, height: 8 }, // Slightly softer shadow
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 6,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    actionSurfaceTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 4,
        letterSpacing: -0.5,
    },
    actionSurfaceSubtitle: {
        fontSize: 13,
        color: '#64748B',
        marginBottom: 20,
    },
    primaryButtonWrapper: {
        width: '100%',
        marginBottom: 16,
        borderRadius: 16, // Ensure ripple effect is contained
        overflow: 'hidden', // Ensure ripple effect is contained
    },
    primaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 18,
        borderRadius: 16,
        // Gradient background handled inline
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    divider: {
        height: 1,
        backgroundColor: '#F1F5F9',
        marginVertical: 4,
        marginBottom: 16,
    },
    secondaryButtonRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 4,
    },
    secondaryButtonText: {
        fontSize: 15,
        fontWeight: '500', // Slightly lighter weight
        color: '#475569',
    },
    secondaryButtonHelper: {
        fontSize: 13,
        color: '#94A3B8',
        fontWeight: '500',
    },
    // Trust Footer Integrated
    trustFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20,
        gap: 6,
        opacity: 0.8,
    },
    trustText: {
        fontSize: 11,
        color: '#94A3B8',
        fontWeight: '500',
    },

    // STATS ROW (Compact)
    statsRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 32,
    },
    statPill: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        // Removed most shadow for cleaner pill look
    },
    statPillIcon: {
        width: 32,
        height: 32,
        borderRadius: 12, // Softer radius
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    statPillLabel: {
        fontSize: 11,
        color: '#64748B',
        fontWeight: '600',
    },
    statPillValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0F172A',
        marginLeft: 'auto',
    },

    // EMPTY STATE CARD
    emptyStateCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderStyle: 'dashed',
    },
    emptyStateIcon: {
        width: 64,
        height: 64,
        backgroundColor: '#F8FAFC',
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    emptyStateTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#334155',
        marginBottom: 6,
    },
    emptyStateText: {
        fontSize: 14,
        color: '#94A3B8',
        textAlign: 'center',
        lineHeight: 20,
    },

    // SECTION HEADERS
    sectionHeader: {
        marginBottom: 16,
        paddingLeft: 4,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0F172A',
        letterSpacing: -0.5,
    },

    // EXISTING CARD STYLES (Keep consistent)
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04, // Softer
        shadowRadius: 12,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#F1F5F9',
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
        marginBottom: 4,
    },
    cardSubtitle: {
        fontSize: 13,
        color: '#64748B',
        fontWeight: '500',
    },
    cardMeta: {
        fontSize: 12,
        color: '#94A3B8',
        fontWeight: '500',
    },
    activeBadge: {
        backgroundColor: '#DCFCE7',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6, // Slightly sharper
        marginLeft: 8, // Add spacing to title
    },
    activeBadgeText: {
        color: '#166534',
        fontSize: 11,
        fontWeight: '700',
    },
    progressBarContainer: {
        height: 10, // Thicker
        backgroundColor: '#F1F5F9',
        borderRadius: 5,
        overflow: 'hidden',
        marginTop: 12,
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#22C55E',
        borderRadius: 5,
    },
    completedCard: {
        opacity: 0.7,
        backgroundColor: '#F8FAFC',
    },
    completedText: {
        textDecorationLine: 'line-through',
        color: '#94A3B8',
    },
    completedBadge: {
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
    },
    completedBadgeText: {
        color: '#64748B',
        fontSize: 11,
        fontWeight: '700',
    },
    failedBadge: {
        backgroundColor: '#FEF2F2',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
    },
    failedBadgeText: {
        color: '#EF4444',
        fontSize: 11,
        fontWeight: '700',
    },
});
