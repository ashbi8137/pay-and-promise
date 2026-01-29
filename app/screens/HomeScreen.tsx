import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    Alert,
    BackHandler,
    Platform,
    Pressable,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    useColorScheme
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors } from '../../constants/theme';
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
    const colorScheme = useColorScheme() ?? 'light';
    const theme = Colors[colorScheme];

    const [firstName, setFirstName] = useState<string>('');
    const [activePromises, setActivePromises] = useState<PromiseItem[]>([]);
    const [completedPromises, setCompletedPromises] = useState<PromiseItem[]>([]);
    const [recentlyCompleted, setRecentlyCompleted] = useState<PromiseItem[]>([]);
    const [promiseListTab, setPromiseListTab] = useState<'in_progress' | 'completed'>('in_progress');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useFocusEffect(
        useCallback(() => {
            fetchData();

            const onBackPress = () => {
                Alert.alert(
                    'Hold on!',
                    'Are you sure you want to exit the app?',
                    [
                        {
                            text: 'Cancel',
                            onPress: () => null,
                            style: 'cancel',
                        },
                        {
                            text: 'Exit',
                            onPress: () => BackHandler.exitApp()
                        },
                    ]
                );
                return true;
            };

            const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

            return () => subscription.remove();
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
                        .order('created_at', { ascending: false });

                    if (promiseError) console.error('Promise details error:', promiseError);

                    if (fetchedPromises) {
                        promises = fetchedPromises;
                    }
                }

                // 2. Fetch Today's Checkins (My Status)
                const today = new Date().toISOString().split('T')[0];
                const { data: checkins, error: checkinError } = await supabase
                    .from('daily_checkins')
                    .select('promise_id, status')
                    .eq('user_id', user.id)
                    .eq('date', today);

                if (checkinError) console.error('Checkin fetch error:', checkinError);

                // 3. Fetch Today's Settlements (Group Status)
                // If a promise is in this table for today, it means everyone is verified/accounted for.
                let settledPromiseIds = new Set();
                if (promises.length > 0) {
                    const promiseIds = promises.map(p => p.id);
                    const { data: settlements, error: settlementError } = await supabase
                        .from('daily_settlements')
                        .select('promise_id')
                        .in('promise_id', promiseIds)
                        .eq('date', today);

                    if (settlementError) console.error('Settlement fetch error:', settlementError);
                    if (settlements) {
                        settledPromiseIds = new Set(settlements.map(s => s.promise_id));
                    }
                }

                if (promises) {
                    const todayCheckinMap = new Map();
                    checkins?.forEach(c => todayCheckinMap.set(c.promise_id, c.status));

                    const pending: PromiseItem[] = [];
                    const done: PromiseItem[] = [];
                    const justCompleted: PromiseItem[] = [];

                    for (const p of promises) {
                        // 1. If Promise is finalized (Completed/Failed entirely), it goes to Completed Tab
                        // NOTE: p.status comes from the 'promises' table (active/completed/failed)
                        if (p.status !== 'active') {
                            done.push(p);
                            // Check if promise was completed recently (check created_at + duration)
                            const startDate = new Date(p.created_at);
                            const endDate = new Date(startDate);
                            endDate.setDate(startDate.getDate() + p.duration_days);
                            const now = new Date();
                            // If promise ended within the last 24 hours, show congratulations
                            const hoursSinceEnd = (now.getTime() - endDate.getTime()) / (1000 * 60 * 60);
                            if (p.status === 'completed' && hoursSinceEnd >= 0 && hoursSinceEnd < 24) {
                                justCompleted.push(p);
                            }
                            continue;
                        }

                        // 2. If Active, check if the DAY is settled (Group Complete)
                        if (settledPromiseIds.has(p.id)) {
                            // The day is fully settled! Move to Completed Tab for today.
                            // We use my personal status for the badge (completed/failed)
                            const myStatus = todayCheckinMap.get(p.id);
                            // If I didn't verify but day is settled, I must have been auto-failed or rejected
                            done.push({ ...p, status: (myStatus === 'done' || myStatus === 'verified') ? 'completed' : 'failed' });
                        } else {
                            // Day is NOT settled yet. Stays in "In Progress".
                            // But I might have finished my part.
                            if (todayCheckinMap.has(p.id)) {
                                const myStatus = todayCheckinMap.get(p.id);
                                // I am done, but waiting for others.
                                // We can use a special status string to show a different badge UI if needed, 
                                // or just keep it 'active' but maybe show "Waiting..." text.
                                // For now, let's keep it in pending.
                                // We'll add a temporary property 'waitingForOthers' if we want to show a badge.
                                // Effectively, it's still "Active" in the list.
                                pending.push({ ...p, status: 'active_waiting' }); // active_waiting is a UI hint
                            } else {
                                // I haven't done it yet.
                                pending.push(p);
                            }
                        }
                    }

                    setActivePromises(pending);
                    setCompletedPromises(done);
                    setRecentlyCompleted(justCompleted);
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
                    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }, isHistory && styles.completedCard]}>
                        <View style={styles.cardHeader}>
                            <View style={{ flex: 1, marginRight: 8 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                                    <Text style={[styles.cardTitle, { color: theme.text }, isHistory && styles.completedText]}>{item.title}</Text>
                                    <View style={
                                        item.status === 'active' ? styles.activeBadge :
                                            item.status === 'active_waiting' ? styles.waitingBadge :
                                                item.status === 'failed' ? styles.failedBadge : styles.completedBadge
                                    }>
                                        <Text style={
                                            item.status === 'active' ? styles.activeBadgeText :
                                                item.status === 'active_waiting' ? styles.waitingBadgeText :
                                                    item.status === 'failed' ? styles.failedBadgeText : styles.completedBadgeText
                                        }>
                                            {item.status === 'active' ? 'Active' :
                                                item.status === 'active_waiting' ? 'Waiting' :
                                                    (item.status === 'failed' ? 'Failed' : 'Done')}
                                        </Text>
                                    </View>
                                </View>

                                <Text style={[styles.cardSubtitle, { color: theme.icon }]}>
                                    {isHistory ? (isFailed ? 'Failed' : 'Completed') : `${currentDay} of ${totalDays} days completed`}
                                </Text>
                                <Text style={[styles.cardMeta, { color: theme.icon }]}>
                                    ₹{item.amount_per_person}/person • {item.number_of_people} participants
                                </Text>
                            </View>
                        </View>

                        {/* Progress Bar */}
                        <View style={[styles.progressBarContainer, { backgroundColor: theme.background }]}>
                            <View
                                style={[
                                    styles.progressBarFill,
                                    { width: `${progressPercent}%` },
                                    item.status === 'completed' && { backgroundColor: theme.icon }, // Grey for completed
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
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <SafeAreaView style={{ flex: 1 }}>
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.tint} />
                    }
                >

                    {/* Header Section */}
                    <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.header}>
                        <View style={styles.headerColumn}>
                            <Text style={[styles.dateText, { color: theme.icon }]}>
                                {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short' }).toUpperCase()}
                            </Text>
                            <View style={styles.greetingRow}>
                                <Text style={[styles.greetingText, { color: theme.icon }]}>Welcome back, </Text>
                                <Text style={[styles.nameText, { color: theme.text }]}>{firstName}</Text>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.profileButton}
                            onPress={() => router.push('/screens/ProfileScreen')}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={[theme.tint, theme.gold]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.profileGradient}
                            >
                                <Text style={styles.profileInitials}>{firstName.charAt(0)}</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </Animated.View>

                    {/* Congratulations Banner for Recently Completed Promises */}
                    {/* {recentlyCompleted.length > 0 && (
                        <Animated.View entering={FadeInDown.delay(150).springify()}>
                            {recentlyCompleted.map(promise => (
                                <TouchableOpacity
                                    key={`congrats-${promise.id}`}
                                    style={[styles.congratsBanner, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}
                                    onPress={() => router.push({
                                        pathname: '/screens/PromiseReportScreen',
                                        params: { promiseId: promise.id }
                                    })}
                                    activeOpacity={0.8}
                                >
                                    <View style={styles.congratsContent}>
                                        <Text style={styles.congratsEmoji}>🎉</Text>
                                        <View style={styles.congratsTextContainer}>
                                            <Text style={styles.congratsTitle}>Congratulations!</Text>
                                            <Text style={styles.congratsSubtitle} numberOfLines={1}>
                                                You have successfully completed "{promise.title}"
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={styles.congratsArrow}>
                                        <Text style={styles.congratsLink}>View report</Text>
                                        <Ionicons name="arrow-forward" size={16} color="#059669" />
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </Animated.View>
                    )} */}

                    {/* ACTION SURFACE (Grouped Actions) */}
                    <Animated.View entering={FadeInDown.delay(200).springify()} style={[styles.actionSurface, { backgroundColor: theme.card, shadowColor: theme.tint, borderColor: theme.border }]}>
                        <View>
                            <Text style={[styles.actionSurfaceTitle, { color: theme.text }]}>Start a new promise</Text>
                            <Text style={[styles.actionSurfaceSubtitle, { color: theme.icon }]}>Stay accountable with real stakes</Text>
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
                                colors={[theme.tint, '#1e40af']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.primaryButton}
                            >
                                <Ionicons name="add-circle" size={24} color="#FFFFFF" style={{ marginRight: 8 }} />
                                <Text style={styles.primaryButtonText}>Create a Promise</Text>
                            </LinearGradient>
                        </Pressable>

                        <View style={[styles.divider, { backgroundColor: theme.border }]} />

                        {/* Secondary Trigger */}
                        <TouchableOpacity
                            onPress={() => router.push('/screens/JoinPromiseScreen')}
                            activeOpacity={0.7}
                            style={styles.secondaryButtonRow}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Ionicons name="enter-outline" size={20} color={theme.icon} style={{ marginRight: 8 }} />
                                <Text style={[styles.secondaryButtonText, { color: theme.text }]}>Join an existing promise</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={16} color={theme.border} />
                        </TouchableOpacity>


                    </Animated.View>

                    {/* STATS ROW (If Data Exists) */}
                    {(activePromises.length > 0 || completedPromises.length > 0) && (
                        <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.statsRow}>
                            <View style={[styles.statPill, { backgroundColor: theme.card, borderColor: theme.border }]}>
                                <View style={[styles.statPillIcon, { backgroundColor: theme.background }]}>
                                    <Ionicons name="flame" size={18} color={theme.tint} />
                                </View>
                                <View>
                                    <Text style={[styles.statPillLabel, { color: theme.icon }]}>Active</Text>
                                    <Text style={[styles.statPillValue, { color: theme.text }]}>{activePromises.length > 0 ? activePromises.length : '-'}</Text>
                                </View>
                            </View>
                            <View style={[styles.statPill, { backgroundColor: theme.card, borderColor: theme.border }]}>
                                <View style={[styles.statPillIcon, { backgroundColor: theme.background }]}>
                                    <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
                                </View>
                                <View>
                                    <Text style={[styles.statPillLabel, { color: theme.icon }]}>Done Today</Text>
                                    <Text style={[styles.statPillValue, { color: theme.text }]}>{completedPromises.length > 0 ? completedPromises.length : '-'}</Text>
                                </View>
                            </View>
                        </Animated.View>
                    )}

                    {/* Promise List Section with Tabs */}
                    <View style={styles.promiseListSection}>
                        <Text style={[styles.sectionTitle, { color: theme.text }]}>Promise List</Text>

                        {/* Tab Switcher */}
                        <View style={[styles.tabContainer, { backgroundColor: theme.background }]}>
                            <TouchableOpacity
                                style={[styles.tab, promiseListTab === 'in_progress' && [styles.tabActive, { backgroundColor: theme.card }]]}
                                onPress={() => setPromiseListTab('in_progress')}
                            >
                                <Text style={[styles.tabText, { color: theme.icon }, promiseListTab === 'in_progress' && styles.tabTextActive]}>
                                    In Progress
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.tab, promiseListTab === 'completed' && [styles.tabActive, { backgroundColor: theme.card }]]}
                                onPress={() => setPromiseListTab('completed')}
                            >
                                <Text style={[styles.tabText, { color: theme.icon }, promiseListTab === 'completed' && styles.tabTextActive]}>
                                    Completed
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Promise Cards based on selected tab */}
                        {promiseListTab === 'in_progress' ? (
                            // In Progress Promises
                            activePromises.length > 0 ? (
                                activePromises.map(item => renderCard(item, false))
                            ) : (
                                <View style={[styles.emptyStateCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                                    <View style={[styles.emptyStateIcon, { backgroundColor: theme.background }]}>
                                        <Ionicons name="hourglass-outline" size={32} color={theme.icon} />
                                    </View>
                                    <Text style={[styles.emptyStateTitle, { color: theme.text }]}>No active promises</Text>
                                    <Text style={[styles.emptyStateText, { color: theme.icon }]}>
                                        Your active promises will appear here.{"\n"}
                                        Create one to get started.
                                    </Text>
                                </View>
                            )
                        ) : (
                            // Completed Promises
                            completedPromises.filter(p => p.status === 'completed' || p.status === 'failed').length > 0 ? (
                                completedPromises.filter(p => p.status === 'completed' || p.status === 'failed').map(item => (
                                    <TouchableOpacity
                                        key={`completed-${item.id}`}
                                        activeOpacity={0.9}
                                        onPress={() => router.push({
                                            pathname: '/screens/PromiseReportScreen',
                                            params: { promiseId: item.id }
                                        })}
                                    >
                                        {renderCard(item, true)}
                                    </TouchableOpacity>
                                ))
                            ) : (
                                <View style={[styles.emptyStateCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                                    <View style={[styles.emptyStateIcon, { backgroundColor: theme.background }]}>
                                        <Ionicons name="trophy-outline" size={32} color={theme.icon} />
                                    </View>
                                    <Text style={[styles.emptyStateTitle, { color: theme.text }]}>No completed promises yet</Text>
                                    <Text style={[styles.emptyStateText, { color: theme.icon }]}>
                                        Complete a promise to see it here.
                                    </Text>
                                </View>
                            )
                        )}
                    </View>
                    {/* Integrated Trust Footer (Moved to Bottom) */}
                    <View style={styles.trustFooter}>
                        <Ionicons name="lock-closed-outline" size={12} color={theme.icon} />
                        <Text style={[styles.trustText, { color: theme.icon }]}>Secure & Private</Text>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        // backgroundColor handled dynamically
    },
    scrollContent: {
        padding: 24,
        paddingTop: Platform.OS === 'android' ? 80 : 60,
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
        fontWeight: '400',
    },
    nameText: {
        fontSize: 20,
        fontWeight: '700',
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
        borderRadius: 24,
        padding: 24,
        marginBottom: 32,
        shadowOffset: { width: 0, height: 8 }, // Slightly softer shadow
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 6,
        borderWidth: 1,
    },
    actionSurfaceTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 4,
        letterSpacing: -0.5,
    },
    actionSurfaceSubtitle: {
        fontSize: 13,
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
        padding: 12,
        borderRadius: 16,
        borderWidth: 1,
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
        fontWeight: '600',
    },
    statPillValue: {
        fontSize: 16,
        fontWeight: '700',
        marginLeft: 'auto',
    },

    // EMPTY STATE CARD
    emptyStateCard: {
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
        borderWidth: 1,
        borderStyle: 'dashed',
    },
    emptyStateIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    emptyStateTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 6,
    },
    emptyStateText: {
        fontSize: 14,
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
        letterSpacing: -0.5,
    },

    // EXISTING CARD STYLES (Keep consistent)
    card: {
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04, // Softer
        shadowRadius: 12,
        elevation: 2,
        borderWidth: 1,
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
        marginBottom: 4,
    },
    cardSubtitle: {
        fontSize: 13,
        fontWeight: '500',
    },
    cardMeta: {
        fontSize: 12,
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
    },
    completedText: {
        textDecorationLine: 'line-through',
    },
    completedBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
    },
    completedBadgeText: {
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
    waitingBadge: {
        backgroundColor: '#FEF9C3', // Yellow-100
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        marginLeft: 8,
    },
    waitingBadgeText: {
        color: '#B45309', // Yellow-700
        fontSize: 11,
        fontWeight: '700',
    },
    // Congratulations Banner Styles
    congratsBanner: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
    },
    congratsContent: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    congratsEmoji: {
        fontSize: 24,
        marginRight: 12,
    },
    congratsTextContainer: {
        flex: 1,
    },
    congratsTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#065F46',
        marginBottom: 2,
    },
    congratsSubtitle: {
        fontSize: 13,
        color: '#047857',
        fontWeight: '500',
    },
    congratsArrow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 4,
    },
    congratsLink: {
        fontSize: 13,
        fontWeight: '600',
        color: '#059669',
    },
    // Promise List Section Styles
    promiseListSection: {
        marginBottom: 16,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#F1F5F9',
        borderRadius: 12,
        padding: 4,
        marginBottom: 16,
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 10,
        alignItems: 'center',
    },
    tabActive: {
        backgroundColor: '#FFFFFF',
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748B',
    },
    tabTextActive: {
        color: '#4F46E5',
    },
});
